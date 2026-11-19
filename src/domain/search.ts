import { categories, services } from "@/data/catalog";
import { usCities, usStates, usCounties } from "@/data/us-areas";
import { normalize, type Professional } from "./types";
import { parseAreaQuery, usAreaParams, stateByCode } from "./us-area";

const terms = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const countryTranslations: Record<string, string> = {
  "Estados Unidos": "United States",
  México: "Mexico",
  Perú: "Peru",
  España: "Spain",
  Canadá: "Canada",
};
const aliases: Record<string, string[]> = {
  roofing: [
    "techos",
    "techo",
    "tejado",
    "goteras",
    "roof",
    "roofer",
    "roofing",
  ],
  plumbing: [
    "plomero",
    "plomeros",
    "fontanero",
    "plomeria",
    "plumber",
    "plumbers",
    "plumbing",
    "tuberias",
    "desague",
    "fuga",
    "leak",
  ],
  hvac: [
    "aire acondicionado",
    "calefaccion",
    "hvac",
    "heating",
    "air conditioning",
  ],
  electrical: [
    "electricista",
    "electricistas",
    "electricidad",
    "electrician",
    "electrical",
    "lighting",
  ],
  painting: ["pintor", "pintores", "pintar", "pintura", "painter", "painting"],
  landscaping: ["jardinero", "jardineria", "jardin", "landscaping", "gardener"],
  carpentry: ["carpintero", "carpinteria", "carpenter"],
  masonry: ["albanil", "albanileria", "masonry"],
  remodeling: ["remodelacion", "remodelar", "renovation", "remodeling"],
};

export function queryCategory(query: string) {
  const input = " " + terms(query) + " ";
  const explicit = categories.find((category) =>
    [
      category.name.es,
      category.name.en,
      ...(aliases[category.id] ?? []).filter(
        (word) => !["fuga", "leak", "techo", "roof"].includes(word),
      ),
    ].some((word) => input.includes(" " + terms(word) + " ")),
  );
  return (
    explicit?.id ??
    categories.find((category) =>
      aliases[category.id]?.some((word) =>
        input.includes(" " + terms(word) + " "),
      ),
    )?.id
  );
}

export function matchesSearch(person: Professional, query: string) {
  if (!query.trim()) return true;
  const offered = services.filter((service) =>
    person.serviceIds.includes(service.id),
  );
  const category = categories.find((item) => item.id === person.categoryId);
  const searchable = terms(
    [
      person.name,
      person.city,
      person.region,
      person.country,
      ...person.coverage,
      category?.name.es,
      category?.name.en,
      ...offered.flatMap((service) => [service.name.es, service.name.en]),
    ].join(" "),
  );
  const serviceQuery = parseAreaQuery(query).service;
  if (!serviceQuery || searchable.includes(terms(serviceQuery))) return true;
  const inferred = queryCategory(serviceQuery);
  return inferred ? person.categoryId === inferred : false;
}

export type LocationOption = { city: string; country: string; label: string };
export function searchLocations(people: Professional[], language: "es" | "en") {
  const options: LocationOption[] = [];
  for (const person of people.filter(
    (person) => person.publication === "published",
  )) {
    for (const city of new Set([person.city, ...person.coverage]))
      options.push({
        city,
        country: person.country,
        label: [
          ...new Set([
            city,
            person.region,
            language === "en"
              ? (countryTranslations[person.country] ?? person.country)
              : person.country,
          ]),
        ].join(", "),
      });
  }
  for (const [, en, es, state] of usCities)
    options.push({
      city: en,
      country: "Estados Unidos",
      label: `${language === "es" ? es : en}, ${state}, ${language === "es" ? "Estados Unidos" : "United States"}`,
    });
  for (const [code, en, es] of usStates)
    options.push({
      city: en,
      country: "Estados Unidos",
      label: `${language === "es" ? (es ?? en) : en}, ${code}, ${language === "es" ? "Estados Unidos" : "United States"}`,
    });
  for (const [, name] of usCounties)
    options.push({
      city: name,
      country: "Estados Unidos",
      label: `${name} County, GA, ${language === "es" ? "Estados Unidos" : "United States"}`,
    });
  for (const country of [
    "Estados Unidos",
    "Venezuela",
    "Colombia",
    "México",
    "Perú",
    "España",
    "Canadá",
  ])
    options.push({
      city: "",
      country,
      label:
        language === "en" ? (countryTranslations[country] ?? country) : country,
    });
  return options.filter(
    (option, index) =>
      options.findIndex(
        (other) =>
          terms(other.city) === terms(option.city) &&
          terms(other.country) === terms(option.country),
      ) === index,
  );
}

export function searchParams(query: string, location: string, country: string) {
  const params = new URLSearchParams();
  const parsed = parseAreaQuery(query);
  const place = parseAreaQuery(location);
  const postal = stateByCode.has(location.trim().toUpperCase())
    ? { state: location.trim().toUpperCase(), county: "", city: "" }
    : undefined;
  const area =
    postal ??
    place.area ??
    (!location.trim() && !country ? parsed.area : undefined);
  const service = parsed.area ? parsed.service : query.trim();
  if (service) params.set("q", service);
  if (area && (!country || country === "Estados Unidos")) {
    for (const [key, value] of usAreaParams(area)) params.set(key, value);
    params.set("us", "1");
  } else {
    const parts = location
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const knownCountries = [
      "Estados Unidos",
      "Venezuela",
      "Colombia",
      "México",
      "Perú",
      "España",
      "Canadá",
    ];
    const foundCountry = knownCountries.find((name) =>
      [name, countryTranslations[name] ?? name].some(
        (label) =>
          terms(label) === terms(location) ||
          terms(label) === terms(parts.at(-1) ?? ""),
      ),
    );
    if (country || foundCountry)
      params.set("country", country || foundCountry!);
    if (parts[0] && terms(parts[0]) !== terms(foundCountry ?? ""))
      params.set("city", parts[0]);
  }
  return params;
}
