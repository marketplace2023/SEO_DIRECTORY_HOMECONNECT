import { lazy, Suspense } from "react";
import type { Language } from "@/domain/types";
import { LoadBoundary } from "@/components/load-boundary";
import { Skeleton } from "@/components/ui/skeleton";

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
            className="grid min-h-[420px] grid-cols-1 gap-4 rounded-xl border bg-neutral-50 p-5 md:grid-cols-[1fr_2fr]"
            role="status"
            aria-label={language === "es" ? "Cargando mapa" : "Loading map"}
          >
            <div className="space-y-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-16 w-20 rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-full min-h-64 w-full" />
          </div>
        }
      >
        <CoverageMap language={language} compact={compact} />
      </Suspense>
    </LoadBoundary>
  );
}
