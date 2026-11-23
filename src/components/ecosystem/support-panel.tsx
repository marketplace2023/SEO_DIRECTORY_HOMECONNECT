import { currentSupportTopic, supportTopics } from "@/data/support-topics";
import { PiArrowLeft, PiPaperPlaneTilt } from "react-icons/pi";
import "./messages.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./primitives";
import { useSectionFilter } from "./section-filter";

const states = {
  choosing: "Selecciona un motivo",
  suggested: "Esperando tu confirmación",
  open: "En espera de un agente",
  reviewing: "En revisión",
  resolved: "Resuelta",
};
const authors = {
  automatic: "Respuesta automática de HOME CONNECT",
  customer: "Solicitante",
  agent: "Agente de soporte",
};
type Entry = { author: keyof typeof authors; text: string; at: string };
type Ticket = {
  id: string;
  number: string | null;
  subject: string;
  message: string;
  status: keyof typeof states;
  topicId?: string;
  lastQuestion?: string;
  createdAt: string;
  updatedAt?: string;
  response?: string;
  history?: Entry[];
};
function entries(ticket: Ticket): Entry[] {
  return (
    ticket.history ??
    (ticket.response
      ? [
          {
            author: "agent",
            text: ticket.response,
            at: ticket.updatedAt || ticket.createdAt,
          },
        ]
      : [])
  );
}

export function SupportPanel({ admin = false }: { admin?: boolean }) {
  const [tickets, setTickets] = useState<Ticket[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  async function load() {
    const current = ++generation.current;
    try {
      const data = await apiRequest<{ tickets: Ticket[] }>("/api/support");
      if (current === generation.current) setTickets(data.tickets);
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 10000);
    return () => {
      generation.current++;
      clearInterval(timer);
    };
  }, []);
  const filter = useSectionFilter(
    tickets,
    (t) => [
      t.number,
      t.subject,
      t.message,
      ...entries(t).map((e) => e.text),
      states[t.status],
    ],
    "Número de ticket, asunto o respuesta",
    "es",
    { label: "Estado del ticket", value: (t) => states[t.status] },
  );
  const [selected, setSelected] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const history = useRef<HTMLDivElement>(null);
  const active = tickets.find((ticket) => ticket.id === selected);
  const replies = active ? entries(active) : [];
  const topic = active && currentSupportTopic(active);
  useEffect(() => {
    if (history.current)
      history.current.scrollTop = history.current.scrollHeight;
  }, [selected, replies.length, mobileOpen]);
  async function act(
    path: string,
    body: Record<string, unknown>,
    form?: HTMLFormElement,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest(path, body);
      if (result.id) setSelected(result.id);
      form?.reset();
      await load();
      if (admin) setMessage("Respuesta guardada.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>, ticket: Ticket) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    void act(
      "/api/support/update",
      {
        id: ticket.id,
        response: data.get("response"),
        status: data.get("status"),
      },
      form,
    );
  }
  function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const text = String(new FormData(form).get("text") || "").trim();
    if (!text) return;
    if (active)
      void act(
        "/api/support/feedback",
        { id: active.id, choice: "message", detail: text },
        form,
      );
    else
      void act(
        "/api/support",
        { subject: text.slice(0, 150), message: text },
        form,
      );
  }
  const feedback = (choice: string, topic?: string, question?: string) =>
    active &&
    act("/api/support/feedback", { id: active.id, choice, topic, question });
  return (
    <section
      aria-label="Ayuda y soporte"
      className="chat-shell"
      data-open={mobileOpen}
    >
      <aside className="chat-sidebar">
        <header>
          <h2>{admin ? "Bandeja de soporte" : "Ayuda y soporte"}</h2>
          {admin ? (
            filter.controls
          ) : (
            <>
              <Button
                disabled={busy}
                onClick={() => {
                  setSelected("");
                  setMobileOpen(true);
                  setError("");
                }}
              >
                Nueva consulta
              </Button>
              <label className="chat-search mt-2">
                <input
                  type="search"
                  aria-label="Buscar ticket"
                  placeholder="Buscar por ticket o consulta"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </>
          )}
        </header>
        <div className="chat-contacts">
          {(admin ? filter.visible : tickets)
            .filter((ticket) =>
              [ticket.number, ticket.subject]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query.trim().toLowerCase()),
            )
            .map((ticket) => (
              <button
                type="button"
                key={ticket.id}
                disabled={busy}
                aria-current={ticket.id === selected ? "true" : undefined}
                onClick={() => {
                  setSelected(ticket.id);
                  setMobileOpen(true);
                  setError("");
                }}
              >
                <span>
                  <strong>
                    {[ticket.number, ticket.subject]
                      .filter(Boolean)
                      .join(" · ")}
                  </strong>
                  <small>{states[ticket.status]}</small>
                </span>
              </button>
            ))}
        </div>
      </aside>
      <div className="chat-pane">
        <header className="chat-heading">
          <button
            className="chat-back"
            aria-label="Volver a tickets"
            onClick={() => setMobileOpen(false)}
          >
            <PiArrowLeft />
          </button>
          <div>
            <h3>Soporte HOME CONNECT</h3>
            <small>
              {active
                ? [active.number, states[active.status]]
                    .filter(Boolean)
                    .join(" · ")
                : admin
                  ? "Bandeja de agentes"
                  : "Nueva consulta"}
            </small>
          </div>
        </header>
        <div
          role="log"
          aria-label="Conversación de soporte"
          className="chat-history"
          ref={history}
        >
          {!active ? (
            <p className="chat-empty">
              {admin
                ? "Selecciona un ticket para ver su historial."
                : "Escribe tu consulta para iniciar la conversación."}
            </p>
          ) : (
            <>
              {[
                {
                  author: "customer" as const,
                  text: active.message,
                  at: active.createdAt,
                },
                ...replies,
              ].map((entry, index) => (
                <article
                  key={index}
                  className="message-bubble"
                  data-outgoing={
                    entry.author === (admin ? "agent" : "customer")
                  }
                >
                  <strong className="text-xs">
                    {entry.author === (admin ? "agent" : "customer")
                      ? "Tú"
                      : authors[entry.author]}
                  </strong>
                  <p>{entry.text}</p>
                  <time dateTime={entry.at}>
                    {new Date(entry.at).toLocaleString("es")}
                  </time>
                </article>
              ))}
              {!admin && active.status === "choosing" && (
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Motivos de consulta"
                >
                  {supportTopics.map((topic) => (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      key={topic.id}
                      onClick={() => feedback("topic", topic.id)}
                    >
                      {topic.label}
                    </Button>
                  ))}
                </div>
              )}
              {!admin && active.status === "suggested" && (
                <div className="grid gap-3">
                  {topic && (
                    <div
                      role="group"
                      aria-label={topic.label}
                      className="grid justify-items-start gap-2"
                    >
                      <strong className="text-sm">
                        {active.lastQuestion ? "Más preguntas" : "Preguntas"}{" "}
                        sobre {topic.label.toLocaleLowerCase("es")}
                      </strong>
                      {topic.questions
                        .filter((item) => item.id !== active.lastQuestion)
                        .map((item) => (
                          <Button
                            key={item.id}
                            variant="outline"
                            size="sm"
                            className="h-auto whitespace-normal text-left"
                            disabled={busy}
                            onClick={() =>
                              feedback("question", topic.id, item.id)
                            }
                          >
                            {item.label}
                          </Button>
                        ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => feedback("menu")}
                    >
                      Consultar otro tema
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() => feedback("resolved")}
                    >
                      Mi consulta está resuelta
                    </Button>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => feedback("agent")}
                    >
                      Hablar con un agente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {admin && active && ["open", "reviewing"].includes(active.status) && (
          <form
            key={active.id}
            className="eco-form p-3"
            onSubmit={(e) => void submit(e, active)}
          >
            <Field label="Estado">
              <select name="status" defaultValue={active.status}>
                <option value="open">En espera de un agente</option>
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
            <Button disabled={busy}>Guardar respuesta</Button>
          </form>
        )}

        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
        {!admin &&
          (!active ||
            active.status === "open" ||
            active.status === "reviewing") && (
            <form
              key={selected}
              className="chat-compose"
              onSubmit={sendMessage}
            >
              <Input
                name="text"
                aria-label="Mensaje de soporte"
                placeholder={
                  active ? "Escribe al agente…" : "Escribe tu consulta…"
                }
                required
                maxLength={active ? 2000 : 3000}
              />
              <Button disabled={busy} type="submit" aria-label="Enviar">
                <PiPaperPlaneTilt />
              </Button>
            </form>
          )}
      </div>
    </section>
  );
}
