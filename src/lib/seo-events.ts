import { apiRequest } from "./http";
export function trackSeoEvent(
  professionalId: string,
  kind: "profile_view" | "website_click",
) {
  void apiRequest("/api/local-seo/event", {
    id: crypto.randomUUID(),
    professionalId,
    kind,
  }).catch(() => {});
}
