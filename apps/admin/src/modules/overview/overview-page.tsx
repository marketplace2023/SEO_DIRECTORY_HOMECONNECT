import { useStore } from "@/domain/store";
import { Stat, Panel, copy } from "@/components/ecosystem/primitives";
import { Button } from "@/components/ui/button";
import { navigate } from "@/lib/navigation";
import { categories } from "@/data/catalog";
import type { Language } from "@/domain/types";
import { ReviewQueue } from "../verifications/verifications-page";
import { CountyRegistrations } from "@/components/ecosystem/county-registrations";
export function OverviewPage({ language }: { language: Language }) {
  const { state, role } = useStore(),
    t = copy(language);
  const pending = state.professionals.reduce(
    (count, p) =>
      count + p.credentials.filter((c) => c.status === "pending").length,
    0,
  );
  if (role === "supplier")
    return (
      <>
        <div className="eco-stats-grid">
          <Stat
            label={t("Materiales", "Materials")}
            value={state.materials.length}
          />
          <Stat
            label={t("Unidades en inventario", "Units in stock")}
            value={state.materials.reduce((sum, m) => sum + m.stock, 0)}
          />
        </div>
        <Panel title={t("Gestión de inventario", "Inventory management")}>
          <Button onClick={() => navigate("/workspace/supplier/inventory")}>
            {t("Abrir inventario", "Open inventory")}
          </Button>
        </Panel>
      </>
    );
  if (role === "business")
    return (
      <>
        <div className="eco-stats-grid">
          <Stat
            label={t("Integrantes de muestra", "Sample team members")}
            value={state.team.length}
          />
          <Stat
            label={t("Categorías del ecosistema", "Ecosystem categories")}
            value={categories.length}
          />
        </div>
        <Panel title={t("Equipo de la organización", "Organization team")}>
          <Button onClick={() => navigate("/workspace/business/team")}>
            {t("Gestionar equipo", "Manage team")}
          </Button>
        </Panel>
      </>
    );
  return (
    <>
      <div className="eco-stats-grid">
        <Stat
          label={t("Perfiles registrados", "Registered profiles")}
          value={state.professionals.length}
        />
        <Stat
          label={t("Credenciales pendientes", "Pending credentials")}
          value={pending}
        />
        <Stat
          label={t("Fichas publicadas", "Published profiles")}
          value={
            state.professionals.filter((p) => p.publication === "published")
              .length
          }
        />
        <Stat
          label={t("Eventos de actividad", "Activity events")}
          value={state.audit.length}
        />
      </div>
      <div className="workspace-welcome">
        <div>
          <p className="eyebrow">
            {t("OPERACIÓN DEL DIRECTORIO", "DIRECTORY OPERATIONS")}
          </p>
          <h2>{t("Cada ficha cuenta.", "Every profile matters.")}</h2>
          <p>
            {t(
              "Revisa las evidencias pendientes, controla la publicación de profesionales y consulta los cambios del equipo.",
              "Review pending evidence, manage professional publication and follow team changes.",
            )}
          </p>
        </div>
        <Button onClick={() => navigate(`/workspace/${role}/verifications`)}>
          {t("Ver pendientes", "Review pending")}
        </Button>
      </div>
      {role === "admin" && <CountyRegistrations language={language} />}
      <ReviewQueue language={language} />
    </>
  );
}
