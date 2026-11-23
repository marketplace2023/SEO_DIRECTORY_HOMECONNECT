import { Button } from "@/components/ui/button";
import { copy } from "@/components/ecosystem/primitives";
import { PiCrown, PiHardHat } from "react-icons/pi";
import { useAuth } from "@/auth/auth-provider";
import { useStore } from "@/domain/store";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import { PageTitle } from "@/components/ecosystem/primitives";
import { navigate, type Route } from "@/lib/navigation";
import type { Language } from "@/domain/types";
import { ContractorRoutes, contractorModules } from "../app/routes";
export function ContractorLayout({
  route,
  language,
  onLanguage,
}: {
  route: Route;
  language: Language;
  onLanguage: (language: Language) => void;
}) {
  const { user } = useAuth(),
    { state, professionalId, setProfessionalId, send } = useStore();
  const person = state.professionals.find((p) => p.id === professionalId);
  const t = copy(language);
  const tab = route.path.split("/")[3] || "overview";
  if (!user?.demo && professionalId !== user?.professionalId)
    return <p role="status">Preparando tu espacio profesional…</p>;
  return (
    <DashboardFrame
      application="contractor"
      title={language === "es" ? "Portal de contratistas" : "Contractor portal"}
      icon={PiHardHat}
      language={language}
      onLanguage={onLanguage}
      items={contractorModules.map((m) => ({ ...m, label: m[language] }))}
      active={tab}
      path="/workspace/contractor"
    >
      <PageTitle
        eyebrow=""
        title={
          language === "es" ? "Panel del contratista" : "Contractor dashboard"
        }
        description={person?.name || user?.name}
        action={
          <span
            className={`eco-badge ${person?.publication === "published" ? "published" : "pending"}`}
          >
            {person?.publication === "published"
              ? "Ficha publicada"
              : "Ficha en borrador"}
          </span>
        }
      />
      {user?.demo && (
        <div className="workspace-role-bar">
          <div className="portal-account-label">
            <span>Cuenta de demostración</span>
            <strong>{user.name}</strong>
          </div>
          <label>
            <span>Perfil de prueba</span>
            <select
              aria-label="Perfil de prueba"
              value={professionalId}
              onChange={(event) => {
                setProfessionalId(event.target.value);
                navigate("/workspace/contractor/overview");
              }}
            >
              {state.professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {person && (
        <section
          aria-label={t("Membresía VIP", "VIP membership")}
          className="vip-membership"
          data-active={Boolean(person.vip)}
        >
          <PiCrown className="vip-crown" aria-hidden="true" />
          <div aria-live="polite">
            <h2>
              {person.vip
                ? t(
                    "Tu membresía VIP está activa",
                    "Your VIP membership is active",
                  )
                : person.vipRequested
                  ? t("Solicitud VIP pendiente", "VIP request pending")
                  : t(
                      "Recibe oportunidades 5 minutos antes",
                      "Get opportunities 5 minutes earlier",
                    )}
            </h2>
            <p>
              {person.vip
                ? t(
                    "En Solicitudes verás la cuenta regresiva de cada oportunidad con acceso anticipado.",
                    "In Requests you can see the countdown for each early-access opportunity.",
                  )
                : person.vipRequested
                  ? t(
                      "Administración revisará tu solicitud. Aquí verás cuándo se active tu membresía.",
                      "Administration will review your request. Your membership status will appear here.",
                    )
                  : t(
                      "Con VIP, las solicitudes generales de tu especialidad y zona aparecen antes de la apertura a los demás contratistas.",
                      "With VIP, matching requests in your area appear before they open to other contractors.",
                    )}
            </p>
          </div>
          {person.vip
            ? tab !== "requests" && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/workspace/contractor/requests")}
                >
                  {t("Ver oportunidades", "View opportunities")}
                </Button>
              )
            : !person.vipRequested && (
                <Button onClick={() => send({ type: "requestVip" })}>
                  {t("Solicitar acceso VIP", "Request VIP access")}
                </Button>
              )}
        </section>
      )}
      {person ? (
        <ContractorRoutes
          route={route}
          language={language}
          professionalId={professionalId}
        />
      ) : (
        <p role="status">Preparando tu ficha…</p>
      )}
    </DashboardFrame>
  );
}
