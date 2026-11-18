import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { PiSealCheck } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  Panel,
  Empty,
  EvidenceBadge,
  copy,
} from "@/components/ecosystem/primitives";

export function ReviewQueue({ language }: { language: Language }) {
  const { state, send } = useStore();
  const t = copy(language);
  const pending = state.professionals.flatMap((p) =>
    p.credentials
      .filter((c) => c.status === "pending")
      .map((c) => ({ professional: p, credential: c })),
  );
  return (
    <Panel title={t("Revisión de credenciales", "Credential review")}>
      <p className="eco-note">
        {t(
          "La revisión es simulada y cambia los distintivos de las fichas de muestra. No verifica empresas reales.",
          "Reviews are simulated and update badges on sample profiles. They do not verify real businesses.",
        )}
      </p>
      {pending.length ? (
        pending.map(({ professional, credential }) => (
          <form
            key={credential.id}
            className="review-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              const decision =
                (
                  (event.nativeEvent as SubmitEvent)
                    .submitter as HTMLButtonElement | null
                )?.value || "verified";
              const note = String(data.get("note")).trim();
              if (decision === "rejected" && !note) {
                (
                  form.elements.namedItem("note") as HTMLInputElement
                ).setCustomValidity(
                  t(
                    "Indica qué debe corregirse.",
                    "Explain what needs changing.",
                  ),
                );
                form.reportValidity();
                return;
              }
              send({
                type: "review",
                professionalId: professional.id,
                credentialId: credential.id,
                status: decision === "verified" ? "verified" : "rejected",
                note,
              });
            }}
          >
            <div className="review-card-head">
              <span className="record-symbol">
                <PiSealCheck />
              </span>
              <div>
                <h3>{professional.name}</h3>
                <p>
                  {credential.name[language]} · {credential.reference}
                </p>
              </div>
              <EvidenceBadge status="pending" language={language} />
            </div>
            <Field label={t("Observación de la revisión", "Review note")}>
              <Input
                name="note"
                maxLength={500}
                onInput={(e) => e.currentTarget.setCustomValidity("")}
                placeholder={t(
                  "Usa solo información de demostración",
                  "Use demo information only",
                )}
              />
            </Field>
            <div className="eco-actions">
              <Button
                type="submit"
                name="decision"
                value="verified"
                onClick={(e) => {
                  const form = e.currentTarget.form!;
                  (
                    form.elements.namedItem("note") as HTMLInputElement
                  ).setCustomValidity("");
                }}
              >
                {t("Aprobar en demo", "Approve in demo")}
              </Button>
              <Button
                variant="outline"
                type="submit"
                name="decision"
                value="rejected"
              >
                {t("Solicitar cambios", "Request changes")}
              </Button>
            </div>
          </form>
        ))
      ) : (
        <Empty
          title={t(
            "No quedan credenciales pendientes",
            "No pending credentials",
          )}
          description={t(
            "Los profesionales pueden enviar nuevas referencias desde su ficha.",
            "Professionals can submit new references from their profile.",
          )}
        />
      )}
    </Panel>
  );
}
