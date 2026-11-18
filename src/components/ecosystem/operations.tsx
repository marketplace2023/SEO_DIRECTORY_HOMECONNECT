import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import type { FormEvent } from "react";
import { PiUserCircle, PiPaperPlaneTilt } from "react-icons/pi";
import { MapSurface } from "./map-surface";
import { navigate, type Route } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Panel, Empty, copy } from "./primitives";

export function Messages({
  language,
  route,
}: {
  language: Language;
  route: Route;
}) {
  const { state, role, professionalId, send } = useStore();
  const t = copy(language);
  const selected =
    role === "contractor"
      ? professionalId
      : state.professionals.find(
          (p) => p.id === route.params.get("professional"),
        )?.id || state.professionals[0]?.id;
  const professional = state.professionals.find((p) => p.id === selected);
  const owners = [
    ...new Set(
      state.messages
        .filter((m) => m.professionalId === selected)
        .map((m) => m.ownerId || "demo-owner"),
    ),
  ];
  const ownerId = route.params.get("owner") || owners[0] || "demo-owner";
  const messages = state.messages.filter(
    (m) =>
      m.professionalId === selected &&
      (role !== "contractor" || (m.ownerId || "demo-owner") === ownerId),
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = String(data.get("message")).trim();
    if (!text || !selected) return;
    send({ type: "message", professionalId: selected, text, ownerId });
    event.currentTarget.reset();
  };
  return (
    <Panel title={t("Conversaciones", "Conversations")}>
      <p className="eco-note">
        {t(
          "Mensajes locales entre los roles de demostración. No se envían comunicaciones externas.",
          "Local messages between demo roles. No external communications are sent.",
        )}
      </p>
      {role === "contractor" && owners.length > 1 && (
        <Field label={t("Conversación con cliente", "Client conversation")}>
          <select
            value={ownerId}
            onChange={(event) =>
              navigate(
                "/workspace/contractor/messages",
                new URLSearchParams({ owner: event.target.value }),
              )
            }
          >
            {owners.map((id) => (
              <option key={id} value={id}>
                {id === "demo-owner"
                  ? "Carolina Mendoza"
                  : `Cliente ${id.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </Field>
      )}
      {role === "owner" && (
        <Field label={t("Conversar con", "Talk to")}>
          <select
            value={selected}
            onChange={(e) =>
              navigate(
                "/workspace/owner/messages",
                new URLSearchParams({ professional: e.target.value }),
              )
            }
          >
            {state.professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="conversation-title">
        <PiUserCircle />
        <strong>
          {role === "contractor"
            ? t("Propietario de demostración", "Demo homeowner")
            : professional?.name}
        </strong>
      </div>
      <div className="message-history" aria-live="polite">
        {messages.length ? (
          messages.map((m) => (
            <article
              key={m.id}
              className={`message-bubble ${m.sender === role ? "outgoing" : ""}`}
            >
              <span>
                {m.sender === "owner"
                  ? t("Propietario", "Homeowner")
                  : professional?.name}
              </span>
              <p>{m.text}</p>
              <time dateTime={m.createdAt}>
                {new Date(m.createdAt).toLocaleTimeString(language, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </article>
          ))
        ) : (
          <Empty
            title={t("Empieza la conversación", "Start the conversation")}
            description={t(
              "Pregunta por el alcance, los materiales o la disponibilidad.",
              "Ask about scope, materials or availability.",
            )}
          />
        )}
      </div>
      <form className="message-compose" onSubmit={submit}>
        <Input
          name="message"
          aria-label={t("Mensaje", "Message")}
          required
          maxLength={2000}
          placeholder={t("Escribe tu mensaje…", "Write your message…")}
        />
        <Button type="submit">
          {t("Enviar", "Send")}
          <PiPaperPlaneTilt />
        </Button>
      </form>
    </Panel>
  );
}

export function CoveragePanel({ language }: { language: Language }) {
  return <MapSurface language={language} compact />;
}
