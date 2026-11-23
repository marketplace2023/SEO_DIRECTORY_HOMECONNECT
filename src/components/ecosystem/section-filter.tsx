import { useState } from "react";
import { normalize, type Language } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function useSectionFilter<T>(
  records: readonly T[],
  fields: (record: T) => unknown[],
  hint: string,
  language: Language = "es",
  group?: { label: string; value: (record: T) => string },
) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const es = language === "es";
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const options = group ? [...new Set(records.map(group.value))] : [];
  if (selected && !options.includes(selected)) options.push(selected);
  const visible = records.filter((record) => {
    if (selected && group?.value(record) !== selected) return false;
    const text = normalize(fields(record).join(" "));
    return terms.every((term) => text.includes(term));
  });
  const active = Boolean(query || selected);
  const controls = (
    <div
      role="search"
      aria-label={hint}
      className="my-4 flex flex-wrap items-end gap-3"
    >
      <label className="grid min-w-0 grow gap-1 text-sm">
        {es ? "Buscar" : "Search"}
        <Input
          type="search"
          placeholder={hint}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {group && (
        <label className="grid gap-1 text-sm">
          {group.label}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">{es ? "Todos" : "All"}</option>
            {options
              .sort((a, b) => a.localeCompare(b, language))
              .map((option) => (
                <option key={option}>{option}</option>
              ))}
          </select>
        </label>
      )}
      {active && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setQuery("");
            setSelected("");
          }}
        >
          {es ? "Limpiar filtros" : "Clear filters"}
        </Button>
      )}
      {active && (
        <p role="status" className="w-full text-sm">
          {visible.length
            ? es
              ? `Resultados: ${visible.length}`
              : `Results: ${visible.length}`
            : es
              ? "Sin coincidencias"
              : "No matches"}
        </p>
      )}
    </div>
  );
  return { visible, controls, active };
}
