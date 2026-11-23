import { useSectionFilter } from "@/components/ecosystem/section-filter";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Panel, Field, copy } from "./primitives";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/http";
import { useAuth } from "@/auth/auth-provider";
import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { ContactAccountDialog } from "./contact-account-dialog";
export function ProjectFeedback({ projectId }: { projectId: string }) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function act(path: string, body: any) {
    setError("");
    try {
      await apiRequest(path, body);
      setMessage(
        path.includes("confirm")
          ? "Entrega confirmada por el cliente. Ya puedes reseñar."
          : "Reseña enviada a moderación.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Panel title="Entrega y reseña">
      <p>
        Confirma que recibiste el trabajo antes de publicar una reseña. No se
        efectúa ningún cobro.
      </p>
      <Button
        variant="outline"
        onClick={() => void act("/api/projects/confirm", { projectId })}
      >
        Confirmar entrega del proyecto
      </Button>
      <form
        className="eco-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void act("/api/reviews", {
            projectId,
            rating: Number(data.get("rating")),
            text: data.get("text"),
          });
        }}
      >
        <Field label="Calificación">
          <select name="rating">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tu experiencia">
          <Textarea name="text" required minLength={20} maxLength={2000} />
        </Field>
        <Button>Enviar reseña a moderación</Button>
      </form>
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="eco-error">
          {error}
        </p>
      )}
    </Panel>
  );
}
export function PublicReviews({
  professionalId,
  language = "es",
  resumeReview = false,
}: {
  professionalId: string;
  language?: Language;
  resumeReview?: boolean;
}) {
  const { user, checking } = useAuth();
  const { state } = useStore();
  const t = copy(language);
  const [reviewIntent, setReviewIntent] = useState(false);
  const [accountPrompt, setAccountPrompt] = useState(false);
  const reviewSection = useRef<HTMLElement>(null);
  const completed =
    user?.role === "owner"
      ? state.projects.filter(
          (project) =>
            project.professionalId === professionalId &&
            project.status === "completed" &&
            state.requests.some(
              (request) =>
                request.id === project.requestId && request.ownerId === user.id,
            ),
        )
      : [];
  useEffect(() => {
    if (resumeReview) reviewSection.current?.scrollIntoView({ block: "start" });
  }, [resumeReview]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiRequest(
      "/api/reviews?professional=" + encodeURIComponent(professionalId),
    )
      .then((result) => {
        if (active) setReviews(result.reviews);
      })
      .catch(() => {
        if (active) setError("No se pudieron consultar las reseñas.");
      });
    return () => {
      active = false;
    };
  }, [professionalId]);
  return (
    <section
      ref={reviewSection}
      className="scroll-mt-48"
      aria-label={t("Reseñas de clientes", "Customer reviews")}
    >
      <Panel
        title={t("Reseñas de clientes", "Customer reviews")}
        action={
          (!user || user.role === "owner") && (
            <Button
              variant="outline"
              size="sm"
              disabled={checking}
              onClick={() =>
                user ? setReviewIntent(true) : setAccountPrompt(true)
              }
            >
              {t("Dejar una reseña", "Leave a review")}
            </Button>
          )
        }
      >
        {accountPrompt && !user && (
          <ContactAccountDialog
            review
            language={language}
            next={`/professionals/${professionalId}?review=1`}
            onDismiss={() => setAccountPrompt(false)}
          />
        )}
        {user?.role === "owner" && (reviewIntent || resumeReview) && (
          <div className="eco-notice">
            {completed.length ? (
              <>
                <p>
                  {t(
                    "Elige un proyecto completado para confirmar la entrega y dejar tu reseña.",
                    "Choose a completed project to confirm delivery and leave your review.",
                  )}
                </p>
                <ul>
                  {completed.map((project) => (
                    <li key={project.id}>
                      <a
                        className="text-link"
                        href={`#/workspace/owner/projects/${project.id}`}
                      >
                        {project.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p role="status">
                {t(
                  "Para dejar una reseña, debes tener un proyecto completado con este contratista.",
                  "You need a completed project with this contractor to leave a review.",
                )}
              </p>
            )}
          </div>
        )}
        {reviews.length ? (
          reviews.map((review) => (
            <article className="eco-record" key={review.id}>
              <div>
                <strong>{review.rating}/5 · Interacción documentada</strong>
                <p>{review.text}</p>
                {review.reply && (
                  <p>
                    <strong>Respuesta del negocio: </strong>
                    {review.reply}
                  </p>
                )}
                {user?.role === "contractor" &&
                  user.professionalId === professionalId && (
                    <form
                      className="eco-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const reply = String(
                          new FormData(event.currentTarget).get("reply"),
                        );
                        void apiRequest("/api/reviews/reply", {
                          id: review.id,
                          reply,
                        })
                          .then(() =>
                            setReviews((current) =>
                              current.map((row) =>
                                row.id === review.id ? { ...row, reply } : row,
                              ),
                            ),
                          )
                          .catch((e) => setError(e.message));
                      }}
                    >
                      <Field label="Respuesta del negocio">
                        <Textarea
                          name="reply"
                          defaultValue={review.reply}
                          required
                          minLength={5}
                          maxLength={1500}
                        />
                      </Field>
                      <Button>Guardar respuesta</Button>
                    </form>
                  )}
              </div>
            </article>
          ))
        ) : !error ? (
          <p>
            Todavía no hay reseñas reales publicadas en HOME CONNECT para este
            profesional.
          </p>
        ) : null}
        {error && <p role="alert">{error}</p>}
      </Panel>
    </section>
  );
}
export function SupportPanel({ admin = false }: { admin?: boolean }) {
  const [tickets, setTickets] = useState<any[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function load() {
    try {
      setTickets((await apiRequest("/api/support")).tickets);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const ticketStates: Record<string, string> = {
    open: "Abierta",
    reviewing: "En revisión",
    resolved: "Resuelta",
  };
  const filter = useSectionFilter(
    tickets,
    (t) => [t.id, t.subject, t.message, t.response, ticketStates[t.status]],
    "Asunto, mensaje o respuesta",
    "es",
    {
      label: "Estado de incidencia",
      value: (t) => ticketStates[t.status] || t.status,
    },
  );
  async function submit(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await apiRequest(
        id ? "/api/support/update" : "/api/support",
        id
          ? { id, status: data.get("status"), response: data.get("response") }
          : { subject: data.get("subject"), message: data.get("message") },
      );
      setMessage("Incidencia guardada.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Panel title={admin ? "Soporte e incidencias" : "Ayuda y soporte"}>
      {!admin && (
        <form className="eco-form" onSubmit={(event) => void submit(event)}>
          <Field label="Asunto">
            <Input name="subject" minLength={5} maxLength={150} required />
          </Field>
          <Field label="Describe la incidencia">
            <Textarea name="message" minLength={20} maxLength={3000} required />
          </Field>
          <Button>Crear incidencia</Button>
        </form>
      )}
      {admin && filter.controls}
      {(admin ? filter.visible : tickets).map((ticket) => (
        <article className="eco-panel" key={ticket.id}>
          <h3>{ticket.subject}</h3>
          <p>{ticket.message}</p>
          <span className="eco-badge">{ticket.status}</span>
          {ticket.response && <p>Respuesta: {ticket.response}</p>}
          {admin && (
            <form
              className="eco-form"
              onSubmit={(event) => void submit(event, ticket.id)}
            >
              <Field label="Estado">
                <select name="status" defaultValue={ticket.status}>
                  <option value="open">Abierta</option>
                  <option value="reviewing">En revisión</option>
                  <option value="resolved">Resuelta</option>
                </select>
              </Field>
              <Field label="Respuesta de soporte">
                <Textarea
                  name="response"
                  minLength={5}
                  maxLength={2000}
                  required
                />
              </Field>
              <Button>Actualizar incidencia</Button>
            </form>
          )}
        </article>
      ))}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </Panel>
  );
}
export function ReviewModeration() {
  const { state } = useStore();
  const [reviews, setReviews] = useState<any[]>([]),
    [error, setError] = useState("");
  const names = new Map(state.professionals.map((p) => [p.id, p.name]));
  const statuses: Record<string, string> = {
    pending: "Pendiente",
    published: "Publicada",
    rejected: "Rechazada",
  };
  const filter = useSectionFilter(
    reviews,
    (r) => [
      r.text,
      r.rating,
      r.professionalId,
      names.get(r.professionalId),
      statuses[r.status],
    ],
    "Profesional, comentario o puntuación",
    "es",
    { label: "Estado de reseña", value: (r) => statuses[r.status] || r.status },
  );
  async function load() {
    try {
      setReviews((await apiRequest("/api/reviews?moderation=1")).reviews);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <Panel title="Moderación de reseñas">
      {filter.controls}
      {filter.visible.map((review) => (
        <article key={review.id} className="eco-panel">
          <strong>
            {review.rating}/5 ·{" "}
            {names.get(review.professionalId) || review.professionalId} ·{" "}
            {statuses[review.status] || review.status}
          </strong>
          <p>{review.text}</p>
          <form
            className="eco-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void apiRequest("/api/reviews/moderate", {
                id: review.id,
                status: data.get("status"),
                note: data.get("note"),
              })
                .then(load)
                .catch((e) => setError(e.message));
            }}
          >
            <Field label="Decisión">
              <select
                name="status"
                defaultValue={
                  review.status === "rejected" ? "rejected" : "published"
                }
              >
                <option value="published">Publicar</option>
                <option value="rejected">Rechazar</option>
              </select>
            </Field>
            <Field label="Motivo de moderación">
              <Input name="note" required minLength={5} maxLength={1000} />
            </Field>
            <Button>Guardar decisión</Button>
          </form>
        </article>
      ))}
      {!reviews.length && <p>No hay reseñas para moderar.</p>}
      {error && <p role="alert">{error}</p>}
    </Panel>
  );
}
