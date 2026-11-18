import type { Professional } from "./types";
import { normalize } from "./types";

// Approximate locality centers for the pilot and existing international demos.
// These are display references, never verified street addresses or travel distances.
const localities: [string, string, string, number, number][] = [
  ["Lawrenceville", "Georgia", "US", 33.956, -83.988],
  ["Duluth", "Georgia", "US", 34.003, -84.145],
  ["Suwanee", "Georgia", "US", 34.051, -84.072],
  ["Atlanta", "Georgia", "US", 33.749, -84.388],
  ["Roswell", "Georgia", "US", 34.023, -84.361],
  ["Alpharetta", "Georgia", "US", 34.075, -84.294],
  ["Buford", "Georgia", "US", 34.12, -84.004],
  ["Dacula", "Georgia", "US", 33.989, -83.897],
  ["Miami", "Florida", "US", 25.774, -80.194],
  ["Doral", "Florida", "US", 25.82, -80.355],
  ["Hialeah", "Florida", "US", 25.858, -80.278],
  ["Toronto", "Ontario", "CA", 43.653, -79.383],
  ["Bogotá", "Bogotá", "CO", 4.711, -74.072],
  ["Madrid", "Madrid", "ES", 40.416, -3.704],
  ["Lima", "Lima", "PE", -12.046, -77.043],
  ["Caracas", "Distrito Capital", "VE", 10.48, -66.904],
];
const countryCode = (value: string) =>
  ({
    "estados unidos": "US",
    "united states": "US",
    usa: "US",
    us: "US",
    canada: "CA",
    colombia: "CO",
    espana: "ES",
    spain: "ES",
    peru: "PE",
    venezuela: "VE",
  })[normalize(value)] || value.toUpperCase();
export function cityLocation(
  city: string,
  region: string,
  country: string,
): Professional["location"] {
  const row = localities.find(
    ([name, state, code]) =>
      normalize(name) === normalize(city) &&
      normalize(state) === normalize(region) &&
      code === countryCode(country),
  );
  return row
    ? { latitude: row[3], longitude: row[4], precision: "city" }
    : null;
}
export const locationOf = (p: Professional) =>
  p.location === undefined
    ? cityLocation(p.city, p.region, p.country)
    : p.location;
export type MapBounds = [number, number, number, number]; // south, west, north, east
export function parseBounds(value: string | null): MapBounds | undefined {
  if (!value) return;
  const parts = value.split(",");
  if (parts.some((part) => !part.trim())) return;
  const n = parts.map(Number);
  if (
    n.length !== 4 ||
    n.some((v) => !Number.isFinite(v)) ||
    n[0] < -90 ||
    n[2] > 90 ||
    n[1] < -180 ||
    n[3] > 180 ||
    n[0] >= n[2] ||
    n[1] >= n[3]
  )
    return;
  return n as MapBounds;
}
export function contains(
  bounds: MapBounds,
  point: NonNullable<Professional["location"]>,
) {
  return (
    point.latitude >= bounds[0] &&
    point.latitude <= bounds[2] &&
    point.longitude >= bounds[1] &&
    point.longitude <= bounds[3]
  );
}
export function displayedLocation(p: Professional, bounds?: MapBounds) {
  if (p.location === null) return null;
  const office = locationOf(p);
  if (!bounds || (office && contains(bounds, office)))
    return office ? { ...office, label: p.city, serviceArea: false } : null;
  for (const city of p.coverage) {
    const location = cityLocation(city, p.region, p.country);
    if (location && contains(bounds, location))
      return { ...location, label: city, serviceArea: true };
  }
  return null;
}
