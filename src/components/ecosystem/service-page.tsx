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
    (p) => p.publication === "published" && p.serviceIds.includes(id),
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
