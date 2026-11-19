# SEO local, email y Google Business Profile

Implementación de HOME CONNECT para el piloto en Georgia. No necesita dominio ni proveedores externos para probar los recorridos locales. La entrega de correo y la autorización real con Google quedan pendientes de configurar y validar con esos proveedores.

## Accesos

| Función | Acceso local |
|---|---|
| Directorio HTML de Georgia | `http://127.0.0.1:5175/georgia` |
| Localidades con oferta de muestra | `/georgia/lawrenceville`, `/georgia/atlanta`, `/georgia/roswell` |
| Página localidad/especialidad | `/georgia/:ciudad/:categoria`, después de crearla y publicarla |
| Ficha pública SEO | `/contractors/:id/:slug` |
| Sitemap y robots | `/sitemap.xml`, `/robots.txt` |
| Gestión SEO | Administración → SEO local |
| Estado de proveedores | Administración → Integraciones |
| Google Business Profile | Contratistas → Google Business Profile |
| Incidencias | Consumidor/contratistas → Ayuda y soporte; administración → Soporte |
| Moderación | Administración → Reseñas |

## 1. Configuración local

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

`npm run dev`, la API, los builds y el comando de base de datos leen `.env` de la raíz. Las variables explícitas de la terminal tienen precedencia. El archivo está ignorado por Git. Reiniciar los procesos después de cambiar configuración. No iniciar dos APIs contra el mismo directorio PGlite.

Los tres frontends y la API conservan puertos separados. Los cambios de esquema se aplican al arrancar; se añade `002_ecosystem.sql` sin eliminar los datos existentes.

## 2. SEO local implementado

Las páginas locales se generan como HTML completo en el backend. Vite y su servidor de preview reenvían esas rutas a la API; no dependen de ejecutar React para que aparezcan el título y el contenido. Las pantallas de cuenta siguen en el router privado del prototipo.

Cada página local incluye título, descripción, canonical, Open Graph, breadcrumbs y JSON-LD. Las URLs inexistentes o combinaciones sin oferta devuelven 404. Los slugs incorrectos de fichas existentes redirigen a su URL canónica. El directorio limita la oferta a perfiles publicados con región Georgia y país Estados Unidos.

Administración puede crear/editar páginas por localidad y especialidad con texto propio, mantenerlas en borrador o publicarlas y autorizar su indexación. No se generan masivamente páginas vacías por ZIP code. Actualmente las localidades configuradas son Atlanta, Lawrenceville, Duluth, Suwanee y Roswell; no se afirma cobertura en todo Georgia.

La indexación requiere simultáneamente:

1. `PUBLIC_SITE_URL` con el dominio HTTPS real.
2. `SEO_INDEXING_ENABLED=true`.
3. Publicación y autorización editorial de las páginas.
4. Oferta real publicada, distinguida de los identificadores de muestra.

Sin estas condiciones se usa `noindex`; el sitemap no ofrece URLs de muestra. Las fichas ficticias nunca se incluyen como negocios reales en el sitemap. Las páginas privadas de los portales tienen `noindex,nofollow`.

Los datos estructurados `HomeAndConstructionBusiness` solo se producen para fichas reales indexables con contacto y dirección pública autorizados. No se inventa una dirección para negocios de área de servicio ni se usan sus estrellas de demostración para `aggregateRating`. El resto de páginas utiliza WebPage/BreadcrumbList. Añadir marcado no garantiza resultados enriquecidos, posición en Google ni aparición en Maps.

La información que publica el administrador en HOME CONNECT debe provenir del negocio y contar con autorización. La conexión privada de Google no alimenta automáticamente el directorio público ni su JSON-LD.

### Publicación del sitio

```dotenv
PUBLIC_SITE_URL=https://tu-dominio-real
SEO_INDEXING_ENABLED=true
GOOGLE_SITE_VERIFICATION=valor-publico-de-search-console
```

Son ejemplos: no hay dominio real configurado. Compilar de nuevo después de modificar estas variables para actualizar el HTML inicial y los portales. La API debe arrancar con los mismos valores.

En producción, servir los assets compilados y la web; enrutar `/georgia`, `/georgia/*`, `/contractors/*`, `/robots.txt` y `/sitemap.xml` hacia la API. Si se despliega únicamente `dist/web` en un hosting estático sin ese enrutamiento, las páginas dinámicas SEO no estarán disponibles. Configurar también el proxy de `/api/` o los orígenes HTTPS de API/portales y CORS. El servidor de preview permite comprobarlo localmente con la API activa; no sustituye hosting de producción.

Después de publicar: comprobar el HTML sin JavaScript, las respuestas 200/404, canonical, sitemap y ausencia de información privada; verificar el dominio en Search Console y enviar el sitemap. La web inicial continúa siendo React; el renderizado HTML completo implementado aquí corresponde a las rutas locales y fichas SEO.

## 3. Registro por email y recuperación

- Registro con email normalizado y contraseña; la cuenta nueva comienza sin confirmar.
- Enlace de confirmación de un solo uso, válido por 24 horas.
- Recuperación mediante enlace de un solo uso, válido por 30 minutos.
- Los tokens se guardan como hashes SHA-256; las contraseñas continúan derivadas con scrypt.
- Reenviar sustituye el token anterior de ese propósito.
- Restablecer contraseña revoca las sesiones de esa cuenta.
- Publicar solicitudes, enviar propuestas/mensajes y conectar Google exige email confirmado. La cuenta puede preparar su perfil mientras tanto.
- Las peticiones de acceso/correo tienen límites de intentos. En producción no se aceptan espacios de datos arbitrarios ni login con las cuentas demo.

### Sin proveedor de correo

En desarrollo, la pantalla de confirmación permite abrir un buzón local autenticado con los mensajes de esa cuenta. Los enlaces funcionan, pero **no se entrega ningún correo real**. El buzón no está disponible en el backend con `NODE_ENV=production`; su botón tampoco aparece en el build de producción.

### Con proveedor SMTP

```dotenv
SMTP_HOST=host-de-tu-proveedor
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario-de-tu-proveedor
SMTP_PASSWORD=secreto-configurado-en-el-servidor
SMTP_FROM=HOME CONNECT <correo@tu-dominio-real>
```

Usar los valores y la modalidad TLS del proveedor: `SMTP_SECURE=true` para TLS directo cuando corresponda. Configurar y validar el remitente, SPF/DKIM/DMARC según las instrucciones de ese proveedor. El transporte tiene timeout; los intentos se registran como enviados o fallidos y el usuario puede solicitar otro enlace. No hay todavía un worker externo de reintentos ni procesamiento de rebotes. El éxito de una llamada SMTP no prueba recepción en la bandeja final.

Las plantillas usan `PUBLIC_SITE_URL` o el origen del portal correspondiente para construir enlaces. En producción, configurar todos los orígenes con HTTPS antes de enviar emails.

## 4. Google Business Profile: alcance real

La integración permite que el contratista autorice su cuenta, consulte cuentas y ubicaciones que puede administrar, sincronice información, seleccione una ficha vinculada y desconecte la integración. La vinculación es con su cuenta de HOME CONNECT, no con un profesional arbitrario recibido del navegador.

El flujo usa OAuth 2.0 con state, cookie HttpOnly/SameSite y PKCE; el state es de un solo uso y vence en diez minutos. Los access/refresh tokens permanecen cifrados con AES-256-GCM en el servidor. No se devuelven al frontend. Se renueva el access token cuando hace falta. Desconectar intenta revocar la autorización en Google y elimina las credenciales y el contenido local de la conexión.

El contenido de las fichas se muestra solo al titular dentro de la integración. Su caché caduca a las 24 horas y se purga al arrancar, periódicamente y al consultar la conexión. No se utiliza para generar leads, copiar reseñas al directorio ni construir páginas públicas por scraping. Las reseñas propias de HOME CONNECT permanecen separadas de Google.

No implementa creación de fichas en Google, verificación de negocios por Google, publicación/edición de datos en Maps, respuestas automáticas a reseñas, métricas de posicionamiento ni garantía de ranking. La vinculación tampoco acredita una licencia de contratista.

### Requisitos externos pendientes

1. Proyecto de Google Cloud del operador, con acceso aprobado a Business Profile APIs.
2. APIs de Account Management y Business Information habilitadas y cuotas disponibles.
3. Pantalla de consentimiento OAuth y credenciales de aplicación web; revisión/aprobaciones que correspondan al uso de producción.
4. Redirect URI registrado exactamente igual que `GOOGLE_REDIRECT_URI`.
5. El dueño o representante del negocio inicia sesión y autoriza acceso a su ficha.

```dotenv
GOOGLE_CLIENT_ID=identificador-del-cliente
GOOGLE_CLIENT_SECRET=secreto-configurado-en-el-servidor
GOOGLE_REDIRECT_URI=https://tu-api-real/api/google/callback
GOOGLE_API_ACCESS_APPROVED=true
GOOGLE_TOKEN_ENCRYPTION_KEY=clave-base64-de-32-bytes
```

Generar la clave localmente y conservarla como secreto del servidor:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

No usar variables `VITE_*` para secretos. No cambiar la clave sin una estrategia de rotación: las credenciales existentes dejarían de poder descifrarse. La variable de aprobación es una declaración de configuración del operador, no obtiene acceso ni sustituye la aprobación de Google. Sin configuración completa el botón queda deshabilitado con un estado explícito.

Google excluye de elegibilidad para una ficha a empresas de generación de leads y negocios exclusivamente online. Por eso no se presupone que HOME CONNECT, como marketplace, pueda tener una ficha propia ni crear una por ciudad. Esta implementación conecta las fichas elegibles de los contratistas autorizantes. Una eventual ficha del operador requiere evaluar su actividad real y las políticas vigentes.

## 5. Otros recorridos incorporados

- Filtrado de oportunidades por servicio y coincidencia con la cobertura declarada. No es cálculo de distancia ni validación postal oficial.
- Confirmación de entrega del proyecto por el consumidor después de completar sus hitos.
- Una reseña por proyecto, con email confirmado y entrega confirmada. Comienza pendiente, administración publica o rechaza con motivo. El negocio reseñado puede responder desde Contratistas → Reseñas.
- Reseñas públicas separadas de los valores de muestra y sin identificadores privados del consumidor.
- Incidencias privadas del usuario; administración puede asignarse y responder con estado abierto/en revisión/resuelto.
- Bootstrap, comandos y SSE entregan una proyección de datos por cuenta; los visitantes no reciben solicitudes, propuestas, proyectos o conversaciones privadas. El canal autenticado usa autorizaciones de corta duración y un solo uso.

Se añadieron carga y descarga de documentos privados y fotografías de solicitudes, con acceso por propietario, administración o profesional elegible según el recurso. Las imágenes de portafolio requieren consentimiento expreso y solo se sirven públicamente cuando la ficha está publicada. Se aceptan JPEG, PNG, WebP y PDF con comprobación de firma, máximo 5 MB por archivo y 30 archivos por cuenta para el piloto; no se aceptan SVG ni HTML. Los archivos se almacenan fuera de `public/`, en `UPLOAD_DIR` o junto al directorio de estado, y los metadatos en `ir_attachment`. El listado muestra el identificador para referenciarlo en una credencial. No equivale a análisis antivirus ni verificación del documento. La carga añade imágenes al portafolio; borrado, ordenación y edición integral de galerías quedan pendientes.

No se ha completado con esta entrega todo el alcance de producción: siguen pendientes validaciones oficiales de licencias y seguro, permisos administrativos más finos, análisis antivirus, métricas comerciales, notificaciones operativas más allá de los emails de cuenta, operación de soporte y puesta en producción. Tampoco se agregan pagos, contratos firmados, garantías u Odoo real. El proyecto requiere estas etapas y los proveedores externos antes de declararse listo para lanzamiento público.

## 6. Pruebas y fuentes

Las pruebas cubren rutas SEO y códigos HTTP, JSON-LD sin reputación inventada, configuración administrativa, email, recuperación, aislamiento API/SSE, soporte, reseñas y OAuth con respuestas simuladas de Google. Ese test de OAuth no equivale a una autorización real ni valida cuotas o aprobación del proyecto externo.

- [Acceso a Business Profile APIs](https://developers.google.com/my-business/content/prereqs).
- [OAuth de Business Profile](https://developers.google.com/my-business/content/implement-oauth).
- [Listado de cuentas](https://developers.google.com/my-business/reference/accountmanagement/rest/v1/accounts/list).
- [Listado de ubicaciones](https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list).
- [Políticas y almacenamiento de contenido](https://developers.google.com/my-business/content/policies).
- [Elegibilidad de negocios](https://support.google.com/business/answer/13763036?hl=en).
- [Datos estructurados de negocios locales](https://developers.google.com/search/docs/appearance/structured-data/local-business).
