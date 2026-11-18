import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { PiPlus } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Panel, copy } from "@/components/ecosystem/primitives";

export function OrganizationPanel({ language }: { language: Language }) {
  const { state, send } = useStore();
  const t = copy(language);
  return (
    <Panel title={t("Equipo de la organización", "Organization team")}>
      <p className="eco-note">
        {t(
          "Miembros de muestra de una organización ficticia. No se envían invitaciones.",
          "Sample members of a fictional organization. No invitations are sent.",
        )}
      </p>
      <div className="team-grid">
        {state.team.map((member) => (
          <article className="team-card" key={member.id}>
            <span>
              {member.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <h3>{member.name}</h3>
            <p>{member.specialty}</p>
          </article>
        ))}
      </div>
      <form
        className="eco-form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const name = String(data.get("name")).trim();
          const specialty = String(data.get("specialty")).trim();
          if (!name || !specialty) return;
          send({ type: "member", value: { name, specialty } });
          e.currentTarget.reset();
        }}
      >
        <div className="eco-form-grid">
          <Field label={t("Nombre del integrante", "Team member name")}>
            <Input name="name" required maxLength={100} />
          </Field>
          <Field label={t("Responsabilidad", "Responsibility")}>
            <Input name="specialty" required maxLength={100} />
          </Field>
        </div>
        <Button type="submit">
          {t("Añadir integrante de prueba", "Add demo team member")}
          <PiPlus />
        </Button>
      </form>
    </Panel>
  );
}
