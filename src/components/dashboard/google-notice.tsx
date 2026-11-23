import { useEffect, useState } from "react";
import { PiBell } from "react-icons/pi";
import { apiRequest } from "@/lib/http";
import type { Language } from "@/domain/types";

const messages = {
  authorization: [
    "Google ha rechazado el acceso a tu ficha. Revisa los permisos o vuelve a autorizar HOME CONNECT.",
    "Google denied access to your profile. Check your permissions or reconnect HOME CONNECT.",
  ],
  location: [
    "Google ya no encuentra la ficha vinculada. Sincroniza tus fichas y selecciona la correcta.",
    "Google can no longer find your linked profile. Sync your profiles and select the correct one.",
  ],
  maps: [
    "El enlace público de tu ficha en Google Maps no está disponible. Revisa tu ficha en Google y vuelve a comprobar el enlace.",
    "Your public Google Maps link is unavailable. Review your profile on Google and check the link again.",
  ],
};
export type GoogleIssue = keyof typeof messages;
export function googleIssueMessage(issue: GoogleIssue, language: Language) {
  return messages[issue][language === "es" ? 0 : 1];
}
export function GoogleNotice({ language }: { language: Language }) {
  const [issue, setIssue] = useState<GoogleIssue | null>(null);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const result = await apiRequest<{ issue: GoogleIssue | null }>(
          "/api/google/notice",
        );
        if (active) setIssue(result.issue);
      } catch {
        /* Keep the last known notice until the service responds. */
      }
    }
    void refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener("google-profile-updated", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("google-profile-updated", refresh);
    };
  }, []);
  if (!issue) return null;
  return (
    <details className="relative">
      <summary
        className="flex cursor-pointer items-center gap-1"
        aria-label={
          language === "es" ? "Notificaciones: 1" : "Notifications: 1"
        }
      >
        <PiBell size={21} />
        <span>1</span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border bg-white p-4 shadow-lg">
        <strong>Google Business Profile</strong>
        <p className="my-2 text-sm">{googleIssueMessage(issue, language)}</p>
        <a
          href="#/workspace/contractor/google"
          onClick={(e) =>
            e.currentTarget.closest("details")?.removeAttribute("open")
          }
        >
          {language === "es" ? "Revisar conexión" : "Review connection"}
        </a>
      </div>
    </details>
  );
}
