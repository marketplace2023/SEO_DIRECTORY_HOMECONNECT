import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/domain/store";
import {
  professionalState,
  cityById,
  cityLabel,
  countyById,
  stateLabel,
  type UsArea,
} from "@/domain/us-area";
import type { Language } from "@/domain/types";
import { copy } from "./primitives";

type Point = [number, number];
type StateShape = { id: string; d: string; center: Point };
type CountyShape = { id?: string; d: string; center?: Point };
type MapData = {
  national: { width: number; height: number; states: StateShape[] };
  regional: { width: number; height: number; counties: CountyShape[] };
  markers: [string, Point, Point | null][];
};
let mapRequest: Promise<MapData> | undefined;
function loadMap() {
  mapRequest ??= fetch(import.meta.env.BASE_URL + "maps/us-areas.json")
    .then((response) => {
      if (!response.ok) throw new Error("Base map unavailable");
      return response.json() as Promise<MapData>;
    })
    .catch((error: unknown) => {
      mapRequest = undefined;
      throw error;
    });
  return mapRequest;
}

const smallStates = new Set([
  "CT",
  "DC",
  "DE",
  "HI",
  "MA",
  "MD",
  "NJ",
  "RI",
  "VT",
  "NH",
]);

export function UsAreaMap({
  language,
  area,
  getHref,
  counts,
}: {
  language: Language;
  area?: UsArea;
  getHref?: (area: UsArea) => string;
  counts?: Map<string, number>;
}) {
  const { state } = useStore();
  const t = copy(language);
  const [map, setMap] = useState<MapData>();
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(0);
  useEffect(() => {
    let current = true;
    loadMap()
      .then((data) => {
        if (current) setMap(data);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, []);
  useEffect(() => setZoom(0), [area?.state, area?.county, area?.city]);
  if (!map)
    return (
      <p className="us-map-loading" role="status">
        {error
          ? t(
              "El mapa no está disponible. Puedes usar los filtros de zona.",
              "The map is unavailable. You can still use the area filters.",
            )
          : t(
              "Cargando mapa de Estados Unidos…",
              "Loading the United States map…",
            )}
      </p>
    );

  const regional = area?.state === "GA";
  const { width, height } = regional ? map.regional : map.national;
  const nationalCounts =
    counts ??
    state.professionals.reduce((byState, person) => {
      const code = professionalState(person);
      if (code && person.publication === "published")
        byState.set(code, 1 + (byState.get(code) ?? 0));
      return byState;
    }, new Map<string, number>());
  const center = (area?.city
    ? map.markers.find(([id]) => area.city === id)?.[regional ? 2 : 1]
    : undefined) ??
    (regional
      ? map.regional.counties.find(({ id }) => id && area?.county === id)
          ?.center
      : map.national.states.find(({ id }) => area?.state === id)?.center) ?? [
      width / 2,
      height / 2,
    ];
  const scale = [1, 1.5, 2, 2.8][zoom];
  const w = width / scale;
  const h = height / scale;
  const x = Math.max(0, Math.min(width - w, center[0] - w / 2));
  const y = Math.max(0, Math.min(height - h, center[1] - h / 2));
  const link = (
    key: string,
    selection: UsArea,
    label: string,
    selected: boolean,
    className: string,
    children: ReactNode,
  ) =>
    getHref ? (
      <a
        key={key}
        className={className}
        href={getHref(selection)}
        aria-label={label}
        aria-current={selected ? "true" : undefined}
      >
        <title>{label}</title>
        {children}
      </a>
    ) : (
      <g key={key} className={className} aria-hidden="true">
        {children}
      </g>
    );

  return (
    <div className={`us-map-stage ${area ? "us-map-full" : "us-map-preview"}`}>
      <svg
        className={regional ? "us-map-regional" : undefined}
        viewBox={`${x} ${y} ${w} ${h}`}
        width={width}
        height={height}
        role={getHref ? "group" : "img"}
        aria-label={
          regional
            ? t("Zonas piloto de Atlanta", "Atlanta pilot areas")
            : t("Mapa de Estados Unidos", "United States map")
        }
      >
        {regional ? (
          <>
            {map.regional.counties
              .filter((county) => !county.id)
              .map((county) => (
                <path key={county.d} d={county.d} className="us-map-context" />
              ))}
            {map.regional.counties
              .filter((county) => county.id)
              .map(({ id, d, center }) => {
                if (!id) return null;
                const name = countyById.get(id) ?? id;
                return link(
                  id,
                  { state: "GA", county: id, city: "" },
                  name,
                  area?.county === id,
                  `us-county zone-${id}`,
                  <>
                    <path d={d} />
                    {center && (
                      <text x={center[0]} y={center[1] - 20}>
                        {name}
                      </text>
                    )}
                  </>,
                );
              })}
          </>
        ) : (
          map.national.states.map(({ id, d, center: [cx, cy] }) =>
            link(
              id,
              { state: id, county: "", city: "" },
              stateLabel(id, language),
              area?.state === id,
              `us-state${nationalCounts.has(id) ? " has-profiles" : ""}`,
              <>
                <path d={d} />
                {!smallStates.has(id) && (
                  <text x={cx} y={cy}>
                    {id}
                  </text>
                )}
                {id === "DC" && <circle cx={cx} cy={cy} r="4" />}
              </>,
            ),
          )
        )}
        {area &&
          getHref &&
          map.markers.map(([id, national, local]) => {
            const city = cityById.get(id);
            if (
              !city ||
              (regional
                ? !local
                : city[4] || (area?.state && area.state !== city[3]))
            )
              return null;
            const [cx, cy] = regional ? local! : national;
            return link(
              id,
              { state: city[3], county: city[4], city: id },
              cityLabel(id, language),
              area?.city === id,
              `us-city zone-${city[4]}${area?.county && city[4] !== area.county ? " muted" : ""}`,
              <circle cx={cx} cy={cy} r={regional ? 8 : 5} />,
            );
          })}
      </svg>
      {area && getHref && (
        <div className="us-map-zoom">
          <button
            type="button"
            disabled={zoom === 3}
            onClick={() => setZoom(zoom + 1)}
            aria-label={t("Acercar", "Zoom in")}
          >
            +
          </button>
          <button
            type="button"
            disabled={zoom === 0}
            onClick={() => setZoom(zoom - 1)}
            aria-label={t("Alejar", "Zoom out")}
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}
