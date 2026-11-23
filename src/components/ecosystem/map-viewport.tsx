import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { MapBounds } from "@/domain/geography";

export function MapViewport({
  onChange,
}: {
  onChange: (bounds: MapBounds) => void;
}) {
  const map = useMap();
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      if (!map.getContainer().clientWidth || !map.getContainer().clientHeight)
        return;
      const b = map.getBounds();
      onChange([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    map.on("move zoomend resize", schedule);
    schedule();
    return () => {
      map.off("move zoomend resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [map, onChange]);
  return null;
}
