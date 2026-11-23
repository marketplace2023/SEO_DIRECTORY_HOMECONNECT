# Centro SEO local

## Versión vigente · 20 de noviembre de 2026

La [especificación de contratistas](../public/especificacion_modulo_seo_local_contratistas.md) sustituye la política de edición descrita en la entrega inicial de abajo.

- **Administrador:** selecciona cualquier contratista, corrige su ficha maestra, gestiona SEO, catálogo, exportaciones e invita usuarios SEO.
- **Usuario SEO:** entra por el portal de administración; solo gestiona contratistas asignados. La administración concede por separado gestión del catálogo y exportación. Revocar una asignación se aplica también a sesiones existentes.
- **Contratista:** consulta únicamente su negocio. El backend rechaza todos los POST del módulo, además de omitir controles de escritura en la interfaz. La exportación está deshabilitada por defecto y se autoriza por perfil.
- **NAP:** se consulta desde `res_partner`. Dirección, teléfono, código postal y condición de negocio por área de servicio forman parte de la ficha maestra. Solo administración puede corregirlos desde el centro SEO. La referencia independiente anterior se conserva como evidencia privada; no se copia silenciosamente a los datos maestros.
- **Keywords:** registro individual o por líneas, previsualización, deduplicación por espacios y mayúsculas, máximo 25 activas por perfil, edición, desactivación y eliminación cuando no existen referencias. Un lote que excede el límite no se guarda parcialmente. Cambiar una keyword no altera la consulta de campañas anteriores.
- **Contenido:** posts, reseñas y noticias; estados borrador, pendiente, publicado, archivado y rechazado. Keywords asociadas, imagen por URL HTTPS, fuente, destino, autor y fechas. Publicado exige URL, fecha y evidencia; es confirmación declarada por el equipo SEO, no validación automática externa. Una reseña requiere origen y evidencia; su testimonio original queda protegido contra modificaciones. El contratista ve únicamente contenido publicado.
- **Directorios:** catálogo global y asociación única por negocio/directorio. Se conservan URL específica, estados, notas, evidencia y fecha de comprobación. Publicado exige evidencia y una URL diferente de la portada del directorio. No se crean perfiles externos automáticamente.
- **Cuadrículas:** usan una keyword activa del perfil. El historial manual/importado sigue disponible, con motores Maps y Local Pack separados. Las campañas anteriores se conservan y sus keywords se adoptan sin borrar historia; solo las primeras 25 distintas quedan activas cuando se supera el nuevo límite.
- **Informes:** filtros por fechas y keyword, consulta paginada en interfaz y exportaciones JSON/CSV autorizadas. No hay PDF. Bitácora administrativa con actor, fecha y valores anteriores/posteriores; no se expone al contratista.
- **Conservación:** las citaciones, competidores, planes anteriores y mediciones se mantienen. Las citaciones y competidores tienen una sección de consulta/gestión; los planes de la primera entrega permanecen en los datos y exportaciones administrativas.

### Operación

En **Contenido**, las acciones **Crear post**, **Registrar reseña** y **Crear noticia** aparecen antes del listado y abren un editor en un diálogo. Cada editor muestra el negocio destinatario y su botón de guardado específico. Al guardar se cierra el editor, se limpia la búsqueda y se muestra el registro en su categoría con confirmación. Los filtros Posts/Reseñas/Noticias consultan los registros guardados; no son las acciones de alta. El formulario ya no queda debajo de un listado vacío.

Panel administrador: `http://127.0.0.1:5181/#/workspace/admin/local-seo`.
Panel contratista: `http://127.0.0.1:5180/#/workspace/contractor/local-seo`.

En **Equipo SEO · usuarios y asignaciones**, administración invita por correo y asigna negocios. La cuenta recibe un enlace para establecer contraseña, sin contraseña inicial compartida. En desarrollo, **Ver invitación de desarrollo** permite abrir ese correo local; no existe buzón local en producción. SMTP sigue siendo necesario para entregar invitaciones reales.

Migración adicional: `004_seo_management.sql`, tablas propias `local_seo_keyword`, `local_seo_content`, `local_seo_directory`, `local_seo_listing`. No se renombra ni duplica el registro maestro del contratista. La persistencia SEO sigue separada de las tablas que se reemplazan al guardar el directorio.

API adicional bajo `/api/local-seo/`: GET `profiles`, `users`; POST `users`, `master`, `settings`, `keyword-preview`, `keywords`, `keyword`, `keyword-remove`, `content`, `content-remove`, `directory`, `listing`. `profile` deja de aceptar un NAP independiente. Las operaciones por negocio validan sesión, asignación y namespace; el catálogo tiene permiso propio. No hay registro público de cuentas SEO.

### Dependencias y límites pendientes

No hay proveedor de rankings contratado: los escaneos reales, workers, cuotas, reintentos y estados de error por consulta siguen pendientes. No se publica en GBP ni en directorios. No se crean reseñas, posiciones ni estadísticas ficticias. La infraestructura de escaneos se debe implementar junto al contrato del proveedor aprobado.

La configuración inicial es un perfil por contratista, máximo 25 keywords activas, centro y separación de cuadrícula, motores Maps/Local Pack y contenido publicado visible para contratistas. Los formularios nuevos de catálogo/contenido/datos maestros exigen HTTPS para enlaces externos. No se incluyen sucursales, automatizaciones, generación con IA, subida nueva de multimedia ni informes PDF. Las listas de interfaz paginan de diez en diez; los históricos de la API siguen requiriendo paginación de servidor y política de retención antes de cargas de producción extensas.

## Registro histórico · entrega inicial del 19 de noviembre

La descripción siguiente documenta la primera entrega. Sus permisos de escritura del contratista, NAP independiente y planificación básica fueron sustituidos por la versión vigente anterior.

Entrega local del 19 de noviembre de 2026. Módulo propio de HOME CONNECT inspirado en los flujos de diagnóstico de Localo y medición de BrightLocal. Referencias: [Localo](https://docs.localo.com/en/articles/11070186-what-is-localo-and-how-does-it-work), [APIs de BrightLocal](https://help.brightlocal.com/hc/en-us/articles/203649917-Does-BrightLocal-provide-APIs) y [Local Search Grid](https://www.brightlocal.com/local-seo-tools/rankings/local-search-grid/).

El usuario confirmó que todavía no tiene proveedor de rankings. Esta versión opera con datos internos y observaciones documentadas, sin conexión a cuentas de Localo/BrightLocal ni mediciones automáticas externas.

## Acceso y alcance

- Contratistas: `http://127.0.0.1:5180/#/workspace/contractor/local-seo`, menú **Centro SEO local**. Solo el negocio vinculado a la cuenta.
- Administración: `http://127.0.0.1:5181/#/workspace/admin/local-seo`. Selector para gestionar cada negocio por separado.
- La sección anterior **SEO local** de administración sigue destinada a páginas HTML locales, canonical, sitemap e indexación.

Cada endpoint valida rol, negocio autorizado y namespace. El contratista no puede gestionar otro negocio modificando el identificador de la URL. Los espacios, informes y referencias son privados. La interfaz inicial del Centro SEO es en español; las campañas registran su propio idioma de búsqueda.

| Módulo | Función operativa | Procedencia y límite |
|---|---|---|
| Datos del negocio | Nombre, dirección, teléfono, web, área de servicio y enlace para reseñas | Referencia declarada; no modifica automáticamente fichas públicas o externas |
| Auditoría | Checklist, puntuación interna, hallazgos y snapshots históricos | Datos de HOME CONNECT y citaciones observadas; no es una auditoría de GBP |
| Tareas | Generación desde hallazgos, prioridades, estados y evidencia | Una nueva auditoría confirma o reabre hallazgos según los datos |
| Geogrid | Cuadrículas 3×3, 5×5 y 7×7, mapa y puntos geodésicos seleccionables | Solo planificación hasta registrar observaciones |
| Rankings | Registro manual o importación normalizada CSV/JSON, con fuente y fecha | Observaciones declaradas, no verificadas por API externa |
| Historial | Top 3, posición media encontrada y comparación con línea base | Exige igual campaña, objetivo, fuente y conjunto de puntos |
| Citaciones | Fichas externas, URL, estado y comparación NAP | No rastrea ni publica correcciones en los directorios |
| Competidores | Referencias y mediciones separadas por objetivo | No genera negocios ni posiciones de muestra |
| Reputación | Recuento, media, reseñas sin respuesta y respuesta del negocio | Solo reseñas propias publicadas, separadas de Google y de las valoraciones demo |
| Contenido | Borradores, planificación y registro de acción manual realizada | Calendario interno, sin publicación automática externa |
| Interacciones | Vistas registradas, clics al sitio y solicitudes dirigidas | HOME CONNECT; no métricas de Google, llamadas o visitantes únicos |
| Informes | JSON completo, CSV de mediciones y bitácora | Exportación privada sin garantías de ranking o causalidad |

## Auditoría y métricas

La puntuación interna es `100 × controles que cumplen / controles disponibles`, redondeada. Los controles disponibles tienen el mismo peso; el de GBP aparece sin datos externos y se excluye. Una puntuación alta no demuestra posicionamiento en Google.

Se conservan checks, fecha, puntuación y datos usados: NAP, nombre de la ficha, presentaciones, servicios, cobertura, publicación, fotos, reseñas propias y observaciones de citaciones. Cambiar la referencia o una citación no modifica auditorías anteriores.

NAP normaliza mayúsculas, acentos y puntuación. Los teléfonos de EE. UU. admiten el prefijo `1`. No interpreta abreviaturas postales como Street/St: una diferencia requiere revisión humana. Un campo vacío es **sin comprobar**, no una coincidencia. La auditoría no exige dirección pública a negocios que atienden por área de servicio.

Una campaña fija palabra clave, motor (`google_maps` o `google_local`), idioma, centro, tamaño, separación y profundidad. Esa configuración queda inmutable para conservar condiciones de comparación; para cambiarlas se crea otra campaña.

- `—`: sin observación, punto no medido.
- `>profundidad`: revisado, negocio no encontrado; se guarda `rank=null`.
- Entero de 1 a profundidad: posición observada.

Top 3 = puntos observados con posición 1–3 / puntos observados × 100. Los puntos no medidos se excluyen; los revisados sin encontrar el negocio sí cuentan. Se muestra el total medido frente al planificado. La posición media utiliza solo puntos donde se encontró el negocio y está etiquetada de esa manera. Sin observaciones, las métricas son nulas.

La variación solo se calcula frente a una observación anterior con la misma campaña, objetivo, tipo y etiqueta de fuente y puntos observados. No demuestra causalidad ni controla por sí sola estacionalidad, personalización o competencia. Las observaciones de competidores no se mezclan con las del negocio propio. Un competidor con mediciones guardadas se conserva para mantener su historial.

Los eventos internos guardan negocio, tipo, identificador de deduplicación y fecha del servidor; no almacenan IP, correo ni identidad del visitante en esta tabla. Las vistas no representan visitantes únicos, ni los clics representan ventas. Los contadores empiezan con esta instrumentación. Las solicitudes y fichas pueden ser de muestra en el escenario demo.

## Importar observaciones

CSV de intercambio: cabecera exacta `row,column,rank`, índices desde 0. Cada fila es un punto comprobado; rank vacío significa comprobado sin encontrar el negocio. Omite filas no observadas. JSON: array de objetos con esas propiedades, o un objeto con el array en `points`.

Al guardar se exige fuente/procedimiento y fecha de observación; la URL de evidencia es opcional. Se rechazan duplicados, puntos fuera de cuadrícula, rangos inválidos, fechas futuras y objetivos ajenos. La interfaz limita el archivo a 100 KB.

El importador no lee todos los formatos propietarios de Localo/BrightLocal. Hay que transformar los datos a este contrato y declarar su procedencia. Los CSV de informes tienen columnas de contexto y no equivalen al formato de tres columnas del importador. La exportación neutraliza fórmulas de hojas de cálculo en campos de texto.

## API, datos y pruebas

`GET /api/local-seo/workspace?professional=<id>` entrega el espacio autorizado. Los POST `profile`, `audit`, `task`, `citation`, `competitor`, `campaign`, `run`, `plan` y `remove` operan bajo `/api/local-seo/`. La escritura y su bitácora se guardan en una transacción.

`POST /api/local-seo/event` admite solo vistas de ficha y clics al sitio para perfiles publicados, con deduplicación y límite de frecuencia.

La migración `003_local_seo.sql` añade `local_seo_project`, `local_seo_audit`, `local_seo_rank_run`, `local_seo_activity` y `local_seo_event`. Son nombres propios, fuera del conjunto de tablas que se reescriben al guardar el directorio. Los datos sobreviven al reinicio de PGlite y entran en el respaldo de disco del backend AWS.

Las pruebas cubren permisos y namespaces, snapshots, persistencia tras reinicio, cálculo de métricas, comparación equivalente, importación, eventos idempotentes, selección de negocio por administración, formularios, mapa sin medir y descarga de informes.

## Dependencias para una siguiente fase

La automatización externa requiere elegir y autorizar un proveedor, implementar su contrato de API, gestionar cuotas y programar trabajos con reintentos. No se usa el orden de resultados de Google Places como una medición de ranking.

Siguen pendientes para una paridad completa: rastreo automático de citaciones y sitios, descubrimiento de competidores, sincronización/respuesta de reseñas externas, publicación programada en Google, alertas de cambios externos, informes PDF de marca blanca, programación automática de informes, generación con IA y métricas externas de llamadas/rutas/conversiones. El conector GBP anterior mantiene sus propios requisitos de credenciales y autorización.
