import { PiArrowUpRight } from "react-icons/pi";
import { useStore, allowedRequests } from "@/domain/store";
import { Stat, copy } from "@/components/ecosystem/primitives";
import { RequestList, Projects } from "@/components/ecosystem/workflows";
import { Button } from "@/components/ui/button";
import { navigate } from "@/lib/navigation";
import type { Language } from "@/domain/types";
export function OverviewPage({ language }: { language: Language }) {
  const { state, professionalId } = useStore(),
    t = copy(language);
  const person = state.professionals.find((p) => p.id === professionalId);
  if (!person) return <p role="status">Cargando tu ficha profesional…</p>;
  return (
    <>
      <div className="eco-stats-grid">
        <Stat
          label={t("Oportunidades", "Opportunities")}
          value={allowedRequests(state, professionalId).length}
        />
        <Stat
          label={t("Propuestas enviadas", "Sent proposals")}
          value={
            state.proposals.filter((p) => p.professionalId === professionalId)
              .length
          }
        />
        <Stat
          label={t("Proyectos asignados", "Assigned projects")}
          value={
            state.projects.filter((p) => p.professionalId === professionalId)
              .length
          }
        />
        <Stat
          label={t("Credenciales en revisión", "Credentials in review")}
          value={
            person.credentials.filter((c) => c.status === "pending").length
          }
        />
      </div>
      <div className="workspace-welcome">
        <div>
          <p className="eyebrow">
            {t("TU ACTIVIDAD PROFESIONAL", "YOUR PROFESSIONAL ACTIVITY")}
          </p>
          <h2>
            {person.publication === "draft"
              ? t(
                  "Tu ficha está en preparación.",
                  "Your profile is being prepared.",
                )
              : t(
                  "Tu experiencia tiene un lugar aquí.",
                  "Your experience belongs here.",
                )}
          </h2>
          <p>
            {person.publication === "draft"
              ? t(
                  "Completa tu presentación y envía tus credenciales. Administración revisará tu ficha antes de publicarla en el directorio.",
                  "Complete your introduction and submit credentials. Administration will review your profile before publishing it.",
                )
              : t(
                  "Responde solicitudes de tu especialidad y mantén al día el avance de tus proyectos.",
                  "Respond to matching requests and keep your project progress updated.",
                )}
          </p>
        </div>
        <Button
          onClick={() =>
            navigate(
              `/workspace/contractor/${person.publication === "draft" ? "profile" : "requests"}`,
            )
          }
        >
          {person.publication === "draft"
            ? t("Completar mi ficha", "Complete my profile")
            : t("Ver oportunidades", "View opportunities")}
          <PiArrowUpRight />
        </Button>
      </div>
      <Projects language={language} contractor />
      <RequestList language={language} contractor />
    </>
  );
}
