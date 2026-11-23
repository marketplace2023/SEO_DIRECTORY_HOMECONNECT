import { useEffect, useRef, useState } from "react";
import {
  PiArrowRight,
  PiArrowUpRight,
  PiCheck,
  PiInfo,
  PiMagnifyingGlass,
  PiMapPin,
  PiSquaresFour,
} from "react-icons/pi";
import { categories, services, subcategories } from "@/data/catalog";
import { normalize, type Language } from "@/domain/types";
import { useStore } from "@/domain/store";
import { navigate, type Route } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { categoryIcon, serviceIcon } from "@/components/category-icons";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { DirectionAwareHover } from "@/components/ui/direction-aware-hover";
import { Input } from "@/components/ui/input";
import { MagicCard } from "@/components/ui/magic-card";
import { NativeSelect } from "@/components/ui/native-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Empty, copy } from "./primitives";
import { MapSurface } from "./map-surface";
import { CatalogProjectCta } from "./catalog-project-cta";

export function CatalogPage({
  route,
  language,
}: {
  route: Route;
  language: Language;
}) {
  const t = copy(language);
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const nav = useRef<HTMLElement>(null);
  const selected = categories.find(
    (category) => category.id === route.params.get("category"),
  );
  const groups = subcategories.filter(
    (group) => group.categoryId === selected?.id,
  );
  const visible = categories.filter((category) =>
    normalize(
      [
        category.name.es,
        category.name.en,
        category.description[language],
        ...category.included.map((item) => item[language]),
      ].join(" "),
    ).includes(normalize(query.trim())),
  );
  const published = (id: string) =>
    state.professionals.filter(
      (person) =>
        person.publication === "published" &&
        person.region === "Georgia" &&
        person.categoryId === id,
    ).length;
  const selectCategory = (id: string) => {
    navigate("/catalog", new URLSearchParams(id ? { category: id } : {}));
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const explore = (path: string, subcategory?: string) =>
    navigate(
      path,
      new URLSearchParams({
        ...(selected ? { category: selected.id } : {}),
        ...(subcategory ? { subcategory } : {}),
        region: "Georgia",
      }),
    );
  useEffect(() => {
    const current = nav.current?.querySelector<HTMLButtonElement>(
      '[aria-current="page"]',
    );
    const viewport = nav.current?.closest('[data-slot="scroll-area-viewport"]');
    if (current && viewport) viewport.scrollTop = current.offsetTop - 80;
  }, [selected?.id]);
  const Icon = selected ? categoryIcon(selected.id) : PiSquaresFour;

  return (
    <div className="space-y-10 pb-8 md:space-y-12" data-catalog-view>
      {selected ? (
        <BlurFade key={selected.id} blur="3px" duration={0.3}>
          <section aria-label={t("Significado y alcance", "Meaning and scope")}>
            <div className="grid overflow-hidden rounded-3xl bg-neutral-50 lg:grid-cols-[1.05fr_1fr]">
              <div className="flex flex-col items-start px-6 py-8 sm:px-9 sm:py-10 xl:px-12 xl:py-12">
                <div className="mb-6 flex items-center gap-3 text-xs font-semibold text-neutral-600">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white text-xl text-primary shadow-xs">
                    <Icon aria-hidden="true" />
                  </span>
                  {t("Servicios para tu hogar", "Services for your home")}
                  <span className="h-3 border-l border-neutral-300" />
                  <span className="flex items-center gap-1">
                    <PiMapPin aria-hidden="true" /> Georgia
                  </span>
                </div>
                <h1 className="max-w-xl text-[clamp(2rem,3.5vw,3.4rem)] leading-[1.12] font-bold tracking-[-0.045em] text-balance">
                  {selected.name[language]}
                </h1>
                <p className="mt-5 max-w-lg text-[15px] leading-7 text-neutral-600 sm:text-base">
                  {selected.description[language]}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    className="h-12 rounded-lg px-5"
                    onClick={() => explore("/professionals")}
                  >
                    {t("Ver profesionales", "See professionals")}
                    <PiArrowUpRight aria-hidden="true" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-lg bg-white px-5"
                    onClick={() => explore("/coverage")}
                  >
                    <PiMapPin aria-hidden="true" />
                    {t("Explorar en el mapa", "Explore on the map")}
                  </Button>
                  <Button asChild variant="link" className="h-12 px-0">
                    <a href={`#/areas?state=GA&category=${selected.id}`}>
                      {t("Contratistas por zona", "Contractors by area")}
                      <PiArrowUpRight aria-hidden="true" />
                    </a>
                  </Button>
                </div>
                <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-neutral-500">
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      published(selected.id) ? "bg-primary" : "bg-neutral-400",
                    )}
                  />
                  {published(selected.id)
                    ? t(
                        `${published(selected.id)} perfiles publicados en Georgia`,
                        `${published(selected.id)} published profiles in Georgia`,
                      )
                    : t(
                        "Aún no hay perfiles publicados en Georgia para esta especialidad.",
                        "No published profiles in Georgia for this specialty yet.",
                      )}
                </p>
              </div>
              <div className="relative min-h-64 sm:min-h-80 lg:min-h-full">
                <img
                  src={selected.image}
                  alt={t(
                    `Imagen de ${selected.name.es.toLowerCase()}`,
                    `${selected.name.en} image`,
                  )}
                  width={752}
                  height={664}
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute right-5 bottom-5 left-5 flex items-center justify-between gap-3 rounded-xl bg-white/95 px-5 py-4 shadow-sm backdrop-blur-sm sm:right-7 sm:bottom-7 sm:left-7">
                  <div>
                    <p className="text-xs font-semibold text-neutral-800">
                      {t(
                        "Conoce tu proyecto antes de empezar",
                        "Understand your project before you start",
                      )}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {groups.length} {t("áreas de trabajo", "work areas")}
                      <span className="mx-2 text-neutral-300">/</span>
                      {
                        services.filter(
                          (service) => service.categoryId === selected.id,
                        ).length
                      }{" "}
                      {t("servicios", "services")}
                    </p>
                  </div>
                  <Icon
                    className="size-7 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-start gap-3 px-1 text-[13px] leading-6 text-neutral-500">
              <PiInfo
                className="mt-1 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p>
                <strong className="font-semibold text-neutral-800">
                  {t("Límites del servicio: ", "Service boundaries: ")}
                </strong>
                {selected.excluded[language]}
              </p>
            </div>
          </section>
        </BlurFade>
      ) : (
        <header className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold text-primary">
            {t("EL DIRECTORIO DE TU HOGAR", "YOUR HOME SERVICE DIRECTORY")}
          </p>
          <h1 className="text-4xl leading-tight font-bold tracking-[-0.04em] text-balance md:text-5xl">
            {t(
              "Cada proyecto empieza por el oficio correcto.",
              "Every project starts with the right trade.",
            )}
          </h1>
          <p className="text-base leading-7 text-neutral-500">
            {t(
              `${categories.length} categorías y ${services.length} servicios. Explora las áreas de trabajo y descubre qué incluye cada especialidad.`,
              `${categories.length} categories and ${services.length} services. Explore the work areas and discover what each trade covers.`,
            )}
          </p>
        </header>
      )}

      {selected && (
        <>
          <MapSurface language={language} scope={{ categoryId: selected.id }} />
          <CatalogProjectCta language={language} categoryId={selected.id} />
        </>
      )}
      <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-12">
        <aside
          className="min-w-0 lg:sticky lg:top-28"
          aria-label={t("Explorar categorías", "Explore categories")}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {t("Explora los servicios", "Explore services")}
            </h2>
            <span className="text-xs text-neutral-400">
              {categories.length}
            </span>
          </div>
          <div className="mb-3 lg:hidden">
            <NativeSelect
              aria-label={t("Seleccionar categoría", "Select category")}
              value={selected?.id || ""}
              onChange={(event) => selectCategory(event.target.value)}
            >
              <option value="">
                {t("Todas las categorías", "All categories")}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name[language]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className={cn("relative mb-4", selected && "hidden lg:block")}>
            <PiMagnifyingGlass
              className="pointer-events-none absolute top-3 left-3 size-4 text-neutral-400"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label={t("Buscar categoría", "Find a category")}
              placeholder={t("Buscar categoría…", "Find a category…")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 rounded-lg bg-neutral-50 pl-9 text-sm shadow-none"
            />
          </div>
          <ScrollArea className="hidden h-[min(610px,calc(100dvh-250px))] pr-3 lg:block">
            <nav
              ref={nav}
              aria-label={t("Categorías del catálogo", "Catalog categories")}
              className="space-y-1"
            >
              <button
                aria-current={!selected ? "page" : undefined}
                onClick={() => selectCategory("")}
                className={cn(
                  "mb-2 flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors hover:bg-neutral-50",
                  !selected && "bg-accent font-semibold text-primary",
                )}
              >
                <PiSquaresFour className="size-5" aria-hidden="true" />
                {t("Todas las categorías", "All categories")}
              </button>
              {visible.map((category) => (
                <button
                  key={category.id}
                  aria-current={
                    selected?.id === category.id ? "page" : undefined
                  }
                  onClick={() => selectCategory(category.id)}
                  className={cn(
                    "group flex min-h-14 w-full items-center gap-3 rounded-lg p-2 text-left text-[13px] leading-5 transition-colors hover:bg-neutral-50",
                    selected?.id === category.id &&
                      "bg-accent font-semibold text-primary",
                  )}
                >
                  <img
                    src={category.image}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    className="size-10 shrink-0 rounded-md object-cover"
                  />
                  <span className="flex-1">{category.name[language]}</span>
                  {selected?.id === category.id && (
                    <PiArrowRight
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
              {!visible.length && (
                <p role="status" className="py-5 text-sm text-neutral-500">
                  {t(
                    "Sin coincidencias. Prueba otro oficio.",
                    "No matches. Try another trade.",
                  )}
                </p>
              )}
            </nav>
          </ScrollArea>
        </aside>

        <div className="min-w-0">
          {selected ? (
            <>
              <header className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-primary">
                    {t(
                      "DEL PROYECTO A LA SOLUCIÓN",
                      "FROM PROJECT TO SOLUTION",
                    )}
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">
                    {t("¿Qué necesitas hacer?", "What do you need done?")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    {t(
                      "Encuentra tu trabajo y consulta los detalles antes de cotizar.",
                      "Find your project and review the details before requesting a quote.",
                    )}
                  </p>
                </div>
                <span className="hidden shrink-0 text-xs text-neutral-400 sm:block">
                  {String(groups.length).padStart(2, "0")} {t("áreas", "areas")}
                </span>
              </header>
              <div
                className="grid items-start gap-5 xl:grid-cols-2"
                data-catalog-areas
              >
                {groups.map((group, index) => {
                  const items = services.filter(
                    (service) => service.subcategoryId === group.id,
                  );
                  return (
                    <MagicCard
                      key={group.id}
                      className="rounded-2xl"
                      gradientFrom="var(--primary)"
                      gradientTo="#ff8010"
                      gradientColor="var(--brand-tint)"
                      gradientOpacity={0.22}
                    >
                      <article
                        className="p-3 sm:p-4"
                        data-catalog-area={group.id}
                      >
                        <DirectionAwareHover
                          imageUrl={group.image}
                          alt={group.name[language]}
                          className="h-52! w-full! rounded-xl sm:h-56!"
                          imageClassName="scale-[1.04]"
                          childrenClassName="pointer-events-none text-sm font-semibold"
                        >
                          <span>{group.name[language]}</span>
                        </DirectionAwareHover>
                        <div className="px-2 pt-5 pb-2">
                          <div className="mb-5 flex items-start gap-3">
                            <span className="mt-0.5 text-xs font-semibold text-primary">
                              0{index + 1}
                            </span>
                            <h3 className="flex-1 text-lg leading-6 font-semibold tracking-tight">
                              {group.name[language]}
                            </h3>
                            <span className="mt-0.5 text-xs text-neutral-400">
                              {items.length}
                            </span>
                          </div>
                          <ul className="divide-y divide-neutral-100 xl:min-h-40">
                            {items.map((service) => {
                              const ServiceIcon = serviceIcon(service);
                              return (
                                <li key={service.id}>
                                  <button
                                    className="service-tile group/row relative flex min-h-0! w-full items-center justify-between gap-4 rounded-none! border-0! bg-transparent! px-0! py-4! text-left hover:text-primary"
                                    onClick={() =>
                                      navigate(`/services/${service.id}`)
                                    }
                                  >
                                    <span className="inline-flex items-center gap-2 text-[13px]! leading-5! font-medium text-neutral-700! group-hover/row:text-primary!">
                                      <ServiceIcon
                                        className="size-5 shrink-0 text-primary"
                                        aria-hidden="true"
                                      />
                                      {service.name[language]}
                                    </span>
                                    <PiArrowUpRight
                                      aria-hidden="true"
                                      className="static! size-4 shrink-0 text-neutral-400 transition-transform group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5 group-hover/row:text-primary"
                                    />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          <Button
                            variant="secondary"
                            className="mt-5 h-10 w-full rounded-lg bg-neutral-100 text-xs"
                            onClick={() => explore("/professionals", group.id)}
                          >
                            {t(
                              "Buscar profesionales de esta área",
                              "Find professionals in this area",
                            )}
                            <PiArrowRight aria-hidden="true" />
                          </Button>
                        </div>
                      </article>
                    </MagicCard>
                  );
                })}
              </div>
              <section
                className="mt-8 rounded-2xl bg-[#fff4e8] px-6 py-7 sm:px-8"
                aria-label={t("Prepara tu solicitud", "Prepare your request")}
              >
                <h2 className="text-lg font-semibold tracking-tight">
                  {t(
                    "Una buena cotización empieza con los detalles.",
                    "A good quote starts with the details.",
                  )}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                  {t(
                    "Comparte el estado actual y el resultado que buscas. Así el profesional podrá delimitar mejor el trabajo.",
                    "Share the current condition and the result you want so the professional can define the work.",
                  )}
                </p>
                <ul className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-xs leading-5 text-neutral-700">
                  {[
                    t("Fotos y medidas", "Photos and dimensions"),
                    t("Ubicación y fechas", "Location and dates"),
                    t(
                      "Materiales y permisos por confirmar",
                      "Materials and permits to confirm",
                    ),
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <PiCheck className="text-primary" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="link"
                  className="mt-4 h-auto justify-start px-0 text-sm"
                  onClick={() => explore("/quote")}
                >
                  {t("Preparar mi solicitud", "Prepare my request")}
                  <PiArrowUpRight aria-hidden="true" />
                </Button>
              </section>
              <p className="mt-5 text-xs leading-6 text-neutral-500">
                {t(
                  "La disponibilidad depende de los profesionales publicados en tu localidad. Pertenecer a una categoría no acredita una licencia.",
                  "Availability depends on published local professionals. Category membership does not certify a license.",
                )}
              </p>
            </>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">
                  {query
                    ? t("Resultados de búsqueda", "Search results")
                    : t("Todas las especialidades", "All specialties")}
                </h2>
                <span role="status" className="text-xs text-neutral-500">
                  {visible.length} {t("categorías", "categories")}
                </span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((category) => {
                  const CategoryIcon = categoryIcon(category.id);
                  return (
                    <MagicCard
                      key={category.id}
                      className="rounded-2xl"
                      gradientFrom="var(--primary)"
                      gradientTo="#ff8010"
                      gradientColor="var(--brand-tint)"
                      gradientOpacity={0.22}
                    >
                      <button
                        className="catalog-category h-full w-full border-0! bg-transparent!"
                        onClick={() => selectCategory(category.id)}
                      >
                        <img
                          src={category.image}
                          alt=""
                          loading="lazy"
                          width={376}
                          height={332}
                        />
                        <h2 className="text-base! leading-6! font-semibold!">
                          <CategoryIcon
                            className="mr-2 inline size-5 text-primary"
                            aria-hidden="true"
                          />
                          {category.name[language]}
                        </h2>
                        <p>{category.description[language]}</p>
                        <span className="flex w-full items-center justify-between text-xs font-semibold text-primary">
                          {t("Explorar servicios", "Explore services")}
                          <PiArrowUpRight aria-hidden="true" />
                        </span>
                        <small>
                          {published(category.id)
                            ? t(
                                "Con perfiles en Georgia",
                                "Profiles in Georgia",
                              )
                            : t(
                                "Sin oferta publicada en Georgia",
                                "No published supply in Georgia",
                              )}
                        </small>
                      </button>
                    </MagicCard>
                  );
                })}
              </div>
              {!visible.length && (
                <Empty
                  title={t(
                    "No encontramos esa categoría",
                    "Category not found",
                  )}
                  description={t(
                    "Prueba con otra palabra o consulta todas las especialidades.",
                    "Try another word or browse all specialties.",
                  )}
                >
                  <Button variant="outline" onClick={() => setQuery("")}>
                    {t("Limpiar búsqueda", "Clear search")}
                  </Button>
                </Empty>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
