import { PiArrowUpRight, PiTrash } from "react-icons/pi";
import { useAuth } from "@/auth/auth-provider";
import { useCart } from "@/domain/cart";
import { useStore } from "@/domain/store";
import { consumerNotifications } from "@/domain/notifications";
import { isPublicWebUrl } from "@/domain/social-links";
import { serviceName } from "@/data/catalog";
import type { Language } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Empty, Panel, PageTitle, copy } from "./primitives";

export function CartPage({ language }: { language: Language }) {
  const { items, remove, storageError } = useCart();
  const { state } = useStore();
  const t = copy(language);
  const ids = [...new Set(items.map((item) => item.professionalId))];
  return (
    <>
      <PageTitle
        eyebrow={t("SERVICIOS SELECCIONADOS", "SELECTED SERVICES")}
        title={t("Tu carrito", "Your cart")}
        description={t(
          "Organiza los servicios por contratista y continúa la compra en su página web.",
          "Organize services by contractor and continue your purchase on their website.",
        )}
      />
      {storageError && (
        <p role="alert" className="eco-error">
          {t(
            "El navegador no pudo guardar el carrito. La selección sigue disponible en esta pestaña.",
            "The browser could not save the cart. Your selection is still available in this tab.",
          )}
        </p>
      )}
      {items.length ? (
        ids.map((id) => {
          const person = state.professionals.find((person) => person.id === id);
          const available = person?.publication === "published";
          const website = available && person.socialLinks?.website;
          const canVisit = website && isPublicWebUrl(website);
          return (
            <Panel
              key={id}
              title={
                person?.name ??
                t("Contratista no disponible", "Contractor unavailable")
              }
            >
              <ul className="cart-services">
                {items
                  .filter((item) => item.professionalId === id)
                  .map((item) => {
                    const valid =
                      available && person.serviceIds.includes(item.serviceId);
                    return (
                      <li key={item.serviceId}>
                        <div>
                          <strong>
                            {serviceName(item.serviceId, language)}
                          </strong>
                          {!valid && (
                            <p className="eco-error">
                              {t(
                                "Este servicio ya no está disponible.",
                                "This service is no longer available.",
                              )}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => remove(item)}
                          aria-label={t(
                            `Quitar ${serviceName(item.serviceId, language)} de ${person?.name ?? id}`,
                            `Remove ${serviceName(item.serviceId, language)} from ${person?.name ?? id}`,
                          )}
                        >
                          <PiTrash />
                        </Button>
                      </li>
                    );
                  })}
              </ul>
              {canVisit ? (
                <>
                  <Button asChild>
                    <a href={website} target="_blank" rel="noopener noreferrer">
                      {t(
                        "Abrir web del contratista",
                        "Open contractor website",
                      )}
                      <PiArrowUpRight />
                    </a>
                  </Button>
                  <p className="eco-note">
                    {t(
                      "La selección se conserva aquí. Consulta el carrito y las condiciones de compra en la web del contratista.",
                      "Your selection is kept here. See the cart and purchase terms on the contractor's website.",
                    )}
                  </p>
                </>
              ) : (
                <p className="eco-note">
                  {t(
                    "Este contratista aún no ha añadido su página web. Puedes solicitarle un presupuesto desde su perfil.",
                    "This contractor has not added a website yet. You can request a quote from their profile.",
                  )}
                </p>
              )}
              {available && (
                <a className="text-link" href={`#/professionals/${id}`}>
                  {t("Ver perfil del contratista", "View contractor profile")}
                  <PiArrowUpRight />
                </a>
              )}
            </Panel>
          );
        })
      ) : (
        <Empty title={t("Tu carrito está vacío", "Your cart is empty")}>
          <Button asChild>
            <a href="#/professionals">
              {t("Explorar contratistas", "Explore contractors")}
            </a>
          </Button>
        </Empty>
      )}
    </>
  );
}

export function NotificationsPage({ language }: { language: Language }) {
  const { user } = useAuth();
  const { state } = useStore();
  const t = copy(language);
  const notifications = user ? consumerNotifications(state, user.id) : [];
  return (
    <>
      <PageTitle
        eyebrow={t("ACTIVIDAD DE TU CUENTA", "YOUR ACCOUNT ACTIVITY")}
        title={t("Notificaciones", "Notifications")}
        description={t(
          "Propuestas y mensajes recibidos de los contratistas.",
          "Quotes and messages received from contractors.",
        )}
      />
      {!user ? (
        <Empty
          title={t(
            "Inicia sesión para consultar tus notificaciones",
            "Sign in to view your notifications",
          )}
        >
          <Button asChild>
            <a href="#/login?next=%2Fnotifications">
              {t("Iniciar sesión", "Sign in")}
            </a>
          </Button>
        </Empty>
      ) : notifications.length ? (
        <ul className="notification-list">
          {notifications.map((item) => (
            <li key={item.id}>
              <a href={item.href}>
                <strong>
                  {item.kind === "proposal"
                    ? t("Propuesta recibida", "Quote received")
                    : t("Mensaje recibido", "Message received")}
                </strong>
                <span>
                  {
                    state.professionals.find(
                      (person) => person.id === item.professionalId,
                    )?.name
                  }
                </span>
                <p>{item.text}</p>
                <time dateTime={item.at}>
                  {new Date(item.at).toLocaleString(language)}
                </time>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          title={t(
            "Aún no tienes notificaciones",
            "You have no notifications yet",
          )}
        />
      )}
    </>
  );
}
