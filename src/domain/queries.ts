import { categories, services } from "@/data/catalog";
import { normalize, type DemoState } from "./types";
import { displayedLocation, parseBounds, type MapBounds } from "./geography";

export type ProfessionalFilters = {
  query?: string;
  categoryId?: string;
  subcategoryId?: string;
  country?: string;
  city?: string;
  verifiedOnly?: boolean;
  minimumRating?: number;
  region?: string;
  serviceId?: string;
  bounds?: MapBounds;
};
export function filtersFromParams(
  params: URLSearchParams,
  defaultRegion = "",
): ProfessionalFilters {
  return {
    query: params.get("q") || "",
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
    const category = categories.find(
      (category) => category.id === person.categoryId,
    );
    const searchable = [
      person.name,
      person.city,
      person.country,
      category?.name.es,
      category?.name.en,
      ...person.coverage,
      ...offered.flatMap((service) => [service.name.es, service.name.en]),
    ].join(" ");
    return (
      person.publication === "published" &&
      (!filters.categoryId || person.categoryId === filters.categoryId) &&
      (!filters.region || person.region === filters.region) &&
      (!filters.serviceId || person.serviceIds.includes(filters.serviceId)) &&
      (!filters.bounds || !!displayedLocation(person, filters.bounds)) &&
      (!filters.subcategoryId ||
        offered.some(
          (service) => service.subcategoryId === filters.subcategoryId,
        )) &&
      (!filters.country || person.country === filters.country) &&
      normalize(person.coverage.join(" ")).includes(
        normalize(filters.city || ""),
      ) &&
      (!filters.verifiedOnly ||
        person.credentials.some(
          (credential) => credential.status === "verified",
        )) &&
      person.rating >= (filters.minimumRating || 0) &&
      normalize(searchable).includes(normalize(filters.query || ""))
    );
  });
}
