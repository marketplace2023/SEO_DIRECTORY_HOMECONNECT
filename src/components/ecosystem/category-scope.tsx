import type { Category, Language } from "@/domain/types";
import { services } from "@/data/catalog";
import { copy } from "./primitives";
export function CategoryScope({
  category,
  language,
}: {
  category: Category;
  language: Language;
}) {
  const t = copy(language);
  return (
    <section
      className="category-scope"
      aria-label={t("Significado y alcance", "Meaning and scope")}
    >
      <img
        src={category.image}
        width={480}
        height={320}
        alt={t(
          `Imagen de ${category.name.es.toLowerCase()}`,
          `${category.name.en} image`,
        )}
      />
      <div>
        <p className="eyebrow">
          {t("CONOCE ESTA ESPECIALIDAD", "UNDERSTAND THIS TRADE")}
        </p>
        <h2>{t("Qué significa y qué abarca", "What it means and covers")}</h2>
        <p className="category-definition">{category.description[language]}</p>
        <h3>{t("Trabajos dentro de esta área", "Work within this area")}</h3>
        <ul>
          {services
            .filter((s) => s.categoryId === category.id)
            .map((s) => (
              <li key={s.id}>{s.name[language]}</li>
            ))}
        </ul>
        <h3>{t("Límites del servicio", "Service boundaries")}</h3>
        <p>{category.excluded[language]}</p>
        <p className="eco-note">
          {t(
            "Antes de cotizar: comparte fotos, medidas, ubicación y resultado esperado. Confirma materiales, permisos y responsabilidades con el profesional.",
            "Before requesting a proposal: share photos, dimensions, location and the expected result. Confirm materials, permits and responsibilities with the professional.",
          )}
        </p>
      </div>
    </section>
  );
}
