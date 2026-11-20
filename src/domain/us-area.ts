import { usCities, usCounties, usStates } from "@/data/us-areas";
import { normalize, type Language, type Professional } from "./types";

export type UsArea = { state: string; county: string; city: string };

export const cityById = new Map(usCities.map((city) => [city[0], city]));
export const stateByCode = new Map(usStates.map((state) => [state[0], state]));
export const countyById = new Map(usCounties);

export const stateLabel = (code: string, language: Language) => {
  const state = stateByCode.get(code);
  return language === "es"
    ? (state?.[2] ?? state?.[1] ?? code)
    : (state?.[1] ?? code);
};
export const cityLabel = (id: string, language: Language) => {
  const city = cityById.get(id);
  return city ? `${city[language === "es" ? 2 : 1]}, ${city[3]}` : id;
};

const words = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const stateCodes = new Map(
  usStates.flatMap(([id, en, es]) =>
    [id, en, es ?? en].map((name) => [words(name), id] as const),
  ),
);
const usNames = new Set([
  "estados unidos",
  "united states",
  "united states of america",
  "usa",
  "us",
  "ee uu",
]);
export function professionalState(person: Professional) {
  return usNames.has(words(person.country))
    ? (stateCodes.get(words(person.region)) ?? "")
    : "";
}
export function isUsProfessional(person: Professional) {
  return usNames.has(words(person.country));
}
export function matchesUsArea(person: Professional, area: UsArea) {
  if (!usNames.has(words(person.country))) return false;
  if (area.state && professionalState(person) !== area.state) return false;
  if (!area.county && !area.city) return true;
  const declaredCities = new Set([person.city, ...person.coverage].map(words));
  if (area.city) {
    const city = cityById.get(area.city);
    return Boolean(city && declaredCities.has(words(city[1])));
  }
  return usCities.some(
    ([, name, , , county]) =>
      county === area.county && declaredCities.has(words(name)),
  );
}

export function readUsArea(params: URLSearchParams): UsArea {
  const state = params.get("state")?.toUpperCase() ?? "";
  const county = params.get("county") ?? "";
  const city = cityById.get(params.get("areaCity") ?? "");
  if (city) return { state: city[3], county: city[4], city: city[0] };
  if (countyById.has(county)) return { state: "GA", county, city: "" };
  return { state: stateByCode.has(state) ? state : "", county: "", city: "" };
}

export function usAreaParams(area: UsArea) {
  const params = new URLSearchParams();
  if (area.state) params.set("state", area.state);
  if (area.county) params.set("county", area.county);
  if (area.city) params.set("areaCity", area.city);
  return params;
}

const places = [
  ...usCities.flatMap(([city, en, es, state, county]) =>
    [en, es, ...(city === "new-york" ? ["NYC", "New York City"] : [])].map(
      (name) => ({ name: words(name), area: { state, county, city } }),
    ),
  ),
  ...usCounties.flatMap(([county, name]) =>
    [name, `${name} County`, `Condado de ${name}`].map((label) => ({
      name: words(label),
      area: { state: "GA", county, city: "" },
    })),
  ),
  ...usStates.flatMap(([state, en, es]) =>
    [en, es ?? en].map((name) => ({
      name: words(name),
      area: { state, county: "", city: "" },
    })),
  ),
].sort((a, b) => b.name.length - a.name.length);

export function parseAreaQuery(input: string) {
  const query = words(input);
  const padded = ` ${query} `;
  const place = places.find(({ name }) => padded.includes(` ${name} `));
  const service = (place ? padded.replace(` ${place.name} `, " ") : query)
    .trim()
    .replace(/^(?:busco|necesito|i need|looking for)(?:\s+|$)/, "")
    .replace(/^(?:a|an|un|una)\s+/, "")
    .replace(/(?:^|\s)(?:en|in|near|cerca de)$/, "");
  return { area: place?.area, service };
}
