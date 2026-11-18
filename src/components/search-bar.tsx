import { PiMagnifyingGlass, PiMapPin, PiArrowUpRight } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const countries = [
  "Estados Unidos",
  "Venezuela",
  "Colombia",
  "México",
  "Perú",
  "España",
  "Canadá",
];

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
  return (
    <form
      className="search-bar"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <label className="search-service">
        <PiMagnifyingGlass aria-hidden="true" />
        <span>
          <span className="search-label">
            {es ? "¿Qué necesitas hacer?" : "What do you need done?"}
          </span>
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={
              es ? "Pintar, remodelar, reparar…" : "Paint, remodel, repair…"
            }
          />
        </span>
      </label>
      <div className="search-location">
        <PiMapPin aria-hidden="true" />
        <div>
          <label className="search-label" htmlFor="search-country">
            {es ? "¿Dónde?" : "Where?"}
          </label>
          <div className="location-fields">
            <select
              id="search-country"
              aria-label={es ? "País" : "Country"}
              value={country}
              onChange={(e) => onCountry(e.target.value)}
            >
              <option value="">{es ? "Cualquier país" : "Any country"}</option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <Input
              aria-label={es ? "Ciudad" : "City"}
              placeholder={es ? "Ciudad" : "City"}
              value={city}
              onChange={(e) => onCity(e.target.value)}
            />
          </div>
        </div>
      </div>
      <Button type="submit" className="search-submit">
        {es ? "Encontrar" : "Find a pro"}
        <PiArrowUpRight />
      </Button>
    </form>
  );
}
