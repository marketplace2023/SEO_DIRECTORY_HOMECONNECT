import type { Professional } from "../../src/domain/types";
import {
  napDifferences,
  type SeoAuditCheck,
  type SeoProject,
} from "../../src/domain/local-seo";

export function auditChecks(
  project: SeoProject,
  person: Professional,
  reviewCount: number,
): SeoAuditCheck[] {
  const check = (
    id: string,
    title: string,
    pass: boolean,
    detail: string,
    priority: "high" | "medium" = "medium",
  ): SeoAuditCheck => ({
    id,
    title,
    status: pass ? "pass" : "fail",
    detail,
    priority,
  });
  const published = project.citations.filter(
    (citation) => citation.status === "published",
  );
  const inconsistent = published.filter((citation) =>
    napDifferences(project.nap, citation.nap).some(
      (field) =>
        (field.field !== "address" || !project.serviceAreaBusiness) &&
        field.status !== "match",
    ),
  );
  return [
    check(
      "profile-name",
      "Nombre consistente con la ficha interna",
      napDifferences(project.nap, { ...project.nap, name: person.name })[0]
        .status === "match",
      "Compara el nombre de referencia con el de tu ficha pública. Guardar la referencia SEO no actualiza automáticamente la ficha.",
      "high",
    ),
    check(
      "name",
      "Nombre comercial definido",
      project.nap.name.trim().length >= 2,
      "Mantén un nombre comercial reconocible y consistente en la ficha y en los directorios.",
      "high",
    ),
    check(
      "phone",
      "Teléfono de contacto definido",
      project.nap.phone.replace(/\D/g, "").length >= 7,
      "Registra el teléfono que los clientes pueden utilizar; compáralo con las citaciones observadas.",
      "high",
    ),
    check(
      "address",
      "Ubicación o modalidad de servicio definida",
      project.serviceAreaBusiness
        ? person.coverage.length > 0
        : project.nap.address.trim().length >= 5,
      "Declara si atiendes a domicilio. Una dirección privada no es necesaria para describir un negocio de área de servicio.",
      "high",
    ),
    check(
      "website",
      "Sitio web registrado",
      !!project.nap.website,
      "Añade la URL pública oficial del negocio. Este control comprueba su registro, no rastrea ni certifica el sitio.",
    ),
    check(
      "description",
      "Presentación del negocio desarrollada",
      person.bio.es.trim().length >= 100 || person.bio.en.trim().length >= 100,
      "Explica en tu ficha qué haces, dónde atiendes y qué diferencia a tu servicio, con al menos 100 caracteres.",
    ),
    check(
      "services",
      "Servicios y cobertura declarados",
      person.serviceIds.length > 0 && person.coverage.length > 0,
      "Selecciona servicios que realmente ofreces y localidades que atiendes.",
      "high",
    ),
    check(
      "photos",
      "Portafolio con imágenes",
      person.portfolio.length >= 3,
      "Añade al menos tres imágenes autorizadas de trabajos. La revisión es de contenido de HOME CONNECT, no de las fotos de Google.",
    ),
    check(
      "publication",
      "Ficha publicada en HOME CONNECT",
      person.publication === "published",
      "Completa la ficha y solicita revisión a administración para publicar el perfil.",
    ),
    check(
      "citations",
      "Citaciones documentadas sin discrepancias detectadas",
      published.length > 0 && inconsistent.length === 0,
      published.length
        ? `${inconsistent.length} de ${published.length} citaciones publicadas tienen discrepancias o campos NAP sin comprobar. Revisa cada campo; datos ausentes no equivalen a coincidencia.`
        : "Registra directorios en los que has comprobado la presencia del negocio, con URL y fecha de observación.",
    ),
    check(
      "reviews",
      "Reseñas propias publicadas",
      reviewCount > 0,
      "Solicita una reseña tras un proyecto entregado. Este control utiliza reseñas de HOME CONNECT, sin mezclar valoraciones de Google.",
    ),
    {
      id: "gbp",
      title: "Auditoría externa de Google Business Profile",
      status: "unavailable",
      priority: "medium",
      detail:
        "No se ha ejecutado una auditoría de Google. Este diagnóstico revisa exclusivamente la información propia de HOME CONNECT y citaciones registradas por el usuario.",
    },
  ];
}
