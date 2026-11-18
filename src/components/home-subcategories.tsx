import { useState } from "react";
import { PiArrowUpRight } from "react-icons/pi";
import { categories, subcategories, services } from "@/data/catalog";
import type { Language } from "@/domain/types";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { navigate } from "@/lib/navigation";

export function HomeSubcategories({ language }: { language: Language }) {
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const es = language === "es";
  return (
    <section
      className="site-container pb-14 md:pb-20"
      aria-labelledby="subcategory-title"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-semibold text-primary">
            {es
              ? "Encuentra el trabajo que necesitas"
              : "Find the work you need"}
          </p>
          <h2
            id="subcategory-title"
            className="text-2xl font-semibold tracking-tight md:text-3xl"
          >
            {es
              ? "Explora las áreas de cada oficio."
              : "Explore each trade's areas."}
          </h2>
        </div>
        <label className="grid w-full gap-2 text-xs font-semibold text-neutral-600 sm:w-72">
          <span>
            {es
              ? "Categoría para ver subcategorías"
              : "Category for subcategories"}
          </span>
          <NativeSelect
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[language]}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {subcategories
          .filter((sub) => sub.categoryId === categoryId)
          .map((sub) => (
            <Card
              key={sub.id}
              className="gap-0 overflow-hidden py-0 shadow-none"
              data-subcategory={sub.id}
            >
              <img
                src={sub.image}
                alt={sub.name[language]}
                width={640}
                height={360}
                loading="lazy"
                decoding="async"
                className="aspect-[16/9] w-full object-cover"
              />
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold tracking-tight">
                  {sub.name[language]}
                </h3>
                <p className="mt-2 text-xs leading-6 text-neutral-500">
                  {services
                    .filter((service) => service.subcategoryId === sub.id)
                    .map((service) => service.name[language])
                    .join(" · ")}
                </p>
                <Button
                  variant="link"
                  className="mt-4 h-auto px-0"
                  onClick={() =>
                    navigate(
                      "/professionals",
                      new URLSearchParams({
                        category: categoryId,
                        subcategory: sub.id,
                      }),
                    )
                  }
                >
                  {es
                    ? "Ver profesionales de esta área"
                    : "Find professionals for this area"}
                  <PiArrowUpRight aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </section>
  );
}
