import { services } from "@/data/catalog";
import { normalize, type DemoState } from "./types";
import { matchesUsArea, type UsArea } from "./us-area";
import { matchesSearch } from "./search";

export type ProfessionalFilters = {
  query?: string;
  categoryId?: string;
  subcategoryId?: string;
  country?: string;
  city?: string;
  verifiedOnly?: boolean;
  minimumRating?: number;
  usArea?: UsArea;
};
export function mostRequestedProfessionals(state: DemoState) {
  const counts = new Map<string, number>();
  for (const request of state.requests) {
    if (request.professionalId)
      counts.set(
        request.professionalId,
        (counts.get(request.professionalId) ?? 0) + 1,
      );
  }
  return state.professionals
    .filter((person) => person.publication === "published")
    .map((person) => ({ person, requests: counts.get(person.id) ?? 0 }))
    .sort(
      (a, b) =>
        b.requests - a.requests ||
        b.person.rating - a.person.rating ||
        a.person.name.localeCompare(b.person.name),
    )
    .slice(0, 12);
}
/** Shared query boundary for the local adapter; no network requests are made. */
export function findProfessionals(
  state: DemoState,
  filters: ProfessionalFilters = {},
) {
  return state.professionals.filter((person) => {
    const offered = services.filter((service) =>
      person.serviceIds.includes(service.id),
    );
    return (
      person.publication === "published" &&
      (!filters.usArea || matchesUsArea(person, filters.usArea)) &&
      (!filters.categoryId || person.categoryId === filters.categoryId) &&
      (!filters.subcategoryId ||
        offered.some(
          (service) => service.subcategoryId === filters.subcategoryId,
        )) &&
      (!filters.country || person.country === filters.country) &&
      normalize([person.city, ...person.coverage].join(" ")).includes(
        normalize(filters.city || ""),
      ) &&
      (!filters.verifiedOnly ||
        person.credentials.some(
          (credential) => credential.status === "verified",
        )) &&
      person.rating >= (filters.minimumRating || 0) &&
      matchesSearch(person, filters.query || "")
    );
  });
}
