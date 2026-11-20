import { useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import {
  gridPoints,
  type SeoCampaign,
  type SeoPoint,
} from "@/domain/local-seo";
import "leaflet/dist/leaflet.css";

export default function RankMap({
  campaign,
  observations,
  select,
}: {
  campaign: SeoCampaign;
  observations: SeoPoint[];
  select: (index: number) => void;
}) {
  const points = gridPoints(campaign);
  const [tileError, setTileError] = useState(false);
  return (
    <div>
      <MapContainer
        key={campaign.id}
        bounds={points.map((point) => [point.latitude, point.longitude])}
        boundsOptions={{ padding: [30, 30], maxZoom: 17 }}
        scrollWheelZoom={false}
        className="z-0 h-80 w-full rounded-xl bg-neutral-100"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        {points.map((point, index) => {
          const observed = observations.find(
            (observed) =>
              observed.row === point.row && observed.column === point.column,
          );
          const rank = observed?.rank;
          const color = !observed
            ? "#a3a3a3"
            : rank === null
              ? "#525252"
              : rank! <= 3
                ? "#15803d"
                : rank! <= 10
                  ? "#a16207"
                  : "#be123c";
          return (
            <CircleMarker
              key={`${point.row}:${point.column}`}
              center={[point.latitude, point.longitude]}
              radius={16}
              pathOptions={{
                color,
                fillColor: "#fff",
                fillOpacity: 0.95,
                weight: 3,
              }}
              eventHandlers={{ click: () => select(index) }}
            >
              <Tooltip
                permanent
                direction="center"
                opacity={1}
                className="border-0! bg-transparent! font-bold! text-neutral-800! shadow-none! before:hidden!"
              >
                {!observed ? "—" : rank === null ? `>${campaign.depth}` : rank}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {tileError && (
        <p className="mt-2 text-xs text-neutral-500">
          La cartografía de calles no está disponible. Los puntos y la tabla
          conservan sus coordenadas y observaciones.
        </p>
      )}
    </div>
  );
}
