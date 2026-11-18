# Cartografía de referencia

`countries.geojson`: Natural Earth, escala 1:110m, límites administrativos de países.

Fuente: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson

Natural Earth publica sus datos cartográficos en dominio público: https://www.naturalearthdata.com/about/terms-of-use/

La aplicación utiliza esta base local como respaldo. Las calles opcionales proceden de OpenStreetMap y requieren internet; su atribución se muestra en el mapa. Los marcadores de contratistas son ficticios y aproximados a la ciudad.

`georgia-counties.geojson`: selección de los 159 condados de Georgia del archivo de condados estadounidenses distribuido por Plotly. Se usa para mantener límites locales reconocibles cuando no se cargan calles externas. Fuente: https://github.com/plotly/datasets/blob/master/geojson-counties-fips.json
