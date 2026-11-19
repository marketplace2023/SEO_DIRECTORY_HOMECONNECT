import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { MultiPolygon, Polygon } from "geojson";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { PiMapPin } from "react-icons/pi";
import { ProfessionalCard } from "@/components/professional-card";
import { categoryName } from "@/data/catalog";
import { professionalLocations } from "@/data/locations";
import { locationOf } from "@/domain/geography";
import { usCities, usCounties } from "@/data/us-areas";
import { normalize, type Language, type Professional } from "@/domain/types";
import type { UsArea } from "@/domain/us-area";
import { navigate } from "@/lib/navigation";
import { Empty, copy } from "./primitives";
import "leaflet/dist/leaflet.css";

type Point = [number, number];
type Boundary = Polygon | MultiPolygon;
type Geography = {
  states: Record<string, Boundary>;
  counties: Record<string, Boundary>;
  cities: Record<string, Point>;
};
type Pin = { position: Point; people: Professional[] };

let geographyRequest: Promise<Geography> | undefined;
function loadGeography() {
  geographyRequest ??= fetch(
    import.meta.env.BASE_URL + "maps/us-area-detail.json",
  )
    .then((response) => {
      if (!response.ok) throw new Error("Area geography unavailable");
      return response.json() as Promise<Geography>;
    })
    .catch((error: unknown) => {
      geographyRequest = undefined;
      throw error;
    });
  return geographyRequest;
}

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function ContractorPin({
  pin,
  focus,
  language,
  onSelect,
}: {
  pin: Pin;
  focus: { id: string } | undefined;
  language: Language;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const marker = useRef<L.Marker>(null);
  const t = copy(language);
  const names = pin.people.map((person) => person.name).join(", ");
  const count = pin.people.length;
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "us-area-pin",
        html: `<span>${count}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -12],
      }),
    [count],
  );
  const requested =
    focus && pin.people.some((person) => person.id === focus.id)
      ? focus
      : undefined;
  useEffect(() => {
    if (!requested) return;
    map.panInside(pin.position, { padding: [48, 48] });
    marker.current?.openPopup();
  }, [map, pin.position, requested]);

  return (
    <Marker
      ref={marker}
      position={pin.position}
      title={names}
      alt={names}
      icon={icon}
      eventHandlers={{ click: () => onSelect(pin.people[0].id) }}
    >
      <Popup>
        <ul className="us-area-popup">
          {pin.people.map((person) => (
            <li key={person.id}>
              <a href={`#/professionals/${person.id}`}>{person.name}</a>
              <span>{categoryName(person.categoryId, language)}</span>
            </li>
          ))}
        </ul>
        <small>{t("Ubicación aproximada", "Approximate location")}</small>
      </Popup>
    </Marker>
  );
}

export default function AreaResults({
  area,
  heading,
  language,
  people,
  getHref,
}: {
  area: UsArea;
  heading: string;
  language: Language;
  people: Professional[];
  getHref: (area: UsArea) => string;
}) {
  const t = copy(language);
  const [geography, setGeography] = useState<Geography>();
  const [failed, setFailed] = useState(false);
  const [focus, setFocus] = useState<{ id: string }>();
  const [active, setActive] = useState("");
  const mapPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    let current = true;
    loadGeography().then(
      (data) => {
        if (current) setGeography(data);
      },
      () => {
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, []);

  const mapped = new Set<string>();
  const pins = new Map<string, Pin>();
  if (geography) {
    for (const person of people) {
      const city = usCities.find(
        ([, en, es, state]) =>
          state === area.state &&
          [en, es].some((name) => normalize(name) === normalize(person.city)),
      );
      const declared = locationOf(person);
      const position =
        person.location === null
          ? undefined
          : declared
            ? ([declared.latitude, declared.longitude] as Point)
            : ((city && geography.cities[city[0]]) ??
              professionalLocations[person.id]);
      if (!position) continue;
      mapped.add(person.id);
      const key = position.join(",");
      const pin = pins.get(key);
      if (pin) pin.people.push(person);
      else pins.set(key, { position, people: [person] });
    }
  }

  const stateBoundary = geography?.states[area.state];
  const countyBoundary = geography?.counties[area.county];
  const cityPosition = geography?.cities[area.city];
  const boundary = countyBoundary ?? stateBoundary;
  const bounds = useMemo(
    () =>
      cityPosition
        ? L.latLng(cityPosition).toBounds(22000)
        : boundary && L.geoJSON(boundary).getBounds(),
    [boundary, cityPosition],
  );
  const mapLabel = t(
    `Mapa de contratistas en ${heading}`,
    `Contractor map in ${heading}`,
  );
  const countyHref = (county: string) =>
    getHref({ state: "GA", county, city: "" });
  const locate = (id: string) => {
    setFocus({ id });
    setActive(id);
    const panel = mapPanel.current;
    if (panel && panel.getBoundingClientRect().bottom < 120)
      panel.scrollIntoView({ block: "start" });
  };

  return (
    <div className="us-area-detail">
      <section
        className="us-area-detail-results"
        aria-labelledby="area-results-title"
      >
        <div className="us-area-result-heading">
          <h2 id="area-results-title">
            {t("Contratistas disponibles", "Available contractors")}
          </h2>
          <p role="status">
            {people.length === 1
              ? t("1 perfil", "1 profile")
              : t(`${people.length} perfiles`, `${people.length} profiles`)}
          </p>
        </div>
        {people.length ? (
          <div className="us-area-contractor-grid">
            {people.map((person) => (
              <article
                key={person.id}
                className="us-area-contractor"
                data-active={active === person.id || undefined}
              >
                <ProfessionalCard
                  person={person}
                  category={categoryName(person.categoryId, language)}
                  experience={t("años de experiencia", "years of experience")}
                  details={t("Ver perfil", "View profile")}
                  verifiedLabel={t("Verificado · demo", "Verified · demo")}
                  onOpen={() => navigate(`/professionals/${person.id}`)}
                />
                {mapped.has(person.id) && (
                  <button
                    type="button"
                    className="us-area-locate"
                    aria-label={t(
                      `Localizar a ${person.name} en el mapa`,
                      `Locate ${person.name} on the map`,
                    )}
                    onClick={() => locate(person.id)}
                  >
                    <PiMapPin />
                    {t("Ver en el mapa", "Show on map")}
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title={t(
              "No hay contratistas para estos filtros",
              "No contractors match these filters",
            )}
          />
        )}
      </section>
      <section
        ref={mapPanel}
        className="us-area-detail-map"
        aria-label={mapLabel}
      >
        {area.state === "GA" && (
          <nav
            className="us-area-county-links"
            aria-label={t("Condados piloto", "Pilot counties")}
          >
            {usCounties.map(([id, name]) => (
              <a
                key={id}
                href={countyHref(id)}
                className={`zone-${id}`}
                aria-current={area.county === id ? "true" : undefined}
              >
                {name}
              </a>
            ))}
          </nav>
        )}
        {geography && bounds && stateBoundary ? (
          <MapContainer
            bounds={bounds}
            boundsOptions={{ padding: [24, 24], maxZoom: 11 }}
            minZoom={2}
            maxZoom={18}
            scrollWheelZoom={false}
            className="us-area-street-map"
          >
            <MapResize />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              data={stateBoundary}
              interactive={false}
              pathOptions={{
                color: "#63758b",
                weight: 1.5,
                fillColor: "#b4c9df",
                fillOpacity: 0.15,
              }}
            />
            {area.state === "GA" &&
              usCounties.map(([id, name]) => (
                <GeoJSON
                  key={id}
                  data={geography.counties[id]}
                  pathOptions={{
                    className: `us-area-county zone-${id}${area.county === id ? " is-selected" : ""}`,
                    weight: 2,
                    fillOpacity: area.county === id ? 0.22 : 0.12,
                  }}
                  eventHandlers={{
                    click: () => {
                      window.location.hash = countyHref(id);
                    },
                  }}
                >
                  <Tooltip sticky>{name}</Tooltip>
                </GeoJSON>
              ))}
            {[...pins].map(([key, pin]) => (
              <ContractorPin
                key={key}
                pin={pin}
                focus={focus}
                language={language}
                onSelect={setActive}
              />
            ))}
          </MapContainer>
        ) : (
          <p className="us-map-loading" role="status">
            {failed || geography
              ? t(
                  "El mapa de esta zona no está disponible.",
                  "This area's map is unavailable.",
                )
              : t("Cargando mapa de la zona…", "Loading area map…")}
          </p>
        )}
        <p className="us-area-map-caption">
          {t(
            "Marcadores con ubicación aproximada",
            "Markers show approximate locations",
          )}
        </p>
      </section>
    </div>
  );
}
