import { useSectionFilter } from "@/components/ecosystem/section-filter";
import { demoAccounts } from "@/data/demo-accounts";
import { Panel, copy } from "@/components/ecosystem/primitives";
import { workspaceHref } from "@/lib/portals";
import type { Language } from "@/domain/types";
import { DemoSettings } from "../settings/settings-page";
export function SeedPage({ language }: { language: Language }) {
  const t = copy(language);
  const filter = useSectionFilter(
    demoAccounts,
    (a) => [a.name, a.email, a.label[language]],
    t("Nombre, correo o rol", "Name, email or role"),
    language,
    { label: t("Rol", "Role"), value: (a) => a.label[language] },
  );
  return (
    <>
      <Panel title={t("Cuentas de demostración", "Demo accounts")}>
        {filter.controls}
        <div className="team-grid">
          {filter.visible.map((account) => (
            <article className="team-card" key={account.id}>
              <span>
                {account.name
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <h3>{account.name}</h3>
              <p>{account.label[language]}</p>
              <p>{account.email}</p>
              <p>Servinexo2026!</p>
              <a href={workspaceHref(account.role)}>
                {t("Abrir entorno", "Open workspace")} ↗
              </a>
            </article>
          ))}
        </div>
        <p className="eco-note">
          {t(
            "Cada portal requiere iniciar sesión con la cuenta correspondiente. Usa únicamente datos ficticios.",
            "Each portal requires sign-in with the corresponding account. Use fictional data only.",
          )}
        </p>
        <a href="/demo-seed.json" download>
          {t("Descargar seed JSON", "Download seed JSON")}
        </a>
      </Panel>
      <DemoSettings searchable={false} language={language} />
    </>
  );
}
