import { isUsProfessional } from "@/domain/us-area";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { PiMagnifyingGlass, PiMapPin, PiCrosshair, PiX } from "react-icons/pi";
import { categories, services } from "@/data/catalog";
import { categoryIcon } from "@/components/category-icons";
import { useStore } from "@/domain/store";
import { normalize } from "@/domain/types";
import { queryCategory, searchLocations } from "@/domain/search";
import { professionalLocations } from "@/data/locations";
import { usCities } from "@/data/us-areas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SearchBarProps = {
  language: "es" | "en";
  query: string;
  city: string;
  country: string;
  onQuery: (value: string) => void;
  onCity: (value: string) => void;
  onCountry: (value: string) => void;
  onSearch: () => void;
};

export function SearchBar({
  language,
  query,
  city,
  country,
  onQuery,
  onCity,
  onCountry,
  onSearch,
}: SearchBarProps) {
  const es = language === "es";
  const { state } = useStore();
  const id = useId();
  const [open, setOpen] = useState<"service" | "location" | null>(null);
  const [active, setActive] = useState(-1);
  const [locationText, setLocationText] = useState("");
  const [geoStatus, setGeoStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const locationInput = useRef<HTMLInputElement>(null);
  const geoRequest = useRef(0);
  useEffect(() => {
    setLocationText([city, country].filter(Boolean).join(", "));
  }, [city, country]);
  useEffect(
    () => () => {
      geoRequest.current++;
    },
    [],
  );
  const locations = useMemo(
    () => searchLocations(state.professionals, language),
    [state.professionals, language],
  );
  const suggestions = useMemo(() => {
    if (!query.trim())
      return categories
        .filter((category) =>
          [
            "plumbing",
            "electrical",
            "roofing",
            "painting",
            "hvac",
            "remodeling",
          ].includes(category.id),
        )
        .map((category) => ({
          label: category.name[language],
          categoryId: category.id,
        }));
    const inferred = queryCategory(query);
    const values = [
      ...categories.map((category) => ({
        label: category.name[language],
        categoryId: category.id,
      })),
      ...services.map((service) => ({
        label: service.name[language],
        categoryId: service.categoryId,
      })),
      ...state.professionals
        .filter(
          (person) =>
            person.publication === "published" && isUsProfessional(person),
        )
        .map((person) => ({
          label: person.name,
          categoryId: person.categoryId,
        })),
    ];
    return values
      .filter(
        (item) =>
          normalize(item.label).includes(normalize(query)) ||
          item.categoryId === inferred,
      )
      .slice(0, 7);
  }, [query, language, state.professionals]);
  const matchingLocations = locations
    .filter(
      (option) =>
        !locationText.trim() ||
        normalize(option.label).includes(normalize(locationText)) ||
        normalize(option.city).includes(normalize(locationText)) ||
        (Boolean(country) &&
          option.city === city &&
          option.country === country),
    )
    .slice(0, 7);
  const chooseService = (index: number) => {
    onQuery(suggestions[index].label);
    setOpen(null);
    setActive(-1);
  };
  const chooseLocation = (index: number) => {
    const option = matchingLocations[index];
    onCity(option.city);
    onCountry(option.country);
    setLocating(false);
    setOpen(null);
    setActive(-1);
    geoRequest.current++;
  };
  const keyboard = (
    event: KeyboardEvent<HTMLInputElement>,
    field: "service" | "location",
    count: number,
  ) => {
    if (event.key === "Escape") {
      setOpen(null);
      setActive(-1);
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(field);
      setActive((index) =>
        count
          ? index < 0
            ? event.key === "ArrowDown"
              ? 0
              : count - 1
            : (index + (event.key === "ArrowDown" ? 1 : count - 1)) % count
          : -1,
      );
    }
    if (
      event.key === "Enter" &&
      open === field &&
      active >= 0 &&
      active < count
    ) {
      event.preventDefault();
      field === "service" ? chooseService(active) : chooseLocation(active);
    }
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setGeoStatus(
        es
          ? "Este navegador no admite ubicación. Escribe tu ciudad."
          : "Location is unavailable. Enter your city.",
      );
      return;
    }
    setLocating(true);
    setGeoStatus("");
    const request = ++geoRequest.current;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (request !== geoRequest.current) {
          setLocating(false);
          return;
        }
        const { latitude, longitude } = position.coords;
        const candidates = state.professionals
          .filter(
            (person) =>
              person.publication === "published" &&
              isUsProfessional(person) &&
              professionalLocations[person.id],
          )
          .map((person) => ({
            city: person.city,
            country: person.country,
            position: professionalLocations[person.id],
          }));
        try {
          const response = await fetch(
            import.meta.env.BASE_URL + "maps/us-area-detail.json",
          );
          if (response.ok) {
            const geography = (await response.json()) as {
              cities: Record<string, [number, number]>;
            };
            for (const [id, name] of usCities) {
              const point = geography.cities[id];
              if (point)
                candidates.push({
                  city: name,
                  country: "Estados Unidos",
                  position: point,
                });
            }
          }
        } catch {
          /* Known contractor cities remain available if local geography fails. */
        }
        if (request !== geoRequest.current) return;
        const nearest = candidates
          .map((candidate) => {
            const [lat, lng] = candidate.position;
            const distance = Math.hypot(
              (lat - latitude) * 111,
              (lng - longitude) * 111 * Math.cos((latitude * Math.PI) / 180),
            );
            return { ...candidate, distance };
          })
          .sort((a, b) => a.distance - b.distance)[0];
        setLocating(false);
        if (!nearest || nearest.distance > 80) {
          setGeoStatus(
            es
              ? "No encontramos una ciudad cercana en el catálogo. Escribe tu ubicación."
              : "No nearby city was found in the catalog. Enter your location.",
          );
          return;
        }
        onCity(nearest.city);
        onCountry(nearest.country);
        setOpen(null);
      },
      () => {
        if (request !== geoRequest.current) return;
        setLocating(false);
        setGeoStatus(
          es
            ? "No se pudo obtener tu ubicación. Puedes escribir tu ciudad."
            : "Could not get your location. You can enter your city.",
        );
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <form
      className="search-bar search-autocomplete"
      role="search"
      aria-label={es ? "Buscar profesionales" : "Find professionals"}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(null);
          setActive(-1);
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        setOpen(null);
        setActive(-1);
        onSearch();
      }}
    >
      <div className="search-service search-input-group">
        <PiMagnifyingGlass aria-hidden="true" />
        <div className="search-input-content">
          <label htmlFor={id + "-service"} className="search-label">
            {es ? "¿Qué necesitas?" : "What do you need?"}
          </label>
          <Input
            id={id + "-service"}
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open === "service"}
            aria-controls={id + "-services"}
            aria-activedescendant={
              open === "service" && active >= 0
                ? id + "-service-option-" + active
                : undefined
            }
            value={query}
            placeholder={
              es
                ? "Servicio, especialidad o contratista"
                : "Service, specialty or contractor"
            }
            onFocus={() => {
              setOpen("service");
              setActive(-1);
            }}
            onChange={(event) => {
              onQuery(event.target.value);
              setOpen("service");
              setActive(-1);
            }}
            onKeyDown={(event) =>
              keyboard(event, "service", suggestions.length)
            }
          />
        </div>
        {open === "service" && (
          <div className="search-suggestions">
            <p className="search-suggestions-title">
              {query.trim()
                ? es
                  ? "Sugerencias"
                  : "Suggestions"
                : es
                  ? "Servicios populares"
                  : "Popular services"}
            </p>
            <div
              id={id + "-services"}
              role="listbox"
              aria-label={es ? "Servicios sugeridos" : "Suggested services"}
              className={!query.trim() ? "search-popular-options" : undefined}
            >
              {suggestions.map((item, index) => {
                const category = categories.find(
                  (category) => category.id === item.categoryId,
                )!;
                const Icon = categoryIcon(category.id);
                return (
                  <button
                    type="button"
                    tabIndex={-1}
                    role="option"
                    id={id + "-service-option-" + index}
                    aria-selected={active === index}
                    key={item.label}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseService(index)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            {!suggestions.length && (
              <p className="search-suggestions-note">
                {es
                  ? "Puedes buscar con el texto que escribiste."
                  : "You can search using your text."}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="search-location search-input-group">
        <PiMapPin aria-hidden="true" />
        <div className="search-input-content">
          <label htmlFor={id + "-location"} className="search-label">
            {es ? "¿Dónde?" : "Where?"}
          </label>
          <Input
            ref={locationInput}
            id={id + "-location"}
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open === "location"}
            aria-controls={id + "-locations"}
            aria-activedescendant={
              open === "location" && active >= 0
                ? id + "-location-option-" + active
                : undefined
            }
            value={locationText}
            placeholder={
              es ? "Ciudad, estado o país" : "City, state or country"
            }
            onFocus={() => {
              setOpen("location");
              setActive(-1);
            }}
            onChange={(event) => {
              geoRequest.current++;
              setLocating(false);
              setGeoStatus("");
              setLocationText(event.target.value);
              onCity(event.target.value);
              onCountry("");
              setOpen("location");
              setActive(-1);
            }}
            onKeyDown={(event) =>
              keyboard(event, "location", matchingLocations.length)
            }
          />
        </div>
        {locationText && (
          <button
            type="button"
            className="search-clear"
            aria-label={es ? "Borrar ubicación" : "Clear location"}
            onClick={() => {
              geoRequest.current++;
              setLocating(false);
              onCity("");
              onCountry("");
              setLocationText("");
              setActive(-1);
              locationInput.current?.focus();
            }}
          >
            <PiX />
          </button>
        )}
        {open === "location" && (
          <div className="search-suggestions">
            <button
              type="button"
              className="search-current-location"
              disabled={locating}
              onClick={locate}
            >
              <PiCrosshair aria-hidden="true" />
              {locating
                ? es
                  ? "Obteniendo ubicación…"
                  : "Getting location…"
                : es
                  ? "Usar mi ubicación actual"
                  : "Use my current location"}
            </button>
            {geoStatus && (
              <p className="search-suggestions-note" role="status">
                {geoStatus}
              </p>
            )}
            <div
              id={id + "-locations"}
              role="listbox"
              aria-label={es ? "Ubicaciones sugeridas" : "Suggested locations"}
            >
              {matchingLocations.map((option, index) => (
                <button
                  type="button"
                  tabIndex={-1}
                  role="option"
                  id={id + "-location-option-" + index}
                  aria-selected={active === index}
                  key={option.label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseLocation(index)}
                >
                  <PiMapPin aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            {!matchingLocations.length && (
              <p className="search-suggestions-note">
                {es
                  ? "Sin sugerencias. Puedes buscar la ubicación escrita."
                  : "No suggestions. You can search your entered location."}
              </p>
            )}
          </div>
        )}
      </div>
      <Button
        type="submit"
        className="search-submit"
        aria-label={es ? "Buscar profesionales" : "Find professionals"}
      >
        <PiMagnifyingGlass aria-hidden="true" />
        <span className="sr-only">{es ? "Buscar" : "Search"}</span>
      </Button>
    </form>
  );
}
