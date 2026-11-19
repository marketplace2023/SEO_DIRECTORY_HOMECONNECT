import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/auth-provider";
import { PiArrowRight, PiArrowUpRight } from "react-icons/pi";
import { categories, services } from "@/data/catalog";
import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { navigate, type Route } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, PageTitle, Panel, copy } from "./primitives";
import { Missing } from "./public-pages";

export function RequestPage({
  route,
  language,
}: {
  route: Route;
  language: Language;
}) {
  const { state, send } = useStore();
  const { user } = useAuth();
  const t = copy(language);
  const draftKey = "homeconnect.quote-draft." + route.params.toString();
  const [draft] = useState<Record<string, string>>(() => {
    try {
      const stored: unknown = JSON.parse(
        sessionStorage.getItem(draftKey) || "{}",
      );
      return stored && typeof stored === "object"
        ? Object.fromEntries(
            Object.entries(stored).filter(
              ([, value]) => typeof value === "string",
            ),
          )
        : {};
    } catch {
      return {};
    }
  });
  const recipient = state.professionals.find(
    (p) =>
      p.id === route.params.get("professional") &&
      p.publication === "published",
  );
  const initial =
    services.find(
      (s) =>
        s.id === (draft.serviceId || route.params.get("service")) &&
        (!recipient || recipient.serviceIds.includes(s.id)),
    ) ||
    services.find((s) => s.id === recipient?.serviceIds[0]) ||
    services.find(
      (s) =>
        s.categoryId === route.params.get("category") &&
        (!recipient || recipient.serviceIds.includes(s.id)),
    ) ||
    services[0];
  const [categoryId, setCategory] = useState(initial.categoryId);
  const [serviceId, setService] = useState(initial.id);
  const [error, setError] = useState("");
  if (!user?.emailVerified || user.role !== "owner") return null;
  if (
    (route.params.has("professional") && !recipient) ||
    (route.params.has("service") &&
      !services.some(
        (s) =>
          s.id === route.params.get("service") &&
          (!recipient || recipient.serviceIds.includes(s.id)),
      ))
  )
    return <Missing language={language} />;
  const available = services.filter(
    (s) =>
      s.categoryId === categoryId &&
      (!recipient || recipient.serviceIds.includes(s.id)),
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title")).trim();
    const location = String(data.get("location")).trim();
    const description = String(data.get("description")).trim();
    const rawBudget = String(data.get("budget"));
    const budget = rawBudget ? Number(rawBudget) : null;
    if (
      !title ||
      !location ||
      !description ||
      (budget !== null && (!Number.isFinite(budget) || budget < 0))
    ) {
      setError(
        t(
          "Completa los campos y revisa el presupuesto.",
          "Complete the fields and check the budget.",
        ),
      );
      return;
    }
    const value = {
      title,
      location,
      description,
      budget,
      categoryId,
      serviceId,
      date: String(data.get("date")),
      ...(recipient ? { professionalId: recipient.id } : {}),
    };
    const id = send({ type: "request", value });
    if (!id) return;
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      /* The request can continue without browser storage. */
    }
    navigate(`/workspace/owner/requests/${id}`);
  };
  return (
    <>
      <PageTitle
        eyebrow={t("DE LA IDEA AL PRIMER PASO", "FROM IDEA TO FIRST STEP")}
        title={t("Cuéntanos qué necesitas.", "Tell us what you need.")}
        description={t(
          "Una solicitud clara es el inicio de una buena conexión.",
          "A clear request is the beginning of a good connection.",
        )}
      />
      <div className="request-layout">
        <Panel title={t("Tu proyecto", "Your project")}>
          <form
            className="eco-form"
            onSubmit={submit}
            onChange={(event) => {
              const values = Object.fromEntries(
                new FormData(event.currentTarget).entries(),
              );
              try {
                sessionStorage.setItem(draftKey, JSON.stringify(values));
              } catch {
                /* The form remains usable without draft storage. */
              }
            }}
          >
            {recipient && (
              <div className="eco-notice">
                {t("Solicitud dirigida a", "Request addressed to")}{" "}
                <strong>{recipient.name}</strong>
              </div>
            )}
            <Field label={t("Título del proyecto", "Project title")}>
              <Input
                name="title"
                defaultValue={draft.title ?? ""}
                required
                maxLength={120}
                placeholder={t(
                  "Ej. Renovar la cocina de mi apartamento",
                  "E.g. Renovate my apartment kitchen",
                )}
              />
            </Field>
            <div className="eco-form-grid">
              <Field label={t("Categoría", "Category")}>
                <select
                  value={categoryId}
                  name="categoryId"
                  disabled={!!recipient}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setService(
                      services.find((s) => s.categoryId === e.target.value)!.id,
                    );
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name[language]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("Servicio", "Service")}>
                <select
                  value={serviceId}
                  name="serviceId"
                  onChange={(e) => setService(e.target.value)}
                >
                  {available.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name[language]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t("Ciudad y país", "City and country")}>
              <Input
                name="location"
                required
                maxLength={160}
                defaultValue={
                  draft.location ??
                  (recipient ? `${recipient.city}, ${recipient.country}` : "")
                }
                placeholder="Caracas, Venezuela"
              />
            </Field>
            <Field label={t("Descripción del proyecto", "Project description")}>
              <Textarea
                name="description"
                defaultValue={draft.description ?? ""}
                required
                maxLength={3000}
                rows={5}
                placeholder={t(
                  "¿Qué quieres cambiar? Incluye medidas, estado actual y materiales si los conoces.",
                  "What would you like to change? Include dimensions, current condition and materials if you know them.",
                )}
              />
            </Field>
            <div className="eco-form-grid">
              <Field
                label={t(
                  "Presupuesto orientativo · USD (opcional)",
                  "Estimated budget · USD (optional)",
                )}
              >
                <Input
                  name="budget"
                  defaultValue={draft.budget ?? ""}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1200"
                />
              </Field>
              <Field
                label={t(
                  "Fecha deseada (opcional)",
                  "Preferred date (optional)",
                )}
              >
                <Input
                  name="date"
                  type="date"
                  defaultValue={draft.date ?? ""}
                />
              </Field>
            </div>
            {error && (
              <p role="alert" className="eco-error">
                {error}
              </p>
            )}
            <Button type="submit">
              {t("Publicar solicitud de prueba", "Post demo request")}
              <PiArrowRight />
            </Button>
            <p className="eco-note">
              {t(
                "Recibe y compara las propuestas desde tu cuenta.",
                "Receive and compare proposals from your account.",
              )}
            </p>
          </form>
        </Panel>
        <aside className="request-help">
          <span className="request-help-icon">
            <PiArrowUpRight />
          </span>
          <h2>
            {t(
              "Las buenas conexiones empiezan con una buena idea.",
              "Good connections start with a good idea.",
            )}
          </h2>
          <ol>
            <li>
              {t(
                "Describe el trabajo que imaginas.",
                "Describe the work you have in mind.",
              )}
            </li>
            <li>
              {t(
                "Recibe propuestas en tu espacio.",
                "Receive proposals in your workspace.",
              )}
            </li>
            <li>
              {t(
                "Compara y elige cómo empezar.",
                "Compare and choose how to start.",
              )}
            </li>
          </ol>
          <p>
            {t(
              "Sigue las respuestas desde tu dashboard.",
              "Follow replies from your dashboard.",
            )}
          </p>
        </aside>
      </div>
    </>
  );
}
