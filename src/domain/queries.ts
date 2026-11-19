import { services } from "@/data/catalog";
import {
  normalize,
  type DemoState,
  type Language,
  type Professional,
} from "./types";
import { matchesUsArea, type UsArea } from "./us-area";
import { displayedLocation, parseBounds, type MapBounds } from "./geography";
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
  region?: string;
  serviceId?: string;
  bounds?: MapBounds;
  initials?: string;
};
export const initialRanges = ["A-F", "G-L", "M-R", "S-Z"] as const;

export function matchesInitial(name: string, range?: string) {
  const selected = initialRanges.find((item) => item === range);
  if (!selected) return true;
  const first = normalize(name).charAt(0);
  const [start, end] = selected.toLowerCase().split("-");
  return first >= start && first <= end;
}

export function orderProfessionals(
  people: Professional[],
  sort: string | null,
  language: Language,
) {
  if (sort !== "name" && sort !== "best") return people;
  return [...people].sort(
    (a, b) =>
      (sort === "best" ? b.rating - a.rating : 0) ||
      a.name.localeCompare(b.name, language),
  );
}
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
export function filtersFromParams(
  params: URLSearchParams,
  defaultRegion = "",
): ProfessionalFilters {
  return {
    query: params.get("q") || "",
    initials: params.get("initials") || "",
    categoryId: params.get("category") || "",
    subcategoryId: params.get("subcategory") || "",
    serviceId: params.get("service") || "",
    country: params.get("country") || "",
    city: params.get("city") || "",
    region:
      params.get("region") === "all"
        ? ""
        : params.get("region") || defaultRegion,
    verifiedOnly: params.get("verified") === "1",
    minimumRating: Number(params.get("rating")) || 0,
    bounds: parseBounds(params.get("bounds")),
  };
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
      matchesInitial(person.name, filters.initials) &&
      (!filters.usArea || matchesUsArea(person, filters.usArea)) &&
      (!filters.categoryId || person.categoryId === filters.categoryId) &&
      (!filters.region || person.region === filters.region) &&
      (!filters.serviceId || person.serviceIds.includes(filters.serviceId)) &&
      (!filters.bounds || !!displayedLocation(person, filters.bounds)) &&
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
export function acceptedQuotes(state: DemoState, ownerId?: string) {
  if (!ownerId) return [];
  const requests = new Map(
    state.requests
      .filter((request) => request.ownerId === ownerId)
      .map((request) => [request.id, request]),
  );
  return state.proposals.flatMap((proposal) => {
    const request = requests.get(proposal.requestId);
    return proposal.status === "accepted" && request?.status === "awarded"
      ? [{ proposal, request }]
      : [];
  });
}
