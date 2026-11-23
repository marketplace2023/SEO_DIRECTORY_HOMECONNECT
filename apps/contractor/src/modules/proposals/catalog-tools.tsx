import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, Panel, copy } from "@/components/ecosystem/primitives";
import {
  lineAmount,
  resourceKinds,
  workUnits,
  type WorkItem,
  type WorkResource,
} from "@/domain/contractor-estimates";
import type { Language } from "@/domain/types";
import { downloadDocument } from "@/lib/contractor-documents";

const headers = [
  "code",
  "description",
  "unit",
  "unit_price_usd",
  "price_source",
];
type ImportedItem = Omit<WorkItem, "id">;

async function readCatalog(file: File): Promise<ImportedItem[]> {
  if (file.size > 4_000_000)
    throw Error(
      "El archivo supera 4 MB. Divide el catálogo en varios archivos.",
    );
  const rows: unknown[][] = [];
  if (/\.xlsx$/i.test(file.name)) {
    const {
      default: { Workbook },
    } = await import("exceljs");
    const workbook = new Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    workbook.worksheets[0]?.eachRow((row, index) => {
      if (index > 501)
        throw Error("Se admiten hasta 500 partidas por importación.");
      rows.push(headers.map((_, column) => row.getCell(column + 1).value));
    });
  } else if (/\.csv$/i.test(file.name)) {
    const { default: Papa } = await import("papaparse");
    const result = Papa.parse<string[]>(await file.text(), {
      skipEmptyLines: "greedy",
    });
    if (result.errors.length)
      throw Error("Revisa el delimitador y las comillas del CSV.");
    rows.push(...result.data);
  } else throw Error("Selecciona un archivo CSV o XLSX.");

  const header = rows.shift();
  if (
    !headers.slice(0, 4).every(
      (name, index) =>
        String(header?.[index])
          .replace(/^\uFEFF/, "")
          .trim()
          .toLowerCase() === name,
    )
  )
    throw Error("Usa las columnas de la plantilla, en el mismo orden.");
  if (!rows.length || rows.length > 500)
    throw Error("El archivo debe contener de 1 a 500 partidas.");

  return rows.map(
    ([rawCode, rawDescription, rawUnit, rawPrice, rawSource], index) => {
      const simple = (value: unknown) =>
        typeof value === "string" || typeof value === "number"
          ? String(value).trim()
          : "";
      const code = simple(rawCode);
      const description = simple(rawDescription);
      const unit = workUnits.find((entry) => entry === simple(rawUnit));
      const price = simple(rawPrice);
      const cents = Math.round(Number(price) * 100);
      const priceSource = simple(rawSource);
      if (
        !code ||
        code.length > 40 ||
        !description ||
        description.length > 160 ||
        !unit ||
        !/^\d+(?:\.\d{1,2})?$/.test(price) ||
        cents < 1 ||
        cents > 100_000_000 ||
        priceSource.length > 160
      )
        throw Error(
          `Revisa el código, descripción, unidad y precio USD en la fila ${index + 2}.`,
        );
      return {
        code,
        description,
        unit,
        unitPriceCents: cents,
        priceSource,
        active: true,
      };
    },
  );
}

export function CatalogImport({
  save,
  language,
}: {
  save: (items: ImportedItem[], updatePrices: boolean) => Promise<unknown>;
  language: Language;
}) {
  const t = copy(language);
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const [updatePrices, setUpdatePrices] = useState(false);
  return (
    <Panel title={t("Importar catálogo", "Import work items")}>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t(
            "Carga hasta 500 partidas de Excel (.xlsx) o CSV. Conserva la fuente de la tarifa en el archivo. Los códigos deben ser únicos en tu catálogo.",
            "Import up to 500 items from Excel (.xlsx) or CSV. Include the rate source in the file. Codes must be unique in your catalog.",
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            downloadDocument(
              new Blob(
                [
                  `\uFEFF${headers.join(",")}\r\nEX-01,Pintura interior,ft²,2.50,Tarifa propia\r\n`,
                ],
                { type: "text/csv;charset=utf-8" },
              ),
              "plantilla-partidas.csv",
            )
          }
        >
          {t("Descargar plantilla CSV", "Download CSV template")}
        </Button>
        <Field label={t("Archivo Excel o CSV", "Excel or CSV file")}>
          <Input
            key={fileKey}
            type="file"
            accept=".csv,.xlsx"
            disabled={busy}
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              setItems([]);
              setError("");
              if (!file) return;
              setBusy(true);
              try {
                setItems(await readCatalog(file));
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </Field>
        {items.length > 0 && (
          <>
            <p className="text-sm" role="status">
              {items.length}{" "}
              {t("partidas listas para importar", "items ready to import")}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={busy}
                checked={updatePrices}
                onChange={(event) => setUpdatePrices(event.target.checked)}
              />
              {t(
                "Actualizar precios y fuentes de los códigos existentes",
                "Update prices and sources for existing codes",
              )}
            </label>
            <Button
              type="button"
              disabled={busy}
              onClick={async () => {
                setError("");
                setBusy(true);
                try {
                  await save(items, updatePrices);
                  setItems([]);
                  setUpdatePrices(false);
                  setFileKey((key) => key + 1);
                } catch (cause) {
                  setError((cause as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("Importar partidas", "Import items")}
            </Button>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </Panel>
  );
}

export function ResourceEditor({
  resources,
  setResources,
  language,
}: {
  resources: WorkResource[];
  setResources: (resources: WorkResource[]) => void;
  language: Language;
}) {
  const t = copy(language);
  const [open, setOpen] = useState(resources.length > 0);
  const kinds = [
    t("Material", "Material"),
    t("Mano de obra", "Labor"),
    t("Equipo", "Equipment"),
  ];
  const change = (
    index: number,
    field: keyof WorkResource,
    value: string | number,
  ) =>
    setResources(
      resources.map((row, rowIndex) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  return (
    <div className="space-y-3 rounded-lg border p-4 md:col-span-2">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {t("Análisis de precio unitario (APU)", "Unit price breakdown")}
      </Button>
      {open && (
        <>
          <p className="text-sm text-muted-foreground">
            {t(
              "Indica el consumo de cada recurso por unidad de partida y su tarifa. El total reemplaza el precio manual.",
              "Enter the consumption per work item unit and each resource rate. The result sets the unit price.",
            )}
          </p>
          {resources.map((resource, index) => (
            <fieldset
              className="grid gap-2 rounded-md border p-3 sm:grid-cols-2 xl:grid-cols-5"
              key={index}
            >
              <legend className="px-1 text-sm">
                {t("Recurso", "Resource")} {index + 1}
              </legend>
              <Field label={t("Tipo", "Type")}>
                <NativeSelect
                  value={resource.kind}
                  onChange={(event) =>
                    change(index, "kind", event.target.value)
                  }
                >
                  {resourceKinds.map((kind, position) => (
                    <option value={kind} key={kind}>
                      {kinds[position]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("Descripción", "Description")}>
                <Input
                  required
                  maxLength={160}
                  value={resource.description}
                  onChange={(event) =>
                    change(index, "description", event.target.value)
                  }
                />
              </Field>
              <Field label={t("Unidad del recurso", "Resource unit")}>
                <Input
                  required
                  maxLength={20}
                  value={resource.unit}
                  onChange={(event) =>
                    change(index, "unit", event.target.value)
                  }
                />
              </Field>
              <Field label={t("Consumo por unidad", "Consumption per unit")}>
                <Input
                  required
                  type="number"
                  min="0.001"
                  max="1000000"
                  step="0.001"
                  value={resource.quantity / 1000 || ""}
                  onChange={(event) =>
                    change(
                      index,
                      "quantity",
                      Math.round(Number(event.target.value) * 1000),
                    )
                  }
                />
              </Field>
              <Field label={t("Tarifa USD", "Rate USD")}>
                <Input
                  required
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  value={resource.rateCents / 100 || ""}
                  onChange={(event) =>
                    change(
                      index,
                      "rateCents",
                      Math.round(Number(event.target.value) * 100),
                    )
                  }
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setResources(resources.filter((_, row) => row !== index))
                }
              >
                {t("Quitar recurso", "Remove resource")}
              </Button>
            </fieldset>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={resources.length >= 100}
              onClick={() =>
                setResources([
                  ...resources,
                  {
                    kind: "material",
                    description: "",
                    unit: "",
                    quantity: 1000,
                    rateCents: 0,
                  },
                ])
              }
            >
              {t("Añadir recurso", "Add resource")}
            </Button>
            <output className="text-sm font-medium">
              {t("Costo unitario USD", "Unit cost USD")} ·{" "}
              {(
                resources.reduce(
                  (sum, resource) =>
                    Number.isSafeInteger(resource.quantity) &&
                    Number.isSafeInteger(resource.rateCents)
                      ? sum + lineAmount(resource.quantity, resource.rateCents)
                      : sum,
                  0,
                ) / 100
              ).toFixed(2)}
            </output>
          </div>
        </>
      )}
    </div>
  );
}
