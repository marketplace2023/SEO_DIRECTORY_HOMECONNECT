import { MapSurface } from "@/components/ecosystem/map-surface";
import type { Language } from "@/domain/types";
export function CoveragePage({ language }: { language: Language }) {
  return <MapSurface language={language} compact />;
}
