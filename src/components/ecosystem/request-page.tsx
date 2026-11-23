import { isUsProfessional } from "@/domain/us-area";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/auth-provider";
import { PiArrowRight, PiArrowUpRight, PiImage } from "react-icons/pi";
import { categories, services } from "@/data/catalog";
import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { navigate, type Route } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, PageTitle, Panel, copy } from "./primitives";
import { Missing } from "./public-pages";
import { readFileData } from "./attachments-panel";
import { apiRequest } from "@/lib/http";

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
      p.publication === "published" &&
      isUsProfessional(p),
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
  const [dragging, setDragging] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState("");
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
  function addPhotos(additions: File[]) {
    if (!additions.length) return;
    if (
      photos.length + additions.length > 2 ||
      additions.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          !file.size ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError(
        t(
          "Selecciona hasta dos imágenes JPEG, PNG o WebP de hasta 5 MB cada una.",
          "Select up to two JPEG, PNG or WebP images, up to 5 MB each.",
        ),
      );
      return;
    }
    setError("");
    setPhotos([...photos, ...additions]);
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
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
    setBusy(true);
    setError("");
    let id = posted;
    try {
      if (!id) {
        let saved: Promise<unknown> | undefined;
        id = send({ type: "request", value }, (promise) => {
          saved = promise;
        });
        if (!id) return;
        await saved;
        setPosted(id);
      }
      for (const photo of photos) {
        await apiRequest("/api/files", {
          targetId: id,
          purpose: "reference",
          name: photo.name.slice(0, 120),
          data: await readFileData(photo),
        });
        setPhotos((items) => items.filter((item) => item !== photo));
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t(
              "No se pudo completar el envío.",
              "Unable to complete submission.",
            ),
      );
      return;
    } finally {
      setBusy(false);
    }
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
            <fieldset className="grid gap-2" disabled={busy || Boolean(posted)}>
              <legend className="mb-2 font-semibold">
                {t(
                  "Imágenes de referencia (opcional)",
                  "Reference images (optional)",
                )}
              </legend>
              <label
                className="request-photo-drop"
                data-dragging={dragging}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!busy && !posted) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  if (!busy && !posted)
                    addPhotos(Array.from(event.dataTransfer.files));
                }}
              >
                <PiImage aria-hidden="true" size={30} />
                <strong>
                  {t(
                    "Arrastra y suelta tus imágenes aquí",
                    "Drag and drop your images here",
                  )}
                </strong>
                <span>
                  {t(
                    "o selecciona archivos de tu dispositivo",
                    "or choose files from your device",
                  )}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  aria-label={t(
                    "Añade hasta dos imágenes del proyecto",
                    "Add up to two project images",
                  )}
                  onChange={(event) => {
                    addPhotos(Array.from(event.currentTarget.files || []));
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <small>
                {t(
                  "JPEG, PNG o WebP · 5 MB por imagen. Los contratistas que reciban la solicitud podrán verlas.",
                  "JPEG, PNG or WebP · 5 MB per image. Contractors who receive the request can view them.",
                )}
              </small>
              {photos.map((photo, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="break-all">{photo.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setPhotos(photos.filter((_, index) => index !== i))
                    }
                  >
                    {t("Quitar", "Remove")}
                  </Button>
                </div>
              ))}
            </fieldset>
            {posted && !busy && (
              <p>
                {t(
                  "Solicitud creada. Puedes reintentar la carga o abrir su detalle.",
                  "Request created. Retry the upload or open the request.",
                )}{" "}
                <a
                  className="underline"
                  href={"#/workspace/owner/requests/" + posted}
                >
                  {t("Ver solicitud", "View request")}
                </a>
              </p>
            )}
            {error && (
              <p role="alert" className="eco-error">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy
                ? t("Enviando…", "Sending…")
                : posted
                  ? t("Reintentar carga", "Retry upload")
                  : t("Publicar solicitud de prueba", "Post demo request")}
              <PiArrowRight />
            </Button>
            <p className="eco-note">
              {t(
                recipient
                  ? "Esta solicitud se envía al contratista seleccionado."
                  : "Los contratistas VIP compatibles reciben tu solicitud primero. Cinco minutos después se abre a los demás profesionales compatibles.",
                recipient
                  ? "Your request goes to the selected contractor."
                  : "Matching VIP contractors receive your request first. Other matching contractors can see it after five minutes.",
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
