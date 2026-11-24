import type { Category, Subcategory, Service, Language } from "@/domain/types";
import { bilingual, categoryContent, serviceMode } from "./category-content";

// Curated starting selection from SEO_GALLERY; not an exhaustive transcription.
const rows = [
  [
    "roofing",
    "Techos y cubiertas",
    "Roofing",
    "Techos asfálticos|Asphalt roofs",
    "Reparación de goteras|Roof leak repair",
    "Inspección de techos|Roof inspection",
  ],
  [
    "plumbing",
    "Plomería",
    "Plumbing",
    "Instalación de grifos|Faucet installation",
    "Reparación de tuberías|Pipe repair",
    "Limpieza de desagües|Drain cleaning",
  ],
  [
    "hvac",
    "Climatización",
    "HVAC",
    "Instalación de aire acondicionado|AC installation",
    "Reparación de calefacción|Heating repair",
    "Limpieza de ductos|Duct cleaning",
  ],
  [
    "electrical",
    "Electricidad",
    "Electrical",
    "Instalación de iluminación|Lighting installation",
    "Reparación de tableros|Panel repair",
    "Inspección eléctrica|Electrical inspection",
  ],
  [
    "painting",
    "Pintura",
    "Painting",
    "Pintura de interiores|Interior painting",
    "Preparación de superficies|Surface repair",
    "Restauración de pintura|Paint restoration",
  ],
  [
    "landscaping",
    "Jardinería y paisajismo",
    "Landscaping",
    "Diseño de jardines|Garden design",
    "Reparación de riego|Irrigation repair",
    "Mantenimiento de jardines|Garden maintenance",
  ],
  [
    "drywall",
    "Paneles de yeso",
    "Drywall",
    "Instalación de paneles|Panel installation",
    "Reparación de grietas|Crack repair",
    "Acabado de juntas|Joint finishing",
  ],
  [
    "concrete",
    "Concreto",
    "Concrete",
    "Losas de concreto|Concrete slabs",
    "Reparación de concreto|Concrete repair",
    "Sellado de concreto|Concrete sealing",
  ],
  [
    "masonry",
    "Albañilería y mampostería",
    "Masonry",
    "Construcción de muros|Wall construction",
    "Restauración de mampostería|Masonry restoration",
    "Rejuntado de ladrillos|Brick repointing",
  ],
  [
    "carpentry",
    "Carpintería",
    "Carpentry",
    "Muebles a medida|Custom furniture",
    "Reparación de gabinetes|Cabinet repair",
    "Restauración de madera|Wood restoration",
  ],
  [
    "flooring",
    "Instalación de pisos",
    "Flooring",
    "Pisos de madera|Hardwood flooring",
    "Reparación de pisos|Floor repair",
    "Lijado y barnizado|Sanding and refinishing",
  ],
  [
    "tile",
    "Azulejos y cerámica",
    "Tile",
    "Instalación de cerámica|Tile installation",
    "Reemplazo de azulejos|Tile replacement",
    "Limpieza de juntas|Grout cleaning",
  ],
  [
    "windows",
    "Ventanas",
    "Windows",
    "Instalación de ventanas|Window installation",
    "Reparación de ventanas|Window repair",
    "Sellado de ventanas|Window sealing",
  ],
  [
    "doors",
    "Puertas",
    "Doors",
    "Instalación de puertas|Door installation",
    "Reparación de puertas|Door repair",
    "Ajuste de herrajes|Hardware adjustment",
  ],
  [
    "fencing",
    "Cercas",
    "Fencing",
    "Cercas de madera|Wood fencing",
    "Reparación de cercas|Fence repair",
    "Mantenimiento de cercas|Fence maintenance",
  ],
  [
    "decks",
    "Terrazas y decks",
    "Decks",
    "Construcción de terrazas|Deck construction",
    "Reparación de decks|Deck repair",
    "Sellado de terrazas|Deck sealing",
  ],
  [
    "siding",
    "Revestimientos exteriores",
    "Siding",
    "Revestimiento de fachadas|Siding installation",
    "Reparación de revestimientos|Siding repair",
    "Limpieza de fachadas|Siding cleaning",
  ],
  [
    "gutters",
    "Canaletas",
    "Gutters",
    "Instalación de canaletas|Gutter installation",
    "Reparación de canaletas|Gutter repair",
    "Limpieza de canaletas|Gutter cleaning",
  ],
  [
    "trees",
    "Servicios de árboles",
    "Tree services",
    "Plantación de árboles|Tree planting",
    "Tratamiento de árboles|Tree treatment",
    "Poda de árboles|Tree pruning",
  ],
  [
    "pressure-washing",
    "Lavado a presión",
    "Pressure washing",
    "Limpieza de entradas|Driveway cleaning",
    "Eliminación de grafitis|Graffiti removal",
    "Lavado de terrazas|Patio washing",
  ],
  [
    "garage-doors",
    "Puertas de garaje",
    "Garage doors",
    "Instalación de puertas de garaje|Garage door installation",
    "Reparación de motores|Opener repair",
    "Inspección de seguridad|Safety inspection",
  ],
  [
    "handyman",
    "Reparaciones generales",
    "Handyman",
    "Montaje de muebles|Furniture assembly",
    "Reparaciones del hogar|Home repairs",
    "Mantenimiento del hogar|Home maintenance",
  ],
  [
    "pest-control",
    "Control de plagas",
    "Pest control",
    "Barreras preventivas|Preventive barriers",
    "Control de termitas|Termite treatment",
    "Inspección de plagas|Pest inspection",
  ],
  [
    "locksmith",
    "Cerrajería",
    "Locksmith",
    "Instalación de cerraduras|Lock installation",
    "Apertura de puertas|Door unlocking",
    "Revisión de cerraduras|Lock inspection",
  ],
  [
    "appliances",
    "Electrodomésticos",
    "Appliance repair",
    "Instalación de electrodomésticos|Appliance installation",
    "Reparación de lavadoras|Washer repair",
    "Mantenimiento de refrigeradores|Refrigerator maintenance",
  ],
  [
    "insulation",
    "Aislamiento",
    "Insulation",
    "Aislamiento de techos|Roof insulation",
    "Reemplazo de aislamiento|Insulation replacement",
    "Inspección térmica|Thermal inspection",
  ],
  [
    "solar",
    "Energía solar",
    "Solar energy",
    "Paneles solares|Solar panels",
    "Reparación de inversores|Inverter repair",
    "Limpieza de paneles|Panel cleaning",
  ],
  [
    "pools",
    "Piscinas",
    "Pools",
    "Construcción de piscinas|Pool construction",
    "Reparación de bombas|Pump repair",
    "Mantenimiento de piscinas|Pool maintenance",
  ],
  [
    "septic",
    "Sistemas sépticos",
    "Septic systems",
    "Instalación de sistemas sépticos|Septic installation",
    "Reparación de tanques|Tank repair",
    "Limpieza de tanques|Tank cleaning",
  ],
  [
    "remodeling",
    "Remodelación",
    "Remodeling",
    "Remodelación de cocinas|Kitchen remodeling",
    "Renovación de baños|Bathroom renovation",
    "Renovación de acabados|Finish renovation",
  ],
  [
    "foundations",
    "Reparación de cimientos",
    "Foundation repair",
    "Refuerzo de cimientos|Foundation reinforcement",
    "Reparación de asentamientos|Settlement repair",
    "Inspección de cimientos|Foundation inspection",
  ],
  [
    "waterproofing",
    "Impermeabilización",
    "Waterproofing",
    "Impermeabilización de techos|Roof waterproofing",
    "Sellado de filtraciones|Leak sealing",
    "Inspección de humedad|Moisture inspection",
  ],
  [
    "general-contractors",
    "Contratistas generales",
    "General contractors",
    "Coordinación de ampliaciones|Addition coordination",
    "Planificación de obra|Construction planning",
    "Supervisión de avance|Construction progress assessment",
  ],
  [
    "home-cleaning",
    "Limpieza del hogar",
    "Home cleaning",
    "Limpieza habitual|Routine home cleaning",
    "Limpieza de mudanza|Move-out cleaning",
    "Limpieza profunda|Deep cleaning",
  ],
  [
    "junk-removal",
    "Retirada de enseres",
    "Junk removal",
    "Recogida de muebles|Furniture removal",
    "Retirada de electrodomésticos|Appliance removal",
    "Recogida de enseres|Household junk removal",
  ],
  [
    "moving",
    "Mudanzas",
    "Moving",
    "Mudanza local|Local moving",
    "Embalaje doméstico|Household packing",
    "Traslado de muebles|Furniture moving",
  ],
  [
    "home-inspection",
    "Inspección de viviendas",
    "Home inspection",
    "Inspección de compra|Pre-purchase inspection",
    "Inspección de venta|Pre-listing inspection",
    "Informe del estado visible|Visible condition assessment",
  ],
  [
    "interior-design",
    "Diseño de interiores",
    "Interior design",
    "Diseño de distribución|Layout design",
    "Asesoría de materiales|Material selection",
    "Diseño de color|Color design",
  ],
  [
    "home-automation",
    "Domótica",
    "Home automation",
    "Instalación de controles inteligentes|Smart control installation",
    "Configuración de automatizaciones|Automation setup",
    "Diagnóstico de domótica|Smart home diagnosis",
  ],
  [
    "home-networks",
    "Redes domésticas",
    "Home networks",
    "Instalación de Wi-Fi|Wi-Fi installation",
    "Cableado de datos|Data cable installation",
    "Mejora de cobertura Wi-Fi|Wi-Fi coverage assessment",
  ],
  [
    "irrigation",
    "Sistemas de riego",
    "Irrigation",
    "Instalación de riego por goteo|Drip irrigation installation",
    "Reparación de aspersores|Sprinkler repair",
    "Inspección de riego|Irrigation inspection",
  ],
  [
    "excavation",
    "Excavación y terrenos",
    "Excavation",
    "Excavación de zanjas|Trench excavation",
    "Nivelación de terrenos|Site grading",
    "Evaluación de movimiento de tierra|Earthwork assessment",
  ],
  [
    "demolition",
    "Demolición selectiva",
    "Demolition",
    "Desmontaje interior|Interior dismantling",
    "Retirada de tabiques no portantes|Non-load-bearing partition removal",
    "Recogida de escombros|Debris removal",
  ],
  [
    "damage-restoration",
    "Restauración por daños",
    "Damage restoration",
    "Secado tras filtraciones|Water damage drying",
    "Reparación de acabados dañados|Damaged finish repair",
    "Inspección de humedad residual|Residual moisture inspection",
  ],
  [
    "chimneys",
    "Chimeneas",
    "Chimneys",
    "Instalación de sombreretes|Chimney cap installation",
    "Reparación de chimeneas|Chimney repair",
    "Limpieza de chimeneas|Chimney cleaning",
  ],
  [
    "cabinetry",
    "Gabinetes a medida",
    "Cabinetry",
    "Instalación de gabinetes|Cabinet installation",
    "Reparación de cajones|Drawer repair",
    "Diseño de almacenamiento|Storage design",
  ],
  [
    "countertops",
    "Encimeras",
    "Countertops",
    "Instalación de encimeras|Countertop installation",
    "Reparación de encimeras|Countertop repair",
    "Medición de superficies|Countertop assessment",
  ],
  [
    "glass-mirrors",
    "Vidrios y espejos",
    "Glass and mirrors",
    "Instalación de espejos|Mirror installation",
    "Reparación de mamparas|Shower enclosure repair",
    "Ajuste de herrajes de vidrio|Glass hardware adjustment",
  ],
] as const;
export let categories: Category[] = rows.map(([id, es, en], i) => ({
  id,
  name: { es, en },
  reference: i + 1,
  description: categoryContent[id].description,
  excluded: categoryContent[id].excluded,
  illustration: categoryContent[id].illustration,
  image: `/CATEGORY_PICS/compatible/${id}.jpg`,
  included: rows
    .find((row) => row[0] === id)!
    .slice(3)
    .map((text) => bilingual(text)),
}));
export let subcategories: Subcategory[] = rows.flatMap(([id]) => [
  {
    id: `${id}-installation`,
    image: `/CATEGORY_PICS/compatible/${id}-installation.jpg`,
    categoryId: id,
    name: categoryContent[id].groups[0],
  },
  {
    id: `${id}-care`,
    image: `/CATEGORY_PICS/compatible/${id}-care.jpg`,
    categoryId: id,
    name: categoryContent[id].groups[1],
  },
]);
export let services: Service[] = rows.flatMap(([categoryId, , , ...names]) =>
  [
    ...names.map((name) => bilingual(name)),
    ...categoryContent[categoryId].extra,
  ].map((name, i) => {
    return {
      id: `${categoryId}-${i + 1}`,
      categoryId,
      subcategoryId: `${categoryId}-${i === 0 || i === 3 ? "installation" : "care"}`,
      name,
      mode: serviceMode(name),
    };
  }),
);
export type Catalog = {
  categories: Category[];
  subcategories: Subcategory[];
  services: Service[];
};
export const builtInCatalog: Catalog = { categories, subcategories, services };

export function currentCatalog(): Catalog {
  return { categories, subcategories, services };
}

export function installCatalog(catalog: Catalog) {
  categories = catalog.categories;
  subcategories = catalog.subcategories;
  services = catalog.services;
}

export function serviceInSubcategory(service: Service, id: string) {
  return (
    service.subcategoryId === id ||
    !!service.additionalSubcategoryIds?.includes(id)
  );
}

export function serviceInCategory(service: Service, id: string) {
  return (
    service.categoryId === id ||
    subcategories.some(
      (area) =>
        area.categoryId === id &&
        service.additionalSubcategoryIds?.includes(area.id),
    )
  );
}
export const categoryName = (id: string, language: Language) =>
  categories.find((c) => c.id === id)?.name[language] ?? id;
export const serviceName = (id: string, language: Language) =>
  services.find((s) => s.id === id)?.name[language] ?? id;
