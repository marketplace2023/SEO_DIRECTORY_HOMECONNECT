import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  PiArrowLeft,
  PiMagnifyingGlass,
  PiPaperPlaneTilt,
} from "react-icons/pi";
import { useStore } from "@/domain/store";
import { isGuestOwner } from "@/domain/guest-quotes";
import { normalize, type Language, type Message } from "@/domain/types";
import { navigate, type Route } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapSurface } from "./map-surface";
import { copy } from "./primitives";
import "./messages.css";

function Avatar({ name, image }: { name: string; image?: string }) {
  return image ? (
    <img className="chat-avatar" src={image} alt="" />
  ) : (
    <span className="chat-avatar" aria-hidden="true">
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")}
    </span>
  );
}

export function Messages({
  language,
  route,
}: {
  language: Language;
  route: Route;
}) {
  const { state, role, professionalId, send } = useStore();
  const t = copy(language);
  const contractor = role === "contractor";
  const param = contractor ? "owner" : "professional";
  const requested = route.params.get(param);
  const path = "/workspace/" + role + "/messages";
  const [search, setSearch] = useState("");
  const history = useRef<HTMLDivElement>(null);
  const threads = new Map<string, Message[]>();
  for (const m of state.messages) {
    if (contractor && m.professionalId !== professionalId) continue;
    const id = contractor ? m.ownerId || "demo-owner" : m.professionalId;
    const thread = threads.get(id);
    if (thread) thread.push(m);
    else threads.set(id, [m]);
  }
  const contacts: { id: string; name: string; image?: string }[] = contractor
    ? []
    : state.professionals.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.img,
      }));
  if (contractor) {
    const related = state.requests.filter(
      (r) =>
        r.professionalId === professionalId ||
        state.proposals.some(
          (p) => p.requestId === r.id && p.professionalId === professionalId,
        ),
    );
    const ids = new Set([
      ...threads.keys(),
      ...related.filter((r) => isGuestOwner(r.ownerId)).map((r) => r.ownerId),
    ]);
    if (requested && state.requests.some((r) => r.ownerId === requested))
      ids.add(requested);
    for (const id of ids) {
      const request = related.find((r) => r.ownerId === id);
      const name =
        threads.get(id)?.find((m) => m.ownerName)?.ownerName ||
        request?.guestContact?.name ||
        (id === "demo-owner"
          ? "Carolina Mendoza"
          : t("Cliente", "Customer") + " " + id.slice(0, 6));
      contacts.push({ id, name });
    }
  }
  const latest = (id: string) => threads.get(id)?.at(-1);
  contacts.sort((a, b) =>
    (latest(b.id)?.createdAt || "").localeCompare(
      latest(a.id)?.createdAt || "",
    ),
  );
  const active = contacts.find((c) => c.id === requested) || contacts[0];
  const messages = active ? threads.get(active.id) || [] : [];
  const last = messages.at(-1);
  useEffect(() => {
    if (history.current)
      history.current.scrollTop = history.current.scrollHeight;
  }, [active?.id, last?.id, requested]);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = String(
      new FormData(e.currentTarget).get("message") || "",
    ).trim();
    if (!text || !active || (contractor && isGuestOwner(active.id))) return;
    send({
      type: "message",
      professionalId: contractor ? professionalId : active.id,
      ownerId: contractor ? active.id : undefined,
      text,
    });
    e.currentTarget.reset();
  };
  const shown = contacts.filter((c) =>
    normalize(c.name).includes(normalize(search)),
  );
  const time = (at: string) =>
    new Date(at).toLocaleTimeString(language, {
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <section
      className="chat-shell"
      data-open={Boolean(requested && active?.id === requested)}
      aria-label={t("Mensajería", "Messaging")}
    >
      <aside className="chat-sidebar" aria-label={t("Contactos", "Contacts")}>
        <header>
          <h2>{t("Conversaciones", "Conversations")}</h2>
          <label className="chat-search">
            <PiMagnifyingGlass aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Buscar contacto", "Search contacts")}
              aria-label={t("Buscar contacto", "Search contacts")}
            />
          </label>
        </header>
        <div className="chat-contacts">
          {shown.map((c) => (
            <button
              type="button"
              key={c.id}
              aria-current={c.id === active?.id ? "true" : undefined}
              onClick={() =>
                navigate(path, new URLSearchParams({ [param]: c.id }))
              }
            >
              <Avatar name={c.name} image={c.image} />
              <span>
                <strong>{c.name}</strong>
                <small>
                  {latest(c.id)?.text ||
                    t("Iniciar conversación", "Start conversation")}
                </small>
              </span>
            </button>
          ))}
          {!shown.length && (
            <p>
              {search
                ? t("Sin coincidencias", "No matches")
                : t("Aún no hay conversaciones.", "No conversations yet.")}
            </p>
          )}
        </div>
      </aside>
      <div className="chat-pane">
        {active ? (
          <>
            <header className="chat-heading">
              <button
                className="chat-back"
                aria-label={t(
                  "Volver a conversaciones",
                  "Back to conversations",
                )}
                onClick={() => navigate(path)}
              >
                <PiArrowLeft />
              </button>
              <Avatar name={active.name} image={active.image} />
              <h3>{active.name}</h3>
            </header>
            <div
              className="chat-history"
              ref={history}
              role="log"
              aria-label={t("Historial de mensajes", "Message history")}
            >
              {messages.map((m) => (
                <article
                  key={m.id}
                  className="message-bubble"
                  data-outgoing={m.sender === role}
                >
                  <p>{m.text}</p>
                  <time dateTime={m.createdAt}>
                    {new Date(m.createdAt).toLocaleDateString(language)} ·{" "}
                    {time(m.createdAt)}
                  </time>
                </article>
              ))}
              {!messages.length && (
                <p className="chat-empty">
                  {t("Empieza la conversación", "Start the conversation")}
                </p>
              )}
            </div>
            {contractor && isGuestOwner(active.id) ? (
              <p className="chat-empty">
                {t(
                  "Conversación disponible para consulta.",
                  "Read-only conversation.",
                )}
              </p>
            ) : (
              <form key={active.id} className="chat-compose" onSubmit={submit}>
                <Input
                  name="message"
                  aria-label={t("Mensaje", "Message")}
                  placeholder={t("Escribe tu mensaje…", "Write your message…")}
                  required
                  maxLength={2000}
                />
                <Button type="submit" aria-label={t("Enviar", "Send")}>
                  <PiPaperPlaneTilt aria-hidden="true" />
                </Button>
              </form>
            )}
          </>
        ) : (
          <p className="chat-empty">
            {t("Selecciona una conversación", "Select a conversation")}
          </p>
        )}
      </div>
    </section>
  );
}

export function CoveragePanel({ language }: { language: Language }) {
  return <MapSurface language={language} compact />;
}
