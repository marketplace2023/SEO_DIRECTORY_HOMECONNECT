import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const directory = resolve(root, ".local/aws");
mkdirSync(directory, { recursive: true });
const profile = process.env.HOME_CONNECT_AWS_PROFILE || "fur";
const region = process.env.HOME_CONNECT_AWS_REGION || "us-east-2";
const account = process.env.HOME_CONNECT_AWS_ACCOUNT || "850695279479";
const stateFile = resolve(directory, "deployment.json");
const state = existsSync(stateFile)
  ? JSON.parse(readFileSync(stateFile, "utf8"))
  : {
      region,
      account,
      sites: {},
      originSecret: randomBytes(32).toString("hex"),
    };
if (state.region !== region || state.account !== account)
  throw Error("AWS deployment account/region mismatch");
const save = () =>
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n");
let sequence = 0;
const input = (value) => {
  const filename = resolve(directory, `input-${sequence++}.json`);
  writeFileSync(filename, JSON.stringify(value));
  return "file://" + filename.replaceAll("\\", "/");
};
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
      AWS_CLI_FILE_ENCODING: "UTF-8",
      AWS_CLI_OUTPUT_ENCODING: "UTF-8",
    },
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout?.trim() || "";
}
const awsArgs = [
  "--profile",
  profile,
  "--region",
  region,
  "--no-cli-pager",
  "--output",
  "json",
];
function aws(...args) {
  const output = run("aws", [...awsArgs, ...args]);
  return output ? JSON.parse(output) : {};
}
const s3 = (...args) =>
  run("aws", [...awsArgs, "s3", ...args, "--only-show-errors"]);
async function processRun(command, args, env = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      windowsHide: true,
      env: { ...process.env, ...env },
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error(`${command} exited ${code}`)),
    );
  });
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tags = [
  { Key: "project", Value: "homeconnect" },
  { Key: "environment", Value: "prototype" },
];
const registry = `${account}.dkr.ecr.${region}.amazonaws.com`;
const bucket = `homeconnect-releases-${account}`;
function ensureBucket(name) {
  try {
    aws("s3api", "head-bucket", "--bucket", name);
  } catch (error) {
    if (!/404|Not Found|NoSuchBucket/.test(error.message)) throw error;
    aws(
      "s3api",
      "create-bucket",
      "--bucket",
      name,
      "--create-bucket-configuration",
      `LocationConstraint=${region}`,
    );
  }
  aws(
    "s3api",
    "put-public-access-block",
    "--bucket",
    name,
    "--public-access-block-configuration",
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true",
  );
  aws(
    "s3api",
    "put-bucket-encryption",
    "--bucket",
    name,
    "--server-side-encryption-configuration",
    input({
      Rules: [
        {
          ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" },
          BucketKeyEnabled: false,
        },
      ],
    }),
  );
  aws(
    "s3api",
    "put-bucket-versioning",
    "--bucket",
    name,
    "--versioning-configuration",
    "Status=Enabled",
  );
  aws(
    "s3api",
    "put-bucket-tagging",
    "--bucket",
    name,
    "--tagging",
    input({ TagSet: tags }),
  );
}

async function infrastructure() {
  ensureBucket(bucket);
  aws(
    "s3api",
    "put-bucket-lifecycle-configuration",
    "--bucket",
    bucket,
    "--lifecycle-configuration",
    input({
      Rules: [
        {
          ID: "retain-backups-30-days",
          Status: "Enabled",
          Filter: { Prefix: "backups/" },
          Expiration: { Days: 30 },
          NoncurrentVersionExpiration: { NoncurrentDays: 30 },
        },
      ],
    }),
  );
  if (!state.role) {
    const name = "homeconnect-api";
    try {
      aws("iam", "get-role", "--role-name", name);
    } catch (error) {
      if (!/NoSuchEntity/.test(error.message)) throw error;
      aws(
        "iam",
        "create-role",
        "--role-name",
        name,
        "--assume-role-policy-document",
        input({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { Service: "ec2.amazonaws.com" },
              Action: "sts:AssumeRole",
            },
          ],
        }),
        "--tags",
        input(tags),
      );
    }
    aws(
      "iam",
      "attach-role-policy",
      "--role-name",
      name,
      "--policy-arn",
      "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    );
    aws(
      "iam",
      "put-role-policy",
      "--role-name",
      name,
      "--policy-name",
      "homeconnect-artifacts",
      "--policy-document",
      input({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["ecr:GetAuthorizationToken"],
            Resource: "*",
          },
          {
            Effect: "Allow",
            Action: [
              "ecr:BatchGetImage",
              "ecr:GetDownloadUrlForLayer",
              "ecr:BatchCheckLayerAvailability",
            ],
            Resource: `arn:aws:ecr:${region}:${account}:repository/homeconnect-api`,
          },
          {
            Effect: "Allow",
            Action: ["s3:ListBucket", "s3:GetBucketLocation"],
            Resource: `arn:aws:s3:::${bucket}`,
          },
          {
            Effect: "Allow",
            Action: ["s3:GetObject"],
            Resource: [
              `arn:aws:s3:::${bucket}/bootstrap/*`,
              `arn:aws:s3:::${bucket}/artifacts/*`,
            ],
          },
          {
            Effect: "Allow",
            Action: ["s3:PutObject"],
            Resource: `arn:aws:s3:::${bucket}/backups/*`,
          },
        ],
      }),
    );
    try {
      aws("iam", "get-instance-profile", "--instance-profile-name", name);
    } catch (error) {
      if (!/NoSuchEntity/.test(error.message)) throw error;
      aws("iam", "create-instance-profile", "--instance-profile-name", name);
      aws(
        "iam",
        "add-role-to-instance-profile",
        "--instance-profile-name",
        name,
        "--role-name",
        name,
      );
    }
    state.role = name;
    save();
  }
  if (!state.securityGroup) {
    const vpc = aws(
      "ec2",
      "describe-vpcs",
      "--filters",
      "Name=is-default,Values=true",
    ).Vpcs[0];
    if (!vpc) throw Error("No default VPC found");
    const prefix = aws(
      "ec2",
      "describe-managed-prefix-lists",
      "--filters",
      "Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing",
    ).PrefixLists[0];
    const existing = aws(
      "ec2",
      "describe-security-groups",
      "--filters",
      "Name=group-name,Values=homeconnect-api",
      `Name=vpc-id,Values=${vpc.VpcId}`,
    ).SecurityGroups[0];
    const id =
      existing?.GroupId ||
      aws(
        "ec2",
        "create-security-group",
        "--group-name",
        "homeconnect-api",
        "--description",
        "HOME CONNECT API from CloudFront only",
        "--vpc-id",
        vpc.VpcId,
      ).GroupId;
    if (!existing)
      aws(
        "ec2",
        "authorize-security-group-ingress",
        "--group-id",
        id,
        "--ip-permissions",
        input([
          {
            IpProtocol: "tcp",
            FromPort: 80,
            ToPort: 80,
            PrefixListIds: [
              {
                PrefixListId: prefix.PrefixListId,
                Description: "CloudFront origins",
              },
            ],
          },
        ]),
      );
    aws("ec2", "create-tags", "--resources", id, "--tags", input(tags));
    state.securityGroup = id;
    state.subnet = aws(
      "ec2",
      "describe-subnets",
      "--filters",
      `Name=vpc-id,Values=${vpc.VpcId}`,
      "Name=map-public-ip-on-launch,Values=true",
    ).Subnets[0].SubnetId;
    save();
  }
  if (!state.instanceId) {
    const image = aws(
      "ssm",
      "get-parameter",
      "--name",
      "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64",
    ).Parameter.Value;
    const result = aws(
      "ec2",
      "run-instances",
      "--cli-input-json",
      input({
        ImageId: image,
        InstanceType: "t3.small",
        MinCount: 1,
        MaxCount: 1,
        ClientToken: `homeconnect-${state.originSecret.slice(0, 24)}`,
        IamInstanceProfile: { Name: state.role },
        SubnetId: state.subnet,
        SecurityGroupIds: [state.securityGroup],
        MetadataOptions: {
          HttpTokens: "required",
          HttpPutResponseHopLimit: 1,
          HttpEndpoint: "enabled",
        },
        BlockDeviceMappings: [
          {
            DeviceName: "/dev/xvda",
            Ebs: {
              VolumeSize: 30,
              VolumeType: "gp3",
              Encrypted: true,
              DeleteOnTermination: false,
            },
          },
        ],
        TagSpecifications: [
          {
            ResourceType: "instance",
            Tags: [...tags, { Key: "Name", Value: "homeconnect-api" }],
          },
          { ResourceType: "volume", Tags: tags },
        ],
      }),
    );
    state.instanceId = result.Instances[0].InstanceId;
    save();
    aws(
      "ec2",
      "modify-instance-attribute",
      "--instance-id",
      state.instanceId,
      "--disable-api-termination",
      "Value=true",
    );
  }
  for (let attempt = 0; attempt < 40; attempt++) {
    const instance = aws(
      "ec2",
      "describe-instances",
      "--instance-ids",
      state.instanceId,
    ).Reservations[0].Instances[0];
    if (instance.State.Name === "running") break;
    if (attempt === 39) throw Error("Instance did not start");
    await delay(5000);
  }
  if (!state.allocationId) {
    const address = aws(
      "ec2",
      "allocate-address",
      "--domain",
      "vpc",
      "--tag-specifications",
      input([{ ResourceType: "elastic-ip", Tags: tags }]),
    );
    state.allocationId = address.AllocationId;
    save();
    aws(
      "ec2",
      "associate-address",
      "--instance-id",
      state.instanceId,
      "--allocation-id",
      address.AllocationId,
    );
  }
  state.apiDomain = aws(
    "ec2",
    "describe-instances",
    "--instance-ids",
    state.instanceId,
  ).Reservations[0].Instances[0].PublicDnsName;
  if (!state.apiDomain) throw Error("Instance DNS not available");
  save();
  if (!state.repository) {
    if (
      !aws("ecr", "describe-repositories").repositories.some(
        (repository) => repository.repositoryName === "homeconnect-api",
      )
    )
      aws(
        "ecr",
        "create-repository",
        "--repository-name",
        "homeconnect-api",
        "--image-scanning-configuration",
        "scanOnPush=true",
        "--image-tag-mutability",
        "IMMUTABLE",
        "--tags",
        input(tags),
      );
    state.repository = `${registry}/homeconnect-api`;
    save();
  }
  if (!state.oac) {
    const existing = aws(
      "cloudfront",
      "list-origin-access-controls",
    ).OriginAccessControlList?.Items?.find(
      (control) => control.Name === "homeconnect-sites",
    );
    state.oac =
      existing?.Id ||
      aws(
        "cloudfront",
        "create-origin-access-control",
        "--origin-access-control-config",
        input({
          Name: "homeconnect-sites",
          Description: "HOME CONNECT private frontend buckets",
          SigningProtocol: "sigv4",
          SigningBehavior: "always",
          OriginAccessControlOriginType: "s3",
        }),
      ).OriginAccessControl.Id;
    save();
  }
  await createSites();
  console.log(
    `Infrastructure ready: ${state.instanceId}, isolated homeconnect resources`,
  );
}

// Remaining phases are below; all state files stay in ignored .local/aws.
async function createSites() {
  const distributions =
    aws("cloudfront", "list-distributions").DistributionList?.Items || [];
  const caches = aws(
    "cloudfront",
    "list-cache-policies",
    "--type",
    "managed",
  ).CachePolicyList.Items.map((item) => item.CachePolicy);
  const requests = aws(
    "cloudfront",
    "list-origin-request-policies",
    "--type",
    "managed",
  ).OriginRequestPolicyList.Items.map((item) => item.OriginRequestPolicy);
  const noCache = caches.find(
    (policy) => policy.CachePolicyConfig.Name === "Managed-CachingDisabled",
  ).Id;
  const optimized = caches.find(
    (policy) => policy.CachePolicyConfig.Name === "Managed-CachingOptimized",
  ).Id;
  const allHeaders = requests.find(
    (policy) =>
      policy.OriginRequestPolicyConfig.Name ===
      "Managed-AllViewerExceptHostHeader",
  ).Id;
  for (const name of ["web", "contractor", "admin"]) {
    if (state.sites[name]) continue;
    const siteBucket = `homeconnect-${name}-${account}`;
    ensureBucket(siteBucket);
    const dynamic = (path) => ({
      PathPattern: path,
      TargetOriginId: "api",
      ViewerProtocolPolicy: "redirect-to-https",
      AllowedMethods: {
        Quantity: 7,
        Items: ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
        CachedMethods: { Quantity: 2, Items: ["GET", "HEAD"] },
      },
      CachePolicyId: noCache,
      OriginRequestPolicyId: allHeaders,
      Compress: true,
    });
    const paths = [
      "/api/*",
      "/health",
      "/robots.txt",
      "/sitemap.xml",
      "/georgia*",
      "/contractors/*",
    ];
    const config = {
      CallerReference: `homeconnect-${name}-${state.originSecret.slice(0, 20)}`,
      Comment: `HOME CONNECT ${name}`,
      Enabled: true,
      DefaultRootObject: "index.html",
      PriceClass: "PriceClass_100",
      HttpVersion: "http2",
      IsIPV6Enabled: true,
      Origins: {
        Quantity: 2,
        Items: [
          {
            Id: "frontend",
            DomainName: `${siteBucket}.s3.${region}.amazonaws.com`,
            OriginAccessControlId: state.oac,
            S3OriginConfig: { OriginAccessIdentity: "" },
          },
          {
            Id: "api",
            DomainName: state.apiDomain,
            CustomHeaders: {
              Quantity: 1,
              Items: [
                {
                  HeaderName: "X-Homeconnect-Origin",
                  HeaderValue: state.originSecret,
                },
              ],
            },
            CustomOriginConfig: {
              HTTPPort: 80,
              HTTPSPort: 443,
              OriginProtocolPolicy: "http-only",
              OriginSslProtocols: { Quantity: 1, Items: ["TLSv1.2"] },
              OriginReadTimeout: 60,
              OriginKeepaliveTimeout: 5,
            },
          },
        ],
      },
      DefaultCacheBehavior: {
        TargetOriginId: "frontend",
        ViewerProtocolPolicy: "redirect-to-https",
        AllowedMethods: {
          Quantity: 2,
          Items: ["GET", "HEAD"],
          CachedMethods: { Quantity: 2, Items: ["GET", "HEAD"] },
        },
        CachePolicyId: optimized,
        Compress: true,
      },
      CacheBehaviors: { Quantity: paths.length, Items: paths.map(dynamic) },
      ViewerCertificate: { CloudFrontDefaultCertificate: true },
      Restrictions: {
        GeoRestriction: { RestrictionType: "none", Quantity: 0 },
      },
    };
    const existing = distributions.find(
      (distribution) => distribution.Comment === config.Comment,
    );
    const distribution =
      existing ||
      aws(
        "cloudfront",
        "create-distribution-with-tags",
        "--distribution-config-with-tags",
        input({ DistributionConfig: config, Tags: { Items: tags } }),
      ).Distribution;
    aws(
      "s3api",
      "put-bucket-policy",
      "--bucket",
      siteBucket,
      "--policy",
      input({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "cloudfront.amazonaws.com" },
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${siteBucket}/*`,
            Condition: { StringEquals: { "AWS:SourceArn": distribution.ARN } },
          },
          {
            Effect: "Deny",
            Principal: "*",
            Action: "s3:*",
            Resource: [
              `arn:aws:s3:::${siteBucket}`,
              `arn:aws:s3:::${siteBucket}/*`,
            ],
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          },
        ],
      }),
    );
    state.sites[name] = {
      id: distribution.Id,
      bucket: siteBucket,
      url: `https://${distribution.DomainName}`,
    };
    save();
    console.log(`Created ${name}: ${state.sites[name].url}`);
  }
}

async function buildImage() {
  if (!state.repository) throw Error("Run infra first");
  const tag = new Date().toISOString().replace(/[-:TZ.]/g, "");
  const image = `${state.repository}:${tag}`;
  await processRun("docker", [
    "build",
    "--platform",
    "linux/amd64",
    "--provenance=false",
    "-f",
    "Dockerfile.api",
    "-t",
    image,
    ".",
  ]);
  const password = run("aws", [...awsArgs, "ecr", "get-login-password"]);
  run("docker", ["login", "--username", "AWS", "--password-stdin", registry], {
    input: password,
  });
  await processRun("docker", ["push", image]);
  state.image = image;
  save();
  console.log("API image built and uploaded");
}

async function command(script) {
  const response = aws(
    "ssm",
    "send-command",
    "--instance-ids",
    state.instanceId,
    "--document-name",
    "AWS-RunShellScript",
    "--parameters",
    input({ commands: [script], executionTimeout: ["1800"] }),
    "--timeout-seconds",
    "60",
  );
  const id = response.Command.CommandId;
  state.remoteCommandId = id;
  save();
  for (let attempt = 0; attempt < 180; attempt++) {
    await delay(5000);
    let result;
    try {
      result = aws(
        "ssm",
        "get-command-invocation",
        "--command-id",
        id,
        "--instance-id",
        state.instanceId,
      );
    } catch (error) {
      if (/InvocationDoesNotExist/.test(error.message)) continue;
      throw error;
    }
    if (result.Status === "Success") {
      console.log(result.StandardOutputContent.trim());
      return;
    }
    if (["Failed", "Cancelled", "TimedOut"].includes(result.Status))
      throw Error(
        `Remote command ${id} ${result.Status}: ${result.StandardErrorContent}`,
      );
    if (attempt % 6 === 0) console.log(`Remote setup ${id}: ${result.Status}`);
  }
  throw Error(
    `Remote command ${id} still running; inspect SSM before retrying`,
  );
}

async function release() {
  if (!state.image || !state.sites.admin)
    throw Error("Run infra and image first");
  const environment = {
    SERVINEXO_WEB_ORIGIN: state.sites.web.url,
    SERVINEXO_CONTRACTOR_ORIGIN: state.sites.contractor.url,
    SERVINEXO_ADMIN_ORIGIN: state.sites.admin.url,
    SERVINEXO_API_ORIGIN: "/",
    PUBLIC_SITE_URL: state.sites.web.url,
    SEO_INDEXING_ENABLED: "false",
    HOME_CONNECT_REGISTRATION_ENABLED: "false",
  };
  await processRun(
    process.platform === "win32" ? "cmd.exe" : "npm",
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npm run build"]
      : ["run", "build"],
    environment,
  );
  for (const name of ["web", "contractor", "admin"]) {
    const build = resolve(
      root,
      name === "web" ? "dist/web" : `apps/${name}/dist`,
    );
    const files = readdirSync(resolve(build, "assets")).filter((name) =>
      name.endsWith(".js"),
    );
    if (
      !files.some((file) =>
        readFileSync(resolve(build, "assets", file), "utf8").includes(
          state.sites.web.url,
        ),
      )
    )
      throw Error(`Missing public origin in ${name} build`);
    const target = `s3://${state.sites[name].bucket}`;
    s3(
      "sync",
      build,
      target,
      "--exclude",
      "index.html",
      "--exclude",
      "assets/*",
      "--cache-control",
      "public,max-age=86400",
    );
    s3(
      "sync",
      resolve(build, "assets"),
      `${target}/assets`,
      "--cache-control",
      "public,max-age=31536000,immutable",
    );
    s3(
      "cp",
      resolve(build, "index.html"),
      `${target}/index.html`,
      "--cache-control",
      "no-cache",
      "--content-type",
      "text/html; charset=utf-8",
    );
    const invalidation = aws(
      "cloudfront",
      "create-invalidation",
      "--distribution-id",
      state.sites[name].id,
      "--paths",
      "/*",
    );
    state.sites[name].invalidationId = invalidation.Invalidation.Id;
    save();
    console.log(`Published ${name}`);
  }
  const hostScript = readFileSync(
    new URL("./bootstrap.sh", import.meta.url),
    "utf8",
  )
    .replaceAll("\r\n", "\n")
    .replaceAll("@@REGION@@", region)
    .replaceAll("@@REGISTRY@@", registry)
    .replaceAll("@@BUCKET@@", bucket)
    .replaceAll("@@ORIGIN_SECRET@@", state.originSecret);
  const script = resolve(directory, "bootstrap.sh");
  writeFileSync(script, hostScript);
  s3("cp", script, `s3://${bucket}/bootstrap/host.sh`);
  const apiEnv =
    Object.entries({
      NODE_ENV: "production",
      ...environment,
      SERVINEXO_API_HOST: "0.0.0.0",
      SERVINEXO_API_PORT: "5190",
      DATABASE_DIR: "/data/database",
      UPLOAD_DIR: "/data/uploads",
      SERVINEXO_STATE_FILE: "/data/state.json",
      HOME_CONNECT_BOOTSTRAP_FILE: "/data/bootstrap-accounts.json",
    })
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n";
  const envFile = resolve(directory, "api.env");
  writeFileSync(envFile, apiEnv);
  const serviceFile = resolve(directory, "service.env");
  writeFileSync(serviceFile, `HOME_CONNECT_IMAGE=${state.image}\n`);
  s3("cp", envFile, `s3://${bucket}/bootstrap/api.env`);
  s3("cp", serviceFile, `s3://${bucket}/bootstrap/service.env`);
  const accessFile = resolve(directory, "access.json");
  if (!existsSync(accessFile))
    writeFileSync(
      accessFile,
      JSON.stringify(
        [
          {
            id: "demo-owner",
            name: "Consumidor HOME CONNECT",
            email: "consumer@homeconnect.example",
            role: "owner",
          },
          {
            id: "demo-contractor",
            name: "Contratista HOME CONNECT",
            email: "contractor@homeconnect.example",
            role: "contractor",
            professionalId: "ruiz",
          },
          {
            id: "demo-admin",
            name: "Administrador HOME CONNECT",
            email: "admin@homeconnect.example",
            role: "admin",
          },
        ].map((account) => ({
          ...account,
          password: randomBytes(24).toString("base64url"),
        })),
        null,
        2,
      ),
    );
  if (!state.accountsProvisioned)
    s3("cp", accessFile, `s3://${bucket}/bootstrap/accounts.json`);
  for (let attempt = 0; attempt < 60; attempt++) {
    const managed = aws(
      "ssm",
      "describe-instance-information",
      "--filters",
      input([{ Key: "InstanceIds", Values: [state.instanceId] }]),
    );
    if (
      managed.InstanceInformationList.some(
        (instance) => instance.PingStatus === "Online",
      )
    )
      break;
    if (attempt === 59) throw Error("Instance not online in SSM");
    await delay(5000);
  }
  const setup = [
    "set -eu",
    `export AWS_DEFAULT_REGION=${region}`,
    `aws s3 cp s3://${bucket}/bootstrap/host.sh /tmp/homeconnect-host.sh --only-show-errors`,
    "bash /tmp/homeconnect-host.sh",
    "if systemctl is-active --quiet homeconnect-api; then /usr/local/sbin/homeconnect-backup; fi",
    "systemctl stop homeconnect-api || true",
    `aws s3 cp s3://${bucket}/bootstrap/api.env /etc/homeconnect/api.env --only-show-errors`,
    `aws s3 cp s3://${bucket}/bootstrap/service.env /etc/homeconnect/service.env --only-show-errors`,
    ...(!state.accountsProvisioned
      ? [
          `aws s3 cp s3://${bucket}/bootstrap/accounts.json /var/lib/homeconnect/bootstrap-accounts.json --only-show-errors`,
          "chown 1000:1000 /var/lib/homeconnect/bootstrap-accounts.json",
          "chmod 600 /var/lib/homeconnect/bootstrap-accounts.json",
        ]
      : []),
    "chmod 600 /etc/homeconnect/*.env",
    "systemctl enable --now homeconnect-api",
    "for attempt in $(seq 1 90); do",
    "  if curl --fail --silent http://127.0.0.1:5190/health >/dev/null; then echo 'HOME CONNECT API healthy'; exit 0; fi",
    "  sleep 2",
    "done",
    "systemctl status homeconnect-api --no-pager",
    "exit 1",
  ].join("\n");
  await command(setup);
  await finalizeRelease();
}

async function finalizeRelease() {
  if (!state.remoteCommandId)
    throw Error("No recorded remote deployment command");
  const remote = aws(
    "ssm",
    "get-command-invocation",
    "--command-id",
    state.remoteCommandId,
    "--instance-id",
    state.instanceId,
    "--query",
    "{Status:Status,Code:ResponseCode}",
  );
  if (remote.Status !== "Success" || remote.Code !== 0)
    throw Error("Remote deployment has not succeeded");
  if (!state.accountsProvisioned) {
    const versions = aws(
      "s3api",
      "list-object-versions",
      "--bucket",
      bucket,
      "--prefix",
      "bootstrap/accounts.json",
    );
    const objects = [
      ...(versions.Versions || []),
      ...(versions.DeleteMarkers || []),
    ]
      .filter((object) => object.Key === "bootstrap/accounts.json")
      .map(({ Key, VersionId }) => ({ Key, VersionId }));
    if (objects.length)
      aws(
        "s3api",
        "delete-objects",
        "--bucket",
        bucket,
        "--delete",
        input({ Objects: objects }),
      );
    state.accountsProvisioned = true;
    save();
  }
  state.releasedAt = new Date().toISOString();
  save();
  console.log(
    "Release complete; private credentials are in .local/aws/access.json",
  );
}

async function status() {
  console.log(
    JSON.stringify(
      {
        region,
        instanceId: state.instanceId,
        image: state.image,
        releasedAt: state.releasedAt,
        sites: state.sites,
      },
      null,
      2,
    ),
  );
  if (state.instanceId)
    console.log(
      aws(
        "ec2",
        "describe-instance-status",
        "--instance-ids",
        state.instanceId,
      ).InstanceStatuses.map((instance) => ({
        instance: instance.InstanceId,
        system: instance.SystemStatus.Status,
        status: instance.InstanceStatus.Status,
      })),
    );
  for (const site of Object.values(state.sites))
    console.log(
      site.url,
      aws("cloudfront", "get-distribution", "--id", site.id).Distribution
        .Status,
    );
}

const identity = aws("sts", "get-caller-identity");
if (identity.Account !== account)
  throw Error("Refusing to deploy to a different AWS account");
if (process.argv[2] !== "status") save();
switch (process.argv[2]) {
  case "infra":
    await infrastructure();
    break;
  case "image":
    await buildImage();
    break;
  case "release":
    await release();
    break;
  case "status":
    await status();
    break;
  case "finalize":
    await finalizeRelease();
    break;
  default:
    throw Error(
      "Usage: node scripts/aws/deploy.mjs infra|image|release|status|finalize",
    );
}
