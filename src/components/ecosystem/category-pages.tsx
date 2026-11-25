import { MapSurface } from "./map-surface";
import { CatalogProjectCta } from "./catalog-project-cta";
import { useState } from "react";
import {
  PiArrowRight,
  PiArrowUpRight,
  PiCaretRight,
  PiInfo,
  PiMagnifyingGlass,
} from "react-icons/pi";
import {
  categories,
  subcategories,
  services,
  serviceInCategory,
  serviceInSubcategory,
} from "@/data/catalog";
import { categoryGuides, subcategoryConcepts } from "@/data/category-guides";
import { subcategoryWhen } from "@/data/service-guides";
import { normalize, type Language, type Subcategory } from "@/domain/types";
import type { Route } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MagicCard } from "@/components/ui/magic-card";
import { BlurFade } from "@/components/ui/blur-fade";
import { Empty, copy } from "./primitives";
import { Missing } from "./public-pages";
import { ServiceGuideCard } from "./service-guide";

export const categoryHref = (id: string, subcategory?: string) =>
  `#/categories/${id}${subcategory ? `/${subcategory}` : ""}`;

function areaDescription(area: Subcategory, language: Language) {
  return (area.concept ?? subcategoryConcepts[area.id] ?? area.name)[language];
}

export function CategoryPages({
  route,
  language,
}: {
  route: Route;
  language: Language;
}) {
  const t = copy(language);
  const [query, setQuery] = useState("");
  const parts = route.path.split("/").filter(Boolean);
  const category = categories.find((category) => category.id === parts[1]);
  const area = subcategories.find(
    (area) => area.id === parts[2] && area.categoryId === category?.id,
  );
  if (parts.length > 3 || (parts[1] && !category) || (parts[2] && !area))
    return <Missing language={language} />;
  const areas = subcategories.filter(
    (area) => area.categoryId === category?.id,
  );
  const visible = categories.filter((category) =>
    normalize(
      [
        category.name[language],
        category.description[language],
        (category.concept ?? categoryGuides[category.id]?.concept)?.[language],
        ...subcategories
          .filter((area) => area.categoryId === category.id)
          .map((area) => area.name[language]),
        ...services
          .filter((service) => serviceInCategory(service, category.id))
          .map((service) => service.name[language]),
      ].join(" "),
    ).includes(normalize(query)),
  );
  const title =
    area?.name[language] ||
    category?.name[language] ||
    t("Categorías y subcategorías", "Categories and subcategories");
  const description = category
    ? area
      ? areaDescription(area, language)
      : (category.concept ??
          categoryGuides[category.id]?.concept ??
          category.description)[language]
    : t(
        "Conoce cada oficio, descubre qué incluye y encuentra el área que necesita tu hogar.",
        "Learn about each trade, discover what it covers and find the area your home needs.",
      );
  const selectedServices = services.filter(
    (service) =>
      !!category &&
      serviceInCategory(service, category.id) &&
      (!area || serviceInSubcategory(service, area.id)),
  );
  const context = area && (area.when ?? subcategoryWhen(area.id));
  return (
    <div
      className="space-y-9 pb-10 md:space-y-12"
      data-category-page={area?.id || category?.id || "index"}
    >
      <nav
        aria-label={t("Ruta de categorías", "Category breadcrumb")}
        className="flex flex-wrap items-center gap-2 text-xs leading-6 text-neutral-500"
      >
        <a href="#/" className="hover:text-primary">
          {t("Inicio", "Home")}
        </a>
        <PiCaretRight aria-hidden="true" />
        {category ? (
          <>
            <a href="#/categories" className="hover:text-primary">
              {t("Categorías", "Categories")}
            </a>
            <PiCaretRight aria-hidden="true" />
            {area ? (
              <>
                <a
                  href={categoryHref(category.id)}
                  className="hover:text-primary"
                >
                  {category.name[language]}
                </a>
                <PiCaretRight aria-hidden="true" />
                <span aria-current="page" className="text-neutral-800">
                  {area.name[language]}
                </span>
              </>
            ) : (
              <span aria-current="page" className="text-neutral-800">
                {category.name[language]}
              </span>
            )}
          </>
        ) : (
          <span aria-current="page">
            {t("Categorías y subcategorías", "Categories and subcategories")}
          </span>
        )}
      </nav>

      <BlurFade key={route.path} duration={0.25} blur="2px">
        <header
          className={
            category
              ? "grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14"
              : "max-w-3xl"
          }
        >
          <div>
            <p className="mb-4 text-xs font-semibold text-primary">
              {category
                ? t(
                    area ? "CONOCE ESTA SUBCATEGORÍA" : "CONOCE ESTA CATEGORÍA",
                    area ? "ABOUT THIS SUBCATEGORY" : "ABOUT THIS CATEGORY",
                  )
                : t(
                    "EL OFICIO CORRECTO PARA TU PROYECTO",
                    "THE RIGHT TRADE FOR YOUR PROJECT",
                  )}
            </p>
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.15] font-bold tracking-[-0.04em] text-balance">
              {title}
            </h1>
            {category && (
              <h2 className="mt-6 text-base font-semibold text-neutral-800">
                {t("¿En qué consiste?", "What does it involve?")}
              </h2>
            )}
            <p
              className="mt-3 max-w-2xl text-base leading-8 text-neutral-600"
              data-category-concept
            >
              {description}
            </p>
            <p className="mt-5 text-sm text-neutral-500 tabular-nums">
              {category
                ? `${area ? "" : `${areas.length} ${t("subcategorías", "subcategories")} · `}${selectedServices.length} ${t("servicios", "services")}`
                : `${categories.length} ${t("categorías", "categories")} · ${subcategories.length} ${t("subcategorías", "subcategories")}`}
            </p>
            {category && (
              <Button asChild className="mt-7 h-11 rounded-lg">
                <a
                  href={`#/professionals?${new URLSearchParams({ category: category.id, ...(area ? { subcategory: area.id } : {}) })}`}
                >
                  {t(
                    "Ver profesionales de esta especialidad",
                    "Find professionals in this specialty",
                  )}
                  <PiArrowUpRight aria-hidden="true" />
                </a>
              </Button>
            )}
          </div>
          {category && (
            <img
              src={area?.image || category.image}
              alt={title}
              width={752}
              height={664}
              fetchPriority="high"
              className="aspect-[4/3] w-full rounded-3xl object-cover lg:max-h-96"
            />
          )}
        </header>
      </BlurFade>

      {!category ? (
        <section
          aria-label={t("Directorio de categorías", "Category directory")}
        >
          <div className="mb-7 flex flex-wrap items-center justify-between gap-5 border-y border-neutral-200 py-5">
            <p role="status" className="text-sm text-neutral-500">
              {visible.length}{" "}
              {t("categorías disponibles", "categories available")}
            </p>
            <div className="relative w-full sm:w-96">
              <PiMagnifyingGlass
                aria-hidden="true"
                className="pointer-events-none absolute top-3 left-3 size-4 text-neutral-400"
              />
              <Input
                type="search"
                aria-label={t(
                  "Buscar categorías o subcategorías",
                  "Search categories or subcategories",
                )}
                placeholder={t(
                  "Ej. pintura, jardines, fugas…",
                  "E.g. painting, gardens, leaks…",
                )}
                className="h-10 rounded-lg pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((category) => (
              <MagicCard
                key={category.id}
                className="rounded-2xl"
                gradientFrom="#e00707"
                gradientTo="#f5b5a7"
                gradientColor="#fff1f1"
                gradientOpacity={0.2}
              >
                <article className="p-4" data-category-summary={category.id}>
                  <a href={categoryHref(category.id)} className="group block">
                    <img
                      src={category.image}
                      alt={category.name[language]}
                      loading="lazy"
                      width={376}
                      height={332}
                      className="aspect-[16/10] w-full rounded-xl object-cover"
                    />
                    <h2 className="mt-5 text-lg font-semibold tracking-tight group-hover:text-primary">
                      {category.name[language]}
                    </h2>
                  </a>
                  <p className="mt-3 text-sm leading-6 text-neutral-500">
                    {category.description[language]}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-neutral-700 tabular-nums">
                    {
                      services.filter((service) =>
                        serviceInCategory(service, category.id),
                      ).length
                    }{" "}
                    {t("servicios", "services")}
                  </p>
                  <ul className="mt-5 divide-y divide-neutral-100 border-t border-neutral-100">
                    {subcategories
                      .filter((area) => area.categoryId === category.id)
                      .map((area) => (
                        <li key={area.id}>
                          <a
                            href={categoryHref(category.id, area.id)}
                            className="flex min-h-12 items-center justify-between gap-3 py-3 text-[13px] leading-5 hover:text-primary"
                          >
                            <span>{area.name[language]}</span>
                            <PiArrowRight
                              aria-hidden="true"
                              className="shrink-0 text-primary"
                            />
                          </a>
                        </li>
                      ))}
                  </ul>
                  <Button asChild variant="link" className="mt-2 px-0">
                    <a href={categoryHref(category.id)}>
                      {t("Conocer esta categoría", "About this category")}
                      <PiArrowUpRight aria-hidden="true" />
                    </a>
                  </Button>
                </article>
              </MagicCard>
            ))}
          </div>
          {!visible.length && (
            <Empty
              title={t(
                "No encontramos esa especialidad",
                "Specialty not found",
              )}
              description={t(
                "Busca por oficio, subcategoría o tipo de trabajo.",
                "Search by trade, subcategory or type of work.",
              )}
            >
              <Button variant="outline" onClick={() => setQuery("")}>
                {t("Limpiar búsqueda", "Clear search")}
              </Button>
            </Empty>
          )}
        </section>
      ) : (
        <>
          <section
            aria-labelledby="category-when-title"
            className="grid gap-4 border-y border-neutral-200 py-7 md:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] md:gap-10"
          >
            <h2
              id="category-when-title"
              className="text-xl leading-8 font-semibold tracking-tight"
            >
              {t(
                "¿Cuándo necesitas un profesional?",
                "When should you call a professional?",
              )}
            </h2>
            <p
              className="max-w-prose text-sm leading-7 text-neutral-600"
              data-category-when
            >
              {
                (context ||
                  category.when ||
                  categoryGuides[category.id]?.when ||
                  category.description)[language]
              }
            </p>
          </section>
          {area ? (
            <section aria-labelledby="category-services-title">
              <h2
                id="category-services-title"
                className="mb-6 text-2xl font-semibold tracking-tight"
              >
                {t(
                  "Servicios de esta subcategoría",
                  "Services in this subcategory",
                )}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {selectedServices.map((service) => (
                  <ServiceGuideCard
                    key={service.id}
                    service={service}
                    language={language}
                  />
                ))}
              </div>
            </section>
          ) : (
            <section aria-labelledby="category-areas-title">
              <div className="mb-6">
                <h2
                  id="category-areas-title"
                  className="text-2xl font-semibold tracking-tight"
                >
                  {t("Subcategorías de", "Subcategories of")}{" "}
                  {category.name[language].toLowerCase()}
                </h2>
              </div>
              <div className="grid gap-6">
                {areas.map((area) => (
                  <Card
                    key={area.id}
                    className="gap-0 overflow-hidden py-0 shadow-none lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
                    data-category-subcategory={area.id}
                  >
                    <CardContent className="space-y-4 bg-[#faf8f5] p-5 sm:p-6">
                      <img
                        src={area.image}
                        alt={area.name[language]}
                        width={640}
                        height={360}
                        loading="lazy"
                        className="aspect-[2.1] max-h-56 w-full rounded-lg object-cover"
                      />
                      <h3 className="text-xl font-semibold tracking-tight">
                        <a
                          href={categoryHref(category.id, area.id)}
                          className="hover:text-primary"
                        >
                          {area.name[language]}
                        </a>
                      </h3>
                      <p className="max-w-prose text-sm leading-7 text-neutral-600">
                        {areaDescription(area, language)}
                      </p>
                      <Button asChild variant="link" className="px-0">
                        <a href={categoryHref(category.id, area.id)}>
                          {t("Explorar subcategoría", "Explore subcategory")}
                          <PiArrowRight aria-hidden="true" />
                        </a>
                      </Button>
                    </CardContent>
                    <div className="divide-y divide-neutral-200 border-t border-neutral-200 px-2 py-3 sm:px-4 lg:border-t-0 lg:border-l">
                      <h4 className="px-4 py-3 text-base font-bold sm:px-5">
                        {t("Servicios", "Services")}
                      </h4>
                      {selectedServices
                        .filter((service) =>
                          serviceInSubcategory(service, area.id),
                        )
                        .map((service) => (
                          <ServiceGuideCard
                            key={service.id}
                            service={service}
                            language={language}
                          />
                        ))}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
          <MapSurface
            language={language}
            scope={{ categoryId: category.id, subcategoryId: area?.id }}
          />
          <CatalogProjectCta language={language} categoryId={category.id} />
          <aside
            className="flex items-start gap-4 rounded-2xl bg-neutral-50 p-6 sm:p-8"
            aria-label={t("Alcance de la categoría", "Category scope")}
          >
            <PiInfo
              aria-hidden="true"
              className="mt-1 size-6 shrink-0 text-primary"
            />
            <div>
              <h2 className="text-base font-semibold">
                {t("Qué debes tener en cuenta", "What to keep in mind")}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
                {category.excluded[language]}
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-500">
                {t(
                  "Confirma con el profesional los materiales, medidas, permisos y condiciones antes de contratar.",
                  "Confirm materials, dimensions, permits and terms with your professional before hiring.",
                )}
              </p>
            </div>
          </aside>
          <a
            href={area ? categoryHref(category.id) : "#/categories"}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            {area
              ? t("Volver a la categoría", "Back to category")
              : t("Ver todas las categorías", "Browse all categories")}
            <PiArrowRight aria-hidden="true" />
          </a>
        </>
      )}
    </div>
  );
}
