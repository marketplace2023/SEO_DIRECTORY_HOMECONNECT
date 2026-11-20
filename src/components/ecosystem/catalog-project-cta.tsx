import { PiArrowUpRight } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import type { Language } from "@/domain/types";
import { copy } from "./primitives";

export function CatalogProjectCta({
  language,
  categoryId,
  serviceId,
}: {
  language: Language;
  categoryId: string;
  serviceId?: string;
}) {
  const t = copy(language);
  const params = new URLSearchParams({ category: categoryId });
  if (serviceId) params.set("service", serviceId);
  return (
    <section
      className="project-cta catalog-project-cta"
      aria-labelledby="catalog-project-cta-title"
    >
      <div className="project-cta-inner">
        <div className="catalog-project-cta-copy">
          <h2 id="catalog-project-cta-title">
            <span>{t("Que no se quede", "Don’t leave it")}</span>
            {t(" en ", " for ")}
            <em>{t("“algún día”.", "“someday”.")}</em>
          </h2>
          <p className="cta-description">
            {t(
              "Cuéntanos qué necesitas para solicitar un presupuesto.",
              "Tell us what you need to request a quote.",
            )}
          </p>
          <Button asChild className="cta-button">
            <a href={`#/quote?${params}`}>
              {t("Empezar mi proyecto", "Start my project")}
              <PiArrowUpRight aria-hidden="true" />
            </a>
          </Button>
        </div>
        <div className="cta-art" aria-hidden="true">
          <span className="cta-orbit orbit-one" />
          <span className="cta-orbit orbit-two" />
          <span className="cta-orbit orbit-three" />
          <PiArrowUpRight />
        </div>
      </div>
    </section>
  );
}
