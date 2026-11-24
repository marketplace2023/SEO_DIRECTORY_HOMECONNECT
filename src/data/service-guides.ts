import type { Localized, Service } from "@/domain/types";
import { bilingual } from "./category-content";
import { categoryContext } from "./category-context";
import { serviceScopes } from "./service-scopes";

const scopes = new Map<string, Localized>(
  Object.entries(serviceScopes).flatMap(([category, entries]) =>
    entries.map(
      (text, index) => [`${category}-${index + 1}`, bilingual(text)] as const,
    ),
  ),
);

const categoryContexts: Record<string, readonly [string, string, string]> =
  categoryContext;
const areaContexts = new Map<string, Localized>(
  Object.entries(categoryContext).flatMap(
    ([category, [installation, care]]) => [
      [`${category}-installation`, bilingual(installation)],
      [`${category}-care`, bilingual(care)],
    ],
  ),
);

export function subcategoryWhen(id: string): Localized | undefined {
  return areaContexts.get(id);
}

export function serviceScope(id: string): Localized | undefined {
  return scopes.get(id);
}

const completionByMode = {
  installation:
    "Elemento colocado, resultado de la comprobación acordada e indicaciones iniciales de uso o cuidado.|Installed item, result of the agreed check and initial use or care instructions.",
  repair:
    "Detalle de las piezas o zonas intervenidas y resultado de la comprobación que se acordó para la reparación.|A record of repaired parts or areas and the result of the agreed repair check.",
  maintenance:
    "Relación de las tareas realizadas y de los ajustes o revisiones recomendados para la próxima visita.|A list of completed tasks and adjustments or checks recommended for the next visit.",
  assessment:
    "Informe de hallazgos visibles, áreas revisadas, límites de acceso y puntos que necesitan seguimiento.|A report of visible findings, inspected areas, access limits and items requiring follow-up.",
  design:
    "Propuesta o plan con las especificaciones, alternativas y decisiones pendientes que se acordaron para esta etapa.|A proposal or plan with the specifications, alternatives and open decisions agreed for this stage.",
  cleaning:
    "Áreas tratadas y detalle de los residuos o manchas que quedaron fuera del alcance de la visita.|A summary of treated areas and any debris or stains outside the scope of the visit.",
} satisfies Record<Service["mode"], string>;

// Additional instructions for services whose material, test or deliverable merits a specific distinction.
const details: Record<
  string,
  { requirements?: string; separate?: string; completion?: string }
> = {
  "hvac-1": {
    requirements:
      "Comparte fotos y modelo del equipo actual, las habitaciones que debe climatizar y la ubicación de las unidades. Indica si es una instalación nueva o un reemplazo.|Share photos and the current equipment model, the rooms it must cool and where the units sit. Indicate whether this is a new installation or a replacement.",
    separate:
      "Adaptar ductos, añadir un circuito, ampliar el drenaje o retirar el equipo anterior depende de la propuesta.|Duct alterations, a new circuit, drain extensions and removal of existing equipment depend on the proposal.",
    completion:
      "Equipo instalado, prueba de enfriamiento y drenaje, e indicaciones de uso del termostato.|Installed equipment, cooling and drainage checks, and thermostat operating instructions.",
  },
  "hvac-2": {
    completion:
      "Descripción de la falla encontrada, piezas o ajustes aplicados y resultado de un ciclo de calefacción.|The fault found, parts or adjustments applied and the result of a heating cycle.",
  },
  "hvac-3": {
    separate:
      "Reparar fugas, cambiar conductos y tratar moho o materiales peligrosos requiere una propuesta aparte.|Leak repairs, duct replacement and treatment of mold or hazardous materials require separate scope.",
  },
  "hvac-5": {
    completion:
      "Termostato vinculado y comprobación de que puede solicitar las funciones de climatización que admite el equipo.|A connected thermostat and confirmation that it can request the HVAC functions the equipment supports.",
  },
  "roofing-2": {
    separate:
      "La reparación de plafones, aislamiento mojado y madera estructural debe figurar por separado.|Interior ceiling repairs, wet insulation and structural woodwork should be listed separately.",
  },
  "plumbing-1": {
    completion:
      "Grifo conectado, comprobación de los mandos y verificación de fugas en las uniones intervenidas.|A connected faucet, control check and leak check at the connections that were worked on.",
  },
  "plumbing-5": {
    separate:
      "Abrir muros o pisos y luego restaurarlos se acuerda aparte si la búsqueda lo requiere.|Opening and restoring walls or floors is agreed separately if tracing the leak requires it.",
  },
  "electrical-5": {
    separate:
      "Ampliar el tablero, cambiar el suministro o construir nuevas canalizaciones depende de lo que se confirme en la visita.|A panel upgrade, service changes or new conduit runs depend on the site assessment.",
  },
  "siding-1": {
    separate:
      "Sustituir un soporte deteriorado, reparar humedades ocultas o reinstalar instalaciones de fachada requiere confirmación aparte.|Replacing a damaged substrate, repairing concealed moisture or reinstalling exterior utilities requires separate confirmation.",
    completion:
      "Paños revestidos, bordes y aberturas rematados, y material y acabado identificados para mantenimiento.|Sided areas, finished edges and openings, and material and finish details for upkeep.",
  },
  "concrete-1": {
    completion:
      "Losa terminada según dimensiones y acabado pactados, con indicaciones de curado y acceso inicial.|A slab completed to agreed dimensions and finish, with curing and initial access guidance.",
  },
  "home-inspection-1": {
    completion:
      "Informe de compra con hallazgos por sistema, fotos cuando correspondan y zonas que quedaron sin acceso.|A buyer’s report with findings by system, photos where appropriate and areas that could not be accessed.",
  },
  "home-inspection-3": {
    completion:
      "Informe fechado por áreas, con condiciones observadas y limitaciones de la visita.|A dated report by area with observed conditions and visit limitations.",
  },
  "countertops-3": {
    completion:
      "Croquis o plantilla con medidas, recortes y referencias de apoyo que se acordaron para fabricación.|A sketch or template with dimensions, cutouts and support references agreed for fabrication.",
  },
  "moving-1": {
    completion:
      "Bienes del inventario descargados en los destinos acordados y registro de incidencias observadas durante el traslado.|Inventoried goods unloaded at the agreed destinations and a record of issues observed during the move.",
  },
  "moving-4": {
    completion:
      "Piezas cargadas o descargadas según la lista y el orden acordados para el turno de trabajo.|Items loaded or unloaded according to the list and sequence agreed for the work period.",
  },
  "moving-5": {
    completion:
      "Muebles del inventario protegidos y listos para entregar al transportista o al cliente.|Inventoried furniture wrapped and ready to hand over to the mover or customer.",
  },
  "general-contractors-3": {
    completion:
      "Registro de avances por etapa, desviaciones observadas y decisiones pendientes para continuar.|A progress record by phase, observed deviations and decisions needed to proceed.",
  },
  "interior-design-2": {
    completion:
      "Selección comparada de materiales con sus aplicaciones, cuidados y opciones todavía abiertas.|A comparison of material choices with applications, upkeep and remaining options.",
  },
};

export function serviceGuide(service: Service) {
  const detail = details[service.id];
  const requirements =
    detail?.requirements ?? categoryContexts[service.categoryId]?.[2];
  return {
    scope: serviceScope(service.id),
    requirements: requirements ? bilingual(requirements) : undefined,
    completion: bilingual(detail?.completion ?? completionByMode[service.mode]),
    separate: detail?.separate ? bilingual(detail.separate) : undefined,
  };
}
