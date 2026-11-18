# HOME CONNECT: alcance realista para Georgia

Fecha de revisión: 18 de noviembre de 2026. Mercado inicial confirmado por el propietario del proyecto: Georgia, Estados Unidos.

Actualización de implementación: se avanzaron SEO HTML local, confirmación/recuperación de email, proyecciones privadas de API/SSE, OAuth de GBP, archivos, reseñas y soporte. El detalle vigente y las dependencias externas están en [seo-email-google.md](seo-email-google.md). La tabla de diagnóstico de abajo conserva la situación auditada antes de esa entrega; no debe usarse como inventario actualizado de esas funciones.

Este documento distingue capacidades existentes, alcance recomendado para lanzamiento y funciones posteriores. Las prioridades y criterios de aceptación son propuestas de producto; no significan que las funciones pendientes ya estén implementadas ni que el presupuesto y el calendario estén aprobados.

## 1. Producto que podemos ofrecer

HOME CONNECT será un marketplace local de servicios del hogar: descubrir profesionales, consultar información de su negocio, enviar una necesidad, recibir y comparar propuestas, registrar una selección y dar seguimiento básico al trabajo.

Recomendación: adoptar el descubrimiento y la reputación local de Yelp y la organización de solicitudes y propuestas de BuildZoom. El contrato de obra y su ejecución corresponden al cliente y al contratista. La plataforma facilitará el encuentro y la trazabilidad; no debe presentarse como constructora, autoridad de licencias, inspector de obra o aseguradora.

Georgia es el mercado confirmado. Empezar por una zona atendible —por ejemplo, un grupo de ZIP codes en Gwinnett— es una propuesta operativa por confirmar, no una cobertura estatal ya disponible. Los registros internacionales del seeder son demostraciones, no oferta para ese lanzamiento.

## 2. Qué aportan Yelp y BuildZoom

| Referencia observada | Funciones relevantes | Qué conviene adoptar |
|---|---|---|
| Yelp: negocio reclamado | El representante administra información y fotos, responde reseñas y solicitudes y consulta actividad. Reclamar la página no equivale a comprar publicidad. | Identidad del negocio, edición controlada, comunicación y reputación. [Y1] |
| Yelp: Request a Quote | Preguntas sobre el proyecto, contacto con el negocio y posibilidad de solicitar propuestas adicionales. Depende de categoría y disponibilidad de la función. | Formulario por oficio y autorización clara antes de distribuir solicitudes. [Y2] |
| Yelp: evolución 2026 | El anuncio de primavera amplió Assistant y las acciones mediante integraciones; el de otoño anunció herramientas de respuesta a leads y nuevas conexiones con software profesional. | Referencia de evolución posterior; una función anunciada no se presupone disponible para todos los negocios. [Y3][Y4] |
| BuildZoom: contratación | Describe un recorrido de definición del proyecto, acompañamiento de un consultor, selección de profesionales, comunicaciones y comparación. | Solicitud bien definida, oportunidades, propuestas y selección. El acompañamiento necesita personal. [B1] |
| BuildZoom Premium | Ofrece organización de preconstrucción, coordinación, análisis de propuestas y revisión de contratos. | Una futura línea de servicio humano con entregables definidos; no una función que aparece por añadir un dashboard. [B2] |
| BuildZoom: cobro | La página de tarifas distingue cobro por conexión y comisión por contratación, según el proyecto, comunicados antes de aceptar. | Transparencia del modelo comercial; no asumir una tarifa universal ni copiar un porcentaje. [B3] |

El tamaño de sus bases de datos, sus rankings y sus resultados comerciales no son capacidades de HOME CONNECT. No se adoptan cifras promocionales como metas garantizadas.

## 3. Estado real del repositorio

“Existe” significa que funciona en el prototipo local, no que esté preparado para producción ni que contenga negocios reales.

| Capacidad | Estado actual | Brecha para ofrecerla a usuarios reales |
|---|---|---|
| Tres aplicaciones | Web con consumidor, portal contratista y administración, con módulos y servidores separados. | Hosting, dominios, HTTPS, despliegues y monitoreo. |
| Registro y login | Cuentas locales, contraseñas derivadas y sesiones de 24 horas. | Confirmación de correo, recuperación, protección contra abuso y gestión de sesiones de producción. |
| Privacidad y permisos | Hay controles de comandos y filtrado de vistas por cuenta. | **Bloqueante:** bootstrap y SSE exponen el estado completo; proteger las lecturas en servidor antes de incorporar datos reales. |
| Directorio y catálogo | 12 contratistas ficticios, 32 categorías, 64 subcategorías y 96 servicios de muestra. | Oferta real autorizada, taxonomía validada y cobertura de Georgia. |
| Búsqueda y cobertura | Filtros de directorio y mapa con posiciones aproximadas. | ZIP codes, áreas reales y criterio de proximidad. La asignación de oportunidades actual se basa en servicio o destinatario, sin comprobar distancia/cobertura. |
| Ficha profesional | Presentación, sede, cobertura y referencias de credenciales editables. | Identidad del representante, datos comerciales completos, carga de evidencias y edición real del portafolio. |
| Verificaciones | Administración puede cambiar estados de referencias ficticias. | Consulta de fuentes, evidencia, fecha, vigencia y revisión humana; hoy no se comprueban licencias. |
| Solicitudes y propuestas | Crear solicitud, responder con importe/plazo/alcance, comparar y aceptar una respuesta. | Adjuntos, alcance y exclusiones estructurados, visita de evaluación y revisiones de presupuesto. |
| Selección y proyecto | Aceptar una propuesta crea un proyecto con tres hitos. | Selección no equivale a firma contractual; faltan confirmación bilateral, incidencias y cambios de alcance. |
| Mensajería | Mensajes de prueba sincronizados entre aplicaciones. | Autorización de conversaciones en servidor, avisos, bloqueo, denuncia y adjuntos seguros. |
| Reseñas y reputación | Calificaciones incluidas en el seeder. No existe flujo de publicación de reseñas reales. | Alta, moderación, respuesta, impugnación y reglas de cálculo. No mostrar valoraciones ficticias como reputación real. |
| Administración | Publicación de perfiles, revisión simulada, actividad y consulta del catálogo. | Edición del catálogo, soporte, moderación, revisión con vigencia y permisos administrativos por función. |
| Base de datos | Persistencia SQL local mediante PGlite, migración desde JSON y nombres de tablas alineados con Odoo donde corresponde. | Operación de producción, copias/restauración y autorización completa. Los nombres no constituyen una integración Odoo ni equivalencia de campos. |
| Inventario y equipo | Pantallas de muestra en administración. | No hay compras, logística, facturación ni ERP operativo. |
| SEO y métricas | Navegación con hash, estadísticas del estado de muestra. | Páginas públicas indexables, códigos HTTP, canonical, sitemap y eventos medidos de conversión. |

Evidencia local: [aplicación web](../src/App.tsx), [reglas de oportunidades y estado](../src/domain/store.tsx), [API y sus lecturas](../scripts/demo-api.ts), [persistencia](../server/database/database.ts), [catálogo administrativo de consulta](../apps/admin/src/modules/catalog/catalog-page.tsx), [coordenadas de muestra](../src/data/locations.ts), [nombres SQL](nombres-tablas.md).

## 4. Alcance del primer lanzamiento

### Web pública y consumidor

- Inicio enfocado en Georgia; páginas de servicio y localidad solo cuando exista oferta y contenido útil.
- Directorio con lista y mapa, especialidad, zona atendida y estados de verificación explicados.
- Ficha del negocio con datos, servicios, portafolio autorizado, disponibilidad declarada y contacto.
- Registro, login, recuperación y dashboard dentro de la web principal.
- Solicitud con oficio, ZIP code, alcance, presupuesto orientativo, plazo, fotos y opción de visita. Indicar si se comparte con un negocio o varios.
- Comparación de propuestas por alcance, importe, exclusiones y plazo. Señalar cuáles requieren visita antes de fijar precio.
- Selección de contratista, mensajes y seguimiento básico; cierre confirmado por ambas partes.
- Reseña vinculada a una interacción o trabajo documentado, con política propia, respuesta del negocio y denuncia. Esa vinculación no prueba por sí sola la calidad del trabajo.

### Portal de contratistas

- Alta del negocio y validación del representante. Si se incorpora una ficha preexistente, agregar reclamación de propiedad y prevención de duplicados.
- Perfil y FUR como expediente interno; no publicar documentos privados ni tratar el código FUR como licencia oficial.
- Servicios, ZIP codes atendidos, radio cuando sea aplicable y capacidad/disponibilidad declarada.
- Credenciales y documentos con estados, historial y vencimientos cuando proceda.
- Oportunidades compatibles con servicio y zona; aceptar interés o declinar sin fingir disponibilidad.
- Propuestas y revisiones; precio definitivo o sujeto a visita claramente indicado.
- Proyectos, mensajes, notificaciones, reseñas recibidas y configuración de cuenta.
- Métricas básicas: solicitudes recibidas, respuestas, propuestas y selecciones registradas. No prometer cantidad de leads ni contratación.

### Administración

- Usuarios, negocios, reclamaciones y permisos por función.
- Catálogo editable, cobertura, solicitudes y asignación manual de apoyo.
- Cola de revisión de evidencias, vigencias y publicación de fichas.
- Moderación de reseñas y contenido; denuncias, bloqueo y suspensión.
- Soporte e incidencias con responsable y registro de decisiones.
- Métricas operativas sin confundir visitas, leads, conexiones y contrataciones.

Inventario, abastecimiento y el rol de proveedor no serán un producto independiente del primer lanzamiento. Las áreas de aliado y empresa pueden servir como organización interna; no deben presentarse como instituciones oficiales o verificadores acreditados sin acuerdos.

## 5. Verificaciones para Georgia

La información oficial de Georgia distingue la comprobación de licencia y seguro; remite a las fuentes del estado y recomienda verificar la cobertura correspondiente. El registro de una empresa no debe usarse como equivalente de licencia profesional. [G1][G2]

La plataforma deberá tener una matriz por oficio y alcance del trabajo, con fuente y responsable. No se aplicará una única exigencia de licencia a las 32 categorías. Los permisos locales también deben distinguirse de la licencia profesional: Gwinnett gestiona permisos y publica información de su jurisdicción; no representa todos los municipios de Georgia. [G3][G4]

Estados propuestos de confianza:

| Estado visible | Significado permitido |
|---|---|
| Información declarada | El negocio proporcionó el dato; no fue comprobado. |
| Documento recibido | Se recibió un archivo; no prueba autenticidad, cobertura o vigencia. |
| En revisión | Un responsable está comprobando la evidencia. |
| Licencia consultada | Coincidencia comprobada en la fuente competente, con fecha, tipo, estado observado y limitaciones. |
| Seguro confirmado | Se documentó una confirmación de cobertura y su vigencia; no es una garantía emitida por HOME CONNECT. |
| Requiere actualización | La evidencia venció, no coincide o necesita revisión. |

La publicación y la verificación serán decisiones distintas. Si un servicio requiere una habilitación, su elegibilidad para recibir solicitudes deberá respetar esa condición, aunque el perfil conserve información histórica. La revisión de licencia no certifica la calidad de una obra ni descarta todo riesgo.

Empezar con verificación manual trazable es viable para un piloto pequeño. No asumir una API de licencias ni automatizar masivamente el buscador: el portal estatal se presenta como consulta individual y remite a solicitudes de datos masivos. El acceso automatizado no quedó validado en esta revisión. [G5]

## 6. Qué no ofrecer en el MVP y qué puede venir después

| Función | Decisión recomendada | Dependencia para incorporarla |
|---|---|---|
| Garantía de satisfacción o indemnización | Fuera del MVP. | Condiciones, financiación, tratamiento de reclamaciones y operación responsable. La existencia de Yelp Guaranteed no transfiere esa cobertura a HOME CONNECT. [Y5] |
| Ranking similar a BuildZoom Score | Fuera del MVP. | Datos suficientes, metodología propia explicable, procedencia y mecanismos de corrección. No copiar su puntuación. |
| Historial masivo de permisos | Fase posterior. | Acceso autorizado, cobertura por jurisdicción, calidad, actualización y coste. |
| Consultor de proyecto como BuildZoom | Solo como piloto de servicio humano explícito. | Equipo, capacidad, horario, alcance y precio; no anunciarlo si nadie presta el servicio. |
| Asistente IA | Fase posterior. | Datos fiables, consentimiento, evaluación y derivación humana; sin inventar licencias, disponibilidad, precios o diagnósticos técnicos. |
| Agenda instantánea | Fase posterior. | Disponibilidad actualizada y confirmación del profesional; una solicitud de visita no es una reserva confirmada. |
| Pagos, anticipos, custodia, devoluciones | Fuera del MVP. | Proveedor de pagos para marketplace, operación financiera, conciliación y revisión jurídica del modelo aplicable. |
| Contrato firmado digitalmente | Fase posterior. | Documentos adecuados al servicio, firma, evidencia y gestión de versiones. Aceptar una propuesta en el sistema no lo sustituye. |
| Cobro por lead o contratación | Definir después de validar el piloto. | Tarifas publicadas, definición del evento facturable, consentimiento, seguimiento, reembolsos y soporte. |
| Publicidad y perfiles destacados | Fase posterior. | Medición y etiquetado de patrocinio; pagar no debe fabricar verificación o reseñas. |
| Odoo | Integración posterior. | Versión y módulos, modelos reales, contratos de sincronización y responsabilidad de cada sistema. |
| Catálogo nacional o internacional | Fuera del lanzamiento inicial. | Oferta y operación por territorio; una categoría existente no acredita disponibilidad. |

Podemos construir estas funciones en etapas, pero no presentarlas como operativas antes de resolver sus dependencias. Tampoco prometer el mejor contratista, precio final sin evaluación, respuesta inmediata universal o una obra garantizada por mostrar un distintivo.

## 7. Páginas y módulos que debemos pulir

Estas rutas son una propuesta de organización; no son una declaración de rutas ya existentes.

| Superficie | Páginas o módulos propuestos |
|---|---|
| Descubrimiento público | Inicio Georgia; directorio; servicio/localidad; ficha del contratista; cómo funciona; para profesionales; ayuda y políticas. |
| Consumidor, dentro de la web | Registro/login/recuperación; nueva solicitud; mis solicitudes y propuestas; proyectos; mensajes; guardados; reseñas y cuenta. |
| Portal contratista separado | Registro/login; resumen; mi negocio; servicios y cobertura; documentos; portafolio; oportunidades; propuestas; proyectos; mensajes; reseñas; notificaciones y cuenta. |
| Administración separada | Resumen; usuarios/negocios; verificaciones; reclamaciones de ficha; catálogo/cobertura; solicitudes; moderación; soporte; actividad y configuración. |

Referencias concretas para revisar con el equipo:

- [Inicio de BuildZoom](https://www.buildzoom.com/): entrada por búsqueda o por proyecto.
- [Cómo funciona BuildZoom](https://www.buildzoom.com/how-it-works): recorrido de contratación.
- [Una ficha pública de contratista](https://www.buildzoom.com/contractor/beyond-the-horizon-construction): referencia de presentación, no contenido para reutilizar.
- [Centro de ayuda de BuildZoom](https://www.buildzoom.com/help): separación entre perfil, leads, mensajes y gestión del proyecto. Las pantallas privadas no se auditaron con una cuenta autenticada.
- [BuildZoom Premium](https://www.buildzoom.com/premium): referencia de servicio asistido posterior, no parte automática del MVP.

## 8. Condiciones mínimas para abrir el piloto

1. **Datos privados:** un usuario no puede leer solicitudes, propuestas, conversaciones ni documentos de otra cuenta por API, SSE o acceso directo. Se prueba en servidor, no solo ocultando botones.
2. **Cuentas:** confirmación y recuperación operativas, sesiones administrables, permisos por recurso y separación del modo demo. El selector de perfiles ficticios no se expone a usuarios reales.
3. **Oferta:** ficha de cada negocio autorizada, contacto comprobado, responsable, especialidad y cobertura real. Sin estrellas o certificaciones inventadas.
4. **Elegibilidad:** revisión por oficio y localidad definida; evidencias y fecha de revisión registradas; cambios de vigencia controlados.
5. **Solicitud:** se distingue necesidad, visita, propuesta, selección y contratación reportada. Distribución a varios negocios con consentimiento.
6. **Comunicaciones y archivos:** envío de avisos probado, acceso restringido, límites de carga, tratamiento de contenido peligroso y mecanismo de reporte.
7. **Operación:** soporte y moderación asignados a personas; horario y política de incidencias publicados.
8. **Infraestructura:** HTTPS, configuración de producción, respaldo y restauración comprobada, manejo de errores y monitoreo. El servicio local actual no se publica sin estos cambios.
9. **SEO:** páginas públicas legibles e indexables con contenido real, canonical, sitemap y estados HTTP; páginas privadas y de prueba fuera del índice. No generar páginas vacías para cada ZIP code.
10. **Medición:** distinguir visita, solicitud válida, profesional elegible notificado, respuesta, propuesta y selección/contratación reportada. Medir tiempos y motivos de rechazo antes de fijar promesas comerciales.

El piloto no necesita un número inventado de profesionales para considerarse listo: requiere capacidad real para atender las combinaciones de zona y oficio que se publicitan. Recomiendo empezar con 3–5 especialidades y ampliar según oferta y resultados; la selección final queda por decidir.

## 9. Orden de ejecución propuesto

| Etapa | Entrega | Criterio de salida |
|---|---|---|
| 1. Preparación del piloto | Zona/oficios, modelo de publicación, matriz de verificación y permisos; cierre de exposición de lecturas. | Alcance operativo acordado y acceso privado probado. |
| 2. Directorio confiable | Negocios reales, ficha, cobertura, documentos, publicación y páginas SEO. | Cada perfil público tiene procedencia, responsable y cobertura declarada. |
| 3. Solicitudes y comparación | Formulario por oficio, distribución elegible, visitas, propuestas, avisos y mensajes. | Recorrido real probado con negocios participantes, sin prometer precio o disponibilidad no confirmados. |
| 4. Seguimiento y reputación | Cierre bilateral, reseñas, respuesta, denuncias, soporte y métricas. | Moderación y soporte operables; sin calificaciones de muestra en producción. |
| 5. Expansión | Monetización, agenda, asistentes, datos externos y Odoo según necesidad validada. | Cada función dispone de proveedor, responsable, coste y criterios de aceptación propios. |

No se fija una fecha ni un presupuesto sin dimensionar equipo, proveedores y operación. Esta propuesta limita el primer producto a un marketplace de descubrimiento y contratación asistida por herramientas, con seguimiento ligero.

## Fuentes consultadas

Revisión de páginas públicas; las funciones pueden variar por categoría, región, elegibilidad y plan. Una página comercial describe lo ofrecido por su proveedor y no constituye una auditoría independiente de resultados.

- [Y1: Yelp, negocios reclamados](https://www.yelp-support.com/article/What-is-a-claimed-business?l=en_US).
- [Y2: Yelp, mensajes y solicitud de cotización](https://www.yelp-support.com/article/How-do-I-message-a-business-or-request-a-quote?l=en_US).
- [Y3: Yelp, lanzamiento de primavera 2026](https://www.yelp-ir.com/news/press-releases/news-release-details/2026/Yelp-Launches-the-New-Yelp-Assistant-Transforming-Local-Discovery-from-Search-to-Answers-and-Actions/default.aspx).
- [Y4: Yelp, anuncio de otoño del 20 de octubre de 2026](https://www.yelp-press.com/press-releases/press-release-details/2026/Yelp-Announces-More-Personalized--Yelp-Assistant-Agent-that-Checks-Restaurant-Wait-Times-and-AI-Tools-for-Service-Professionals/default.aspx).
- [Y5: Yelp, términos y programa Guaranteed](https://terms.yelp.com/tos/en_us/20260101_en_us/).
- [B1: BuildZoom, recorrido público](https://www.buildzoom.com/).
- [B2: BuildZoom Premium](https://www.buildzoom.com/premium).
- [B3: BuildZoom, modalidades de tarifa](https://www.buildzoom.com/contractor-faq/fees).
- [G1: Georgia Attorney General, comprobar licencia y seguro](https://consumered.georgia.gov/ask-ed/2023-12-13/how-can-i-verify-contractor-licensed-and-insured).
- [G2: Georgia Secretary of State, junta de contratistas residenciales y generales](https://sos.ga.gov/state-licensing-board-residential-and-commercial-general-contractors).
- [G3: Gwinnett, construcción, permisos e inspecciones](https://www.gwinnettcounty.com/government/departments/planning-development/services/building-services).
- [G4: Gwinnett, informes de permisos y alcance de jurisdicción](https://www.gwinnettcounty.com/government/departments/planning-development/building-services/building-permits-issued).
- [G5: Georgia, consulta de licencias](https://verify.sos.ga.gov/verification/). El buscador bloqueó la lectura automatizada; su resultado de búsqueda oficial indica consulta individual y formulario para datos masivos. No se verificaron contratistas concretos ni una API de integración.
