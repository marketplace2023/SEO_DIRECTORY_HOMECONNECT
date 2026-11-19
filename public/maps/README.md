# Cartografía de referencia

`countries.geojson`: Natural Earth, escala 1:110m, límites administrativos de países.

Fuente: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson

Natural Earth publica sus datos cartográficos en dominio público: https://www.naturalearthdata.com/about/terms-of-use/

La aplicación utiliza esta base local como respaldo. Las calles opcionales proceden de OpenStreetMap y requieren internet; su atribución se muestra en el mapa. Los marcadores de contratistas son ficticios y aproximados a la ciudad.

`georgia-counties.geojson`: selección de los 159 condados de Georgia del archivo de condados estadounidenses distribuido por Plotly. Se usa para mantener límites locales reconocibles cuando no se cargan calles externas. Fuente: https://github.com/plotly/datasets/blob/master/geojson-counties-fips.json

`us-areas.json`: geometría portada desde Home Connect. Usa los límites de [U.S. Atlas](https://github.com/topojson/us-atlas) y los puntos representativos del [Gazetteer 2025 de la Oficina del Censo](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.2025.html). El mapa funciona con datos locales. Sus cifras se calculan con los perfiles publicados del directorio.

`us-area-detail.json` contiene los límites geográficos de los estados ([U.S. Atlas, states-10m](https://github.com/topojson/us-atlas#states-10m.json)), los tres condados piloto de `georgia-counties.geojson` y los puntos representativos de las ciudades del catálogo ([Gazetteer 2025](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.2025.html)). Se usa para encuadrar la zona y mantener visibles sus límites si las calles de OpenStreetMap no cargan.
