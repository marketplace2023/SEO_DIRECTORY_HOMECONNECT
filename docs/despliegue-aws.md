# HOME CONNECT en AWS

Despliegue del prototipo en la cuenta `850695279479`, región `us-east-2`, mediante el perfil local `fur`. Se consultó Planta_Oro como referencia. Todos los recursos nuevos llevan el prefijo `homeconnect-` y etiquetas `project=homeconnect`, `environment=prototype`; no comparten API, base de datos, buckets, credenciales ni distribuciones con FUR.

## Aplicaciones públicas

| Aplicación | URL |
|---|---|
| Web y consumidor | https://d38ml21kymywc2.cloudfront.net |
| Contratistas | https://dgbkzs6odn1rz.cloudfront.net |
| Administración | https://dhebsa7dthlvw.cloudfront.net |

Son aplicaciones y compilaciones independientes. Cada distribución CloudFront sirve su bucket S3 privado mediante Origin Access Control. Las peticiones `/api/*` se reenvían a la misma API sin caché, incluyendo autorización, cookies y parámetros. El navegador utiliza el dominio de su propio portal. `/health`, `/georgia*`, `/contractors/*`, `/robots.txt` y `/sitemap.xml` también se dirigen a la API; no se convierten errores JSON en respuestas HTML exitosas.

## API y persistencia

La API utiliza una instancia EC2 `t3.small` con Amazon Linux 2023, Docker, Nginx y disco EBS cifrado de 30 GiB. Su base PGlite requiere un único proceso con disco persistente: no se ha desplegado en App Runner ni en un contenedor con disco efímero. El servicio se reinicia con systemd. Los datos y adjuntos están en `/var/lib/homeconnect`, montado como `/data`, fuera de la imagen; una publicación de código no los reemplaza.

La instancia tiene protección contra terminación y el volumen no se elimina al terminarla. Se administra con Systems Manager, sin abrir SSH. El puerto HTTP de origen solo admite la lista de prefijos administrada de CloudFront; Nginx exige además un encabezado privado de esta aplicación. Los visitantes usan HTTPS de CloudFront. El tramo CloudFront–EC2 utiliza HTTP restringido: para una publicación productiva con TLS hasta el origen debe configurarse también un origen HTTPS confiable. El prototipo no tiene dominio personalizado.

La imagen ejecuta Node 22 y `NODE_ENV=production`, con usuario sin privilegios, sistema de archivos de solo lectura y directorio de datos independiente. Las contraseñas públicas de demostración del repositorio no permiten entrar. Las sesiones se invalidan al reiniciar la API, según el comportamiento actual del servidor.

## Accesos iniciales

El despliegue genera contraseñas aleatorias para tres cuentas privadas, una por entorno. Sus credenciales están únicamente en `.local/aws/access.json`, fuera de Git, y no deben publicarse. Las cuentas se provisionan una vez y los siguientes despliegues las conservan. El archivo temporal de provisión se elimina del servidor y sus versiones se eliminan del bucket después de una provisión exitosa.

El estado y configuración sensible del despliegue permanecen en `.local/aws/deployment.json`. No copiar ese archivo a Git: contiene el secreto que protege el origen. Conservar ambos archivos en un almacenamiento privado para operar futuros despliegues.

La guía local `.local/aws/ACCESOS.md` reúne las URLs de login y las credenciales generadas; también está excluida de Git.

El registro público está deshabilitado hasta configurar un proveedor SMTP y un remitente válido. Se muestra un mensaje en el formulario y la API responde 503 antes de crear una cuenta. Las cuentas provisionadas pueden acceder a los módulos. El buzón local de pruebas no se expone en AWS. Google Places, OAuth y GBP no se activan con este despliegue. El sitio mantiene `noindex` mientras sea un prototipo con datos de muestra.

## Operación y publicaciones

Requisitos locales: AWS CLI con acceso a la cuenta indicada, Docker para Linux y Node/npm. La identidad de AWS se comprueba antes de cualquier operación.

```powershell
# Crear o recuperar recursos propios sin afectar los de otros proyectos:
node scripts/aws/deploy.mjs infra

# Construir una imagen con etiqueta nueva e inmutable y subirla a ECR:
node scripts/aws/deploy.mjs image

# Compilar con las URLs públicas, publicar los tres portales y la API:
node scripts/aws/deploy.mjs release

# Consultar URLs, estado EC2 y propagación CloudFront:
node scripts/aws/deploy.mjs status
```

La publicación conserva los assets anteriores con hash, sube `index.html` al final e invalida CloudFront. Los buckets tienen versionado. Antes de actualizar una API que ya esté activa se realiza una copia consistente de los datos. No se sube la base local de desarrollo a AWS: se inicia un conjunto de datos de muestra independiente.

El script guarda el avance de la infraestructura en `.local/aws/deployment.json`. Si una operación falla, revisar ese estado y los recursos existentes antes de repetirla. No cambiar de cuenta o región ni borrar ese estado para reintentar: podría producir recursos duplicados.

Si el comando remoto terminó correctamente pero el cliente local no pudo leer la respuesta, `node scripts/aws/deploy.mjs finalize` comprueba el resultado del comando SSM registrado y completa la limpieza de las credenciales temporales sin volver a publicar. La CLI se ejecuta con salida UTF-8 para admitir los mensajes de Linux desde Windows.

Para habilitar el registro se debe preparar SMTP, añadir su configuración al entorno privado de la API y actualizar la configuración del despliegue para compilar con `HOME_CONNECT_REGISTRATION_ENABLED=true`. No poner contraseñas SMTP en variables `VITE_*` ni en Git. La integración de Google Places es una entrega pendiente independiente.

## Respaldos y recuperación

`homeconnect-backup.timer` ejecuta una copia diaria a las 05:00 UTC. Detiene brevemente la API, comprime la base y los adjuntos juntos, reinicia el servicio y sube el archivo al bucket privado `homeconnect-releases-850695279479/backups/`. La retención es de 30 días. También puede ejecutarse `sudo /usr/local/sbin/homeconnect-backup` mediante Systems Manager. Un bloqueo evita que se ejecuten dos respaldos simultáneos.

Una recuperación requiere detener la API, respaldar el directorio actual, restaurar el archivo en `/var/lib/homeconnect`, conservar el propietario UID/GID 1000 y arrancar el servicio. No restaurar ni borrar archivos con el motor PGlite abierto. Comprobar versión de código, datos y migraciones antes de revertir una imagen.

La infraestructura genera cargos de EC2, IPv4 pública, EBS, S3, ECR y CloudFront según consumo. Detener EC2 detiene el cómputo, pero no elimina los cargos de almacenamiento ni de la dirección reservada. No se han modificado los recursos ni las políticas de despliegue de Planta_Oro.

## Verificación del 18 de noviembre de 2026

- Las 51 pruebas locales pasaron y las tres compilaciones se completaron con sus orígenes públicos.
- La imagen Linux se probó con disco de datos separado, sistema de archivos de solo lectura y reinicio conservando las cuentas.
- Las tres distribuciones están `Deployed`; portada, endpoint de salud e imágenes JPEG responden 200 por HTTPS.
- Chrome comprobó el login y dashboard de consumidor, contratista y administrador, sin errores de JavaScript ni peticiones a localhost. Las llamadas API usan el origen de cada portal.
- Se comprobó que el visitante no recibe solicitudes ni mensajes privados, que las credenciales públicas de muestra no permiten entrar y que el registro sin correo responde 503.
- Se ejecutó un respaldo consistente, se comprobó el reinicio de la API y se restauró el archivo en otro contenedor aislado. Las tres cuentas privadas funcionaron tanto en AWS después del respaldo como en la base restaurada. La copia inicial se conserva en `backups/homeconnect-20261118-211310.tar.gz` dentro del bucket privado de publicaciones.
