# Alcance del producto a partir de SEO_GALLERY

Revisión de las 49 imágenes de `public/SEO_GALLERY`, contrastadas con el prototipo React actual. Este documento organiza el material de referencia; no convierte automáticamente los diagramas en un esquema de base de datos, contratos API o una integración ejecutada.

**Nota de actualización:** este documento conserva el análisis de la iteración inicial y contiene descripciones históricas. Para el estado vigente y la propuesta de lanzamiento en Georgia, consultar [alcance-realista-georgia.md](alcance-realista-georgia.md); para la persistencia SQL actual, consultar [nombres-tablas.md](nombres-tablas.md).

## Criterio de interpretación

- El HTML inicial aporta los flujos de partida; la galería amplía y detalla el producto.
- Se conserva la marca Servinexo. La paleta vigente es rojo, blanco y grises al estilo Yelp; la tipografía actual usa Open Sans y Poppins. La marca Yelp/Home Connect y las composiciones de las infografías permanecen como referencias.
- Se distingue lo que está descrito en las imágenes de las propuestas técnicas de este documento.
- Las cifras, reseñas y empresas mostradas no se incorporan como registros reales o verificaciones efectuadas por Servinexo.
- Odoo se trata como integración prevista. No hay backend, conexión ni sincronización Odoo en el proyecto actual.

## Índice de fuentes

Todos los nombres de archivo de las tablas siguientes son relativos a `public/SEO_GALLERY/`.

| Archivo | Contenido principal |
| --- | --- |
| `unnamed.png` | Ecosistema general, catálogo inicial de 32 categorías y actores. |
| `unnamed (1).png` | Mapa del sitio: inicio, buscar, categorías, propietarios, contratistas, proyectos, recursos, nosotros y contacto; páginas de usuario, legales e integraciones. |
| `unnamed (2).png` | Módulos del producto, pagos, reseñas, comunicaciones, administración, analítica, integraciones y seguridad. |
| `unnamed (3).png` | Inventario propuesto de tablas Odoo y tablas propias; no contiene DDL ejecutable. |
| `unnamed (4).png` | Tipos de ficha única de registro (FUR), códigos y ciclo de registro/validación/publicación/operación/seguimiento/cierre. |
| `unnamed (5).png` | Referencia de perfil público: portafolio, equipo, agenda, documentos, reseñas, ubicación y solicitud. |
| `unnamed (6).png` | Siete actores y matriz de casos de uso por módulos; declara 150 casos de uso. |
| `unnamed (7).png` | FUR de servicio, cinco dimensiones de clasificación, modelo relacional conceptual, precio, evidencia, operación y geoportal. Ejemplo expresamente simulado/no verificado. |
| `unnamed (8).png` | Catálogo maestro base de 32 categorías. |
| `unnamed (9).png` a `unnamed (39).png` | Catálogos detallados por especialidad, con servicios, materiales, variantes y agrupaciones. No hay lámina genérica independiente de Jardinería entre ellas. |
| `unnamed (40).png` a `unnamed (44).png` | Nuevas versiones de cimientos, HVAC, aislamiento, plomería y techos, numeradas 33 a 37. Se solapan con el catálogo base. |
| `unnamed (45).png` | FUR de contratista electricista, evidencias, cobertura, modelo Odoo propuesto y datos pendientes de validación. Indica uso interno y ausencia de autorización para publicar. |
| `unnamed (46).png` | FUR de contratista pintor, servicios, materiales, cobertura y matriz de confianza. Indica uso interno. |
| `unnamed (47).png` | FUR de paisajismo, evidencias y discrepancias de dirección a verificar. Indica uso interno. |
| `unnamed (48).png` | Caso territorial de Lawrenceville: ciudades, condados, distribución de leads y categorías adicionales al catálogo base. |

## Actores y espacios de trabajo

La lámina 6 distingue siete actores. Se propone traducirlos a espacios de interfaz; la definición de permisos detallados queda pendiente.

| Actor descrito | Espacio frontend propuesto | Funciones descritas o derivadas del material |
| --- | --- | --- |
| Visitante | Portal público | Descubrir categorías, buscar, consultar servicios y registrarse. |
| Usuario / propietario | Área de cliente | Solicitudes, comparación de cotizaciones, proyectos, favoritos, mensajes y reseñas. |
| Contratista | Área profesional | Perfil y FUR, especialidades, documentos, certificaciones, portafolio, disponibilidad, solicitudes y propuestas. |
| Proveedor | Área de proveedor | Productos, materiales, inventario, pedidos, logística y facturación. |
| Administrador | Administración | Usuarios, catálogo, moderación, verificaciones, reportes y configuración. |
| Empresa / negocio | Área de organización | Servicios, sucursales, equipos, negocio, planes y suscripciones. |
| Institución / aliado | Área de validación / alianzas | Credenciales, normativas, permisos, integración y programas de apoyo. |

Estas áreas no equivalen a permisos efectivos. El prototipo puede simular la navegación por actor; la autorización real exige backend y comprobaciones por recurso. Tampoco se deduce de las imágenes una arquitectura multiempresa o multitenant definitiva.

Los “ecosistemas” presentes son portal público, operación del marketplace, catálogo y FUR de Home Connect, gestión propuesta en Odoo y capa geográfica. No se encontró una definición formal de ambientes de desarrollo, pruebas y producción.

## Catálogo base y normalización

La lámina 8 es una base razonable para la siguiente iteración del catálogo. Su numeración se documenta como referencia visual, no como clave primaria de base de datos.

| N.º base | Categoría | Lámina detallada |
| --- | --- | --- |
| 01 | Techos y cubiertas / Roofing | 9; variante adicional 44 |
| 02 | Plomería / Plumbing | 10; variante adicional 43 |
| 03 | Climatización / HVAC | 11; variante adicional 41 |
| 04 | Electricidad | 12 |
| 05 | Pintura | 13 |
| 06 | Jardinería y paisajismo | Resumen 8; FUR específico 47 |
| 07 | Paneles de yeso / Drywall | 14 |
| 08 | Concreto | 15 |
| 09 | Albañilería y mampostería | 16 |
| 10 | Carpintería | 17 |
| 11 | Instalación de pisos | 18 |
| 12 | Azulejos y cerámica | 19 |
| 13 | Ventanas | 20 |
| 14 | Puertas | 21 |
| 15 | Cercas | 22 |
| 16 | Terrazas y decks | 23 |
| 17 | Revestimientos exteriores | 24 |
| 18 | Canaletas y drenaje de techo | 25 |
| 19 | Servicios de árboles | 26 |
| 20 | Lavado a presión | 27 |
| 21 | Puertas de garaje | 28 |
| 22 | Reparaciones generales / Handyman | 29 |
| 23 | Control de plagas | 30 |
| 24 | Cerrajería | 31 |
| 25 | Reparación de electrodomésticos | 32 |
| 26 | Aislamiento térmico y acústico | 33; variante adicional 42 |
| 27 | Energía solar | 34 |
| 28 | Piscinas | 35 |
| 29 | Sistemas sépticos | 36 |
| 30 | Remodelación y renovación | 37 |
| 31 | Reparación de cimientos | 38; variante adicional 40 |
| 32 | Impermeabilización | 39 |

### Decisiones de normalización pendientes

1. Las categorías 33–37 de las láminas 40–44 repiten especialidades existentes. Conviene consolidar su contenido como versiones o ampliaciones, sin crear cinco categorías duplicadas.
2. La lámina 48 intercambia el orden de algunas categorías respecto del maestro: por ejemplo, concreto y albañilería aparecen en posiciones diferentes. Los identificadores del frontend deben ser estables e independientes de la posición en pantalla.
3. La lámina 48 incluye categorías extendidas, como contratista general, fuera del catálogo base. Debe definirse si son categorías nuevas, etiquetas o agrupaciones transversales.
4. El catálogo actual tiene Tecnología, Mudanzas, Automotriz y Servicios profesionales. No pertenecen al maestro doméstico de 32 categorías. Su continuidad es una decisión de alcance, no una equivalencia automática.
5. Cada tarjeta numerada en las láminas puede representar un servicio, material, variante o caso de uso. No debe convertirse indiscriminadamente en una subcategoría.

Jerarquía propuesta para el frontend: **categoría → subcategoría o familia → servicio**, con etiquetas transversales para instalación, reparación, mantenimiento, emergencia, materiales y uso residencial/comercial. Las relaciones cruzadas deben permitir, por ejemplo, que una reparación de techo aparezca en techos e impermeabilización sin duplicar la entidad del servicio.

## Dominios y datos

La lámina 3 propone tablas propias con prefijo `yelp_`, además de tablas o modelos relacionados con Odoo. Ese prefijo se conserva como evidencia de la referencia, no como decisión de nombres para Servinexo.

| Dominio | Entidades de referencia | Relaciones / comportamiento a definir |
| --- | --- | --- |
| Identidad | Usuario, perfil, rol, organización, preferencias | Usuario con roles y pertenencia a organizaciones; alcance del permiso. |
| Profesionales | Contratista, especialidades, certificaciones, portafolio, disponibilidad, documentos y zonas | Un profesional puede ofrecer varios servicios y atender varias áreas. |
| Catálogo | Categoría, servicio, atributos, imágenes, precios de referencia, materiales, herramientas y etiquetas | Clasificación jerárquica, traducciones y relación entre servicios y profesionales. |
| FUR | Registro normalizado, código, tipo, revisión, fuentes, evidencias y estado | Identidad estable y trazabilidad de cambios; publicación separada de captura interna. |
| Geografía | País, estado, condado, ciudad, coordenadas y áreas de cobertura | La sede y la cobertura no son el mismo dato; una referencia en mapa no acredita cobertura. |
| Cotizaciones | Solicitud, destinatarios, propuesta, partidas, condiciones y vigencia | Separar la necesidad del cliente de las respuestas de contratistas. |
| Proyectos | Proyecto, servicios, tareas, hitos, presupuesto, documentos, fotos y avance | Vincular a una propuesta aceptada; definir cambios y cierre. |
| Operación financiera | Pedido, pago, factura, devolución y comisiones | Estados y conciliación; integración futura, sin cobro real en el prototipo. |
| Reputación | Reseña, respuesta, denuncia, moderación y distintivos | Diferenciar opinión, verificación documental y puntuación calculada. |
| Comunicación | Conversación, mensajes, adjuntos y notificaciones | Participantes, lectura y eventos; proveedores externos pendientes. |
| Contenido | Artículos, guías, tutoriales y recursos | Categorías editoriales, publicación y traducciones. |
| Gestión | Auditoría, reportes, soporte e integraciones | Trazabilidad de actores, cambios y fallos. |

Ejemplos explícitos de tablas propias en la referencia: `yelp_contractor`, `yelp_service_category`, `yelp_service`, `yelp_quote`, `yelp_quote_line`, `yelp_project`, `yelp_review`, `yelp_payment`, `yelp_notification`, `yelp_message` y `yelp_chat_room`.

La propuesta Odoo utiliza, entre otros, `res_partner`, `product_category`, `product_template`, `product_product`, `sale_order`, `sale_order_line`, `project_project`, `project_task`, `account_move` e `ir_attachment`. La FUR de servicio indica que los servicios no generan `stock_quant`.

Antes de implementar una integración deben fijarse versión y módulos Odoo, comprobar modelos reales y sus nombres ORM/SQL, y asignar qué sistema mantiene cada dato. Las imágenes no resuelven tipos de campos, claves únicas, índices, migraciones, reglas de acceso o contratos de sincronización. Las cifras 135 + 80 = 215 de la lámina 3 son un inventario conceptual, no 215 tablas ya existentes o exigidas al frontend.

## FUR: eje del perfil y del servicio

Las láminas 4, 7 y 45–47 describen cinco dimensiones recurrentes:

1. Categoría y especialidades.
2. Ubicación, acceso y cobertura.
3. Identificación y registro empresarial.
4. Verificación, licencias, seguros y certificaciones.
5. Presencia digital, fuentes y evidencias.

Propuesta de representación en el prototipo: ficha con secciones de presentación, servicios, trabajos, cobertura y credenciales. La vista interna añade registro, fuentes, documentos y seguimiento. Los estados deben poder distinguir borrador, dato declarado, pendiente de revisión y dato verificado, además del estado de publicación. No basta un booleano `verified` para expresar las referencias.

Los códigos FUR de las imágenes muestran varias convenciones. No se deduce un generador de identificadores definitivo ni una fórmula validada para los índices de confianza.

Las fichas 45–47 son demostrativas y señalan uso interno, datos por validar y ausencia de autorización de publicación o integración. Para el frontend público se mantienen empresas ficticias; sus casos sirven para diseñar estructura y estados.

## API: lo descrito y la propuesta

Las láminas mencionan APIs, webhooks, exportación JSON e integraciones. No se encontró una especificación HTTP completa con rutas, métodos, payloads, autenticación, paginación o códigos de error.

El siguiente listado es una **propuesta inicial para preparar adaptadores frontend**, no una transcripción de endpoints ya definidos:

| Operación | Contrato candidato |
| --- | --- |
| Consultar árbol del catálogo | `GET /api/v1/categories` |
| Buscar profesionales y filtrar por cobertura | `GET /api/v1/professionals` |
| Consultar ficha pública | `GET /api/v1/professionals/:id` |
| Consultar servicios | `GET /api/v1/services` |
| Consultar detalle de servicio | `GET /api/v1/services/:id` |
| Publicar necesidad de un cliente | `POST /api/v1/quote-requests` |
| Consultar solicitudes propias | `GET /api/v1/me/quote-requests` |
| Presentar una propuesta | `POST /api/v1/quote-requests/:id/proposals` |
| Consultar proyectos propios | `GET /api/v1/me/projects` |
| Actualizar perfil propio | `PATCH /api/v1/me/profile` |
| Consultar conversaciones propias | `GET /api/v1/me/conversations` |
| Tramitar revisión de credenciales | `POST /api/v1/admin/verifications/:id/decisions` |

Pendientes del contrato: identificadores, filtros geográficos, orden y paginación, códigos de estado del negocio, monedas/unidades, fechas, traducciones, carga de archivos, errores y permisos. No se requiere crear un backend para simular esos contratos en la siguiente iteración visual.

## Brecha con la primera iteración

| Área | Estado actual | Cambio que guía la galería |
| --- | --- | --- |
| Identidad visual | Rebranding propio y componentes Magic UI, Aceternity UI, Swiper y React Icons | Mantener coherencia de marca y aplicar el sistema a las nuevas vistas. |
| Catálogo | 12 categorías planas | Maestro doméstico de 32, jerarquía y relaciones estables. |
| Descubrimiento | Consulta por texto, país, ciudad, categoría, calificación y booleano verificado | Especialidades, servicios, cobertura territorial y estados de evidencia. |
| Perfil | Foto, categoría, ubicación, calificación y experiencia | Perfil FUR, portafolio, equipo, credenciales, cobertura y servicios. |
| Solicitudes | Formulario y lista en memoria | Solicitudes diferenciadas de propuestas; detalle, estados y comparación. |
| Áreas privadas | Panel profesional y administración conceptuales | Experiencias específicas para propietario, profesional y demás actores priorizados. |
| Datos | JSON de muestra y estado local | Entidades tipadas y adaptadores de datos simulados, preparados para API. |
| Geografía | País y ciudad como texto | Ubicaciones estructuradas, cobertura y futuro mapa/geoportal. |
| Integraciones | Ninguna | Odoo, pagos, mensajes y geografía documentados como etapas futuras. |

## Secuencia propuesta para continuar el frontend

1. **Catálogo y contratos simulados:** normalizar las 32 categorías, acordar agrupaciones de servicios, incorporar identificadores estables y separar datos del estado de pantalla. Conservar datos ficticios.
2. **Descubrimiento y FUR pública:** búsqueda avanzada, detalle de servicio, perfil con trabajos, cobertura y credenciales; navegación con URLs para poder compartir fichas y resultados.
3. **Propietario y contratista:** áreas diferenciadas, solicitud, respuesta de presupuesto, comparación y detalle del proyecto. Estados simulados de punta a punta.
4. **Administración:** revisión de perfiles y evidencias, catálogo, moderación y estados de publicación.
5. **Expansión del ecosistema:** organizaciones, proveedores, aliados, recursos, mensajería y vistas geográficas, según prioridad acordada.
6. **Integraciones reales:** backend, autenticación, permisos, persistencia y conectores, cuando existan contratos y decisiones técnicas confirmadas.

Esta secuencia es una propuesta de trabajo; no supone que todas las capacidades del ecosistema deban construirse en la próxima iteración.

## Inconsistencias y decisiones abiertas

- Consolidación de categorías y servicios repetidos, y permanencia de las especialidades no domésticas del prototipo inicial.
- Nombre comercial definitivo: la referencia alterna Yelp/Home Services/Home Connect; el prototipo mantiene Servinexo.
- Alcance geográfico: el prototipo es internacional y varias fichas proponen un piloto en Georgia. No se ha confirmado restringir el producto a ese territorio.
- Jerarquía de roles: empresa, contratista y proveedor pueden solaparse; la galería no define una matriz de permisos cerrada.
- Fuente de verdad: responsabilidad de Servinexo, Home Connect y Odoo sobre perfiles, catálogo, propuestas y facturas.
- Tablas, precios y métricas de demostración no equivalen a datos validados. En la lámina 48, los siete totales visibles por especialidad suman 627, frente al total anunciado de 859 y ocho categorías activas. Falta aclarar esa diferencia antes de utilizar las cifras como datos del producto.
- No hay contratos API completos ni códigos hexadecimales normativos identificados. La paleta vigente está definida en `src/index.css`.

La revisión no modifica la aplicación ni implementa una base de datos. Deja trazabilidad para que la siguiente iteración responda al alcance del producto sin copiar literalmente la apariencia de las láminas.
