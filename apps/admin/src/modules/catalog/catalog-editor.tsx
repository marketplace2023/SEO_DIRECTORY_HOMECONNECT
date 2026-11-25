import { useState, type FormEvent } from "react";
import {
  categories,
  services,
  subcategories,
  installCatalog,
  type Catalog,
} from "@/data/catalog";
import { categoryGuides, subcategoryConcepts } from "@/data/category-guides";
import { serviceGuide, subcategoryWhen } from "@/data/service-guides";
import type { Language, Localized } from "@/domain/types";
import { Field, copy } from "@/components/ecosystem/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/http";

export type EditCatalogItem = {
  kind: "category" | "subcategory" | "service";
  id?: string;
  parent?: string;
};
type TextField = {
  name: string;
  label: string;
  initial?: Localized;
  short?: boolean;
};

export function CatalogEditor({
  item,
  onClose,
  onSaved,
  language,
}: {
  item: EditCatalogItem;
  onClose: () => void;
  onSaved: (categoryId: string) => void;
  language: Language;
}) {
  const t = copy(language);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const category =
    item.kind === "category"
      ? categories.find((entry) => entry.id === item.id)
      : undefined;
  const area =
    item.kind === "subcategory"
      ? subcategories.find((entry) => entry.id === item.id)
      : undefined;
  const service =
    item.kind === "service"
      ? services.find((entry) => entry.id === item.id)
      : undefined;
  const guide = service && serviceGuide(service);
  const parentCategory = categories.find(
    (entry) =>
      entry.id === (area?.categoryId ?? service?.categoryId ?? item.parent),
  );
  const fields: TextField[] = [
    {
      name: "name",
      label: t("Nombre", "Name"),
      initial: (category ?? area ?? service)?.name,
      short: true,
    },
  ];
  if (item.kind === "category") {
    fields.push(
      {
        name: "description",
        label: t("Descripción breve", "Short description"),
        initial: category?.description,
      },
      {
        name: "concept",
        label: t("En qué consiste", "What it involves"),
        initial: category?.concept ?? categoryGuides[item.id ?? ""]?.concept,
      },
      {
        name: "when",
        label: t("Cuándo buscar ayuda", "When to get help"),
        initial: category?.when ?? categoryGuides[item.id ?? ""]?.when,
      },
      {
        name: "excluded",
        label: t("Límites", "Boundaries"),
        initial: category?.excluded,
      },
    );
  } else if (item.kind === "subcategory") {
    fields.push(
      {
        name: "concept",
        label: t("En qué consiste", "What it involves"),
        initial: area?.concept ?? subcategoryConcepts[item.id ?? ""],
      },
      {
        name: "when",
        label: t("Cuándo buscar ayuda", "When to get help"),
        initial: area?.when ?? subcategoryWhen(item.id ?? ""),
      },
    );
  } else {
    fields.push(
      { name: "scope", label: t("Alcance", "Scope"), initial: guide?.scope },
      {
        name: "requirements",
        label: t("Qué preparar al cotizar", "What to prepare for a quote"),
        initial: guide?.requirements,
      },
      {
        name: "completion",
        label: t("Entregables", "Deliverables"),
        initial: guide?.completion,
      },
      {
        name: "separate",
        label: t("Qué se acuerda por separado", "What to agree separately"),
        initial: guide?.separate ?? parentCategory?.excluded,
      },
    );
  }
  const modes = [
    ["installation", t("Instalación", "Installation")],
    ["repair", t("Reparación", "Repair")],
    ["maintenance", t("Mantenimiento", "Maintenance")],
    ["assessment", t("Evaluación", "Assessment")],
    ["design", t("Diseño", "Design")],
    ["cleaning", t("Limpieza", "Cleaning")],
  ];
  const kindLabel = {
    category: t("categoría", "category"),
    subcategory: t("subcategoría", "subcategory"),
    service: t("servicio", "service"),
  }[item.kind];

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    const text = Object.fromEntries(
      fields.map(({ name }) => [
        name,
        { es: value(`${name}-es`), en: value(`${name}-en`) },
      ]),
    );
    const id = item.id ?? value("id").trim();
    const categoryId = area?.categoryId ?? value("categoryId");
    const subcategoryId = service?.subcategoryId ?? value("subcategoryId");
    const body = {
      ...text,
      id,
      kind: item.kind,
      create: !item.id,
      ...(item.kind === "subcategory" && { categoryId }),
      ...(item.kind !== "service" && { image: value("image") }),
      ...(item.kind === "service" && {
        subcategoryId,
        mode: value("mode"),
        additionalSubcategoryIds: form.getAll("related"),
      }),
    };
    setBusy(true);
    setError("");
    try {
      const catalog = await apiRequest<Catalog>("/api/catalog", body);
      installCatalog(catalog);
      onSaved(
        item.kind === "category"
          ? id
          : item.kind === "subcategory"
            ? categoryId
            : catalog.services.find((entry) => entry.id === id)!.categoryId,
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent>
        <div>
          <DialogTitle className="pr-8 text-xl font-bold">
            {item.id ? t("Editar", "Edit") : t("Crear", "Create")} {kindLabel}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-neutral-600">
            {t(
              "Completa los textos en español e inglés para el catálogo público.",
              "Complete the Spanish and English text for the public catalog.",
            )}
          </DialogDescription>
        </div>
        <form className="space-y-4" onSubmit={(event) => void save(event)}>
          <fieldset disabled={busy} className="space-y-4">
            <Field label={t("Identificador", "Identifier")}>
              <Input
                name="id"
                maxLength={80}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                defaultValue={item.id}
                readOnly={!!item.id}
                required
                placeholder="mi-especialidad"
              />
            </Field>
            {item.kind === "subcategory" && (
              <Field label={t("Categoría principal", "Primary category")}>
                <NativeSelect
                  name="categoryId"
                  disabled={!!area}
                  defaultValue={area?.categoryId ?? item.parent ?? ""}
                  required
                >
                  <option value="">
                    {t("Selecciona una categoría", "Select a category")}
                  </option>
                  {categories.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name[language]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
            {item.kind === "service" && (
              <>
                <Field
                  label={t("Subcategoría principal", "Primary subcategory")}
                >
                  <NativeSelect
                    name="subcategoryId"
                    disabled={!!service}
                    defaultValue={
                      service?.subcategoryId ??
                      subcategories.find(
                        (entry) => entry.categoryId === item.parent,
                      )?.id ??
                      ""
                    }
                    required
                  >
                    <option value="">
                      {t("Selecciona una subcategoría", "Select a subcategory")}
                    </option>
                    {subcategories.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {
                          categories.find(
                            (category) => category.id === entry.categoryId,
                          )?.name[language]
                        }{" "}
                        · {entry.name[language]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={t("Modalidad", "Service type")}>
                  <NativeSelect
                    name="mode"
                    defaultValue={service?.mode ?? "installation"}
                  >
                    {modes.map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <details
                  className="rounded-lg border p-3"
                  open={
                    !!service?.additionalSubcategoryIds?.length || undefined
                  }
                >
                  <summary className="cursor-pointer text-sm font-semibold">
                    {t("Subcategorías relacionadas", "Related subcategories")}
                  </summary>
                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                    {subcategories
                      .filter((entry) => entry.id !== service?.subcategoryId)
                      .map((entry) => (
                        <label
                          key={entry.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <input
                            className="mt-1"
                            type="checkbox"
                            name="related"
                            value={entry.id}
                            defaultChecked={service?.additionalSubcategoryIds?.includes(
                              entry.id,
                            )}
                          />
                          {
                            categories.find(
                              (category) => category.id === entry.categoryId,
                            )?.name[language]
                          }{" "}
                          · {entry.name[language]}
                        </label>
                      ))}
                  </div>
                </details>
              </>
            )}
            {item.kind !== "service" && (
              <Field
                label={t(
                  "Imagen del catálogo o URL HTTPS",
                  "Catalog image or HTTPS URL",
                )}
              >
                <Input
                  name="image"
                  required
                  maxLength={1500}
                  defaultValue={
                    category?.image ?? area?.image ?? parentCategory?.image
                  }
                />
              </Field>
            )}
            {fields.map((field) => (
              <div key={field.name} className="grid gap-3 sm:grid-cols-2">
                {(["es", "en"] as const).map((locale) => (
                  <Field
                    key={locale}
                    label={`${field.label} (${locale.toUpperCase()})`}
                  >
                    {field.short ? (
                      <Input
                        required
                        minLength={2}
                        maxLength={140}
                        name={`${field.name}-${locale}`}
                        defaultValue={field.initial?.[locale]}
                      />
                    ) : (
                      <Textarea
                        rows={2}
                        required
                        minLength={5}
                        maxLength={3000}
                        name={`${field.name}-${locale}`}
                        defaultValue={field.initial?.[locale]}
                      />
                    )}
                  </Field>
                ))}
              </div>
            ))}
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy
              ? t("Guardando…", "Saving…")
              : t("Guardar en el catálogo", "Save to catalog")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
