# Ecosistema frontend · segunda iteración

Registro histórico de la segunda iteración. El estado vigente del mapa y el catálogo está en [mapa-y-catalogo.md](mapa-y-catalogo.md); las cuentas, SEO y Google se documentan en [seo-email-google.md](seo-email-google.md). Los límites y cifras de esta iteración histórica no son el inventario actual de HOME CONNECT.

## Incluido

- Catálogo base de 32 categorías, sin duplicar las variantes 33–37 de las láminas. Identificadores por especialidad, independientes del orden visual.
- 64 agrupaciones iniciales (instalación/proyectos y reparación/cuidado), con una selección curada de 96 servicios. Las agrupaciones son una decisión de esta iteración, no una transcripción exhaustiva de las láminas.
- Doce empresas ficticias. Dos de remodelación y dos de pintura permiten comparar propuestas; cuatro contratistas adicionales representan el piloto en Georgia.
- Búsqueda por texto, categoría, agrupación, ciudad de cobertura, país, calificación y credenciales verificadas en demo. Los filtros se conservan en la URL.
- Fichas públicas con código FUR, servicios, portafolio, sede, cobertura y estado individual de credenciales.
- Solicitudes generales o dirigidas a un profesional; formulario con título, alcance, servicio, ubicación, presupuesto opcional en USD y fecha.
- Propuestas con importe, plazo y condiciones. Una propuesta por profesional y solicitud; se aceptan solo solicitudes abiertas de su especialidad.
- Comparación de propuestas. Aceptar una crea un solo proyecto, adjudica la solicitud y cierra las propuestas competidoras.
- Proyectos con tres hitos y progreso calculado; únicamente el profesional seleccionado puede actualizar los hitos de sus proyectos en la simulación. Completar todos cierra el proyecto.
- Favoritos y conversaciones locales entre propietario y profesional, sin respuestas automáticas inventadas ni comunicaciones externas.
- FUR editable: nombre comercial, presentación, sede y cobertura. Envío de referencias documentales ficticias a revisión.
- Revisión por aliado/administrador: aprobar en demo o solicitar cambios con observación obligatoria. El estado se refleja en la ficha pública.
- Administración de publicación: una ficha en borrador desaparece del directorio público y de su URL pública.
- Proveedor: alta y edición de materiales, existencias y precio de muestra.
- Empresa: equipo ficticio y alta de integrantes sin enviar invitaciones.
- Mapa interactivo con Leaflet, filtros, marcadores, fichas, países y condados de Georgia locales. Calles opcionales de OpenStreetMap. Tres guías de uso.
- Historial local de acciones y restablecimiento de la demostración con confirmación explícita.

## Espacios por actor

| Actor                | Secciones disponibles                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Visitante            | Resumen y cobertura; acceso al catálogo público y las guías.                                                                                    |
| Propietario          | Resumen, solicitudes, proyectos, guardados y mensajes.                                                                                          |
| Profesional          | Resumen, oportunidades, propuestas, proyectos, ficha FUR y mensajes. Selector de perfil de prueba para recorrer ambos lados de una comparación. |
| Proveedor            | Resumen, inventario y cobertura.                                                                                                                |
| Empresa              | Resumen, equipo y cobertura.                                                                                                                    |
| Institución / aliado | Resumen, revisión de credenciales y cobertura.                                                                                                  |
| Administración       | Resumen, verificaciones, publicación de perfiles, catálogo, actividad y configuración de la demo.                                               |

El dashboard del consumidor permanece en la web. Contratistas y administración tienen aplicaciones separadas en `apps/contractor` y `apps/admin`; sus accesos abren otra entrada frontend. No existe un selector de rol entre esas tres aplicaciones. Esto no representa autenticación ni autorización de servidor: los controles del prototipo no constituyen una barrera de seguridad. Detalles en `aplicaciones-separadas.md`.

## URLs

Se utiliza navegación por hash para funcionar en un hosting estático sin reglas de reescritura. Ejemplos:

```text
/#/catalog
/#/catalog?category=painting
/#/services/painting-1
/#/professionals?category=remodeling&city=Doral
/#/professionals/ruiz
/#/quote?service=remodeling-1
/#/workspace/owner/requests/:id
/#/workspace/contractor/projects/:id
/#/workspace/contractor/profile
/#/workspace/supplier/inventory
/#/workspace/business/team
/#/workspace/ally/verifications
/#/workspace/admin/profiles
/#/workspace/admin/activity
/#/workspace/admin/settings
/#/coverage
/#/resources
```

Las URLs permiten volver atrás, recargar y compartir la estructura de la pantalla. Los registros creados localmente solo existen en el navegador donde se guardaron; compartir una URL de un proyecto no transfiere sus datos a otra persona.

## Datos y límites

- `src/data/catalog.ts`: categorías, agrupaciones y servicios canónicos.
- `src/data/seed.ts`: muestra ficticia inicial.
- `src/domain/types.ts`: contratos TypeScript de los dominios.
- `src/domain/schema.ts`: validación del almacenamiento con Zod.
- `src/domain/queries.ts`: búsqueda compartida sobre el adaptador local.
- `src/domain/store.tsx`: transiciones de negocio y persistencia local.
- `src/lib/navigation.ts`: lectura y actualización de rutas.
- `src/components/ecosystem/`: catálogo, perfiles, formularios, flujos, operaciones y espacios por rol.

El servicio local persiste el estado y las cuentas en PostgreSQL embebido (PGlite), en `.local/demo-state.pgdata` y sincroniza los tres orígenes mediante HTTP y SSE. `localStorage` mantiene una caché con la clave `servinexo.ecosystem.v1`. Las cuentas y contraseñas derivadas con scrypt se guardan por separado; cada aplicación utiliza su sesión de acceso. Consulta la arquitectura vigente en [aplicaciones-separadas.md](aplicaciones-separadas.md).

Las credenciales usan referencias ficticias; no se suben ni verifican documentos reales. Las fotografías y las fuentes se sirven localmente. El historial de actividad también es una herramienta de demostración, no un registro de auditoría inmutable.

## Integraciones y siguientes etapas

Existe un servicio local para registro, login, sesiones y sincronización de la demostración. No están implementados base de datos remota, autorización completa de lecturas para producción, pagos, Odoo, correos, recuperación de contraseña o carga documental. El mapa funciona con posiciones aproximadas y no verifica cobertura real. Tampoco hay aprovisionamiento multiempresa, compras/logística, facturación o suscripciones operativas.

## Actualización de paleta, accesos y seeders

La paleta vigente usa rojo `#e00707`, blanco y grises, por indicación del usuario. Los tres entornos principales tienen accesos directos desde todas las páginas y tarjetas propias en la portada. Las páginas privadas utilizan un menú lateral en escritorio.

El escenario inicial ya contiene 6 solicitudes, 6 propuestas, 2 proyectos, 5 mensajes y 12 contratistas, además de favoritos, materiales, equipo y actividad. `src/data/seed-scenarios.json` contiene los escenarios; `src/data/demo-accounts.ts` define tres cuentas ficticias. El consumidor de muestra es Carolina Mendoza; la administración corresponde a Lucía Ramos; el contratista inicial es Construcciones Ruiz.

`npm run seed:export` valida los datos y genera `public/demo-seed.json`. La sección Administración → Datos de prueba permite descargarlo y restaurar la muestra. El adaptador actualiza las instalaciones anteriores incorporando registros de muestra faltantes sin sobrescribir los cambios previos. Este es un seeder frontend; no crea registros en una base de datos remota.

La integración siguiente requiere acordar los contratos HTTP, la matriz de permisos, las reglas de publicación, los estados definitivos de proyectos y credenciales, el modelo de organizaciones y la responsabilidad de cada sistema sobre sus datos. Las rutas API del documento de alcance siguen siendo propuestas.

La navegación con hash sirve al prototipo; para SEO de páginas indexables debe abordarse una fase de rutas públicas y renderizado adecuado. `SEO_GALLERY` es la referencia del proyecto, no una implementación de SEO.

## Verificación

```sh
npm run build
npm run test:e2e
```

La suite de Playwright cubre el catálogo y los filtros compartibles, el recorrido solicitud/propuestas/proyecto, revisión de credenciales, favoritos, conversaciones entre roles, publicación, inventario, equipo, restablecimiento, navegación móvil y recuperación de almacenamiento inválido. La configuración utiliza Chrome instalado.
