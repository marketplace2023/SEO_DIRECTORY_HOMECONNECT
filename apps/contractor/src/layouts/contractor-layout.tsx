import { PiHardHat } from "react-icons/pi";
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
    { state, professionalId, setProfessionalId } = useStore();
  const person = state.professionals.find((p) => p.id === professionalId);
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
