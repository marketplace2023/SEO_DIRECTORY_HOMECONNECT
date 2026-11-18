# HOME CONNECT · Contratistas

Proyecto React con servidor propio en `http://127.0.0.1:5180`. La ruta inicial presenta el login; el registro crea una cuenta y una ficha profesional en borrador.

```text
src/
  app/app.tsx                 Proveedores, acceso y arranque
  app/routes.tsx              Rutas y carga de módulos
  layouts/contractor-layout.tsx
  modules/
    auth/                    Login y registro
    overview/                Indicadores y próximos pasos
    opportunities/           Solicitudes y detalle
    proposals/               Propuestas enviadas
    projects/                Proyectos e hitos
    profile/                 Formulario FUR y credenciales
    messages/                Conversaciones
    coverage/                Mapa y filtros
    account/                 Cuenta y cierre de sesión
```

Desde la raíz del repositorio:

```sh
npm ci
npm run dev:api
npm run dev:contractor
npm run build:contractor
```

El servicio local de datos y cuentas escucha en 5190. El build propio queda en `apps/contractor/dist`, con sus imágenes y mapas. El layout visual, controles, contratos y adaptador de datos se comparten desde `src/` de la raíz; los módulos y rutas del contratista pertenecen a este proyecto.

Cuenta de muestra: `ruiz@example.test` / `Servinexo2026!`. Solo esta cuenta de demostración puede seleccionar otros perfiles de muestra. Una cuenta registrada gestiona su propia ficha.
