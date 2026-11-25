import { MapSurface } from "./map-surface";
import { CatalogProjectCta } from "./catalog-project-cta";
import { CategoryScope } from "./category-scope";
import { Panel } from "./primitives";
import { PiCheck } from "react-icons/pi";
import { isUsProfessional } from "@/domain/us-area";
import { categories, services, subcategories } from "@/data/catalog";
import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { Empty, copy } from "./primitives";
import { Missing, PersonCard } from "./public-pages";
import { ServiceGuide } from "./service-guide";

export function ServicePage({
  id,
  language,
}: {
  id: string;
  language: Language;
}) {
  const { state } = useStore();
  const t = copy(language);
  const service = services.find((s) => s.id === id);
  if (!service) return <Missing language={language} />;
  const category = categories.find((item) => item.id === service.categoryId);
  const area = subcategories.find((item) => item.id === service.subcategoryId);
  if (!category || !area) return <Missing language={language} />;
  const people = state.professionals.filter(
    (p) =>
      isUsProfessional(p) &&
      p.publication === "published" &&
      p.serviceIds.includes(id),
  );
  const siblings = services.filter(
    (item) => item.categoryId === category.id && item.id !== id,
  );
  const related = [
    ...siblings.filter((item) => item.subcategoryId === area.id),
    ...siblings.filter((item) => item.subcategoryId !== area.id),
  ].slice(0, 3);
  return (
    <ServiceGuide
      service={service}
      category={category}
      area={area}
      language={language}
      related={related}
    >
      <MapSurface
        language={language}
        scope={{ categoryId: service.categoryId, serviceId: id }}
      />
      <CatalogProjectCta
        language={language}
        categoryId={service.categoryId}
        serviceId={id}
      />
      <div className="mt-6">
        <Panel title={t("Antes de empezar", "Before you start")}>
          <ul className="eco-checklist">
            {[
              t(
                "Describe el estado actual y el resultado que buscas.",
                "Describe the current condition and the result you want.",
              ),
              t(
                "Indica la ubicación, dimensiones y fecha orientativa.",
                "Include the location, dimensions and preferred date.",
              ),
              t(
                "Confirma materiales, alcance y condiciones en la propuesta.",
                "Confirm materials, scope and terms in the proposal.",
              ),
            ].map((item) => (
              <li key={item}>
                <PiCheck />
                {item}
              </li>
            ))}
          </ul>
          <p className="eco-note">
            {t(
              "Revisa el alcance y las condiciones de pago de la propuesta antes de aceptarla.",
              "Review the scope and payment terms of your quote before accepting it.",
            )}
          </p>
        </Panel>
      </div>
      <CategoryScope category={category} language={language} />
      <section aria-labelledby="service-professionals">
        <h2
          id="service-professionals"
          className="mb-5 text-2xl font-bold tracking-tight"
        >
          {t(
            "Profesionales para este servicio",
            "Professionals for this service",
          )}
        </h2>
        {people.length ? (
          <div className="eco-people-grid">
            {people.map((p) => (
              <PersonCard key={p.id} person={p} language={language} />
            ))}
          </div>
        ) : (
          <Empty
            title={t(
              "Aún no hay perfiles publicados para este servicio",
              "No published profiles for this service yet",
            )}
          />
        )}
      </section>
    </ServiceGuide>
  );
}
