import { initialRanges } from "@/domain/queries";
import type { Language } from "@/domain/types";
import { Field, copy } from "./primitives";

export function ProfessionalFilters({
  language,
  params,
  update,
}: {
  language: Language;
  params: URLSearchParams;
  update: (key: string, value: string) => void;
}) {
  const t = copy(language);
  return (
    <>
      <Field label={t("Inicial del nombre", "Name initial")}>
        <select
          value={params.get("initials") || ""}
          onChange={(event) => update("initials", event.target.value)}
        >
          <option value="">{t("Todas las letras", "All letters")}</option>
          {initialRanges.map((range) => (
            <option key={range} value={range}>
              {range.replace("-", "–")}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("Ordenar resultados", "Sort results")}>
        <select
          value={params.get("sort") || "default"}
          onChange={(event) => update("sort", event.target.value)}
        >
          <option value="default">
            {t("Todos · orden del directorio", "All · directory order")}
          </option>
          <option value="name">{t("Nombre A–Z", "Name A–Z")}</option>
          <option value="best">
            {t("Mejor calificados", "Highest rated")}
          </option>
        </select>
      </Field>
    </>
  );
}
