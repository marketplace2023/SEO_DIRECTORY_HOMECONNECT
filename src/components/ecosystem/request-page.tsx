import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/auth-provider";
import { VerificationNotice } from "@/auth/email-pages";
import { demoPost } from "@/domain/demo-client";
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
  const guest = !user;
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
  const [submissionId] = useState(
    () => draft.submissionId || crypto.randomUUID(),
  );
  const [skipAccount, setSkipAccount] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const accountNext = "/quote" + (route.params.size ? "?" + route.params : "");
  const accountHref = (path: string) =>
    "#" + path + "?next=" + encodeURIComponent(accountNext);
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
  if (user && !user.emailVerified) return <VerificationNotice />;
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
  const submit = async (event: FormEvent<HTMLFormElement>) => {
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
    if (guest) {
      if (submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setError("");
      try {
        const remote = await demoPost("/api/demo/guest-requests", {
          id: submissionId,
          value,
          contact: {
            name: String(data.get("contactName")).trim(),
            email: String(data.get("contactEmail")).trim(),
            phone: String(data.get("contactPhone")).trim(),
          },
        });
        if (!remote.requests.some((request) => request.id === submissionId))
          throw Error("Request missing");
        try {
          sessionStorage.removeItem(draftKey);
        } catch {
          /* Submission is already saved. */
        }
        setSubmitted(true);
      } catch {
        setError(
          t(
            "No se pudo enviar la solicitud. Revisa la conexión e inténtalo de nuevo.",
            "Could not submit the request. Check your connection and try again.",
          ),
        );
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    } else {
      const id = send({ type: "request", value });
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Continue without draft storage. */
      }
      navigate(`/workspace/owner/requests/${id}`);
    }
  };
  if (submitted)
    return (
      <Panel title={t("Solicitud enviada", "Request submitted")}>
        <p role="status" className="eco-success">
          {recipient
            ? t(
                `Tu solicitud se ha guardado para ${recipient.name}.`,
                `Your request has been saved for ${recipient.name}.`,
              )
            : t(
                "Tu solicitud se ha guardado para los contratistas de la especialidad.",
                "Your request has been saved for contractors in this specialty.",
              )}
        </p>
        <p>
          {t(
            "El contratista podrá consultar tus datos de contacto para responderte.",
            "The contractor can use your contact details to respond.",
          )}
        </p>
        <p className="eco-note">
          {t("Referencia", "Reference")} {submissionId}
        </p>
        <div className="eco-actions">
          <Button asChild>
            <a href="#/register">
              {t("Crear una cuenta", "Create an account")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="#/professionals">
              {t("Omitir y seguir explorando", "Skip and keep exploring")}
            </a>
          </Button>
        </div>
      </Panel>
    );
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
                sessionStorage.setItem(
                  draftKey,
                  JSON.stringify({ ...values, submissionId }),
                );
              } catch {
                /* The form remains usable without draft storage. */
              }
            }}
          >
            {guest && !skipAccount && (
              <div className="eco-notice">
                <h3>
                  {t(
                    "¿Quieres usar tu cuenta?",
                    "Would you like to use your account?",
                  )}
                </h3>
                <p>
                  {t(
                    "Puedes solicitar tu presupuesto como invitado o iniciar sesión para gestionarlo desde tu espacio.",
                    "Request a quote as a guest or sign in to manage it in your workspace.",
                  )}
                </p>
                <div className="eco-actions">
                  <Button asChild variant="outline">
                    <a href={accountHref("/login")}>
                      {t("Iniciar sesión", "Sign in")}
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={accountHref("/register")}>
                      {t("Crear cuenta", "Create account")}
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSkipAccount(true)}
                  >
                    {t(
                      "Omitir y continuar como invitado",
                      "Skip and continue as guest",
                    )}
                  </Button>
                </div>
              </div>
            )}
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
            {guest && (
              <fieldset>
                <legend className="font-semibold">
                  {t("Tus datos de contacto", "Your contact details")}
                </legend>
                <p className="eco-note">
                  {t(
                    "El contratista utilizará estos datos para responder a tu solicitud.",
                    "The contractor will use these details to respond to your request.",
                  )}
                </p>
                <div className="eco-form-grid">
                  <Field label={t("Nombre de contacto", "Contact name")}>
                    <Input
                      name="contactName"
                      defaultValue={draft.contactName ?? ""}
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </Field>
                  <Field label={t("Correo electrónico", "Email address")}>
                    <Input
                      name="contactEmail"
                      defaultValue={draft.contactEmail ?? ""}
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={160}
                    />
                  </Field>
                  <Field label={t("Teléfono (opcional)", "Phone (optional)")}>
                    <Input
                      name="contactPhone"
                      defaultValue={draft.contactPhone ?? ""}
                      type="tel"
                      autoComplete="tel"
                      maxLength={40}
                    />
                  </Field>
                </div>
              </fieldset>
            )}
            {error && (
              <p role="alert" className="eco-error">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy
                ? t("Enviando…", "Sending…")
                : guest
                  ? t("Enviar solicitud de presupuesto", "Submit quote request")
                  : t("Publicar solicitud de prueba", "Post demo request")}
              <PiArrowRight />
            </Button>
            <p className="eco-note">
              {t(
                "Solicitud de demostración guardada en el proyecto. Los profesionales y presupuestos son de prueba.",
                "Demo request saved in the project. Professionals and quotes are sample data.",
              )}
            </p>
          </form>
        </Panel>
        <aside className="request-help">
          {guest && (
            <div className="eco-notice">
              <p>
                {t(
                  "Puedes continuar como invitado. Si prefieres usar tu espacio, inicia sesión cuando quieras.",
                  "You can continue as a guest. Sign in at any time to use your workspace.",
                )}
              </p>
              <a className="underline" href={accountHref("/login")}>
                {t("Iniciar sesión", "Sign in")}
              </a>
            </div>
          )}
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
                guest
                  ? "Deja tus datos para que el contratista pueda responderte."
                  : "Recibe propuestas en tu espacio.",
                guest
                  ? "Leave your contact details so the contractor can respond."
                  : "Receive proposals in your workspace.",
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
              guest
                ? "Puedes completar y enviar tu solicitud sin crear una cuenta."
                : "Sigue las respuestas y los avances de tu proyecto desde el dashboard del consumidor.",
              guest
                ? "You can complete and submit your request without creating an account."
                : "Follow responses and project progress from your consumer dashboard.",
            )}
          </p>
        </aside>
      </div>
    </>
  );
}
