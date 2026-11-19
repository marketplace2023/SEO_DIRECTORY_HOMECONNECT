# Nombres de tablas

La referencia de nombres nativos es Odoo 18. Se conservan los nombres originales cuando existe una correspondencia de dominio; no se usa el prefijo de la marca.

| Entidad del prototipo | Tabla SQL | Procedencia del nombre |
|---|---|---|
| Cuentas | `res_users` | Odoo: `res.users` |
| Profesionales y contactos del equipo | `res_partner` | Odoo: `res.partner` |
| Categorías y subcategorías | `product_category` | Odoo: `product.category` |
| Servicios | `product_template` | Odoo: `product.template` |
| Materiales | `product_product` | Odoo: `product.product` |
| Cotizaciones / propuestas | `sale_order` | Odoo: `sale.order` |
| Proyectos | `project_project` | Odoo: `project.project` |
| Hitos | `project_milestone` | Odoo: `project.milestone` |
| Mensajes | `mail_message` | Odoo: `mail.message` |
| Solicitudes de servicio | `service_request` | Propio |
| Credenciales del profesional | `contractor_credential` | Propio |
| Portafolio del profesional | `contractor_portfolio` | Propio |
| Profesionales favoritos | `contractor_favorite` | Propio |
| Auditoría de negocio | `audit_event` | Propio |
| Espacios de datos del prototipo | `prototype_dataset` | Técnico propio |
| Versiones de migración | `schema_migration` | Técnico propio |

La migración `002_ecosystem.sql` añade `ir_config_parameter`, `mail_mail`, `rating_rating` e `ir_attachment` usando nombres de Odoo, y `auth_token`, `google_business_connection`, `google_oauth_state` y `support_ticket` como tablas propias. Se mantiene el alcance de compatibilidad exclusivamente de nombres.

“Propio” significa que no se adopta una tabla equivalente de los módulos base, catálogo, ventas, proyectos y correo revisados en Odoo 18; otros addons pueden ofrecer modelos similares. Una solicitud del consumidor no se considera automáticamente un lead de CRM, ni la auditoría de negocio un log técnico.

## Implementación

- Registro central: `server/database/tables.ts`.
- DDL PostgreSQL: `server/database/migrations/001_initial.sql`.
- Adaptador de persistencia: `server/database/database.ts`.
- El servidor usa PostgreSQL embebido con PGlite, solo en backend, en `.local/demo-state.pgdata` por defecto.
- La primera ejecución importa los JSON anteriores y las cuentas, sin borrar los originales. El registro de migración evita volver a importar sobre datos modificados.
- Cada operación de persistencia utiliza una transacción. Credenciales, portafolios e hitos se guardan en tablas separadas.

```sh
npm run db:migrate
npm run db:inspect
```

Con la API activa, los comandos consultan ese proceso; sin API, abren la base local. No se deben abrir dos procesos contra el mismo directorio PGlite. `DATABASE_DIR` permite elegir otro directorio; las pruebas usan el derivado de su archivo de estado, separado del de desarrollo.

El alcance de compatibilidad con Odoo es **exclusivamente el nombre de tabla**. Los registros del prototipo se conservan en documentos JSONB dentro de tablas SQL; los campos, identificadores y procesos todavía no reproducen el esquema ORM de Odoo. Esta migración se ejecuta únicamente en la base del prototipo, nunca encima de una base Odoo existente. No se ha instalado Odoo ni conectado una instancia ERP.

Referencias: [ORM de Odoo 18](https://github.com/odoo/odoo/blob/18.0/odoo/models.py), [ventas](https://github.com/odoo/odoo/blob/18.0/addons/sale/models/sale_order.py), [hitos](https://github.com/odoo/odoo/blob/18.0/addons/project/models/project_milestone.py), [mensajes](https://github.com/odoo/odoo/blob/18.0/addons/mail/models/mail_message.py), [persistencia PGlite](https://pglite.dev/docs/).
