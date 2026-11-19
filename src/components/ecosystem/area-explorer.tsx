import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  PiArrowLeft,
  PiArrowUpRight,
  PiMagnifyingGlass,
  PiMapPin,
} from "react-icons/pi";
import { categories, categoryName } from "@/data/catalog";
import { usCities, usCounties, usStates } from "@/data/us-areas";
import { findProfessionals } from "@/domain/queries";
import { useStore } from "@/domain/store";
import {
  cityById,
  cityLabel,
  countyById,
  matchesUsArea,
  parseAreaQuery,
  professionalState,
  readUsArea,
  stateLabel,
  usAreaParams,
  type UsArea,
} from "@/domain/us-area";
import type { Language } from "@/domain/types";
import { navigate, type Route } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Empty, Field, copy } from "./primitives";
import { UsAreaMap } from "./us-area-map";

const nationwide = { state: "", county: "", city: "" };
const AreaResults = lazy(() => import("./area-results"));

export function AreaExplorer({
  language,
  route,
}: {
  language: Language;
  route: Route;
}) {
  const { state } = useStore();
  const t = copy(language);
  const currentQuery = route.params.get("q") ?? "";
  const [query, setQuery] = useState(currentQuery);
  useEffect(() => setQuery(currentQuery), [currentQuery]);
  const category = route.params.get("category") ?? "";
  const parsed = parseAreaQuery(currentQuery);
  const area =
    route.params.has("state") ||
    route.params.has("county") ||
    route.params.has("areaCity")
      ? readUsArea(route.params)
      : (parsed.area ?? nationwide);
  const headingRef = useRef<HTMLElement>(null);
  const areaKey = usAreaParams(area).toString();
  useEffect(() => {
    const header = headingRef.current;
    if (header && header.getBoundingClientRect().bottom < 105)
      header.scrollIntoView({ block: "start" });
  }, [areaKey]);
  const params = (
    selection: UsArea,
    input = parsed.service,
    service = category,
  ) => {
    const next = usAreaParams(selection);
    if (input.trim()) next.set("q", input.trim());
    if (service) next.set("category", service);
    return next;
  };
  const href = (selection: UsArea) => {
    const next = params(selection);
    return "#/areas" + (next.size ? "?" + next : "");
  };
  const move = (selection: UsArea, nextCategory = category) =>
    navigate(
      "/areas",
      params(selection, parseAreaQuery(query).service, nextCategory),
    );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = parseAreaQuery(query);
    navigate("/areas", params(next.area ?? area, next.service));
  };
  const list = findProfessionals(state, {
    query: parsed.service,
    categoryId: category,
    usArea: area,
  });
  const towns = usCities.filter(
    ([, , , region, county]) =>
      (!area.state || region === area.state) &&
      (!area.county || area.county === county),
  );
  const stateCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const person of area.state ? [] : list) {
    const code = professionalState(person);
    if (code) stateCounts.set(code, 1 + (stateCounts.get(code) ?? 0));
    categoryCounts.set(
      person.categoryId,
      1 + (categoryCounts.get(person.categoryId) ?? 0),
    );
  }
  const cityCounts = (area.state ? [] : towns)
    .map(([id, , , region, county]) => ({
      id,
      count: list.filter((person) =>
        matchesUsArea(person, { state: region, county, city: id }),
      ).length,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        cityLabel(a.id, language).localeCompare(cityLabel(b.id, language)),
    );
  const heading = area.city
    ? cityLabel(area.city, language)
    : area.county
      ? countyById.get(area.county)
      : area.state
        ? stateLabel(area.state, language)
        : t("Estados Unidos", "United States");
  const toDirectory = params(area);
  toDirectory.set("us", "1");

  return (
    <section className="us-area-page">
      <header ref={headingRef} className="us-area-heading">
        <div>
          {area.state && (
            <a className="us-area-back" href={href(nationwide)}>
              <PiArrowLeft />
              {t("Mapa nacional", "National map")}
            </a>
          )}
          <h1>
            {area.state
              ? heading
              : t(
                  "Encuentra profesionales por zona",
                  "Find professionals by area",
                )}
          </h1>
          {!area.state && (
            <p>
              {t(
                "Selecciona un estado, una ciudad o una zona piloto y filtra por especialidad.",
                "Select a state, city, or pilot area and filter by specialty.",
              )}
            </p>
          )}
        </div>
        <Button asChild variant="outline">
          <a href={`#/professionals?${toDirectory}`}>
            {t("Ver directorio", "View directory")}
            <PiArrowUpRight />
          </a>
        </Button>
      </header>
      <form className="map-toolbar us-area-toolbar" onSubmit={submit}>
        <Field label={t("Servicio o ubicación", "Service or location")}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "Ej. techos en Lawrenceville",
              "E.g. roofing in Lawrenceville",
            )}
          />
        </Field>
        <Field label={t("Estado", "State")}>
          <select
            value={area.state}
            onChange={(e) =>
              move({ state: e.target.value, county: "", city: "" })
            }
          >
            <option value="">{t("Todos los estados", "All states")}</option>
            {usStates.map(([id]) => (
              <option value={id} key={id}>
                {stateLabel(id, language)}
              </option>
            ))}
          </select>
        </Field>
        {area.state === "GA" && (
          <Field label={t("Condado piloto", "Pilot county")}>
            <select
              value={area.county}
              onChange={(e) =>
                move({ state: "GA", county: e.target.value, city: "" })
              }
            >
              <option value="">
                {t("Todos los condados", "All counties")}
              </option>
              {usCounties.map(([id, name]) => (
                <option value={id} key={id}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={t("Ciudad", "City")}>
          <select
            value={area.city}
            onChange={(e) => {
              const town = cityById.get(e.target.value);
              move(
                town
                  ? { state: town[3], county: town[4], city: town[0] }
                  : { ...area, city: "" },
              );
            }}
          >
            <option value="">{t("Todas las ciudades", "All cities")}</option>
            {towns.map(([id]) => (
              <option value={id} key={id}>
                {cityLabel(id, language)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Especialidad", "Specialty")}>
          <select value={category} onChange={(e) => move(area, e.target.value)}>
            <option value="">
              {t("Todas las especialidades", "All specialties")}
            </option>
            {categories.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name[language]}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit">
          <PiMagnifyingGlass />
          {t("Buscar", "Search")}
        </Button>
        <Button asChild variant="outline">
          <a href="#/areas">{t("Limpiar filtros", "Clear filters")}</a>
        </Button>
      </form>
      {area.state ? (
        <Suspense
          fallback={
            <p className="us-map-loading" role="status">
              {t("Cargando vista de la zona…", "Loading area view…")}
            </p>
          }
        >
          <AreaResults
            key={areaKey}
            area={area}
            heading={heading ?? area.state}
            language={language}
            people={list}
            getHref={href}
          />
        </Suspense>
      ) : (
        <>
          <div className="us-area-map-layout">
            <section className="us-area-panel">
              <div className="us-area-panel-header">
                <div>
                  <h2>{heading}</h2>
                  <p role="status">
                    {list.length}{" "}
                    {t(
                      "perfiles coinciden con tu búsqueda",
                      "profiles match your search",
                    )}
                  </p>
                </div>
                <div className="us-area-switch">
                  <Button asChild variant={!area.state ? "default" : "outline"}>
                    <a href={href(nationwide)}>
                      {t("Mapa nacional", "National map")}
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={href({ ...nationwide, state: "GA" })}>
                      {t("Área de Atlanta", "Atlanta area")}
                    </a>
                  </Button>
                </div>
              </div>
              <UsAreaMap
                language={language}
                area={area}
                getHref={href}
                counts={stateCounts}
              />
              <div className="us-area-legend">
                <span>
                  <i />
                  {t("Estados con perfiles", "States with profiles")}
                </span>
                <a
                  className="us-area-source"
                  href="https://github.com/topojson/us-atlas"
                  target="_blank"
                  rel="noreferrer"
                >
                  U.S. Atlas
                </a>
              </div>
            </section>
            <aside className="us-area-aside">
              <section className="us-area-panel us-area-ranking">
                <h2>{t("Ciudades en la zona", "Cities in this area")}</h2>
                {cityCounts.length ? (
                  <ul>
                    {cityCounts.map(({ id, count }) => {
                      const town = cityById.get(id)!;
                      return (
                        <li key={id}>
                          <a
                            href={href({
                              state: town[3],
                              county: town[4],
                              city: id,
                            })}
                            aria-current={area.city === id ? "true" : undefined}
                          >
                            <span>{cityLabel(id, language)}</span>
                            <strong>{count}</strong>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>
                    {t(
                      "No hay ciudades habilitadas en este estado.",
                      "No cities are available in this state.",
                    )}
                  </p>
                )}
              </section>
              <section className="us-area-panel us-area-ranking">
                <h2>{t("Especialidades", "Specialties")}</h2>
                {categoryCounts.size ? (
                  <ul>
                    {[...categoryCounts]
                      .sort((a, b) => b[1] - a[1])
                      .map(([id, count]) => (
                        <li key={id}>
                          <a
                            href={`#/areas?${params(area, parsed.service, id)}`}
                            aria-current={category === id ? "true" : undefined}
                          >
                            <span>{categoryName(id, language)}</span>
                            <strong>{count}</strong>
                          </a>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>
                    {t(
                      "No hay especialidades en estos resultados.",
                      "No specialties in these results.",
                    )}
                  </p>
                )}
              </section>
            </aside>
          </div>
          <section className="us-area-results">
            <h2>
              {t("Profesionales en esta zona", "Professionals in this area")}
            </h2>
            {list.length ? (
              <div className="us-area-result-grid">
                {list.map((person) => (
                  <article
                    key={person.id}
                    className="us-area-panel us-area-result"
                  >
                    <h3>{person.name}</h3>
                    <p>{categoryName(person.categoryId, language)}</p>
                    <p>
                      <PiMapPin />
                      {person.city}, {person.region}
                    </p>
                    <Button asChild variant="outline">
                      <a href={`#/professionals/${person.id}`}>
                        {t("Ver perfil", "View profile")}
                        <PiArrowUpRight />
                      </a>
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title={t(
                  "No hay perfiles para estos filtros",
                  "No profiles match these filters",
                )}
              />
            )}
          </section>
        </>
      )}
    </section>
  );
}
