# Mapa y catálogo de HOME CONNECT

Implementación del 18 de noviembre de 2026. Mantiene servicios del hogar como enfoque y Georgia como mercado inicial. No incorpora otras industrias de Yelp ni importa sus negocios.

## Catálogo explicado

Hay **48 categorías, 96 áreas o subcategorías y 240 servicios**. Se mantienen los identificadores de las 32 categorías originales y de sus primeros 96 servicios; solicitudes, propuestas y perfiles anteriores conservan sus referencias. Las agrupaciones ahora tienen nombres propios del oficio. Inspección, diseño y limpieza tienen modalidades separadas; una inspección ya no se etiqueta como mantenimiento por estar en la tercera posición de una lista.

Se añaden contratistas generales, limpieza del hogar, retirada de enseres, mudanzas, inspección de viviendas, diseño de interiores, domótica, redes domésticas, riego, excavación, demolición selectiva, restauración por daños, chimeneas, gabinetes, encimeras y vidrios/espejos.

Cada categoría presenta:

- Definición bilingüe del oficio.
- Trabajos concretos incluidos y agrupaciones propias.
- Límites y relación con trabajos que deben acordarse aparte.
- Una ilustración SVG original y un texto alternativo.
- Disponibilidad de perfiles publicados en Georgia, separada de la existencia de la categoría.
- Acceso al mapa filtrado y a sus servicios.

La portada utiliza las mismas ilustraciones. Las fichas de servicios muestran la explicación de su área. Las páginas locales HTML por ciudad y especialidad reutilizan el contenido aprobado del catálogo, sin depender de ejecutar React. Las páginas SEO siguen requiriendo publicación, oferta y las condiciones de indexación ya documentadas.

El catálogo canónico continúa siendo código versionado: `src/data/catalog.ts` y `src/data/category-content.ts`. El arranque guarda esa versión en `product_category` y `product_template`. No se incorpora un editor administrativo que compita con esa fuente. Revisar, versionar y volver a desplegar los cambios editoriales es el flujo vigente.

Las 48 ilustraciones están en `public/category-art`. Su fuente reproducible es `scripts/build-category-art.mjs`; ejecutar `npm run art:categories` para regenerarlas. Son dibujos propios en SVG, sin fotografías, fuentes ni marcas externas. Los iconos pequeños de navegación siguen utilizando React Icons y se resuelven por identificador de categoría.

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

La lista y los marcadores comparten identificador y numeración. Seleccionar una tarjeta centra su marcador; seleccionar un marcador resalta y desplaza el listado a su tarjeta. Un perfil sin ubicación conserva su ficha y puede aparecer en búsquedas por ciudad, aunque no tenga marcador.

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
