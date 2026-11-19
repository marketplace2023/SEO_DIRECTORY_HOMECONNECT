import { useEffect, useRef } from "react";
import {
  PiArrowUpRight,
  PiArrowRight,
  PiFacebookLogo,
  PiGlobe,
  PiGoogleLogo,
  PiInstagramLogo,
  PiLinkedinLogo,
  PiLinkSimple,
  PiChatCircleDots,
  PiClipboardText,
  PiTiktokLogo,
  PiXLogo,
  PiYoutubeLogo,
  PiX,
} from "react-icons/pi";
import { isPublicWebUrl, socialPlatforms } from "@/domain/social-links";
import type { Language, Professional } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { navigate } from "@/lib/navigation";
import { copy } from "./primitives";
import "@/styles/contact-account.css";

export const socialIcons = {
  website: PiGlobe,
  googleBusiness: PiGoogleLogo,
  instagram: PiInstagramLogo,
  facebook: PiFacebookLogo,
  linkedin: PiLinkedinLogo,
  youtube: PiYoutubeLogo,
  tiktok: PiTiktokLogo,
  x: PiXLogo,
  other: PiLinkSimple,
};

export function ContactAccountDialog({
  next,
  message,
  person,
  language,
}: {
  next: string;
  message: boolean;
  person?: Professional;
  language: Language;
}) {
  const t = copy(language);
  const dialog = useRef<HTMLDialogElement>(null);
  const authParams = new URLSearchParams({ next });
  const links = socialPlatforms.map(([key, es, en]) => {
    const url = person?.socialLinks?.[key];
    return {
      key,
      url: url && isPublicWebUrl(url) ? url : undefined,
      label: t(es, en),
    };
  });
  const hasLinks = links.some(({ url }) => url);
  const ActionIcon = message ? PiChatCircleDots : PiClipboardText;
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="contact-account-title"
      onClose={() =>
        navigate(person ? `/professionals/${person.id}` : "/professionals")
      }
      className="contact-account-dialog"
    >
      <section
        className="contact-account-intro"
        aria-labelledby="contact-register-title"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="contact-account-close"
          aria-label={t("Cerrar", "Close")}
          onClick={() => dialog.current?.close()}
        >
          <PiX aria-hidden="true" />
        </Button>
        <span className="contact-account-symbol">
          <ActionIcon aria-hidden="true" />
        </span>
        <h2 id="contact-register-title" className="contact-account-kicker">
          {t("Continúa en HOME CONNECT", "Continue on HOME CONNECT")}
        </h2>
        <h1 id="contact-account-title">
          {message
            ? t("Escribe al contratista", "Message the contractor")
            : t("Solicita un presupuesto", "Request a quote")}
        </h1>
        {person && <p className="contact-account-person">{person.name}</p>}
        <p className="contact-account-description">
          {message
            ? t(
                "Crea tu cuenta y sigue la conversación desde tu espacio personal.",
                "Create an account and keep the conversation in your personal workspace.",
              )
            : t(
                "Crea tu cuenta para enviar la solicitud, recibir propuestas y dar seguimiento a tu proyecto.",
                "Create an account to submit your request, receive quotes, and track your project.",
              )}
        </p>
        <div className="contact-account-actions">
          <Button className="contact-account-register" asChild size="lg">
            <a
              href={`#/register?${authParams}`}
              onClick={() => {
                try {
                  sessionStorage.setItem("homeconnect.contact-return", next);
                } catch {
                  /* Registration remains available. */
                }
              }}
            >
              {t("Crear cuenta", "Create account")}
              <PiArrowRight aria-hidden="true" />
            </a>
          </Button>
          <Button
            className="contact-account-login"
            asChild
            variant="outline"
            size="lg"
          >
            <a href={`#/login?${authParams}`}>
              {t("Iniciar sesión", "Sign in")}
            </a>
          </Button>
        </div>
      </section>
      <section
        className="contact-account-links"
        aria-labelledby="contact-links-title"
      >
        <h2 id="contact-links-title" className="font-semibold">
          {person
            ? t(`Enlaces de ${person.name}`, `Links for ${person.name}`)
            : t("Enlaces del contratista", "Contractor links")}
        </h2>
        {person ? (
          <>
            <p className="contact-account-links-note">
              {hasLinks
                ? t(
                    "Abre los canales publicados. Los demás iconos son de referencia.",
                    "Open published channels. The other icons are for reference.",
                  )
                : t(
                    "Vista previa de los canales que el contratista puede añadir a su ficha.",
                    "Preview of the channels the contractor can add to their profile.",
                  )}
            </p>
            <ul className="contact-account-channels">
              {links.map(({ key, url, label }) => {
                const Icon = socialIcons[key];
                const content = (
                  <>
                    <span className="contact-account-channel-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <span>{label}</span>
                  </>
                );
                return (
                  <li key={key}>
                    {url ? (
                      <a
                        className="contact-account-channel contact-account-channel-live"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {content}
                        <PiArrowUpRight
                          className="contact-account-external"
                          aria-hidden="true"
                        />
                      </a>
                    ) : (
                      <span className="contact-account-channel contact-account-channel-preview">
                        {content}
                        <small>{t("Por añadir", "Not added yet")}</small>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-neutral-600">
            {t(
              "Selecciona un contratista para ver sus enlaces públicos.",
              "Choose a contractor to see their public links.",
            )}
          </p>
        )}
      </section>
    </dialog>
  );
}
