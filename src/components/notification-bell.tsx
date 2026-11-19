import { useEffect, useRef, useState } from "react";
import { PiBell, PiChatCircleDots, PiClipboardText } from "react-icons/pi";
import { useAuth } from "@/auth/auth-provider";
import { useStore } from "@/domain/store";
import { consumerNotifications } from "@/domain/notifications";
import type { Language } from "@/domain/types";

export function NotificationBell({
  language,
  onOpen,
}: {
  language: Language;
  onOpen: () => void;
}) {
  const es = language === "es";
  const { user, checking } = useAuth();
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = es ? "Notificaciones" : "Notifications";
  const items = user ? consumerNotifications(state, user.id) : [];
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  return (
    <div
      className="header-notifications"
      ref={wrapper}
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        type="button"
        ref={trigger}
        className="header-icon-action"
        title={title}
        aria-label={title + (items.length ? ` (${items.length})` : "")}
        aria-expanded={open}
        aria-controls="header-notifications-panel"
        onClick={() => {
          if (!open) onOpen();
          setOpen(!open);
        }}
      >
        <PiBell aria-hidden="true" />
        {items.length > 0 && (
          <span className="header-action-count" aria-hidden="true">
            {items.length > 99 ? "99+" : items.length}
          </span>
        )}
      </button>
      <section
        hidden={!open}
        className="header-notifications-panel"
        id="header-notifications-panel"
        aria-labelledby="header-notifications-title"
      >
        <div className="notification-panel-heading">
          <h2 id="header-notifications-title">{title}</h2>
          {items.length > 0 && (
            <a href="#/notifications" onClick={() => setOpen(false)}>
              {es ? "Ver todas" : "See all"}
            </a>
          )}
        </div>
        {open &&
          (checking ? (
            <p className="notification-panel-empty" role="status">
              {es ? "Cargando…" : "Loading…"}
            </p>
          ) : !user ? (
            <div className="notification-panel-empty">
              <p>
                {es
                  ? "Inicia sesión para ver tus mensajes y propuestas."
                  : "Sign in to see your messages and quotes."}
              </p>
              <a
                href="#/login?next=%2Fnotifications"
                onClick={() => setOpen(false)}
              >
                {es ? "Iniciar sesión" : "Sign in"}
              </a>
            </div>
          ) : items.length ? (
            <ul className="notification-panel-list">
              {items.slice(0, 12).map((item) => {
                const person = state.professionals.find(
                  (row) => row.id === item.professionalId,
                );
                const message = item.kind === "message";
                const Icon = message ? PiChatCircleDots : PiClipboardText;
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <a
                      href={item.href}
                      className="notification-panel-entry"
                      onClick={() => setOpen(false)}
                    >
                      <span className="notification-panel-avatar">
                        {person?.img && <img src={person.img} alt="" />}
                        <span className="notification-panel-type">
                          <Icon aria-hidden="true" />
                        </span>
                      </span>
                      <span className="notification-panel-copy">
                        <strong>
                          {person?.name ?? (es ? "Contratista" : "Contractor")}
                        </strong>
                        <span>
                          {message
                            ? es
                              ? "Mensaje"
                              : "Message"
                            : es
                              ? "Propuesta"
                              : "Quote"}{" "}
                          · {item.text}
                        </span>
                        <time dateTime={item.at}>
                          {new Date(item.at).toLocaleString(language, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="notification-panel-empty">
              {es
                ? "Aún no tienes notificaciones."
                : "You don’t have any notifications yet."}
            </p>
          ))}
      </section>
    </div>
  );
}
