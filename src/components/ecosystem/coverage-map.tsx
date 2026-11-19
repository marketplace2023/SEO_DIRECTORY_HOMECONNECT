import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Pane,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import {
  PiMapPin,
  PiArrowUpRight,
  PiGlobeHemisphereWest,
  PiList,
  PiMapTrifold,
  PiMagnifyingGlass,
} from "react-icons/pi";
import { useStore } from "@/domain/store";
import {
  categories,
  categoryName,
  services,
  subcategories,
} from "@/data/catalog";
import type { Language } from "@/domain/types";
import { displayedLocation, type MapBounds } from "@/domain/geography";
import { filtersFromParams, findProfessionals } from "@/domain/queries";
import { navigate, useRoute } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Empty, PageTitle, copy } from "./primitives";
import "leaflet/dist/leaflet.css";

function profileMarker(imageUrl: string, name: string, selected: boolean) {
  const avatar = document.createElement("span");
  avatar.className = "map-profile-avatar";
  const initials = document.createElement("span");
  initials.className = "map-profile-initials";
  initials.textContent = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] || "")
    .join("")
    .toUpperCase();
  avatar.append(initials);
  const image = document.createElement("img");
  image.alt = ""; // The Leaflet marker itself carries the business name.
  image.draggable = false;
  image.addEventListener("error", () => image.remove(), { once: true });
  try {
    const url = new URL(imageUrl, window.location.href);
    if (imageUrl && ["http:", "https:"].includes(url.protocol)) {
      image.src = url.href;
      avatar.append(image);
    }
  } catch {
    /* Keep the initials when the profile has no usable image. */
  }
  return L.divIcon({
    className: `contractor-marker profile-marker ${selected ? "selected" : ""}`,
    html: avatar,
    iconSize: [48, 56],
    iconAnchor: [24, 54],
    popupAnchor: [0, -48],
  });
}

function MapBehavior({
  positions,
  selected,
  fitKey,
  applied,
  onMove,
}: {
  positions: [number, number][];
  selected?: [number, number];
  fitKey: string;
  applied?: MapBounds;
  onMove: (bounds: MapBounds) => void;
}) {
  const map = useMapEvents({
    moveend() {
      const b = map.getBounds();
      onMove([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
    },
  });
  const fitted = useRef<string | null>(null);
  useEffect(() => {
    if (!map.getContainer().clientWidth) return;
    map.invalidateSize();
    if (fitted.current === fitKey) return;
    if (applied)
      map.fitBounds(
        [
          [applied[0], applied[1]],
          [applied[2], applied[3]],
        ],
        { animate: false },
      );
    else if (positions.length === 1)
      map.setView(positions[0], 10, { animate: false });
    else if (positions.length > 1)
      map.fitBounds(positions, {
        padding: [55, 55],
        maxZoom: 10,
        animate: false,
      });
    if (applied || positions.length) fitted.current = fitKey;
  }, [map, fitKey, positions.length]);
  useEffect(() => {
    if (selected) map.panTo(selected, { animate: false });
  }, [map, selected?.[0], selected?.[1]]);
  return null;
}

export function CoverageMap({
  language,
  compact = false,
}: {
  language: Language;
  compact?: boolean;
}) {
  const { state } = useStore();
  const route = useRoute(),
    t = copy(language);
  const [localParams, setLocalParams] = useState(
    new URLSearchParams({ region: "Georgia" }),
  );
  const params = compact ? localParams : route.params;
  const filters = filtersFromParams(params, params.size ? "" : "Georgia");
  const [query, setQuery] = useState(params.get("q") || "");
  const [city, setCity] = useState(params.get("city") || "");
  const [selected, setSelected] = useState(params.get("selected") || "");
  const [mobileView, setMobileView] = useState("map");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [viewport, setViewport] = useState<MapBounds>();
  const [countries, setCountries] = useState<GeoJsonObject | null>(null);
  const [counties, setCounties] = useState<GeoJsonObject | null>(null);
  const [streets, setStreets] = useState(true);
  const [tileError, setTileError] = useState(false);
  const [baseError, setBaseError] = useState(false);
  const [locating, setLocating] = useState(false),
    [geoMessage, setGeoMessage] = useState("");
  const resultList = useRef<HTMLElement>(null);
  useEffect(() => {
    const list = resultList.current;
    const result = list?.querySelector<HTMLElement>(
      `[data-professional="${CSS.escape(selected)}"]`,
    );
    if (list && result)
      list.scrollTo({ top: result.offsetTop, behavior: "instant" });
  }, [selected]);
  useEffect(() => {
    setQuery(params.get("q") || "");
    setCity(params.get("city") || "");
    setSelected(params.get("selected") || "");
  }, [params.toString()]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/maps/countries.geojson", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setCountries)
      .catch((e) => {
        if (e.name !== "AbortError") setBaseError(true);
      });
    fetch("/maps/georgia-counties.geojson", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(setCounties)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const commit = (next: URLSearchParams) => {
    if (!next.has("region")) next.set("region", filters.region || "all");
    compact ? setLocalParams(next) : navigate("/coverage", next);
  };
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key === "region" && !value) next.set("region", "all");
    if (key === "category") {
      next.delete("subcategory");
      next.delete("service");
    }
    if (key !== "selected") next.delete("selected");
    commit(next);
  };
  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ q: query, city }))
      value ? next.set(key, value) : next.delete(key);
    next.delete("bounds");
    next.delete("selected");
    commit(next);
  };
  const results = findProfessionals(state, filters);
  const visible =
    params.get("sort") === "name"
      ? [...results].sort((a, b) => a.name.localeCompare(b.name))
      : results;
  const located = visible
    .map((p) => ({ person: p, point: displayedLocation(p, filters.bounds) }))
    .filter((row) => row.point !== null);
  const positions = located.map(
    ({ point }) => [point!.latitude, point!.longitude] as [number, number],
  );
  const focused = located.find(({ person }) => person.id === selected);
  const regions = [
    ...new Set(
      state.professionals
        .filter((p) => p.publication === "published")
        .map((p) => p.region),
    ),
  ];
  const fitParams = new URLSearchParams(params);
  fitParams.delete("selected");
  fitParams.delete("sort");
  const locateMe = () => {
    if (!navigator.geolocation) {
      setGeoMessage(
        t(
          "Tu navegador no ofrece ubicación. Escribe una ciudad.",
          "Location is unavailable. Enter a city.",
        ),
      );
      return;
    }
    setLocating(true);
    setGeoMessage("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const next = new URLSearchParams(params);
        next.set(
          "bounds",
          [
            Math.max(-90, coords.latitude - 0.09),
            Math.max(-180, coords.longitude - 0.12),
            Math.min(90, coords.latitude + 0.09),
            Math.min(180, coords.longitude + 0.12),
          ].join(","),
        );
        next.set("region", "all");
        next.delete("city");
        next.delete("selected");
        commit(next);
      },
      () => {
        setLocating(false);
        setGeoMessage(
          t(
            "No se obtuvo tu ubicación. Puedes buscar por ciudad o mover el mapa.",
            "Could not get your location. Search by city or move the map.",
          ),
        );
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  };
  return (
    <section
      className={`coverage-map-section discovery-map ${compact ? "compact" : ""}`}
    >
      {!compact && (
        <PageTitle
          eyebrow={t("EXPLORA TU VECINDARIO", "EXPLORE YOUR NEIGHBORHOOD")}
          title={t(
            "El profesional que buscas, en tu zona.",
            "Find the right professional in your area.",
          )}
          description={t(
            "Busca un servicio, compara fichas y explora dónde trabajan. Lista y mapa comparten los mismos filtros.",
            "Search a service, compare listings and explore service areas. List and map share the same filters.",
          )}
          action={
            <Button asChild variant="outline">
              <a href="#/areas">
                <PiGlobeHemisphereWest />
                {t("Mapa de zonas de EE. UU.", "U.S. area map")}
              </a>
            </Button>
          }
        />
      )}
      <form className="map-search-form" onSubmit={search}>
        <Field label={t("Servicio o negocio", "Service or business")}>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("¿Qué necesitas resolver?", "What needs doing?")}
          />
        </Field>
        <Field label={t("Ciudad o área atendida", "City or service area")}>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Lawrenceville"
          />
        </Field>
        <Button type="submit">
          <PiMagnifyingGlass />
          {t("Buscar", "Search")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={locating}
          onClick={locateMe}
        >
          <PiMapPin />
          {locating
            ? t("Ubicando…", "Locating…")
            : t("Mi ubicación", "My location")}
        </Button>
      </form>
      {geoMessage && (
        <p className="eco-note" role="alert">
          {geoMessage}
        </p>
      )}
      <Button
        className="map-mobile-filter-toggle"
        variant="outline"
        aria-expanded={filtersExpanded}
        onClick={() => setFiltersExpanded(!filtersExpanded)}
      >
        {t("Filtros", "Filters")}
        {filters.categoryId
          ? ` · ${categoryName(filters.categoryId, language)}`
          : ""}
      </Button>
      <div className="map-toolbar" data-expanded={filtersExpanded}>
        <Field label={t("Región del mapa", "Map region")}>
          <select
            value={filters.region || ""}
            onChange={(e) => update("region", e.target.value)}
          >
            <option value="">
              {t("Todo el ecosistema", "Entire ecosystem")}
            </option>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label={t("Especialidad en el mapa", "Map specialty")}>
          <select
            value={filters.categoryId}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">
              {t("Todas las especialidades", "All specialties")}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[language]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Servicio específico", "Specific service")}>
          <select
            value={filters.serviceId}
            onChange={(e) => update("service", e.target.value)}
          >
            <option value="">{t("Todos los servicios", "All services")}</option>
            {services
              .filter(
                (s) =>
                  !filters.categoryId || s.categoryId === filters.categoryId,
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name[language]}
                </option>
              ))}
          </select>
        </Field>
        <Field label={t("Subcategoría", "Subcategory")}>
          <select
            value={filters.subcategoryId}
            onChange={(e) => update("subcategory", e.target.value)}
          >
            <option value="">{t("Todas las áreas", "All areas")}</option>
            {subcategories
              .filter(
                (s) =>
                  !filters.categoryId || s.categoryId === filters.categoryId,
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name[language]}
                </option>
              ))}
          </select>
        </Field>
        <Field label={t("Calificación mínima", "Minimum rating")}>
          <select
            value={filters.minimumRating || 0}
            onChange={(e) => update("rating", e.target.value)}
          >
            <option value="0">{t("Todas", "All")}</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
          </select>
        </Field>
        <Field label={t("Ordenar resultados", "Sort results")}>
          <select
            value={params.get("sort") || "default"}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="default">
              {t("Orden del directorio", "Directory order")}
            </option>
            <option value="name">{t("Nombre A–Z", "Name A–Z")}</option>
          </select>
        </Field>
        <label className="verified-filter">
          <input
            type="checkbox"
            checked={filters.verifiedOnly || false}
            onChange={(e) => update("verified", e.target.checked ? "1" : "")}
          />
          {t("Con credencial verificada", "With verified credential")}
        </label>
        <Button
          variant="outline"
          onClick={() => commit(new URLSearchParams({ region: "all" }))}
        >
          <PiGlobeHemisphereWest />
          {t("Ver todos", "Show all")}
        </Button>
      </div>
      <div className="discovery-summary">
        <p role="status">
          {visible.length}{" "}
          {t("contratistas en el mapa", "contractors on the map")}
        </p>
        {located.length !== visible.length && (
          <span>
            {visible.length - located.length}{" "}
            {t("sin marcador público", "without a public marker")}
          </span>
        )}
        {filters.bounds && (
          <Button variant="ghost" onClick={() => update("bounds", "")}>
            {t("Quitar límite del mapa", "Clear map boundary")}
          </Button>
        )}
        {!compact && (
          <Button
            variant="outline"
            onClick={() =>
              navigate("/professionals", new URLSearchParams(params))
            }
          >
            <PiList />
            {t("Abrir directorio", "Open directory")}
          </Button>
        )}
      </div>
      <div
        className="map-mobile-switch"
        role="group"
        aria-label={t("Vista de resultados", "Results view")}
      >
        <Button
          variant="outline"
          aria-pressed={mobileView === "list"}
          onClick={() => setMobileView("list")}
        >
          <PiList />
          {t("Lista", "List")}
        </Button>
        <Button
          variant="outline"
          aria-pressed={mobileView === "map"}
          onClick={() => setMobileView("map")}
        >
          <PiMapTrifold />
          {t("Mapa", "Map")}
        </Button>
      </div>
      <div className="geoportal-layout" data-mobile-view={mobileView}>
        <div className="geoportal-map">
          <MapContainer
            center={[33.95, -84.1]}
            zoom={8}
            minZoom={2}
            maxZoom={18}
            scrollWheelZoom={false}
            className="real-map"
            aria-label={t(
              "Mapa interactivo de contratistas",
              "Interactive contractor map",
            )}
          >
            <Pane name="local-geography" style={{ zIndex: 150 }}>
              {countries && (
                <GeoJSON
                  data={countries}
                  style={{
                    color: "#d1d5db",
                    fillColor: "#f5f5f5",
                    fillOpacity: 1,
                    weight: 1,
                  }}
                />
              )}
              {counties && (
                <GeoJSON
                  data={counties}
                  style={{
                    color: "#b8c4cc",
                    fillColor: "#f9fbfc",
                    fillOpacity: 1,
                    weight: 1,
                  }}
                  onEachFeature={(feature, layer) => {
                    layer.bindTooltip(`${feature.properties.NAME} County`);
                  }}
                />
              )}
            </Pane>
            {streets && !tileError && (
              <TileLayer
                attribution={
                  import.meta.env.VITE_MAP_TILE_ATTRIBUTION ||
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                }
                url={
                  import.meta.env.VITE_MAP_TILE_URL ||
                  "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
                eventHandlers={{ tileerror: () => setTileError(true) }}
              />
            )}
            <MapBehavior
              positions={positions}
              selected={
                focused
                  ? [focused.point!.latitude, focused.point!.longitude]
                  : undefined
              }
              applied={filters.bounds}
              fitKey={fitParams.toString() + mobileView}
              onMove={setViewport}
            />
            {located.map(({ person: p, point }) => (
              <Marker
                key={p.id}
                position={[point!.latitude, point!.longitude]}
                title={p.name}
                alt={p.name}
                zIndexOffset={selected === p.id ? 1000 : 0}
                icon={profileMarker(p.img, p.name, selected === p.id)}
                eventHandlers={{ click: () => update("selected", p.id) }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -48]}
                  permanent={tileError || !streets}
                >
                  {point!.label}
                </Tooltip>
                <Popup>
                  <div className="map-popup">
                    <strong>{p.name}</strong>
                    <span>{categoryName(p.categoryId, language)}</span>
                    <p>
                      {point!.label}, {p.country}
                    </p>
                    <p>
                      {point!.serviceArea
                        ? t("Área atendida declarada", "Declared service area")
                        : point!.precision === "city"
                          ? t(
                              "Ubicación aproximada de ciudad",
                              "Approximate city location",
                            )
                          : t(
                              "Punto público declarado",
                              "Declared public point",
                            )}
                    </p>
                    <button onClick={() => navigate(`/professionals/${p.id}`)}>
                      {t("Ver ficha", "View profile")}{" "}
                      <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <Button
            className="map-search-area"
            disabled={!viewport}
            onClick={() => {
              if (viewport)
                update("bounds", viewport.map((n) => n.toFixed(5)).join(","));
            }}
          >
            <PiMagnifyingGlass />
            {t("Buscar en esta área", "Search this area")}
          </Button>
          <div className="map-attribution">
            {t(
              "Base local: Natural Earth · Consulta la precisión de cada marcador.",
              "Local basemap: Natural Earth · Check each marker's precision.",
            )}
          </div>
          <label className="map-streets-toggle">
            <input
              type="checkbox"
              checked={streets}
              onChange={(e) => {
                setStreets(e.target.checked);
                setTileError(false);
              }}
            />
            {t(
              "Calles OpenStreetMap (requiere internet)",
              "OpenStreetMap streets (requires internet)",
            )}
          </label>
          {tileError && streets && (
            <p className="map-fallback-note">
              {t(
                "Calles no disponibles. Se mantiene la base cartográfica local.",
                "Street tiles unavailable. The local geographic basemap remains visible.",
              )}
            </p>
          )}
          {baseError && (
            <p role="alert">
              {t(
                "No se pudo cargar la base local. Los marcadores siguen disponibles.",
                "Could not load the local basemap. Markers remain available.",
              )}
            </p>
          )}
        </div>
        <aside
          className="map-results"
          ref={resultList}
          aria-label={t("Contratistas del mapa", "Map contractors")}
        >
          {visible.length ? (
            visible.map((p, index) => {
              const point = displayedLocation(p, filters.bounds);
              return (
                <article
                  data-professional={p.id}
                  aria-current={selected === p.id ? "true" : undefined}
                  className={selected === p.id ? "selected" : ""}
                  key={p.id}
                >
                  <div className="map-result-top">
                    <img
                      src={p.img}
                      alt=""
                      width={76}
                      height={76}
                      loading="lazy"
                    />
                    <span className="eco-badge">
                      {p.id.startsWith("pro-")
                        ? t("Negocio registrado", "Registered business")
                        : t("Perfil de muestra", "Sample profile")}
                    </span>
                  </div>
                  <button
                    className="map-result-focus"
                    onClick={() => {
                      update("selected", p.id);
                      setMobileView("map");
                    }}
                    aria-label={`${t("Localizar", "Locate")} ${p.name}`}
                    disabled={!point}
                  >
                    <span>{index + 1}</span>
                    <div>
                      <h3>{p.name}</h3>
                      <p>{categoryName(p.categoryId, language)}</p>
                      <span>
                        <PiMapPin />
                        {p.city}, {p.region}
                      </span>
                    </div>
                  </button>
                  <p className="map-result-bio">{p.bio[language]}</p>
                  <p className="map-result-areas">
                    {t("Atiende", "Serves")}: {p.coverage.join(", ")}
                  </p>
                  <small>
                    {!point
                      ? t("Sin marcador público", "No public marker")
                      : point.serviceArea
                        ? t("Marcador de área atendida", "Service-area marker")
                        : point.precision === "city"
                          ? t(
                              "Centro de ciudad aproximado",
                              "Approximate city center",
                            )
                          : t(
                              "Punto público declarado",
                              "Declared public point",
                            )}
                  </small>
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/professionals/${p.id}`)}
                  >
                    {t("Ver ficha", "View profile")}
                    <PiArrowUpRight />
                  </Button>
                </article>
              );
            })
          ) : (
            <Empty
              title={t(
                "No hay contratistas con estos filtros",
                "No contractors match these filters",
              )}
              description={t(
                "Amplía el área o prueba otra especialidad. No se añaden negocios ficticios para completar resultados.",
                "Expand the area or try another trade. No listings are invented to fill results.",
              )}
            />
          )}
        </aside>
      </div>
      <p className="eco-note">
        {t(
          "Los negocios declaran sus áreas de servicio. Un marcador no verifica dirección, disponibilidad ni distancia de viaje. Los perfiles de muestra no están disponibles para contratar.",
          "Businesses declare their service areas. A marker does not verify an address, availability or travel distance. Sample profiles are not available for hiring.",
        )}
      </p>
    </section>
  );
}
