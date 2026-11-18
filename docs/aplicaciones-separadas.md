# Aplicaciones, módulos y acceso

El repositorio contiene tres proyectos frontend con procesos independientes. Compartir controles visuales y contratos evita duplicaciones; los módulos administrativos y profesionales ya no se resuelven desde un `Workspace` común.

| Aplicación | Fuente | Origen de desarrollo | Build |
|---|---|---|---|
| Web y consumidor | `src/App.tsx`, `src/modules`, `src/components` | http://127.0.0.1:5175 | `dist/web` |
| Contratistas | `apps/contractor/src` | http://127.0.0.1:5180 | `apps/contractor/dist` |
| Administración | `apps/admin/src` | http://127.0.0.1:5181 | `apps/admin/dist` |

## Estructura de cada portal

- `app/app.tsx`: proveedores, autenticación y arranque.
- `app/routes.tsx`: rutas permitidas y carga diferida de módulos.
- `layouts/`: composición del panel y navegación propia.
- `modules/`: implementación de cada área funcional.
- `main.tsx`, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`: entrada, comandos y compilación del proyecto.

Contratistas contiene auth, overview, opportunities, proposals, projects, profile, messages, coverage y account. Administración contiene auth, overview, verifications, profiles, catalog, activity, settings, seed, inventory, team y coverage.

La ficha profesional y el formulario de evidencias viven en contratistas. Revisión de credenciales, publicación, inventario, equipo, actividad y configuración viven en administración. Los widgets que comparten consumidor y profesional, el mapa, los controles, contratos y el adaptador de datos siguen en `src/` de la raíz.

## Registro y sesiones

1. El visitante explora la web sin cuenta.
2. Para publicar o entrar a su dashboard, inicia sesión o registra una cuenta de consumidor en 5175.
3. El profesional entra a 5180. Puede registrarse con nombre, correo, contraseña, especialidad y ciudad.
4. El servicio crea la cuenta y una ficha profesional propia en borrador. Completarla no la publica automáticamente.
5. Administración entra a 5181 con una cuenta provisionada; revisa evidencias y controla publicación.
6. Cerrar sesión revoca el token. Acceder directamente a una ruta privada vuelve al login, conservando el destino solicitado.

El registro público nunca crea administradores. Las sesiones se validan contra el servicio local y duran 24 horas. Cambiar un hash de rol no concede acceso al otro portal. La cuenta de demostración profesional puede seleccionar fichas de muestra; las cuentas nuevas solo gestionan la suya.

## Servicio de prototipo

`npm run dev` inicia los tres Vite y el servicio local en 5190. HTTP y SSE sincronizan los cambios entre orígenes. El servidor persiste datos y cuentas en PostgreSQL embebido (PGlite), dentro de `.local/demo-state.pgdata`; cada navegador conserva su caché y token. Los comandos comprueban sesión y rol. Las vistas de consumidor filtran datos por su identificador.

Rutas del servicio:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
POST /api/demo/bootstrap
POST /api/demo/commands
GET  /api/demo/events
```

El alcance sigue siendo de demostración local: las lecturas del estado completo aún necesitan autorización de servidor antes de usar datos reales. No hay recuperación de contraseña por correo, pagos ni conexión con Odoo. Las contraseñas de cuentas se derivan con scrypt; los tokens se mantienen en memoria de servidor y se revocan al reiniciarlo.

## Ejecución y publicación

```sh
npm ci
npm run dev
npm run build
```

Cada salida de build se sirve como un sitio separado. Configura sus direcciones y la del servicio antes de compilar usando las variables de `.env.example`. Cada portal copia imágenes, mapas, favicon y seed a su propio build. Las URLs antiguas `/contractor/` y `/admin/` de la web redirigen a los servidores correspondientes durante desarrollo.

La nomenclatura SQL vigente y su alcance se detallan en [nombres-tablas.md](nombres-tablas.md).
