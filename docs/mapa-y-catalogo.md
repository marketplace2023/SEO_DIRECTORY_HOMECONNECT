# Mapa y catálogo de HOME CONNECT

Implementación del 18 de noviembre de 2026. Mantiene servicios del hogar como enfoque y Georgia como mercado inicial. No incorpora otras industrias de Yelp ni importa sus negocios.

## Catálogo explicado

Desde el 19 de noviembre de 2026, el menú Servicios y las categorías de la portada llevan a páginas dedicadas:

- `/#/categories`: índice de las 48 categorías, con descripción breve, imagen y enlaces a sus 96 subcategorías. La búsqueda acepta nombres de categorías, subcategorías y servicios.
- `/#/categories/siding`: página exclusiva de una categoría, con su explicación, imagen, límites y subcategorías; no incluye la navegación lateral del catálogo general.
- `/#/categories/siding/siding-installation`: detalle de una subcategoría con los servicios que le corresponden y un enlace al directorio filtrado.

Las páginas permiten regresar a su categoría o al índice, conservan el idioma y pueden abrirse directamente o recargarse. Un identificador inexistente o una subcategoría de otra categoría muestra la página no disponible. Se reutilizan las imágenes del catálogo. El catálogo anterior en `/#/catalog` sigue disponible.

Los textos breves de las tarjetas del índice se mantienen separados de las explicaciones de detalle. `src/data/category-guides.ts` contiene conceptos propios para las 48 categorías, casos en los que se necesita cada oficio y definiciones para sus 96 subcategorías, en español e inglés. Las descripciones no se generan concatenando nombres de servicios. La página muestra «¿En qué consiste?» y «¿Cuándo necesitas un profesional?», con los límites del catálogo en un bloque aparte. En climatización se explican temperatura, humedad, renovación y distribución del aire, el significado de HVAC y la diferencia entre equipos/ventilación y diagnóstico/puesta a punto.

Hay **48 categorías, 96 áreas o subcategorías y 240 servicios**. Se mantienen los identificadores de las 32 categorías originales y de sus primeros 96 servicios; solicitudes, propuestas y perfiles anteriores conservan sus referencias. Las agrupaciones ahora tienen nombres propios del oficio. Inspección, diseño y limpieza tienen modalidades separadas; una inspección ya no se etiqueta como mantenimiento por estar en la tercera posición de una lista.

Se añaden contratistas generales, limpieza del hogar, retirada de enseres, mudanzas, inspección de viviendas, diseño de interiores, domótica, redes domésticas, riego, excavación, demolición selectiva, restauración por daños, chimeneas, gabinetes, encimeras y vidrios/espejos.

Cada categoría presenta:

- Definición bilingüe del oficio.
- Trabajos concretos incluidos y agrupaciones propias.
- Límites y relación con trabajos que deben acordarse aparte.
- Una fotografía de `CATEGORY_PICS` y un texto alternativo.
- Disponibilidad de perfiles publicados en Georgia, separada de la existencia de la categoría.
- Acceso al mapa filtrado y a sus servicios.

La portada utiliza las fotografías de categorías y ofrece un selector de categoría para explorar sus subcategorías con imagen y servicios. Administración → Catálogo permite buscar categorías o subcategorías, ver las miniaturas, seleccionar una categoría y consultar su fotografía, sus dos subcategorías con imagen y los servicios asociados.

Las páginas de categoría agrupan las tarjetas de servicio por subcategoría. Las subcategorías explican cuándo conviene acudir a esa área. Cada ficha en `/#/services/{id}` muestra su alcance, qué preparar al cotizar, qué acordar por separado, entregables, proceso de contratación y servicios relacionados. La solicitud abre con el servicio seleccionado. Los alcances bilingües se editan en `src/data/service-scopes.ts` y los casos de uso en `src/data/category-context.ts`.

Las páginas locales HTML por ciudad y especialidad reutilizan el contenido aprobado del catálogo y sus fotografías, sin depender de ejecutar React. Las páginas SEO siguen requiriendo publicación, oferta y las condiciones de indexación ya documentadas.

Administración → Catálogo permite crear y editar categorías, subcategorías y servicios con textos en español e inglés. Las altas y ajustes se guardan en `product_category` y `product_template` y se aplican sobre el catálogo incluido en el repositorio. Un servicio conserva su subcategoría principal y puede aparecer en otras subcategorías relacionadas sin duplicar su ficha. La cotización usa la clasificación principal del servicio.

Las 144 fotografías originales están en `public/CATEGORY_PICS`: `{id-categoria}.webp` y `{id-subcategoria}.webp`. Esos archivos se conservan intactos. Se reprodujeron franjas blancas al decodificarlos en Chrome incluso en una página vacía, con bytes idénticos al original y sin estilos; por eso la interfaz utiliza versiones JPEG sRGB en `public/CATEGORY_PICS/compatible/{id}.jpg`.

`npm run images:prepare` genera las versiones compatibles con Sharp, sin redimensionar ni recortar las fotografías. También se ejecuta antes de `npm run dev` y `npm run build`. Un manifiesto guarda hashes de entrada/salida y dimensiones; solo se regeneran archivos nuevos o modificados. Los campos `image` del catálogo apuntan a estos JPEG y se persisten en `product_category`. Los tres frontends incluyen la carpeta completa. Las 48 ilustraciones anteriores se conservan en `public/category-art` como referencia histórica; los iconos pequeños siguen utilizando React Icons.

La prueba de imágenes compara los píxeles dibujados por el navegador con la foto original decodificada mediante libvips, admitiendo la diferencia menor de compresión JPEG. Así detecta franjas o alteraciones que una respuesta HTTP 200 y `naturalWidth` no detectaban.

El contenido describe alcances orientativos, no habilita licencias ni garantiza que un profesional ofrezca todos los trabajos. Las cuentas existentes mantienen sus servicios declarados; ampliar el catálogo no les asigna automáticamente nuevas capacidades.

## Descubrimiento con lista y mapa

Ejemplos locales:

```text
http://127.0.0.1:5175/#/catalog
http://127.0.0.1:5175/#/catalog?category=home-automation
http://127.0.0.1:5175/#/coverage
http://127.0.0.1:5175/#/coverage?category=plumbing&city=Lawrenceville&region=Georgia
```

El mapa abre en Georgia cuando se accede sin filtros. La búsqueda usa la misma función que el directorio para texto, localidad atendida, categoría, subcategoría, servicio, región, país, calificación y credenciales. Se conservan los filtros al cambiar entre mapa y directorio o recargar una URL. El orden por nombre también se conserva. Los cambios de filtros dentro de la misma página no fuerzan el desplazamiento al inicio.

La lista y los marcadores comparten identificador. Cada marcador muestra la imagen del perfil en lugar de un número; si no se puede cargar, muestra las iniciales del negocio. El perfil seleccionado se distingue con un borde rojo. Seleccionar una tarjeta centra su marcador; seleccionar un marcador resalta y desplaza el listado a su tarjeta. Un perfil sin ubicación conserva su ficha y puede aparecer en búsquedas por ciudad, aunque no tenga marcador.

En escritorio, resultados a la izquierda y mapa a la derecha. En móvil, botones Lista/Mapa conservan la búsqueda. “Buscar en esta área” aplica explícitamente los límites visibles; mover el mapa no cambia resultados por sí solo. “Quitar límite del mapa” elimina ese filtro. La ubicación del navegador solo se solicita al pulsar “Mi ubicación”; si no se obtiene, se mantiene la búsqueda por ciudad y mapa.

La localización del navegador se transforma en un rectángulo aproximado de búsqueda; no es un radio contractual, un cálculo de distancia o una estimación de tiempo. Ese rectángulo forma parte de la URL compartible.

## Ubicación y áreas atendidas

La ubicación se guarda en el JSON del profesional en `res_partner`, con latitud, longitud y precisión `city` o `public`. No se crea ni renombra una tabla por esta función. El esquema valida latitudes entre -90 y 90 y longitudes entre -180 y 180.

Contratistas → Mi ficha FUR ofrece tres modalidades:

1. Centro aproximado de la ciudad, usando las localidades de referencia disponibles.
2. Punto público declarado, con coordenadas y autorización explícita en el formulario.
3. Sin marcador público. La ficha puede seguir publicada.

Los negocios nuevos de las ciudades conocidas reciben una posición aproximada al registrarse. Para una localidad desconocida no se inventan coordenadas: el representante puede declarar un punto público o mantener su ficha sin marcador. No se publican direcciones privadas ni se toman direcciones de Google Business Profile automáticamente.

Al cargar registros anteriores sin el campo, la base añade una referencia aproximada de ciudad cuando existe y la persiste. Conserva puntos explícitos, valores nulos, nombres y referencias previas. Las coordenadas de las empresas de muestra son demostrativas.

Cuando se busca dentro de los límites del mapa, también se consideran las ciudades atendidas declaradas que tienen una referencia geográfica. Si una sede queda fuera y una localidad atendida dentro, el marcador representa esa **área atendida**, con una etiqueta que lo distingue de la sede. Una cobertura escrita sin referencia geográfica no se convierte en coordenadas supuestas.

Se retira el antiguo círculo fijo de 9 km. Ningún marcador acredita domicilio, disponibilidad, cobertura verificada o tiempo de viaje. La calificación y las credenciales de los perfiles de muestra siguen siendo datos de demostración.

## Cartografía y límites actuales

Se conserva Leaflet. Las calles utilizan OpenStreetMap y la geografía local de países/condados continúa como respaldo si las teselas no están disponibles. La URL de teselas admite `VITE_MAP_TILE_URL` y el crédito HTML `VITE_MAP_TILE_ATTRIBUTION`; una fuente alternativa debe mantener la atribución que corresponda. El proveedor, sus límites y su configuración deben validarse antes de publicar. Estas variables son públicas y requieren recompilar al cambiarlas; no deben contener secretos. La documentación oficial de uso de las teselas estándar está en https://operations.osmfoundation.org/policies/tiles/.

El prototipo filtra los perfiles autorizados cargados en el navegador. No se implementa PostGIS, consultas geográficas paginadas en servidor, rutas, distancias de viaje, geocodificación global, agrupación de miles de marcadores ni una garantía de disponibilidad del proveedor de mapas. Estas capacidades requieren una etapa de escala y operación. La disponibilidad de negocios no se rellena con empresas inventadas para completar categorías.

## Comprobación

Pruebas de catálogo y activos, clasificación de inspecciones, cobertura con sede fuera del mapa, límites inválidos, privacidad de ubicación, catálogo en móvil, navegación lista/mapa, búsqueda por ubicación del navegador y configuración de un negocio nuevo. Se amplía la prueba de persistencia para cubrir la actualización de registros antiguos y la conservación de un punto declarado.

`npm run seed:export` actualiza la exportación pública de demostración. `npm run test:e2e` ejecuta los recorridos y `npm run build` compila las tres aplicaciones.
