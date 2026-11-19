import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { useState, type FormEvent } from "react";
import { categoryName } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  isPublicWebUrl,
  socialPlatforms,
  type SocialLinks,
} from "@/domain/social-links";
import {
  Field,
  Panel,
  EvidenceBadge,
  copy,
} from "@/components/ecosystem/primitives";

export function ProfileEditor({ language }: { language: Language }) {
  const { state, professionalId, send } = useStore();
  const t = copy(language);
  const person = state.professionals.find((p) => p.id === professionalId)!;
  const [saved, setSaved] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    const city = String(data.get("city")).trim();
    const bio = String(data.get("bio")).trim();
    const coverage = [
      ...new Set(
        String(data.get("coverage"))
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
    if (!name || !city || !bio || !coverage.length) return;
    const socialLinks: SocialLinks = Object.fromEntries(
      socialPlatforms.map(([key]) => [key, String(data.get(key) ?? "").trim()]),
    );
    send({ type: "profile", name, city, bio, coverage, language, socialLinks });
    setSaved(true);
  };
  return (
    <>
      <Panel
        title={t("Mi ficha de registro", "My registration record")}
        action={<span className="eco-badge">{person.fur}</span>}
      >
        <form
          key={`${person.id}-${language}`}
          className="eco-form"
          onSubmit={submit}
          onChange={() => setSaved(false)}
        >
          <div className="eco-form-grid">
            <Field label={t("Nombre profesional", "Professional name")}>
              <Input
                name="name"
                defaultValue={person.name}
                required
                maxLength={100}
              />
            </Field>
            <Field label={t("Ciudad de la sede", "Office city")}>
              <Input
                name="city"
                defaultValue={person.city}
                required
                maxLength={100}
              />
            </Field>
          </div>
          <Field label={t("Presentación", "About us")}>
            <Textarea
              name="bio"
              defaultValue={person.bio[language]}
              rows={4}
              required
              maxLength={2000}
            />
          </Field>
          <Field
            label={t(
              "Ciudades de cobertura (separadas por comas)",
              "Service cities (comma separated)",
            )}
          >
            <Input
              name="coverage"
              defaultValue={person.coverage.join(", ")}
              required
              maxLength={500}
            />
          </Field>
          <p className="eco-note">
            {categoryName(person.categoryId, language)} · {person.region} ·{" "}
            {person.country}
          </p>
          <fieldset>
            <legend className="font-semibold">
              {t("Redes sociales y página web", "Social media and website")}
            </legend>
            <p className="eco-note">
              {t(
                "Estos enlaces aparecerán en tu perfil público. Introduce la dirección completa con https://. Deja el campo vacío para eliminar un enlace.",
                "These links will appear on your public profile. Enter the full address starting with https://. Leave a field empty to remove a link.",
              )}
            </p>
            <div className="eco-form-grid">
              {socialPlatforms.map(([key, es, en]) => (
                <Field key={key} label={t(es, en)}>
                  <Input
                    name={key}
                    type="url"
                    maxLength={2048}
                    placeholder="https://"
                    defaultValue={person.socialLinks?.[key] ?? ""}
                    onChange={(event) => {
                      const input = event.currentTarget;
                      input.setCustomValidity(
                        !input.value.trim() ||
                          isPublicWebUrl(input.value.trim())
                          ? ""
                          : t(
                              "Introduce un enlace completo con https://.",
                              "Enter a full URL starting with https://.",
                            ),
                      );
                    }}
                  />
                </Field>
              ))}
            </div>
          </fieldset>
          <Button type="submit">{t("Guardar ficha", "Save record")}</Button>
          {saved && (
            <p role="status" className="eco-success">
              {t("Ficha actualizada.", "Record updated.")}
            </p>
          )}
        </form>
      </Panel>
      <Panel title={t("Credenciales y evidencias", "Credentials and evidence")}>
        <p className="eco-note">
          {t(
            "Introduce una referencia documental ficticia. El aliado o administrador podrá revisarla. No cargues documentos personales reales.",
            "Enter a fictional document reference. A partner or administrator can review it. Do not upload real personal documents.",
          )}
        </p>
        {person.credentials.map((c) => (
          <form
            key={`${person.id}-${c.id}`}
            className="credential-editor"
            onSubmit={(e) => {
              e.preventDefault();
              const reference = String(
                new FormData(e.currentTarget).get("reference"),
              ).trim();
              if (reference)
                send({ type: "credential", credentialId: c.id, reference });
            }}
          >
            <div>
              <h3>{c.name[language]}</h3>
              <EvidenceBadge status={c.status} language={language} />
              {c.note && <p className="eco-note">{c.note}</p>}
            </div>
            <Field label={t("Referencia del documento", "Document reference")}>
              <Input
                name="reference"
                defaultValue={c.reference}
                required
                maxLength={150}
              />
            </Field>
            <Button
              variant="outline"
              type="submit"
              disabled={c.status === "pending"}
            >
              {c.status === "pending"
                ? t("Esperando revisión", "Awaiting review")
                : t("Enviar a revisión", "Submit for review")}
            </Button>
          </form>
        ))}
      </Panel>
    </>
  );
}
