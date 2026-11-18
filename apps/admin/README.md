# HOME CONNECT · Administración

Proyecto React con servidor propio en `http://127.0.0.1:5181`. Requiere login administrativo. No tiene registro público de administradores.

```text
src/
  app/app.tsx                 Proveedores, acceso y arranque
  app/routes.tsx              Rutas y carga de módulos
  layouts/admin-layout.tsx
  modules/
    auth/                    Login
    overview/                Indicadores y pendientes
    verifications/           Revisión de credenciales
    profiles/                Publicación de fichas
    catalog/                 Consulta de categorías y servicios
    activity/                Historial de cambios
    settings/                Reinicio de la muestra
    seed/                    Cuentas y exportación de datos
    inventory/               Materiales y existencias
    team/                    Equipo de muestra
    coverage/                Mapa y filtros
```

Desde la raíz del repositorio:

```sh
npm ci
npm run dev:api
npm run dev:admin
npm run build:admin
```

El servicio local de datos y cuentas escucha en 5190. El build propio queda en `apps/admin/dist`, con sus imágenes y mapas. Los módulos y rutas administrativos pertenecen a este proyecto; los controles, contratos y adaptador de datos se comparten con los otros frontends.

Cuenta provisionada de muestra: `admin@example.test` / `Servinexo2026!`. Inventario, equipo y revisión por aliado son áreas de operación de esta consola.
