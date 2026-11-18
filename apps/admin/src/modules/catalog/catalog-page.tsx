import { useState } from "react";
import { categories, services, subcategories } from "@/data/catalog";
import { Panel, Stat, copy } from "@/components/ecosystem/primitives";
import { Input } from "@/components/ui/input";
import { normalize, type Language } from "@/domain/types";
export function CatalogPage({ language }: { language: Language }) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(categories[0].id),
    t = copy(language);
  const visible = categories.filter((c) =>
    normalize(c.name[language]).includes(normalize(query)),
  );
  return (
    <Panel title={t("Catálogo normalizado", "Normalized catalog")}>
      <div className="eco-stats-grid">
        <Stat value={categories.length} label={t("Categorías", "Categories")} />
        <Stat
          value={subcategories.length}
          label={t("Subcategorías", "Subcategories")}
        />
        <Stat
          value={services.length}
          label={t("Servicios iniciales", "Initial services")}
        />
      </div>
      <Input
        aria-label={t("Buscar categoría", "Search category")}
        placeholder={t("Buscar categoría…", "Search category…")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="admin-catalog-grid">
        <nav aria-label="Categorías del catálogo">
          {visible.map((category) => (
            <button
              className={selected === category.id ? "selected" : ""}
              key={category.id}
              onClick={() => setSelected(category.id)}
            >
              {category.name[language]}
              <small>{category.id}</small>
            </button>
          ))}
          {!visible.length && <p>No hay coincidencias.</p>}
        </nav>
        <div>
          <h3>{categories.find((c) => c.id === selected)?.name[language]}</h3>
          {subcategories
            .filter((s) => s.categoryId === selected)
            .map((subcategory) => (
              <section key={subcategory.id}>
                <h4>{subcategory.name[language]}</h4>
                {services
                  .filter((s) => s.subcategoryId === subcategory.id)
                  .map((service) => (
                    <p key={service.id}>
                      {service.name[language]} <code>{service.id}</code>
                    </p>
                  ))}
              </section>
            ))}
        </div>
      </div>
      <p className="eco-note">
        {t(
          "Consulta del catálogo maestro del prototipo. Los cambios de catálogo todavía no se editan desde el panel.",
          "Prototype master catalog reference. Catalog changes are not yet editable from this panel.",
        )}
      </p>
    </Panel>
  );
}
