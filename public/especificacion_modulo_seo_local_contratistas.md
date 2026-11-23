# Especificación funcional y técnica

## Módulo de SEO Local para el Sistema de Contratistas

**Tipo de documento:** Especificación de implementación\
**Versión:** 1.0\
**Fecha:** 20 de noviembre de 2026\
**Estado:** Propuesta para validación funcional y técnica

------------------------------------------------------------------------

## 1. Resumen ejecutivo

Se requiere incorporar al sistema de contratistas un módulo de **SEO
Local** que permita al equipo SEO administrar la presencia digital de
cada contratista y consultar los resultados asociados desde el panel del
contratista.

La solución tendrá dos experiencias diferenciadas por rol:

1.  **Panel administrador / usuario SEO:** tendrá permisos de gestión.
    Podrá seleccionar contratistas existentes, configurar su información
    NAP, registrar hasta 25 palabras clave, administrar contenido
    (posts, reviews y noticias), gestionar directorios y ejecutar o
    consultar análisis de posicionamiento local.
2.  **Panel del contratista:** tendrá acceso de **solo visualización** a
    la información SEO que le corresponda. Podrá consultar su NAP,
    keywords, contenido, directorios, Local Pack/Local Grid e informes,
    pero no crear, modificar, eliminar ni ejecutar configuraciones
    administrativas.

El objetivo final es ofrecer una herramienta de gestión y seguimiento de
SEO local, tomando como referencia funcional productos como Localo y
BrightLocal. La plataforma no debe prometer ni garantizar posiciones en
Google. Debe mostrar mediciones obtenidas mediante una fuente de datos
de ranking local debidamente integrada.

## 2. Antecedentes y alcance derivado del diagrama

El diagrama de requerimientos plantea el siguiente flujo y componentes:

-   **NAP** como información base del negocio.
-   **25 keywords** asociadas al negocio.
-   **Local Pack** como concepto de visibilidad en resultados locales.
-   Creación/gestión de contenido en tres categorías: **Post, Reviews y
    Noticias**.
-   Un listado de **directorios** donde se coloca o registra el
    contenido/datos del negocio.
-   **Local Grid** como resultado objetivo, inspirado en Localo y
    BrightLocal.

Este documento desarrolla esos elementos y añade el requisito confirmado
posteriormente: el panel del contratista mostrará los mismos apartados e
información, pero en modo de consulta.

### 2.1 Fuera del alcance confirmado

Los siguientes puntos no se deben asumir como incluidos hasta recibir
aprobación:

-   Publicar automáticamente posts en Google Business Profile u otras
    plataformas.
-   Crear o publicar automáticamente perfiles en directorios.
-   Generar reseñas de clientes mediante IA.
-   Garantizar que el negocio aparezca en el Local Pack o alcance una
    posición determinada.
-   Integrar una IA para generar keywords o contenido. Inicialmente, las
    keywords y los textos pueden prepararse externamente y cargarse en
    la plataforma.
-   Ejecutar escaneos de Local Grid sin una API/proveedor de ranking
    local definido.

Se pueden considerar como evoluciones futuras.

------------------------------------------------------------------------

## 3. Objetivos

### 3.1 Objetivo general

Centralizar la configuración, administración y consulta del SEO local de
cada contratista, y proporcionar mediciones geográficas de
posicionamiento para las palabras clave configuradas.

### 3.2 Objetivos específicos

-   Reutilizar los datos del contratista que ya existen en el sistema.
-   Mantener una configuración SEO independiente por contratista.
-   Registrar y administrar un conjunto de hasta 25 keywords por perfil
    SEO.
-   Gestionar posts, reviews y noticias asociados al contratista.
-   Mantener un catálogo de directorios y relacionar cada directorio con
    los perfiles correspondientes.
-   Registrar el estado y la URL del perfil/listado del contratista en
    cada directorio.
-   Configurar y ejecutar análisis de ranking local cuando exista
    integración con un proveedor de datos.
-   Mostrar el Local Grid y el historial de mediciones.
-   Dar al contratista visibilidad de su propia información, sin
    permisos de edición.
-   Restringir el acceso de cada contratista exclusivamente a sus
    propios datos.

## 4. Roles y permisos

### 4.1 Matriz de permisos

  --------------------------------------------------------------------------------
  Funcionalidad                Administrador        Usuario SEO        Contratista
  ----------------------- ------------------ ------------------ ------------------
  Ver listado de                          Sí     Según permisos                 No
  contratistas

  Seleccionar contratista                 Sí                 Sí                 No
  para administrar SEO

  Ver su propio perfil                    Sí                 Sí                 Sí
  SEO

  Crear/editar datos SEO                  Sí                 Sí                 No
  del perfil

  Consultar NAP                           Sí                 Sí                 Sí

  Modificar NAP desde SEO Según política del    No por defecto;                 No
                                     sistema   reutilizar datos
                                                       maestros

  Crear/editar/eliminar                   Sí                 Sí                 No
  keywords

  Consultar keywords                      Sí                 Sí                 Sí

  Crear/editar/eliminar                   Sí                 Sí                 No
  posts

  Consultar posts                         Sí                 Sí                 Sí

  Crear/editar/eliminar                   Sí                 Sí                 No
  reviews

  Consultar reviews                       Sí                 Sí                 Sí

  Crear/editar/eliminar                   Sí                 Sí                 No
  noticias

  Consultar noticias                      Sí                 Sí                 Sí

  Administrar catálogo de                 Sí     Según permisos                 No
  directorios

  Asociar directorios a                   Sí                 Sí                 No
  contratistas

  Consultar directorios                   Sí                 Sí                 Sí
  asociados

  Registrar/verificar                     Sí                 Sí                 No
  estado de directorios

  Configurar Local Grid                   Sí                 Sí                 No

  Ejecutar escaneo Local                  Sí                 Sí                 No
  Grid

  Consultar Local Grid y                  Sí                 Sí                 Sí
  resultados

  Consultar reportes e                    Sí                 Sí                 Sí
  historial

  Exportar reportes                       Sí     Según permisos         Solo si se
                                                                          habilita
  --------------------------------------------------------------------------------

**Regla principal:** el panel del contratista es de solo lectura. No
basta con ocultar botones en la interfaz: el backend debe rechazar
operaciones de escritura realizadas por usuarios con rol de contratista.

### 4.2 Alcance de datos del contratista

El contratista autenticado solo puede consultar los datos vinculados a
su propio `contractor_id`. El backend debe obtener ese identificador
desde la sesión/token autenticado y no confiar en un identificador
enviado libremente por el navegador.

Si un contratista intenta consultar el perfil SEO de otro contratista
mediante una URL o una petición directa, el sistema debe responder con
acceso denegado o recurso no disponible, según el estándar de seguridad
existente.

### 4.3 Diferencia entre paneles

**Panel administrador / SEO** - Tiene navegación de administración. -
Puede crear y actualizar registros. - Puede asociar información con
contratistas. - Puede configurar y ejecutar análisis. - Puede revisar
estados, errores e historial.

**Panel del contratista** - Presenta los mismos grupos de información
relevantes. - Muestra exclusivamente los datos del contratista
autenticado. - Utiliza etiquetas como "Solo lectura" cuando ayuden a
evitar confusión. - No muestra controles de crear, editar, eliminar,
asociar, verificar ni ejecutar. - Puede mostrar mensajes de estado y
fechas de última actualización. - Puede permitir filtros de consulta y
exportación únicamente si el negocio lo autoriza; esas acciones no deben
modificar datos.

------------------------------------------------------------------------

## 5. Navegación propuesta

### 5.1 Menú del administrador

1.  SEO Local
    -   Resumen
    -   Perfiles SEO / Contratistas
    -   NAP
    -   Keywords
    -   Contenido
        -   Posts
        -   Reviews
        -   Noticias
    -   Directorios
    -   Local Grid
    -   Reportes / Historial

Los apartados NAP y Keywords pueden formar parte de una pantalla de
configuración del perfil SEO, en lugar de ser páginas independientes. La
estructura final debe seguir los patrones de navegación ya utilizados
por el sistema.

### 5.2 Menú del contratista

1.  Mi SEO Local
    -   Resumen
    -   Mi información NAP
    -   Mis keywords
    -   Mi contenido
        -   Posts
        -   Reviews
        -   Noticias
    -   Mis directorios
    -   Mi Local Grid
    -   Mis reportes

Los nombres pueden ajustarse al diseño actual del portal. La experiencia
debe ser de consulta, no de administración.

------------------------------------------------------------------------

## 6. Requerimientos funcionales

### RF-01. Selección de contratista y creación del perfil SEO

**Actor:** Administrador / usuario SEO.

**Descripción:** el usuario selecciona un contratista que ya está
registrado en el sistema y crea o consulta su perfil SEO.

**Comportamiento:** 1. Mostrar un buscador/listado de contratistas
existentes. 2. Permitir seleccionar un contratista. 3. Consultar sus
datos maestros sin duplicar la información. 4. Comprobar si ya existe un
perfil SEO asociado. 5. Si no existe, permitir crear la configuración
SEO. 6. Si existe, abrir el perfil existente. 7. Evitar crear más de un
perfil SEO activo por contratista, salvo que se apruebe expresamente el
uso de múltiples ubicaciones o sucursales.

**Datos mínimos del perfil:** - Identificador del contratista. - Estado
del perfil SEO: activo/inactivo. - Fecha de creación. - Fecha de última
actualización. - Usuario que creó/actualizó el perfil.

**Criterios de aceptación:** - No se puede asociar un perfil a un
contratista inexistente. - No se duplican perfiles por doble envío o
concurrencia. - El perfil muestra claramente a qué contratista
pertenece.

### RF-02. Información NAP

**Actor:** Administrador / usuario SEO; contratista en modo lectura.

NAP corresponde a:

-   **Name:** nombre comercial.
-   **Address:** dirección física.
-   **Phone:** teléfono.

Se recomienda mostrar también, si el sistema dispone de ellos: - Sitio
web. - Categoría principal y servicios. - Ciudad, estado/provincia y
código postal. - Área de servicio. - Coordenadas geográficas. - Horarios
de atención.

**Regla de fuente de datos:** el NAP debe obtenerse del registro maestro
del contratista. No se debe mantener una copia editable e independiente
sin una razón funcional. Si el equipo SEO necesita corregir un dato,
debe utilizar el flujo autorizado de actualización del contratista o
solicitar la corrección al área responsable.

**Validaciones:** - Nombre comercial obligatorio. - Dirección y teléfono
según los requisitos del negocio y la disponibilidad de los datos
maestros. - Normalizar formato telefónico y dirección cuando sea
posible, sin alterar el dato original. - Mostrar claramente los campos
faltantes. - Registrar cuándo se consultó o actualizó por última vez la
información.

**Panel del contratista:** muestra los mismos datos NAP sin controles de
edición.

### RF-03. Administración de 25 keywords

**Actor:** Administrador / usuario SEO; contratista en modo lectura.

**Descripción:** permitir registrar hasta 25 palabras clave por perfil
SEO.

**Funciones:** - Agregar keywords individualmente. - Pegar múltiples
keywords, una por línea. - Editar una keyword. - Eliminar una keyword. -
Consultar el total registrado. - Asociar cada keyword al perfil SEO. -
Marcar keyword como activa/inactiva, si se requiere conservar histórico
sin utilizarla en nuevos escaneos. - Mostrar fecha de alta y usuario
responsable.

**Reglas de negocio:** - Límite inicial: máximo 25 keywords activas por
perfil SEO. - El sistema debe validar duplicados ignorando diferencias
triviales de mayúsculas/minúsculas y espacios. - El sistema debe limpiar
espacios al inicio y final. - No aceptar líneas vacías como keywords. -
No guardar una carga si excede el límite sin informar cuáles registros
no se procesaron. - El alcance de "25" debe confirmarse: este documento
lo interpreta como 25 keywords por contratista/perfil SEO, no 25 para
toda la plataforma.

**Carga múltiple:** 1. El usuario pega las palabras clave. 2. El sistema
separa por salto de línea (y opcionalmente por coma, si se acuerda). 3.
Presenta una previsualización. 4. Identifica duplicados, vacíos y
excedentes. 5. El usuario confirma el guardado. 6. Se muestra el
resultado: agregadas, omitidas y motivo.

**Panel del contratista:** lista las keywords, su estado y, cuando
exista información, sus resultados de posicionamiento. No puede
alterarlas.

### RF-04. Gestión de contenido SEO

**Actor:** Administrador / usuario SEO; contratista en modo lectura.

El módulo tendrá tres categorías: **Posts, Reviews y Noticias**.

#### 4.4.1 Campos comunes

-   Contratista/perfil SEO asociado.
-   Tipo de contenido.
-   Título, cuando aplique.
-   Texto/contenido.
-   Imagen o recurso multimedia, si aplica.
-   Keywords relacionadas.
-   URL de destino o fuente, si aplica.
-   Estado: borrador, pendiente, publicado, archivado o rechazado, según
    el flujo que se defina.
-   Fecha de creación.
-   Fecha de publicación, si aplica.
-   Autor/usuario responsable.
-   Fecha de última modificación.

#### 4.4.2 Posts

Permitir crear, editar, consultar y archivar publicaciones relacionadas
con el negocio.

Campos sugeridos: - Título. - Cuerpo. - Imagen. - Keyword principal. -
Keywords secundarias. - URL de destino. - Estado. - Fecha de
publicación.

#### 4.4.3 Reviews

El módulo debe administrar reseñas auténticas de clientes o respuestas
asociadas a ellas.

Campos sugeridos: - Fuente/plataforma. - Nombre público del autor, si
está permitido. - Calificación, si la fuente la proporciona. - Texto de
la reseña. - Fecha de la reseña. - URL de origen. - Respuesta del
negocio, si existe. - Estado de revisión/moderación.

**Regla de integridad:** no se deben inventar reseñas ni presentar
contenido generado por IA como si fuera una opinión real de un cliente.
Si se incluye asistencia de IA para redactar respuestas, debe quedar
claro que la respuesta requiere revisión y aprobación humana.

#### 4.4.4 Noticias

Permitir registrar novedades del contratista o de su actividad
comercial.

Campos sugeridos: - Título. - Resumen. - Contenido. - Imagen. - Fuente o
URL, si aplica. - Fecha de publicación. - Keywords relacionadas. -
Estado.

#### 4.4.5 Publicación externa

El registro de contenido en el panel no implica que se publique
automáticamente en Google, el sitio web del contratista o
redes/directorios externos.

La primera versión puede funcionar como repositorio y panel de
seguimiento. Si se requiere publicación automática, se debe especificar
por plataforma: - API disponible y permisos. - Cuenta que autoriza la
publicación. - Estados de sincronización. - Manejo de errores. -
Reintentos. - Registro de URL publicada.

**Panel del contratista:** puede consultar los contenidos y sus estados,
pero no crear, editar, eliminar ni cambiar estados.

### RF-05. Catálogo y asociaciones de directorios

**Actor:** Administrador / usuario SEO; contratista en modo lectura.

Se deben distinguir dos conceptos:

1.  **Catálogo de directorios:** directorios disponibles globalmente
    (por ejemplo, Yelp, Bing Places, Apple Business Connect, Angi o
    Yellow Pages).
2.  **Listado del contratista en un directorio:** registro individual
    que indica si el contratista tiene perfil en ese directorio y cuál
    es su URL.

**Campos del catálogo:** - Nombre del directorio. - URL principal. -
Descripción/categoría. - Estado activo/inactivo.

**Campos de la asociación con el contratista:** - Perfil
SEO/contratista. - Directorio. - URL específica del perfil del
negocio. - Estado: pendiente, en proceso, publicado, requiere
corrección, no aplica o no verificado. - Fecha de registro. - Fecha de
última verificación. - Observaciones. - Usuario responsable.

**Funciones:** - Crear y editar directorios del catálogo. - Asociar un
directorio a uno o varios contratistas. - Registrar la URL específica
del perfil del negocio. - Actualizar el estado. - Registrar
observaciones y fecha de verificación. - Evitar asociaciones duplicadas
para el mismo contratista y directorio.

**Regla importante:** guardar la URL principal de Yelp o de otro
directorio no demuestra que el contratista tenga un perfil publicado. Se
debe guardar por separado la URL del perfil específico y su estado de
verificación.

No se debe afirmar que el sistema publica automáticamente en un
directorio si no existe una integración autorizada que realice esa
operación.

**Panel del contratista:** muestra directorio, URL del perfil, estado y
última verificación. Los enlaces externos pueden abrirse en otra
pestaña. No permite modificar registros ni estados.

### RF-06. Configuración de Local Grid

**Actor:** Administrador / usuario SEO.

**Descripción:** configurar un análisis geográfico para una keyword y un
contratista.

**Parámetros sugeridos:** - Contratista/perfil SEO. - Keyword activa. -
Ubicación central. - Coordenadas de referencia (latitud/longitud). -
Radio o distancia entre puntos. - Dimensiones de la cuadrícula (por
ejemplo, 5 × 5 o 7 × 7). - Límite de resultados que devolverá el
proveedor. - Idioma y país, cuando el proveedor lo requiera. -
Motor/plataforma consultada. - Fecha y hora de ejecución.

Los valores de dimensiones y radio son configurables y deben aprobarse
con el negocio. No se consideran definitivos por aparecer como ejemplos.

**Validaciones:** - La keyword debe pertenecer al perfil SEO
seleccionado y estar activa. - El perfil debe tener
ubicación/coordenadas válidas. - La configuración debe respetar los
límites del proveedor de datos. - El usuario debe recibir una estimación
o advertencia de consumo/costo antes de ejecutar análisis de alto
volumen, si el proveedor cobra por consulta.

### RF-07. Ejecución del Local Grid y captura de rankings

**Dependencia externa:** proveedor/API de ranking local.

El sistema debe integrar un servicio capaz de obtener resultados de
búsqueda local o Google Maps para coordenadas específicas. La fuente,
cobertura, límites, costo y condiciones de uso deben validarse antes de
implementar.

**Flujo sugerido:** 1. El usuario SEO selecciona contratista y keyword.
2. Selecciona o crea la configuración geográfica. 3. El backend genera
los puntos de la cuadrícula. 4. El backend crea una ejecución (`scan`)
con estado pendiente. 5. Un proceso de trabajo ejecuta las consultas
contra el proveedor. 6. Se almacenan los resultados por punto. 7. Se
actualiza el estado de la ejecución: completada, parcial o fallida. 8.
La interfaz muestra el mapa y sus métricas.

**Datos por punto:** - Identificador del escaneo. - Latitud y
longitud. - Posición/ranking del negocio. - Nombre y URL del resultado,
si el proveedor lo entrega y su uso está permitido. - Estado del punto:
encontrado, fuera del límite, sin resultado o error. - Fecha/hora de
consulta. - Identificador de consulta del proveedor, si aplica.

**Reglas:** - No inventar posiciones cuando la API no devuelve
resultados. - Diferenciar "no encontrado dentro del límite consultado"
de "error de consulta". - Guardar la respuesta mínima necesaria para
auditoría y depuración, respetando las condiciones del proveedor. -
Evitar ejecutar consultas sin control desde el navegador. - Permitir
reintentos controlados para fallos transitorios. - No sobrescribir
escaneos históricos: cada ejecución debe conservarse.

### RF-08. Visualización del Local Grid

**Actor:** Administrador, usuario SEO y contratista (solo lectura).

El mapa debe representar cada coordenada de la cuadrícula con un
marcador o celda que indique la posición obtenida.

**Elementos de interfaz:** - Nombre del contratista. - Keyword
consultada. - Fecha y hora del escaneo. - Ubicación central. - Radio y
dimensiones de la cuadrícula. - Mapa con puntos geográficos. - Posición
por punto. - Leyenda de colores. - Resumen de métricas. - Acceso a
ejecuciones anteriores.

**Leyenda sugerida, configurable:** - Verde: posiciones 1--3. -
Amarillo: posiciones 4--10. - Naranja: posiciones 11--20. - Rojo:
posiciones superiores a 20 o fuera del rango visible, diferenciándolo de
errores. - Gris: sin dato o consulta fallida.

La leyenda debe corresponder al límite de resultados realmente
solicitado al proveedor. Si el proveedor devuelve un máximo distinto, la
interfaz debe reflejarlo.

**Métricas sugeridas:** - Posición promedio de los puntos donde se
encontró el negocio. - Mejor posición. - Peor posición. - Cantidad de
puntos con resultado. - Cantidad de puntos sin resultado dentro del
límite. - Porcentaje de puntos en Top 3. - Porcentaje de puntos en Top
10. - Variación frente al escaneo anterior comparable.

Las métricas deben indicar cómo se calculan. Por ejemplo, la posición
promedio no debe tratar los puntos sin resultado como posición cero.

### RF-09. Local Pack

El Local Pack es la sección de resultados locales de Google que puede
mostrar negocios y un mapa para determinadas búsquedas.

Debe tratarse como un concepto de visibilidad/resultados locales, no
como un objeto que la plataforma pueda generar directamente.

La plataforma puede: - Consultar y registrar resultados locales si el
proveedor los ofrece. - Mostrar si el negocio aparece dentro del
conjunto de resultados observado. - Mostrar la posición devuelta por el
proveedor. - Relacionar la medición con keyword, ubicación y fecha.

La plataforma no puede garantizar la aparición del negocio en el Local
Pack. Los resultados pueden variar por ubicación, consulta, momento,
dispositivo y otros factores.

### RF-10. Dashboard y reportes

**Administrador / SEO:** consulta global o por contratista, según
permisos.

**Contratista:** consulta únicamente sus propios resultados.

**Resumen sugerido:** - Estado general del perfil SEO. - NAP y datos
faltantes. - Número de keywords activas (máximo 25). - Contenidos por
categoría y estado. - Directorios asociados y estado. - Último Local
Grid ejecutado. - Métricas del último escaneo. - Comparación con
escaneos anteriores.

**Reportes:** - Filtro por rango de fechas. - Filtro por keyword. -
Filtro por contratista (solo administrador/SEO). - Historial de
escaneos. - Comparación de resultados. - Exportación PDF/CSV, si se
aprueba.

Los reportes deben incluir la fecha de medición, keyword, ubicación,
fuente de datos y limitaciones relevantes.

------------------------------------------------------------------------

## 7. Requerimientos específicos del panel del contratista

Este requisito es transversal y obligatorio.

### 7.1 Objetivo

Permitir que cada contratista tenga transparencia sobre la estrategia
SEO que se administra para su negocio y pueda consultar el estado y los
resultados sin alterar la configuración.

### 7.2 Secciones visibles

  -----------------------------------------------------------------------
  Sección                 Información visible     Acciones permitidas
  ----------------------- ----------------------- -----------------------
  Resumen SEO             Estado del perfil y     Consultar
                          resumen de resultados

  NAP                     Nombre, dirección,      Consultar
                          teléfono y demás datos
                          disponibles

  Keywords                Hasta 25 keywords,      Consultar/filtrar
                          estado y resultados
                          asociados

  Posts                   Título, contenido,      Consultar
                          fecha y estado

  Reviews                 Reseñas auténticas,     Consultar
                          fuente, calificación y
                          respuestas registradas

  Noticias                Título, contenido,      Consultar
                          fuente y fecha

  Directorios             Nombre, URL del perfil, Consultar/abrir enlace
                          estado y última
                          verificación

  Local Pack              Resultados observados,  Consultar
                          si están disponibles

  Local Grid              Mapa, posiciones,       Consultar
                          leyenda y fecha del
                          escaneo

  Reportes                Historial y métricas    Consultar; exportar si
                          del propio contratista  se autoriza
  -----------------------------------------------------------------------

### 7.3 Reglas de solo lectura

-   No mostrar botones de crear, editar, eliminar, guardar, publicar,
    asociar o ejecutar.
-   No permitir edición mediante formularios manipulados o peticiones
    directas.
-   No permitir que el contratista cambie el `contractor_id` de la
    consulta.
-   No exponer datos de otros contratistas en respuestas, listados,
    archivos o reportes.
-   Si una sección no tiene información, mostrar un estado vacío claro
    (por ejemplo, "Aún no hay keywords registradas").
-   Mostrar cuándo se actualizó por última vez cada bloque de
    información.
-   Los enlaces a directorios externos deben abrir la URL guardada y
    validada.

### 7.4 Experiencia visual

Se recomienda mantener coherencia visual entre ambos paneles: - Mismos
nombres de secciones. - Mismos datos y métricas. - Componentes de
visualización reutilizables. - En el panel administrador, los
componentes incluyen controles de gestión. - En el panel del
contratista, los controles de gestión se omiten y se presenta la
información en modo lectura.

No es necesario duplicar la lógica de negocio. Se recomienda reutilizar
componentes de presentación con permisos/acciones condicionados por rol,
manteniendo la autorización real en el backend.

------------------------------------------------------------------------

## 8. Modelo de datos conceptual

El siguiente modelo es una propuesta lógica. Debe adaptarse a la base de
datos, nomenclatura y relaciones existentes en el proyecto.

### 8.1 Entidades

#### `seo_profiles`

Un perfil SEO asociado a un contratista.

Campos sugeridos: - `id` - `contractor_id` (FK al contratista
existente) - `status` - `created_by` - `updated_by` - `created_at` -
`updated_at`

Restricción recomendada: índice único para `contractor_id` si se permite
un solo perfil por contratista.

#### `seo_keywords`

-   `id`
-   `seo_profile_id`
-   `keyword`
-   `normalized_keyword`
-   `status` (active/inactive)
-   `created_by`
-   `created_at`
-   `updated_at`

Restricciones: - Índice único por perfil y keyword normalizada. -
Validación de máximo 25 keywords activas por perfil en la capa de
servicio/transacción.

#### `seo_contents`

-   `id`
-   `seo_profile_id`
-   `type` (post/review/news)
-   `title`
-   `body`
-   `media_url` (nullable)
-   `source_url` (nullable)
-   `target_url` (nullable)
-   `rating` (nullable; aplicable a review)
-   `author_label` (nullable)
-   `status`
-   `published_at` (nullable)
-   `created_by`
-   `updated_by`
-   `created_at`
-   `updated_at`

Si el proyecto necesita gestionar reseñas y respuestas con mayor
detalle, se recomienda separar `seo_reviews` y `seo_review_responses` en
tablas propias.

#### `seo_content_keywords`

-   `content_id`
-   `keyword_id`

Tabla pivote para asociar contenido con una o varias keywords.

#### `seo_directories`

-   `id`
-   `name`
-   `base_url`
-   `description`
-   `status`
-   `created_at`
-   `updated_at`

#### `seo_directory_listings`

-   `id`
-   `seo_profile_id`
-   `directory_id`
-   `listing_url`
-   `status`
-   `last_verified_at`
-   `notes`
-   `created_by`
-   `updated_by`
-   `created_at`
-   `updated_at`

Restricción recomendada: combinación única de `seo_profile_id` y
`directory_id`, si solo se permite un listado por directorio y
contratista.

#### `seo_grid_settings`

-   `id`
-   `seo_profile_id`
-   `center_latitude`
-   `center_longitude`
-   `radius_or_spacing`
-   `grid_rows`
-   `grid_columns`
-   `country`
-   `language`
-   `provider`
-   `created_by`
-   `created_at`
-   `updated_at`

#### `seo_grid_scans`

-   `id`
-   `seo_profile_id`
-   `keyword_id`
-   `grid_settings_id`
-   `status` (queued/running/completed/partial/failed)
-   `provider`
-   `provider_job_id` (nullable)
-   `started_at`
-   `completed_at`
-   `error_summary` (nullable)
-   `created_by`
-   `created_at`

#### `seo_grid_points`

-   `id`
-   `scan_id`
-   `latitude`
-   `longitude`
-   `rank_position` (nullable)
-   `result_name` (nullable)
-   `result_url` (nullable)
-   `point_status`
-   `provider_payload_reference` (nullable)
-   `queried_at`

#### `seo_audit_logs`

-   `id`
-   `actor_user_id`
-   `seo_profile_id`
-   `entity_type`
-   `entity_id`
-   `action`
-   `before_data` (si aplica)
-   `after_data` (si aplica)
-   `created_at`

### 8.2 Relación conceptual

``` text
contractors
   |
   | 1:1 (propuesta inicial)
   v
seo_profiles
   |---- 1:N ---- seo_keywords
   |                  |
   |                  | N:M
   |                  v
   |             seo_contents
   |
   |---- 1:N ---- seo_directory_listings ---- N:1 ---- seo_directories
   |
   |---- 1:N ---- seo_grid_settings
   |
   |---- 1:N ---- seo_grid_scans ---- N:1 ---- seo_keywords
                         |
                         | 1:N
                         v
                   seo_grid_points
```

La relación entre `contractors` y `seo_profiles` debe ajustarse si el
negocio maneja varias sucursales o ubicaciones por contratista. En ese
caso, el perfil debe relacionarse con una entidad de ubicación/sucursal
y no solo con el contratista general.

------------------------------------------------------------------------

## 9. API / servicios de backend sugeridos

Los nombres son ilustrativos; deben adaptarse al framework y
convenciones actuales.

### 9.1 Perfiles SEO

-   `GET /api/admin/seo/profiles`
-   `POST /api/admin/seo/profiles`
-   `GET /api/admin/seo/profiles/{profileId}`
-   `PATCH /api/admin/seo/profiles/{profileId}`

El endpoint del contratista debe resolverse desde su identidad
autenticada, por ejemplo: - `GET /api/contractor/me/seo`

No debe permitir consultar perfiles ajenos mediante un `contractor_id`
arbitrario.

### 9.2 Keywords

-   `GET /api/admin/seo/profiles/{profileId}/keywords`
-   `POST /api/admin/seo/profiles/{profileId}/keywords`
-   `POST /api/admin/seo/profiles/{profileId}/keywords/bulk`
-   `PATCH /api/admin/seo/keywords/{keywordId}`
-   `DELETE /api/admin/seo/keywords/{keywordId}`

Vista del contratista: - `GET /api/contractor/me/seo/keywords`

### 9.3 Contenido

-   `GET /api/admin/seo/profiles/{profileId}/contents`
-   `POST /api/admin/seo/profiles/{profileId}/contents`
-   `GET /api/admin/seo/contents/{contentId}`
-   `PATCH /api/admin/seo/contents/{contentId}`
-   `DELETE /api/admin/seo/contents/{contentId}`

Vista del contratista: - `GET /api/contractor/me/seo/contents`

Se puede agregar un filtro `type=post|review|news`.

### 9.4 Directorios

-   `GET /api/admin/seo/directories`
-   `POST /api/admin/seo/directories`
-   `PATCH /api/admin/seo/directories/{directoryId}`
-   `GET /api/admin/seo/profiles/{profileId}/directories`
-   `POST /api/admin/seo/profiles/{profileId}/directories`
-   `PATCH /api/admin/seo/directory-listings/{listingId}`

Vista del contratista: - `GET /api/contractor/me/seo/directories`

### 9.5 Local Grid

-   `GET /api/admin/seo/profiles/{profileId}/grid-settings`
-   `POST /api/admin/seo/profiles/{profileId}/grid-settings`
-   `POST /api/admin/seo/profiles/{profileId}/scans`
-   `GET /api/admin/seo/scans/{scanId}`
-   `GET /api/admin/seo/scans/{scanId}/points`
-   `GET /api/admin/seo/profiles/{profileId}/scans`

Vista del contratista: - `GET /api/contractor/me/seo/grid` -
`GET /api/contractor/me/seo/scans/{scanId}`

Los endpoints de contratista solo deben devolver escaneos que
pertenezcan al perfil del usuario autenticado.

### 9.6 Dashboard

-   `GET /api/admin/seo/profiles/{profileId}/dashboard`
-   `GET /api/contractor/me/seo/dashboard`

El backend debe aplicar filtros de autorización antes de devolver
cualquier dato.

------------------------------------------------------------------------

## 10. Integración de ranking local

La integración con un proveedor de datos es una dependencia crítica para
que el Local Grid muestre posiciones reales.

### 10.1 Requisitos para seleccionar proveedor

Evaluar: - Cobertura del país/ciudad donde operan los contratistas. -
Soporte de búsquedas locales y resultados de Google Maps/Local Finder. -
Consultas por coordenadas geográficas. - Límite de resultados por
consulta. - Precio por consulta o crédito. - Velocidad y límites de
concurrencia. - Capacidad de consultar múltiples keywords. -
Identificador de solicitud y trazabilidad. - Política de retención y uso
de datos. - Disponibilidad, soporte y SLA.

No se debe asumir que una API genérica de mapas devuelve rankings de
Google. El proveedor debe demostrar que ofrece resultados de búsqueda
local/ranking para coordenadas.

### 10.2 Procesamiento asíncrono

Los escaneos pueden implicar muchas solicitudes y no deben depender de
una petición HTTP abierta desde el navegador.

Se recomienda: - Crear el escaneo y devolver un identificador. -
Procesarlo mediante cola de trabajos/worker. - Actualizar el estado del
escaneo. - Consultar el progreso desde la interfaz. - Aplicar reintentos
con límites. - Evitar duplicados mediante una clave de idempotencia. -
Limitar concurrencia y controlar consumo/costo.

### 10.3 Estimación de volumen

Ejemplo ilustrativo: 25 keywords por contratista y una cuadrícula de 5 ×
5 representan hasta 25 × 25 = 625 consultas por contratista y ejecución
completa, si cada combinación keyword/punto requiere una consulta
individual.

Para 100 contratistas serían hasta 62.500 consultas por ejecución. El
volumen real depende del proveedor, de cómo agrupe solicitudes y de las
dimensiones de la cuadrícula.

Antes de habilitar ejecuciones masivas, se debe implementar una
estimación de consumo y un límite de uso.

------------------------------------------------------------------------

## 11. Reglas de negocio transversales

1.  Cada perfil SEO debe estar vinculado a un contratista válido.
2.  La información de un contratista no debe mezclarse con la de otro.
3.  El máximo inicial será de 25 keywords activas por perfil SEO.
4.  Las keywords duplicadas no deben guardarse.
5.  El NAP se obtiene del registro maestro del contratista, salvo
    decisión explícita de mantener datos específicos por sucursal.
6.  Posts, reviews y noticias deben identificarse claramente por tipo.
7.  Las reviews deben representar opiniones reales y conservar fuente
    cuando esté disponible.
8.  El catálogo de directorios es distinto de los listados de cada
    contratista.
9.  La URL del perfil en el directorio es distinta de la URL principal
    del directorio.
10. Un escaneo histórico no se sobrescribe con uno nuevo.
11. Los resultados sin posición deben diferenciarse de los errores de
    consulta.
12. El contratista solo puede consultar su propia información.
13. El rol de contratista no puede ejecutar operaciones de escritura,
    incluso si invoca endpoints directamente.
14. La plataforma no debe afirmar que una publicación está activa en una
    plataforma externa sin confirmación verificable.
15. La plataforma no debe garantizar posiciones ni presencia en el Local
    Pack.

------------------------------------------------------------------------

## 12. Seguridad, auditoría y privacidad

-   Aplicar autorización basada en roles y alcance de recurso.
-   Validar permisos en backend para cada operación.
-   Usar el contratista asociado al usuario autenticado para las vistas
    del portal.
-   Evitar exposición de IDs o datos de otros contratistas.
-   Validar URLs externas y permitir únicamente esquemas seguros
    (`https`, y `http` solo si el negocio lo autoriza).
-   Escapar/sanitizar contenido para evitar XSS.
-   Limitar tamaño de textos, archivos e imágenes.
-   Restringir tipos y tamaños de archivos.
-   Proteger credenciales de proveedores mediante variables/secret
    manager; nunca exponerlas en frontend.
-   Registrar operaciones de creación, modificación, eliminación,
    ejecución de escaneos y cambios de estado.
-   Registrar actor, fecha, entidad y valores modificados cuando
    corresponda.
-   Aplicar rate limiting a endpoints de escaneo.
-   No guardar más datos de terceros de los necesarios.
-   Definir retención de resultados y respuestas del proveedor.
-   Mantener trazabilidad de fallos de integración sin exponer detalles
    sensibles al contratista.

------------------------------------------------------------------------

## 13. Estados y mensajes de interfaz

### 13.1 Estados de perfil SEO

-   Sin configurar.
-   Configurado.
-   Inactivo.

### 13.2 Estados de contenido

-   Borrador.
-   Pendiente de revisión.
-   Publicado (solo si la publicación está confirmada).
-   Archivado.
-   Rechazado, si se incorpora moderación.

### 13.3 Estados de directorio

-   Pendiente.
-   En proceso.
-   Publicado.
-   Requiere corrección.
-   No aplica.
-   No verificado.

### 13.4 Estados de Local Grid

-   En cola.
-   En ejecución.
-   Completado.
-   Completado parcialmente.
-   Fallido.

La interfaz debe explicar los estados y no confundir "pendiente" con
"publicado".

------------------------------------------------------------------------

## 14. Requerimientos no funcionales

### Rendimiento

-   Las vistas de consulta deben paginar listas extensas.
-   Los escaneos deben ejecutarse en segundo plano.
-   Los resultados del mapa deben cargarse por escaneo, no recalcularse
    en cada renderizado.
-   Crear índices para claves foráneas, estados y fechas de consulta.

### Escalabilidad

-   Separar la ejecución de escaneos del servidor web mediante
    workers/colas.
-   Controlar la concurrencia por proveedor y por cuenta.
-   Considerar almacenamiento histórico y políticas de retención.

### Usabilidad

-   Mantener consistencia con el diseño actual del sistema.
-   Mostrar mensajes de validación claros.
-   Confirmar acciones destructivas.
-   Mostrar estados vacíos y errores de integración.
-   Indicar la fecha de última actualización de los datos.

### Mantenibilidad

-   Separar lógica de negocio, integración con proveedor y presentación.
-   Encapsular el proveedor de ranking detrás de una interfaz/servicio
    para poder cambiarlo.
-   Documentar variables de entorno y procesos de worker.
-   Crear pruebas automatizadas de permisos y aislamiento entre
    contratistas.

------------------------------------------------------------------------

## 15. Criterios de aceptación generales

La funcionalidad se considerará aceptada cuando se cumpla lo siguiente:

### Perfil y NAP

-   [ ] El usuario SEO puede seleccionar un contratista existente.
-   [ ] El sistema muestra el NAP del contratista seleccionado.
-   [ ] No se crean perfiles duplicados de manera accidental.
-   [ ] El contratista puede consultar su NAP sin editarlo.

### Keywords

-   [ ] Se pueden registrar keywords individualmente y en bloque.
-   [ ] Se valida el límite de 25 keywords activas por perfil.
-   [ ] Se detectan duplicados y líneas vacías.
-   [ ] El contratista puede consultar sus keywords, pero no
    modificarlas.

### Contenido

-   [ ] Existen las categorías Posts, Reviews y Noticias.
-   [ ] Los registros quedan asociados al contratista correcto.
-   [ ] Se muestran estado y fechas.
-   [ ] El contratista puede consultar el contenido en modo lectura.
-   [ ] Las reseñas no se presentan como reales si son contenido
    ficticio o generado.

### Directorios

-   [ ] Existe un catálogo de directorios.
-   [ ] Se puede asociar un directorio a un contratista.
-   [ ] Se registra la URL específica del perfil del negocio.
-   [ ] Se puede actualizar y consultar el estado de verificación.
-   [ ] El contratista solo consulta sus asociaciones.

### Local Grid

-   [ ] Se puede configurar keyword y ubicación.
-   [ ] Se generan coordenadas de cuadrícula.
-   [ ] El escaneo se ejecuta mediante el proveedor aprobado.
-   [ ] Se guardan resultados por punto y fecha.
-   [ ] Se diferencian posiciones, ausencia de resultado y errores.
-   [ ] Se visualiza el mapa y las métricas.
-   [ ] El contratista puede consultar sus resultados sin ejecutar
    escaneos.
-   [ ] Se conserva el historial de escaneos.

### Seguridad

-   [ ] El contratista no puede consultar datos de otro contratista.
-   [ ] El contratista no puede escribir datos mediante endpoints
    directos.
-   [ ] Las credenciales de API no se exponen en el cliente.
-   [ ] Las operaciones administrativas quedan auditadas.

------------------------------------------------------------------------

## 16. Plan de implementación recomendado

### Fase 0. Descubrimiento y decisiones técnicas

-   Revisar el modelo actual de contratistas, usuarios, roles y
    permisos.
-   Confirmar si existe una entidad de sucursales/ubicaciones.
-   Definir si habrá un perfil SEO por contratista o por ubicación.
-   Confirmar alcance de las 25 keywords.
-   Definir si los directorios son solo seguimiento o publicación
    automatizada.
-   Seleccionar y validar proveedor de Local Rank Tracking.
-   Estimar consumo, costos y frecuencia de escaneo.
-   Aprobar diseño funcional de ambos paneles.

**Entregable:** alcance aprobado, modelo de datos y proveedor
seleccionado (o decisión de posponer Local Grid real).

### Fase 1. Perfil SEO y NAP

-   Crear tablas/migraciones del perfil SEO.
-   Relacionar perfil con contratista existente.
-   Implementar selección de contratista.
-   Mostrar NAP desde la fuente maestra.
-   Implementar permisos por rol.
-   Crear vista de solo lectura del contratista.

**Entregable:** cada contratista puede tener su perfil SEO y consultar
sus datos base.

### Fase 2. Keywords

-   Crear modelo y endpoints.
-   Implementar alta individual y carga múltiple.
-   Implementar límite de 25.
-   Implementar validaciones y deduplicación.
-   Crear vistas administrador y contratista.

**Entregable:** gestión completa de keywords y consulta de solo lectura.

### Fase 3. Contenido SEO

-   Implementar Posts.
-   Implementar Reviews.
-   Implementar Noticias.
-   Implementar estados, fechas y asociación de keywords.
-   Crear vistas de consulta para contratistas.

**Entregable:** repositorio de contenido SEO por contratista.

### Fase 4. Directorios

-   Crear catálogo global.
-   Crear asociaciones por contratista.
-   Registrar URLs y estados.
-   Implementar fechas de verificación y observaciones.
-   Crear vista de consulta para contratistas.

**Entregable:** control de directorios y perfiles externos.

### Fase 5. Local Grid

-   Integrar proveedor.
-   Implementar cola de trabajos.
-   Crear configuración geográfica.
-   Generar puntos.
-   Consultar ranking por keyword/punto.
-   Guardar resultados e historial.
-   Implementar mapa, leyenda y métricas.
-   Habilitar consulta de resultados en panel del contratista.

**Entregable:** Local Grid funcional con datos reales del proveedor.

### Fase 6. Dashboard, reportes y estabilización

-   Crear resumen SEO por contratista.
-   Crear historial y comparaciones.
-   Implementar exportaciones aprobadas.
-   Realizar pruebas de seguridad, permisos y rendimiento.
-   Documentar operación y soporte.

**Entregable:** módulo listo para puesta en producción.

------------------------------------------------------------------------

## 17. Plan de pruebas

### Pruebas de permisos

-   Usuario SEO administra el perfil autorizado.
-   Contratista A no puede consultar el perfil de contratista B.
-   Contratista no puede crear keywords mediante API.
-   Contratista no puede editar contenido mediante API.
-   Contratista no puede ejecutar un escaneo mediante API.
-   Usuario sin rol autorizado no puede acceder al módulo.

### Pruebas de datos

-   Perfil SEO asociado a contratista existente.
-   Rechazo de keywords duplicadas.
-   Rechazo o advertencia al superar 25 keywords activas.
-   Asociación correcta de contenidos y directorios.
-   Integridad de resultados entre escaneo, keyword y perfil.

### Pruebas de integración

-   Respuesta exitosa del proveedor.
-   Timeout del proveedor.
-   Error de autenticación.
-   Límite de solicitudes alcanzado.
-   Resultado parcial.
-   Reintento sin duplicar resultados.
-   Escaneo fallido con mensaje comprensible.

### Pruebas de interfaz

-   Vista administrativa con controles.
-   Vista de contratista sin controles de edición.
-   Estados vacíos.
-   Carga y paginación.
-   Visualización del mapa en escritorio y móvil.
-   Diferenciación visual de ranking, sin resultado y error.

------------------------------------------------------------------------

## 18. Decisiones pendientes de aprobación

Antes de cerrar el diseño técnico, el responsable del producto debe
responder:

1.  ¿Las 25 keywords son por contratista, por sucursal o por cuenta?
2.  ¿Un contratista puede tener varias ubicaciones físicas?
3.  ¿El NAP se consulta exclusivamente desde los datos existentes o se
    requiere una ficha SEO independiente?
4.  ¿Los posts, reviews y noticias son solo registros internos o deben
    publicarse en plataformas externas?
5.  ¿Las reviews provendrán de fuentes externas, serán cargadas
    manualmente o ambas?
6.  ¿Los directorios se administran como un checklist de presencia o se
    espera automatizar altas/publicaciones?
7.  ¿Qué proveedor se utilizará para obtener rankings locales reales?
8.  ¿Qué países/ciudades deben cubrirse?
9.  ¿Qué dimensiones de grid y radio se ofrecerán?
10. ¿Con qué frecuencia se ejecutarán los escaneos?
11. ¿El contratista podrá exportar sus reportes o solo consultarlos?
12. ¿El contratista verá todas las keywords y todo el contenido o solo
    los elementos marcados como visibles para él?
13. ¿Se necesita aprobación del contratista antes de publicar contenido
    externamente?
14. ¿Se requiere un historial de cambios del NAP y de las keywords?

------------------------------------------------------------------------

## 19. Recomendación final de arquitectura

Se recomienda implementar un único módulo de negocio SEO Local con dos
interfaces basadas en permisos:

-   **Administración:** operaciones de escritura, configuración y
    ejecución.
-   **Contratista:** consulta de datos y resultados propios.

La lógica, los modelos y los servicios deben compartirse. La diferencia
entre ambos paneles debe estar en la autorización y en las acciones que
ofrece la interfaz, no en mantener dos sistemas de datos independientes.

El desarrollo debe priorizar primero la gestión de perfiles, NAP,
keywords, contenido y directorios. El Local Grid real debe implementarse
cuando se haya seleccionado y validado el proveedor de ranking local, ya
que sin esa integración solo sería posible mostrar una representación
visual sin datos de posicionamiento verificables.

**Resultado esperado:** un módulo centralizado de SEO Local que permita
al equipo SEO administrar la estrategia de cada contratista y que
permita a cada contratista consultar, desde su propio panel y en modo de
solo lectura, la información y los resultados de esa estrategia.
