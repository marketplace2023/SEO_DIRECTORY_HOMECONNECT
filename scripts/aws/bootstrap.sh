#!/usr/bin/env bash
# Rendered into a private release bucket by deploy.mjs; contains no IAM keys.
set -euo pipefail
export AWS_DEFAULT_REGION=@@REGION@@
dnf install -y docker nginx
systemctl enable --now docker
install -d -m 700 /etc/homeconnect
install -d -m 700 -o 1000 -g 1000 /var/lib/homeconnect

cat >/etc/nginx/conf.d/homeconnect.conf <<'NGINX'
server {
    listen 80 default_server;
    server_name _;
    if ($http_x_homeconnect_origin != "@@ORIGIN_SECRET@@") { return 403; }
    client_max_body_size 9m;
    location / {
        proxy_pass http://127.0.0.1:5190;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 75s;
    }
}
NGINX
# Amazon Linux's bundled default server conflicts with our explicit server.
cat >/etc/nginx/nginx.conf <<'NGINX'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;
events { worker_connections 1024; }
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    include /etc/nginx/conf.d/*.conf;
}
NGINX
nginx -t
systemctl enable --now nginx

cat >/etc/systemd/system/homeconnect-api.service <<'UNIT'
[Unit]
Description=HOME CONNECT API
Requires=docker.service
After=docker.service network-online.target
[Service]
EnvironmentFile=/etc/homeconnect/service.env
ExecStartPre=/bin/bash -c '/usr/bin/aws ecr get-login-password --region @@REGION@@ | /usr/bin/docker login --username AWS --password-stdin @@REGISTRY@@ >/dev/null'
ExecStartPre=/bin/bash -c '/usr/bin/docker pull "$HOME_CONNECT_IMAGE"'
ExecStart=/bin/bash -c 'exec /usr/bin/docker run --rm --name homeconnect-api --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m --cap-drop ALL --security-opt no-new-privileges --log-opt max-size=10m --log-opt max-file=3 --publish 127.0.0.1:5190:5190 --env-file /etc/homeconnect/api.env --volume /var/lib/homeconnect:/data "$HOME_CONNECT_IMAGE"'
ExecStop=/usr/bin/docker stop --time 30 homeconnect-api
Restart=always
RestartSec=5
TimeoutStartSec=300
TimeoutStopSec=45
[Install]
WantedBy=multi-user.target
UNIT

cat >/usr/local/sbin/homeconnect-backup <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail
exec 9>/var/lock/homeconnect-backup.lock
flock -n 9 || exit 1
systemctl stop homeconnect-api
trap 'systemctl start homeconnect-api' EXIT
filename="/tmp/homeconnect-$(date -u +%Y%m%d-%H%M%S).tar.gz"
tar -C /var/lib/homeconnect -czf "$filename" .
systemctl start homeconnect-api
trap - EXIT
aws s3 cp "$filename" "s3://@@BUCKET@@/backups/$(basename "$filename")" --region @@REGION@@ --only-show-errors
rm -f -- "$filename"
BACKUP
chmod 700 /usr/local/sbin/homeconnect-backup
cat >/etc/systemd/system/homeconnect-backup.service <<'UNIT'
[Unit]
Description=Consistent HOME CONNECT database and file backup
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/homeconnect-backup
UNIT
cat >/etc/systemd/system/homeconnect-backup.timer <<'UNIT'
[Unit]
Description=Daily HOME CONNECT backup
[Timer]
OnCalendar=*-*-* 05:00:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now homeconnect-backup.timer
echo 'HOME CONNECT host configured'
