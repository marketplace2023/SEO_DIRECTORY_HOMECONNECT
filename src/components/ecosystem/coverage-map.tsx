import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Circle,
  Pane,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import {
  PiMapPin,
  PiArrowUpRight,
  PiGlobeHemisphereWest,
} from "react-icons/pi";
import { useStore } from "@/domain/store";
import { professionalLocations } from "@/data/locations";
import { categories, categoryName } from "@/data/catalog";
import type { Language } from "@/domain/types";
import { navigate } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Field, Empty, PageTitle, copy } from "./primitives";
import "leaflet/dist/leaflet.css";

function MapView({
  positions,
  selected,
}: {
  positions: [number, number][];
  selected?: [number, number];
}) {
  const map = useMap();
  const key = JSON.stringify({ positions, selected });
  useEffect(() => {
    map.invalidateSize();
    if (selected) map.setView(selected, 11, { animate: false });
    else if (positions.length === 1)
      map.setView(positions[0], 10, { animate: false });
    else if (positions.length > 1)
      map.fitBounds(L.latLngBounds(positions), {
        padding: [55, 55],
        maxZoom: 10,
        animate: false,
      });
  }, [map, key]);
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
  const t = copy(language);
  const [region, setRegion] = useState("Georgia");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState("");
  const [countries, setCountries] = useState<GeoJsonObject | null>(null);
  const [counties, setCounties] = useState<GeoJsonObject | null>(null);
  const [streets, setStreets] = useState(true);
  const [tileError, setTileError] = useState(false);
  const [baseError, setBaseError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/maps/countries.geojson", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("basemap");
        return response.json();
      })
      .then(setCountries)
      .catch((error) => {
        if (error.name !== "AbortError") setBaseError(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/maps/georgia-counties.geojson", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("counties");
        return response.json();
      })
      .then(setCounties)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const published = state.professionals.filter(
    (p) => p.publication === "published" && professionalLocations[p.id],
  );
  const regions = [...new Set(published.map((p) => p.region))];
  const visible = published.filter(
    (p) =>
      (!region || p.region === region) &&
      (!category || p.categoryId === category),
  );
  const focused = visible.find((p) => p.id === selected);
  const positions = visible.map((p) => professionalLocations[p.id]);
  return (
    <section className={`coverage-map-section ${compact ? "compact" : ""}`}>
      {!compact && (
        <PageTitle
          eyebrow={t("TALENTO EN EL MAPA", "TALENT ON THE MAP")}
          title={t(
            "Buenas conexiones, cerca de ti.",
            "Good connections, close to you.",
          )}
          description={t(
            "Explora el piloto de Georgia y las ubicaciones internacionales. Selecciona un marcador o un contratista para acercarte a su zona.",
            "Explore the Georgia pilot and international locations. Select a marker or contractor to zoom to their area.",
          )}
        />
      )}
      <div className="map-toolbar">
        <Field label={t("Región del mapa", "Map region")}>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setSelected("");
            }}
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
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSelected("");
            }}
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
        <Button
          variant="outline"
          onClick={() => {
            setRegion("");
            setCategory("");
            setSelected("");
          }}
        >
          <PiGlobeHemisphereWest />
          {t("Ver todos", "Show all")}
        </Button>
        <p role="status">
          {visible.length}{" "}
          {t("contratistas en el mapa", "contractors on the map")}
        </p>
      </div>
      <div className="geoportal-layout">
        <div className="geoportal-map">
          <MapContainer
            center={[33.95, -84.1]}
            zoom={8}
            minZoom={2}
            maxZoom={16}
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
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                eventHandlers={{ tileerror: () => setTileError(true) }}
              />
            )}
            <MapView
              positions={positions}
              selected={focused ? professionalLocations[focused.id] : undefined}
            />
            {focused && (
              <Circle
                center={professionalLocations[focused.id]}
                radius={9000}
                pathOptions={{
                  color: "#e00707",
                  fillColor: "#e00707",
                  fillOpacity: 0.06,
                  weight: 1,
                  dashArray: "5 7",
                }}
              />
            )}
            {visible.map((p, index) => (
              <Marker
                key={p.id}
                position={professionalLocations[p.id]}
                title={p.name}
                alt={p.name}
                icon={L.divIcon({
                  className: `contractor-marker ${selected === p.id ? "selected" : ""}`,
                  html: `<span>${index + 1}</span>`,
                  iconSize: [34, 42],
                  iconAnchor: [17, 42],
                })}
                eventHandlers={{ click: () => setSelected(p.id) }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -35]}
                  permanent={tileError || !streets}
                >
                  {p.city}
                </Tooltip>
                <Popup>
                  <div className="map-popup">
                    <strong>{p.name}</strong>
                    <span>{categoryName(p.categoryId, language)}</span>
                    <p>
                      {p.city}, {p.country}
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
          <div className="map-attribution">
            {t(
              "Base local: Natural Earth · Posiciones aproximadas de demostración.",
              "Local basemap: Natural Earth · Approximate demonstration locations.",
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
          aria-label={t("Contratistas del mapa", "Map contractors")}
        >
          {visible.length ? (
            visible.map((p, index) => (
              <article
                className={selected === p.id ? "selected" : ""}
                key={p.id}
              >
                <button
                  className="map-result-focus"
                  onClick={() => setSelected(p.id)}
                  aria-label={`${t("Localizar", "Locate")} ${p.name}`}
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
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/professionals/${p.id}`)}
                >
                  {t("Ver ficha", "View profile")}
                  <PiArrowUpRight />
                </Button>
              </article>
            ))
          ) : (
            <Empty
              title={t(
                "No hay contratistas con estos filtros",
                "No contractors match these filters",
              )}
            />
          )}
        </aside>
      </div>
      <p className="eco-note">
        {t(
          "Ubicaciones ficticias a nivel de ciudad. El círculo de 9 km es una guía visual, no una cobertura verificada; las ciudades atendidas se consultan en cada ficha.",
          "Fictional city-level locations. The 9 km circle is a visual guide, not verified coverage; served cities are listed in each profile.",
        )}
      </p>
    </section>
  );
}
