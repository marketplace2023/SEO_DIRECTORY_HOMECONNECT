# Componentes visuales de HOME CONNECT

Actualización: 18 de noviembre de 2026. Los componentes se incorporan como código desde los registros oficiales, que es el mecanismo utilizado por estas bibliotecas. El archivo `components.json` configura esos registros; cada archivo nuevo incluye su URL de origen. No se presenta una implementación propia con otro nombre como si fuera una descarga oficial.

## Aplicación visible

| Biblioteca | Componentes usados | Dónde y para qué |
|---|---|---|
| shadcn/ui | Card, CardHeader, CardContent, CardTitle | Paneles operativos y fichas profesionales; estructura compartida de encabezado, acciones y contenido. |
| shadcn/ui | Tabs, TabsList, TabsTrigger | Familias de oficios en la portada, conectadas con el carrusel de categorías. |
| shadcn/ui | NativeSelect, Label | Controles del buscador y selectores de los formularios que usan Field. Conservan etiquetas y eventos existentes. |
| shadcn/ui | ScrollArea, Separator | Navegación lateral de administración y contratistas, con desplazamiento propio y agrupación del espacio de trabajo. |
| shadcn/ui | Badge, Tooltip | Estados de credenciales, etiquetas de contexto y acciones de fichas. |
| shadcn/ui | Empty, EmptyHeader, EmptyMedia, EmptyDescription | Estados sin resultados y paneles sin registros. |
| shadcn/ui | Skeleton | Carga del mapa con una estructura de resultados y superficie geográfica. |
| Magic UI | MagicCard | Categorías de portada, catálogo completo y métricas de los paneles; respuesta del borde y superficie al puntero con colores de HOME CONNECT. |
| Magic UI | InteractiveHoverButton | Acción principal del encabezado de portada. |
| Magic UI | BlurFade, NumberTicker | Entrada de contenido y presentación de cifras existentes, sin inventar tendencias ni actividad. |
| Aceternity UI | DirectionAwareHover | Galería principal y fotografías de profesionales con movimiento según la dirección de entrada del puntero. |
| Aceternity UI | GlowingEffect | Se conserva en la invitación final de la portada. |
| Swiper | EffectFade, Pagination, Keyboard, A11y | Galería principal navegable con paginación, sin reproducción automática. |
| Swiper | FreeMode, Keyboard, A11y | Carrusel de categorías con filtro de familias y controles anterior/siguiente. |
| Swiper | Keyboard, A11y | Carrusel de profesionales. |
| React Icons | Phosphor | Iconos de acciones, ubicación, navegación y categorías. |

## Composición

Se sustituye el antiguo encabezado con fotografía recortada, sello circular y ficha profesional flotante por una composición editorial con galería de proyectos y buscador completo. Se elimina la fila de tarjetas de roles de la portada; el acceso a los portales sigue en la navegación del ecosistema.

Se conservan el rojo `#e00707`, los fondos claros, Open Sans y Poppins. Las variaciones de superficies se limitan a la misma familia de neutros y rojo. Los componentes MagicCard reciben colores explícitos para evitar sus degradados púrpuras por defecto.

Los componentes públicos descargados se adaptan a los alias del proyecto, React Icons y textos alternativos. Los controles siguen funcionando por teclado. Las imágenes de la galería son referencias de inspiración, no proyectos o contratos atribuidos a un proveedor real.

Tailwind configura la composición, los tamaños y los colores. Las hojas anteriores siguen soportando partes existentes y el posicionamiento del mapa y los portales. Esta actualización no afirma que se haya eliminado todo CSS ni que cada pantalla use efectos de animación. Las bibliotecas no sustituyen las decisiones de diseño ni la lógica de la aplicación.

## Procedencia

- shadcn: `https://ui.shadcn.com/r/styles/new-york-v4/{componente}.json`.
- Magic UI: `https://magicui.design/r/magic-card.json`, `https://magicui.design/r/interactive-hover-button.json`.
- Aceternity UI: `https://ui.aceternity.com/registry/direction-aware-hover.json`.
- Swiper React: https://swiperjs.com/react.

Los JSON descargados para la integración se guardan únicamente en `.artifacts/registries`, ignorado por Git. El código utilizado sí se versiona en `src/components/ui`.
