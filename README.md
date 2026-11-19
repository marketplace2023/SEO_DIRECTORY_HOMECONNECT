# HOME CONNECT · Prototipo

Tres aplicaciones React + TypeScript en un monorepo, con servidores, rutas, módulos y compilaciones propios. Identidad inspirada en Yelp: rojo `#e00707`, blanco, grises, Open Sans y Poppins alojadas localmente.

El prototipo dispone de infraestructura propia en AWS. Las URLs de los tres portales, publicación, accesos privados y respaldos se documentan en [despliegue AWS](docs/despliegue-aws.md).

El mercado inicial confirmado es **Georgia, Estados Unidos**. El [alcance realista para Georgia](docs/alcance-realista-georgia.md) contrasta Yelp y BuildZoom, documenta lo que existe, los bloqueantes del lanzamiento y las etapas propuestas. Las referencias históricas de SEO_GALLERY no sustituyen ese diagnóstico del estado actual.

La implementación de **SEO local, confirmación de email y Google Business Profile** se describe en [seo-email-google.md](docs/seo-email-google.md). Incluye páginas HTML `/georgia`, gestión SEO en administración, buzón local de pruebas sin SMTP y conexión OAuth pendiente de credenciales/aprobación externas. No hay dominio ni proveedor de correo real configurados.

El [mapa y catálogo ampliado](docs/mapa-y-catalogo.md) incorpora 48 categorías, 96 subcategorías con sus fotografías de `public/CATEGORY_PICS`, definiciones y límites, 240 servicios y búsqueda compartida entre lista y mapa. El administrador consulta la jerarquía con sus imágenes desde Catálogo. Los contratistas pueden configurar una ubicación pública desde su ficha.

La [composición visual y procedencia de componentes](docs/componentes-visuales.md) identifica dónde se usan shadcn/ui, Magic UI, Aceternity UI y Swiper. La portada incorpora una galería interactiva y filtros por familias de oficios; los paneles comparten controles, tarjetas, navegación y estados shadcn.

| Aplicación | Proyecto | Dirección |
|---|---|---|
| Marketplace y cuenta del consumidor | Raíz | http://127.0.0.1:5175 |
| Portal de contratistas | `apps/contractor` | http://127.0.0.1:5180 |
| Panel de administración | `apps/admin` | http://127.0.0.1:5181 |
| Servicio local de datos y cuentas | `scripts/demo-api.ts`, `server/auth` | http://127.0.0.1:5190 |

## Arranque

Node.js 20.19+ o 22.12+ y npm:

```sh
npm ci
npm run dev
```

El comando inicia cuatro procesos y comprueba los puertos antes del arranque. Si ya existe una instancia de desarrollo de este proyecto, muestra sus direcciones y termina sin duplicar servidores. Si otro proceso ocupa un puerto, informa del conflicto antes de abrir la base de datos. `Ctrl+C` en la terminal que inició el entorno cierra sus procesos. Para iniciar componentes individuales: `npm run dev:web`, `npm run dev:contractor`, `npm run dev:admin` y `npm run dev:api`.

Si una instalación de dependencias deja una caché Vite antigua, detén los servidores, ejecuta `npm run dev:refresh` y recarga el navegador. Las pruebas usan otros puertos y cachés.

## Acceso y registro

La web permite explorar servicios, perfiles y mapa sin sesión. Publicar solicitudes requiere una cuenta de consumidor y email confirmado. El registro, login y dashboard permanecen en la web principal. Se incluye recuperación de contraseña; en desarrollo sin SMTP se utiliza un buzón de pruebas autenticado.

Contratistas tiene login y registro propios. El registro crea una ficha FUR en borrador con la especialidad y ciudad elegidas. Cada cuenta nueva está vinculada a su ficha. Administración revisa credenciales y controla su publicación. Solo la cuenta de muestra permite seleccionar otros perfiles para probar escenarios.

Administración tiene login y rutas protegidas; no admite registro público. Las cuentas administrativas se provisionan en el servicio local. Las sesiones duran 24 horas y se invalidan al cerrar sesión o reiniciar el servicio. Las cuentas registradas sobreviven al reinicio.

| Cuenta | Correo | Contraseña de muestra |
|---|---|---|
| Consumidor | `carolina@example.test` | `Servinexo2026!` |
| Contratista | `ruiz@example.test` | `Servinexo2026!` |
| Administrador | `admin@example.test` | `Servinexo2026!` |

El formulario ofrece rellenar estos datos para probar el acceso. No inicia una sesión automáticamente.

## Módulos

- **Web:** portada, catálogo, directorio, ficha profesional, mapa, guías, login, registro y dashboard de consumidor con solicitudes, propuestas recibidas, proyectos, favoritos y mensajes.
- **Contratistas:** resumen, oportunidades, propuestas, proyectos e hitos, ficha FUR y credenciales, mensajes, cobertura y cuenta. Su implementación está en `apps/contractor/src/modules`.
- **Administración:** resumen, verificaciones, publicación de perfiles, consulta del catálogo, actividad, configuración, datos de prueba, inventario, equipo y cobertura. Su implementación está en `apps/admin/src/modules`.

Los dos portales tienen sidebar fija en escritorio y menú desplegable en móvil. Los componentes visuales, contratos y operaciones comunes se reutilizan; cada aplicación controla sus rutas, layout, acceso y módulos.

Más detalle en [aplicaciones separadas](docs/aplicaciones-separadas.md), [proyecto contratistas](apps/contractor/README.md) y [proyecto administración](apps/admin/README.md). Las referencias funcionales están en [alcance SEO_GALLERY](docs/alcance-seo-gallery.md).

## Datos y cuentas locales

La muestra contiene 12 contratistas, 48 categorías, 96 subcategorías, 240 servicios, 6 solicitudes, 6 propuestas, 2 proyectos y 5 mensajes. `npm run seed:export` valida y exporta `public/demo-seed.json`.

El servicio comparte cambios entre los tres orígenes mediante HTTP y eventos SSE. Persiste datos y cuentas en PostgreSQL embebido (PGlite), en `.local/demo-state.pgdata`. Importa una sola vez los JSON anteriores sin borrarlos. Las contraseñas siguen derivadas mediante scrypt. El navegador conserva una caché de datos y un token propio de su aplicación. Las vistas del consumidor filtran sus solicitudes, proyectos, mensajes y favoritos por cuenta.

Los comandos requieren una sesión y validan el rol. Bootstrap y SSE proyectan los datos por cuenta; los visitantes no reciben solicitudes ni conversaciones privadas. Los documentos subidos tienen control de acceso y el portafolio requiere autorización de publicación. El correo real necesita configurar SMTP. El servicio sigue siendo infraestructura de piloto: requiere hosting HTTPS, copias incluyendo archivos, monitoreo y operación antes de recibir datos reales. Pagos y Odoo siguen pendientes.

El mapa usa React Leaflet, cartografía local de países y los 159 condados de Georgia. La capa opcional de calles de OpenStreetMap requiere internet. Las coordenadas de profesionales son aproximadas. Fuentes: `public/maps/README.md` y `public/images/sources.json`.

## Validación y compilación

```sh
npm run typecheck
npm run test:e2e
npm run build
npm run build:web
npm run build:contractor
npm run build:admin
```

Los resultados se generan por separado en `dist/web`, `apps/contractor/dist` y `apps/admin/dist`. Cada portal incluye sus recursos públicos. Para otras direcciones, configura los orígenes de `config/origins.ts` antes de iniciar o compilar; para AWS, utiliza el procedimiento de `docs/despliegue-aws.md`. `npm run preview` sirve solo el build de la web.

Playwright comprueba navegación, mapa, recorridos de solicitudes y proyectos, sincronización entre aplicaciones, registro, login, roles, logout y móvil. Usa Chrome instalado y puertos 5194–5197.

Nombres SQL: se reutilizan los originales de Odoo cuando existe correspondencia y se definen nombres propios sin prefijo de marca para los demás. Consulta [nombres y migración](docs/nombres-tablas.md). Comandos: `npm run db:migrate` y `npm run db:inspect`. La coincidencia es de nombres, no de columnas ni de compatibilidad ORM.

Stack: React, Vite, Tailwind CSS 4, shadcn/ui, Magic UI, Aceternity UI, Swiper, React Icons y Motion. `reference/index.html` y `public/SEO_GALLERY` son referencias, no una copia literal de la interfaz.
