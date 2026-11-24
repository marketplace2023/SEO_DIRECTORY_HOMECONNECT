import { useId, type ReactNode } from "react";
import {
  PiArrowUpRight,
  PiCaretRight,
  PiClipboardText,
  PiListChecks,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Category, Language, Service, Subcategory } from "@/domain/types";
import { serviceGuide, serviceScope } from "@/data/service-guides";
import { copy } from "./primitives";

export function ServiceGuideCard({
  service,
  language,
}: {
  service: Service;
  language: Language;
}) {
  const name = service.name[language];
  const descriptionId = useId();
  const description = (service.scope ?? serviceScope(service.id))?.[language];
  return (
    <Card className="group gap-0 rounded-lg border-transparent bg-transparent py-0 shadow-none transition-colors hover:bg-primary/5">
      <a
        href={`#/services/${service.id}`}
        aria-label={name}
        aria-describedby={description ? descriptionId : undefined}
        className="flex h-full items-start justify-between gap-4 rounded-xl p-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary sm:p-5"
      >
        <div className="min-w-0">
          <p className="text-base font-semibold group-hover:text-primary">
            {name}
          </p>
          {description && (
            <p
              id={descriptionId}
              className="mt-2 text-sm leading-6 text-neutral-600"
            >
              {description}
            </p>
          )}
        </div>
        <PiArrowUpRight
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-primary"
        />
      </a>
    </Card>
  );
}

export function ServiceGuide({
  service,
  category,
  area,
  language,
  related,
  children,
}: {
  service: Service;
  category: Category;
  area: Subcategory;
  language: Language;
  related: Service[];
  children: ReactNode;
}) {
  const t = copy(language);
  const details = serviceGuide(service);
  const areaUrl = `#/categories/${category.id}/${area.id}`;
  const quoteUrl = `#/quote?${new URLSearchParams({ service: service.id })}`;
  const steps = [
    [
      t("Envía la solicitud", "Send your request"),
      t(
        "Describe el área, el problema y el resultado que buscas.",
        "Describe the area, the issue and the result you want.",
      ),
    ],
    [
      t("Revisa las propuestas", "Review proposals"),
      t(
        "Confirma qué trabajos, materiales, accesos y plazos incluye cada propuesta.",
        "Check the work, materials, access and timing covered by each proposal.",
      ),
    ],
    [
      t("Acuerda la entrega", "Agree on the handover"),
      t(
        "Define con el profesional qué se comprobará al terminar.",
        "Agree with the professional on what will be checked at completion.",
      ),
    ],
  ];

  return (
    <article
      className="space-y-9 pb-10 md:space-y-12"
      data-service-page={service.id}
    >
      <nav
        aria-label={t("Ruta del servicio", "Service breadcrumb")}
        className="flex flex-wrap items-center gap-2 text-sm text-neutral-600"
      >
        <a href="#/categories" className="hover:text-primary">
          {t("Categorías", "Categories")}
        </a>
        <PiCaretRight aria-hidden="true" />
        <a href={`#/categories/${category.id}`} className="hover:text-primary">
          {category.name[language]}
        </a>
        <PiCaretRight aria-hidden="true" />
        <a href={areaUrl} className="hover:text-primary">
          {area.name[language]}
        </a>
      </nav>

      <header className="overflow-hidden rounded-2xl border border-neutral-200 bg-[#faf8f5]">
        <img
          src={area.image}
          alt={area.name[language]}
          width={640}
          height={360}
          fetchPriority="high"
          className="aspect-[2.3] max-h-72 w-full object-cover"
        />
        <div className="grid items-start gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12 lg:px-10 lg:py-9">
          <div>
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.12] font-bold tracking-[-0.04em] text-balance">
              {service.name[language]}
            </h1>
            {details.scope && (
              <div className="mt-5 max-w-xl">
                <h2 className="text-base font-bold">
                  {t("Qué incluye el servicio", "What this service covers")}
                </h2>
                <p
                  className="mt-2 text-base leading-8 text-neutral-700"
                  data-service-scope
                >
                  {details.scope[language]}
                </p>
              </div>
            )}
          </div>
          <Button
            asChild
            className="h-11 justify-self-start rounded-lg lg:mt-2"
          >
            <a href={quoteUrl}>
              {t("Solicitar presupuesto", "Request a quote")}{" "}
              <PiArrowUpRight aria-hidden="true" />
            </a>
          </Button>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section
          aria-labelledby="service-requirements"
          className="space-y-5 border-y border-neutral-200 py-6 lg:px-2"
        >
          <div>
            <h2
              id="service-requirements"
              className="flex items-center gap-3 text-xl font-bold"
            >
              <PiClipboardText
                aria-hidden="true"
                className="shrink-0 text-primary"
              />
              {t("Qué preparar para cotizar", "What to prepare for a quote")}
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-7 text-neutral-700">
              {details.requirements?.[language] ??
                t(
                  "Comparte la ubicación, fotos y el resultado esperado.",
                  "Share the location, photos and the result you want.",
                )}
            </p>
          </div>
          <div>
            <h3 className="text-base font-bold">
              {t("Qué se acuerda por separado", "What to agree separately")}
            </h3>
            <p className="mt-2 max-w-prose text-sm leading-7 text-neutral-700">
              {details.separate?.[language] ?? category.excluded[language]}
            </p>
          </div>
        </section>
        <Card className="gap-3 rounded-xl border-0 border-l-4 border-primary/55 bg-[#faf8f5] px-6 py-6 shadow-none">
          <h2 className="flex items-center gap-3 text-xl font-bold">
            <PiListChecks
              aria-hidden="true"
              className="shrink-0 text-primary"
            />
            {t("Entregables a acordar", "Deliverables to agree on")}
          </h2>
          <p
            className="max-w-prose text-sm leading-7 text-neutral-700"
            data-service-deliverable
          >
            {details.completion[language]}
          </p>
        </Card>
      </div>

      <section aria-labelledby="service-process">
        <h2
          id="service-process"
          className="mb-5 text-2xl font-bold tracking-tight"
        >
          {t("Proceso de contratación", "How to hire")}
        </h2>
        <ol className="grid gap-x-7 gap-y-4 sm:grid-cols-3">
          {steps.map(([title, description], index) => (
            <li
              key={title}
              className="flex gap-3 border-t border-neutral-200 pt-4"
            >
              <span
                className="text-sm font-semibold tabular-nums text-primary"
                aria-hidden="true"
              >
                {index + 1}.
              </span>
              <div>
                <h3 className="text-sm font-bold">{title}</h3>
                <p className="mt-2 max-w-prose text-sm leading-6 text-neutral-600">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {children}

      {related.length > 0 && (
        <section aria-labelledby="service-related">
          <h2
            id="service-related"
            className="mb-5 text-2xl font-bold tracking-tight"
          >
            {t("Servicios relacionados", "Related services")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ServiceGuideCard
                key={item.id}
                service={item}
                language={language}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
