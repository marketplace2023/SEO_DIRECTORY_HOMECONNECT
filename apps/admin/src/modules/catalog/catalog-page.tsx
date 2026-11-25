import { useState } from "react";
import {
  categories,
  services,
  subcategories,
  serviceInSubcategory,
} from "@/data/catalog";
import { Panel, Stat, copy, Empty } from "@/components/ecosystem/primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { normalize, type Language } from "@/domain/types";
import { CatalogEditor, type EditCatalogItem } from "./catalog-editor";

export function CatalogPage({ language }: { language: Language }) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(categories[0].id),
    t = copy(language);
  const [editor, setEditor] = useState<EditCatalogItem>();
  const [saved, setSaved] = useState(false);
  const visible = categories.filter((c) =>
    normalize(
      [
        c.name.es,
        c.name.en,
        c.id,
        ...services
          .filter((service) => service.categoryId === c.id)
          .flatMap((service) => [service.id, service.name.es, service.name.en]),
        ...subcategories
          .filter((sub) => sub.categoryId === c.id)
          .flatMap((sub) => [sub.name.es, sub.name.en, sub.id]),
      ].join(" "),
    ).includes(normalize(query)),
  );
  const category = visible.find((c) => c.id === selected) || visible[0];
  return (
    <Panel title={t("Catálogo normalizado", "Normalized catalog")}>
      <div className="mb-5 flex flex-wrap gap-2">
        <Button type="button" onClick={() => setEditor({ kind: "category" })}>
          {t("Nueva categoría", "New category")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setEditor({ kind: "subcategory", parent: category?.id })
          }
        >
          {t("Nueva subcategoría", "New subcategory")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditor({ kind: "service", parent: category?.id })}
        >
          {t("Nuevo servicio", "New service")}
        </Button>
      </div>
      {saved && (
        <p role="status" className="mb-4 text-sm text-green-800">
          {t(
            "Cambios publicados en el catálogo.",
            "Changes published to the catalog.",
          )}
        </p>
      )}
      {editor && (
        <CatalogEditor
          item={editor}
          language={language}
          onClose={() => setEditor(undefined)}
          onSaved={(id) => {
            setEditor(undefined);
            setSelected(id);
            setQuery("");
            setSaved(true);
          }}
        />
      )}
      <div className="eco-stats-grid">
        <Stat value={categories.length} label={t("Categorías", "Categories")} />
        <Stat
          value={subcategories.length}
          label={t("Subcategorías", "Subcategories")}
        />
        <Stat value={services.length} label={t("Servicios", "Services")} />
      </div>
      <Input
        aria-label={t("Buscar categoría", "Search category")}
        placeholder={t(
          "Buscar categoría, subcategoría o servicio…",
          "Search category, subcategory or service…",
        )}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="my-5"
      />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label={t("Categorías del catálogo", "Catalog categories")}>
          <ScrollArea className="h-72 rounded-lg border border-neutral-200 xl:h-[760px]">
            <div className="space-y-1 p-2">
              {visible.map((c) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  onClick={() => setSelected(c.id)}
                  aria-pressed={category?.id === c.id}
                  className={`h-auto w-full justify-start gap-3 px-2 py-2 text-left ${category?.id === c.id ? "bg-accent text-accent-foreground" : ""}`}
                >
                  <img
                    src={c.image}
                    alt=""
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    className="size-12 shrink-0 rounded-md object-cover"
                  />
                  <span className="min-w-0 whitespace-normal">
                    <span className="block text-xs font-semibold leading-5">
                      {c.name[language]}
                    </span>
                    <small className="block break-all text-[10px] text-neutral-400">
                      {c.id}
                    </small>
                  </span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </nav>
        {category ? (
          <div className="min-w-0" data-catalog-category={category.id}>
            <div className="grid gap-5 sm:grid-cols-[minmax(140px,.8fr)_minmax(0,1fr)]">
              <img
                src={category.image}
                alt={category.name[language]}
                width={640}
                height={400}
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
              <div>
                <Badge variant="outline" className="mb-3">
                  {t("Categoría", "Category")} · {category.id}
                </Badge>
                <h3 className="text-2xl font-semibold tracking-tight">
                  {category.name[language]}
                </h3>
                <p className="mt-3 text-sm leading-7 text-neutral-500">
                  {category.description[language]}
                </p>
                <p className="mt-3 break-all font-mono text-[10px] text-neutral-400">
                  {category.image}
                </p>
                <Button
                  className="mt-3"
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setEditor({ kind: "category", id: category.id })
                  }
                >
                  {t("Editar categoría", "Edit category")}
                </Button>
              </div>
            </div>
            <h3 className="mt-8 mb-4 text-base font-semibold">
              {t("Subcategorías y sus servicios", "Subcategories and services")}
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              {subcategories
                .filter((sub) => sub.categoryId === category.id)
                .map((sub) => (
                  <Card
                    key={sub.id}
                    data-catalog-subcategory={sub.id}
                    className="gap-0 overflow-hidden py-0 shadow-none"
                  >
                    <img
                      src={sub.image}
                      alt={sub.name[language]}
                      width={640}
                      height={360}
                      loading="lazy"
                      decoding="async"
                      className="aspect-video w-full object-cover"
                    />
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold leading-6">
                        {sub.name[language]}
                      </h4>
                      <code className="mt-1 block break-all text-[10px] text-neutral-400">
                        {sub.id}
                      </code>
                      <Button
                        className="mt-3"
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditor({ kind: "subcategory", id: sub.id })
                        }
                      >
                        {t("Editar subcategoría", "Edit subcategory")}
                      </Button>
                      <ul className="mt-4 space-y-3">
                        {services
                          .filter((service) =>
                            serviceInSubcategory(service, sub.id),
                          )
                          .map((service) => (
                            <li
                              key={service.id}
                              className="text-xs leading-5 text-neutral-600"
                            >
                              {service.name[language]}
                              <code className="block text-[10px] text-neutral-400">
                                {service.id}
                              </code>
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto px-0"
                                aria-label={`${t("Editar", "Edit")} ${service.name[language]}`}
                                onClick={() =>
                                  setEditor({ kind: "service", id: service.id })
                                }
                              >
                                {t("Editar servicio", "Edit service")}
                              </Button>
                            </li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ) : (
          <Empty title={t("No hay coincidencias.", "No matches.")} />
        )}
      </div>
    </Panel>
  );
}
