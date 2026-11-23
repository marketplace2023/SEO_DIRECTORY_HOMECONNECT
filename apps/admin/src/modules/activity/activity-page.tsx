import { useSectionFilter } from "@/components/ecosystem/section-filter";
import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { roleNames } from "@/domain/types";
import { Panel, Empty, copy } from "@/components/ecosystem/primitives";

export function Activity({ language }: { language: Language }) {
  const { state } = useStore();
  const t = copy(language);
  const actions: Record<string, string> = {
    request: t("Solicitud creada", "Request created"),
    proposal: t("Propuesta enviada", "Proposal sent"),
    accept: t(
      "Propuesta aceptada y proyecto creado",
      "Proposal accepted and project created",
    ),
    milestone: t("Hito actualizado", "Milestone updated"),
    credential: t("Credencial enviada", "Credential submitted"),
    review: t("Credencial revisada", "Credential reviewed"),
    publication: t("Publicación modificada", "Publication changed"),
    profile: t("Ficha actualizada", "Profile updated"),
    material: t("Inventario actualizado", "Inventory updated"),
    member: t("Integrante añadido", "Team member added"),
    cancel: t("Solicitud cancelada", "Request cancelled"),
  };
  const filter = useSectionFilter(
    state.audit,
    (e) => [
      actions[e.action] || e.action,
      roleNames[e.actor][language],
      e.entityId,
      new Date(e.at).toLocaleString(language),
    ],
    t("Acción, fecha o identificador", "Action, date or ID"),
    language,
    { label: t("Rol", "Role"), value: (e) => roleNames[e.actor][language] },
  );
  return (
    <Panel title={t("Actividad del ecosistema", "Ecosystem activity")}>
      {filter.controls}
      {state.audit.length ? (
        <ol className="audit-list">
          {filter.visible.map((event) => (
            <li key={event.id}>
              <span className="audit-dot" />
              <div>
                <h3>{actions[event.action] || event.action}</h3>
                <p>
                  {roleNames[event.actor][language]} ·{" "}
                  <time dateTime={event.at}>
                    {new Date(event.at).toLocaleString(language)}
                  </time>
                </p>
                <code>{event.entityId}</code>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Empty
          title={t("Todavía no hay actividad", "No activity yet")}
          description={t(
            "Los cambios de las fichas, propuestas y proyectos aparecerán aquí.",
            "Changes to profiles, proposals and projects will appear here.",
          )}
        />
      )}
    </Panel>
  );
}
