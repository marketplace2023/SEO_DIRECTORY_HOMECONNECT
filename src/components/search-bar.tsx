import { NativeSelect } from "@/components/ui/native-select";
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
      className="grid grid-cols-1 items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_8px_30px_-15px_#8c3d3225] md:grid-cols-[1.2fr_1.4fr_auto] md:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <label className="flex min-w-0 items-center gap-3 text-neutral-400 [&>span]:w-full">
        <PiMagnifyingGlass aria-hidden="true" />
        <span>
          <span className="mb-2 block text-[11px] font-semibold text-neutral-700">
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
      <div className="flex min-w-0 items-center gap-3 text-neutral-400 [&>div]:w-full">
        <PiMapPin aria-hidden="true" />
        <div>
          <label
            className="mb-2 block text-[11px] font-semibold text-neutral-700"
            htmlFor="search-country"
          >
            {es ? "¿Dónde?" : "Where?"}
          </label>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <NativeSelect
              id="search-country"
              aria-label={es ? "País" : "Country"}
              value={country}
              onChange={(e) => onCountry(e.target.value)}
            >
              <option value="">{es ? "Cualquier país" : "Any country"}</option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
            <Input
              aria-label={es ? "Ciudad" : "City"}
              placeholder={es ? "Ciudad" : "City"}
              value={city}
              onChange={(e) => onCity(e.target.value)}
            />
          </div>
        </div>
      </div>
      <Button type="submit" className="h-11 rounded-lg px-6 md:self-end">
        {es ? "Encontrar" : "Find a pro"}
        <PiArrowUpRight />
      </Button>
    </form>
  );
}
