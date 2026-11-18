import { lazy, Suspense } from "react";
import type { Language } from "@/domain/types";
import { LoadBoundary } from "@/components/load-boundary";

const CoverageMap = lazy(() =>
  import("./coverage-map").then((module) => ({ default: module.CoverageMap })),
);
export function MapSurface({
  language,
  compact = false,
}: {
  language: Language;
  compact?: boolean;
}) {
  return (
    <LoadBoundary language={language} scope="map">
      <Suspense
        fallback={
          <div
            className="map-loading"
            role="status"
            aria-label={language === "es" ? "Cargando mapa" : "Loading map"}
          />
        }
      >
        <CoverageMap language={language} compact={compact} />
      </Suspense>
    </LoadBoundary>
  );
}
