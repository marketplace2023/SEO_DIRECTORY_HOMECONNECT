import { MapViewport } from "./map-viewport";
import { isUsProfessional } from "@/domain/us-area";
import { ProfessionalFilters } from "./professional-filters";
import { ProfessionalCard } from "@/components/professional-card";
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
  PiSquaresFour,
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
import {
  contains,
  displayedLocation,
  type MapBounds,
} from "@/domain/geography";
import {
  filtersFromParams,
  findProfessionals,
  orderProfessionals,
} from "@/domain/queries";
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
  onMove: (bounds: MapBounds, source: "user" | "layout" | "selection") => void;
}) {
  const source = useRef<"user" | "layout" | "selection">("user");
  const popupPan = useRef(false);
  const map = useMapEvents({
    autopanstart() {
      popupPan.current = true;
    },
    moveend() {
      const b = map.getBounds();
      onMove(
        [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()],
        popupPan.current ? "layout" : source.current,
      );
      popupPan.current = false;
    },
  });
  const fitted = useRef<string | null>(null);
  useEffect(() => {
    if (!map.getContainer().clientWidth) return;
    source.current = "layout";
    map.invalidateSize({ pan: false });
    source.current = "user";
    if (fitted.current === fitKey) return;
    source.current = "layout";
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
    source.current = "user";
  }, [map, fitKey, positions.length]);
  useEffect(() => {
    if (!selected) return;
    source.current = "selection";
    map.panTo(selected, { animate: false });
    source.current = "user";
  }, [map, selected?.[0], selected?.[1]]);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (!map.getContainer().clientWidth) return;
      source.current = "layout";
      map.invalidateSize({ pan: false });
      source.current = "user";
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export type CatalogMapScope = { categoryId: string; serviceId?: string };

export function CoverageMap({
  language,
  compact = false,
  scope,
}: {
  language: Language;
  compact?: boolean;
  scope?: CatalogMapScope;
}) {
  const { state } = useStore();
  const route = useRoute(),
    t = copy(language);
  const local = compact || Boolean(scope);
  const [localParams, setLocalParams] = useState(
    () => new URLSearchParams({ region: scope ? "all" : "Georgia" }),
  );
  const params = new URLSearchParams(local ? localParams : route.params);
  if (scope) {
    params.set("category", scope.categoryId);
    if (scope.serviceId) params.set("service", scope.serviceId);
  }
  const filters = filtersFromParams(params);
  const [query, setQuery] = useState(params.get("q") || "");
  const [city, setCity] = useState(params.get("city") || "");
  const [selected, setSelected] = useState(params.get("selected") || "");
  const [mobileView, setMobileView] = useState("map");
  const [resultView, setResultView] = useState<"cards" | "list">("cards");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [viewport, setViewport] = useState<MapBounds>();
  const [searchedArea, setSearchedArea] = useState<{
    key: string;
    bounds: MapBounds;
  }>();
  const [fitVersion, setFitVersion] = useState(0);
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
    const changed = new Set([...params.keys(), ...next.keys()]);
    changed.delete("selected");
    changed.delete("sort");
    if ([...changed].some((key) => params.get(key) !== next.get(key)))
      setSearchedArea(undefined);
    local ? setLocalParams(next) : navigate("/coverage", next);
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
  const fitParams = new URLSearchParams(params);
  fitParams.delete("selected");
  fitParams.delete("sort");
  const fitKey = fitParams.toString();
  const area =
    searchedArea?.key === fitKey ? searchedArea.bounds : filters.bounds;
  const baseResults = findProfessionals(state, {
    ...filters,
    bounds: undefined,
  });
  const located = orderProfessionals(
    baseResults,
    params.get("sort"),
    language,
  ).flatMap((person) => {
    const point = displayedLocation(person);
    if (!point || !viewport || !contains(viewport, point)) return [];
    return [
      {
        person,
        point: {
          ...point,
          longitude:
            point.longitude +
            360 * Math.ceil((viewport[1] - point.longitude) / 360),
        },
      },
    ];
  });
  const visible = located.map((row) => row.person);
  const positions = baseResults.flatMap((person): [number, number][] => {
    const point = displayedLocation(person);
    return point ? [[point.latitude, point.longitude]] : [];
  });
  const selectedPerson = visible.find((person) => person.id === selected);
  const focused =
    located.find(({ person }) => person.id === selected)?.point ??
    (selectedPerson && displayedLocation(selectedPerson));
  const viewportLongitude = viewport ? (viewport[1] + viewport[3]) / 2 : 0;
  const focusedPosition: [number, number] | undefined = focused
    ? [
        focused.latitude,
        focused.longitude +
          360 * Math.round((viewportLongitude - focused.longitude) / 360),
      ]
    : undefined;
  const regions = [
    ...new Set(
      state.professionals
        .filter((p) => p.publication === "published" && isUsProfessional(p))
        .map((p) => p.region),
    ),
  ];
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
      className={`coverage-map-section discovery-map ${compact ? "compact" : ""} ${scope ? "catalog-coverage" : ""}`}
      aria-label={
        scope
          ? t(
              "Profesionales y mapa de cobertura",
              "Professionals and coverage map",
            )
          : undefined
      }
    >
      {scope && (
        <h2 className="catalog-coverage-title">
          {t(
            "Profesionales y mapa de cobertura",
            "Professionals and coverage map",
          )}
        </h2>
      )}
      {!local && (
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
        {!scope && (
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
        )}
        {!scope?.serviceId && (
          <Field label={t("Servicio específico", "Specific service")}>
            <select
              value={filters.serviceId}
              onChange={(e) => update("service", e.target.value)}
            >
              <option value="">
                {t("Todos los servicios", "All services")}
              </option>
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
        )}
        {!scope?.serviceId && (
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
        )}
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
        <ProfessionalFilters
          language={language}
          params={params}
          update={update}
        />
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
          onClick={() => {
            setSearchedArea(undefined);
            setFitVersion((version) => version + 1);
            commit(new URLSearchParams({ region: "all" }));
          }}
        >
          <PiGlobeHemisphereWest />
          {scope
            ? t("Limpiar filtros", "Clear filters")
            : t("Ver todos", "Show all")}
        </Button>
      </div>
      <div className="discovery-summary">
        <p role="status">
          {located.length}{" "}
          {t("contratistas en el mapa", "contractors on the map")}
        </p>
        {area && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchedArea(undefined);
              setFitVersion((version) => version + 1);
              update("bounds", "");
            }}
          >
            {t("Quitar límite del mapa", "Clear map boundary")}
          </Button>
        )}
        {!local && (
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
            scrollWheelZoom
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
            <MapViewport onChange={setViewport} />
            <MapBehavior
              positions={positions}
              selected={focusedPosition}
              applied={filters.bounds}
              fitKey={fitKey + "#" + fitVersion}
              onMove={(bounds, source) => {
                if (source !== "layout") {
                  if (source === "user") setSelected("");
                  setSearchedArea({ key: fitKey, bounds });
                }
              }}
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
          data-result-view={resultView}
          ref={resultList}
          aria-label={t("Contratistas del mapa", "Map contractors")}
        >
          <div
            className="map-result-view-switch"
            role="group"
            aria-label={t(
              "Formato de profesionales",
              "Contractor display format",
            )}
          >
            <Button
              type="button"
              size="sm"
              variant={resultView === "cards" ? "default" : "outline"}
              aria-pressed={resultView === "cards"}
              onClick={() => setResultView("cards")}
            >
              <PiSquaresFour aria-hidden="true" /> {t("Tarjetas", "Cards")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={resultView === "list" ? "default" : "outline"}
              aria-label={t("Vista de lista", "List view")}
              aria-pressed={resultView === "list"}
              onClick={() => setResultView("list")}
            >
              <PiList aria-hidden="true" /> {t("Lista", "List")}
            </Button>
          </div>
          {visible.length ? (
            visible.map((p) => {
              const point =
                located.find(({ person }) => person.id === p.id)?.point ??
                displayedLocation(p);
              return (
                <ProfessionalCard
                  key={p.id}
                  horizontal
                  selected={selected === p.id}
                  person={p}
                  language={language}
                  category={categoryName(p.categoryId, language)}
                  experience={t("años de experiencia", "years of experience")}
                  details={t("Ver ficha", "View profile")}
                  verifiedLabel={t("Verificado · demo", "Verified · demo")}
                  onOpen={() => navigate(`/professionals/${p.id}`)}
                >
                  {!scope && (
                    <details className="map-result-description">
                      <summary>
                        <span>
                          {p.bio[language] ||
                            t("Áreas de servicio", "Service areas")}
                        </span>
                      </summary>
                      <p>{p.bio[language]}</p>
                      <p>
                        <strong>{t("Atiende", "Serves")}</strong>{" "}
                        {p.coverage.join(", ")}
                      </p>
                    </details>
                  )}
                  <div className="map-result-actions">
                    {point ? (
                      <button
                        type="button"
                        className="text-link"
                        aria-label={`${t("Localizar", "Locate")} ${p.name}`}
                        onClick={() => {
                          update("selected", p.id);
                          setMobileView("map");
                        }}
                      >
                        <PiMapPin aria-hidden="true" />{" "}
                        {t("Ver en el mapa", "Show on map")}
                      </button>
                    ) : (
                      <small>
                        {t("Sin marcador público", "No public marker")}
                      </small>
                    )}
                    {point && !scope && (
                      <small>
                        {point.serviceArea
                          ? t("Área atendida", "Service area")
                          : point.precision === "city"
                            ? t("Ubicación aproximada", "Approximate location")
                            : t(
                                "Punto público declarado",
                                "Declared public point",
                              )}
                      </small>
                    )}
                  </div>
                </ProfessionalCard>
              );
            })
          ) : (
            <Empty
              title={t(
                "No hay contratistas en el área visible con estos filtros",
                "No matching contractors in the visible area",
              )}
              description={
                scope
                  ? t(
                      "Puedes cambiar la ubicación o limpiar los filtros.",
                      "Change the location or clear your filters.",
                    )
                  : t(
                      "Amplía el área o prueba otra especialidad. No se añaden negocios ficticios para completar resultados.",
                      "Expand the area or try another trade. No listings are invented to fill results.",
                    )
              }
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
