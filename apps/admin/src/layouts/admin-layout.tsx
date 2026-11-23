import { useEffect, lazy, Suspense } from "react";
import { PiShieldCheck } from "react-icons/pi";
import { useAuth } from "@/auth/auth-provider";
import { useStore } from "@/domain/store";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import { PageTitle } from "@/components/ecosystem/primitives";
import { navigate, type Route } from "@/lib/navigation";
import { roleNames, type Language, type Role } from "@/domain/types";
import { AdminRoutes, adminModules, managementSections } from "../app/routes";
const LocalSeoPage = lazy(() =>
  import("@/modules/local-seo/local-seo-page").then((m) => ({
    default: m.LocalSeoPage,
  })),
);
export function AdminLayout({
  route,
  language,
  onLanguage,
}: {
  route: Route;
  language: Language;
  onLanguage: (language: Language) => void;
}) {
  const { user } = useAuth(),
    { state, role, setRole } = useStore();
  const target = route.path.split("/")[2] as Role,
    tab = route.path.split("/")[3] || "overview";
  const selected = managementSections[target] ? target : "admin";
  useEffect(() => {
    if (role !== selected) setRole(selected);
  }, [selected, role, setRole]);
  const pending = state.professionals.reduce(
    (n, p) => n + p.credentials.filter((c) => c.status === "pending").length,
    0,
  );
  if (user?.role === "seo")
    return (
      <DashboardFrame
        application="admin"
        title="Equipo SEO"
        icon={PiShieldCheck}
        language={language}
        onLanguage={onLanguage}
        items={[{ key: "local-seo", label: "SEO local", icon: PiShieldCheck }]}
        active="local-seo"
        path="/workspace/admin"
      >
        <Suspense fallback={<p role="status">Cargando centro SEO…</p>}>
          <LocalSeoPage admin />
        </Suspense>
      </DashboardFrame>
    );
  return (
    <DashboardFrame
      application="admin"
      title={
        language === "es"
          ? "Consola de administración"
          : "Administration console"
      }
      icon={PiShieldCheck}
      language={language}
      onLanguage={onLanguage}
      items={adminModules
        .filter((m) => managementSections[selected]?.includes(m.key))
        .map((m) => ({
          ...m,
          label: m[language],
          badge: m.key === "verifications" ? pending : undefined,
        }))}
      active={tab}
      path={`/workspace/${selected}`}
    >
      <PageTitle
        eyebrow=""
        title={
          selected === "admin"
            ? language === "es"
              ? "Centro de administración"
              : "Administration center"
            : roleNames[selected][language]
        }
        description={`${user?.name} · ${language === "es" ? "Control y operación del directorio" : "Directory management and operations"}`}
      />
      <div className="workspace-role-bar">
        <div className="portal-account-label">
          <span>Sesión de administración</span>
          <strong>{user?.email}</strong>
        </div>
        <label>
          <span>Área de gestión</span>
          <select
            aria-label="Área de gestión"
            value={selected}
            onChange={(event) => navigate(`/workspace/${event.target.value}`)}
          >
            {Object.keys(managementSections).map((key) => (
              <option key={key} value={key}>
                {roleNames[key as Role][language]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selected === "admin" && (
        <div className="seed-overview">
          <div>
            <strong>Escenario de prueba cargado</strong>
            <p>
              {state.professionals.length} contratistas ·{" "}
              {state.requests.length} solicitudes · {state.proposals.length}{" "}
              propuestas · {state.projects.length} proyectos
            </p>
          </div>
          <a href="/demo-seed.json" download>
            Descargar seed JSON
          </a>
        </div>
      )}
      {role === selected ? (
        <AdminRoutes route={route} language={language} />
      ) : (
        <p role="status">Abriendo área de gestión…</p>
      )}
    </DashboardFrame>
  );
}
