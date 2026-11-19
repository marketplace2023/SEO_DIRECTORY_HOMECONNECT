import { AttachmentsPanel } from "@/components/ecosystem/attachments-panel";
import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { useState, type FormEvent } from "react";
import { categoryName } from "@/data/catalog";
import { cityLocation } from "@/domain/geography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  isPublicWebUrl,
  socialLinksSchema,
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
  const [locationError, setLocationError] = useState("");
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
    const manual = data.get("mapMode") === "public";
    const latitude = Number(data.get("latitude")),
      longitude = Number(data.get("longitude"));
    if (
      manual &&
      (!String(data.get("latitude")).trim() ||
        !String(data.get("longitude")).trim() ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180 ||
        !data.get("publicLocation"))
    ) {
      setLocationError(
        t(
          "Revisa las coordenadas y autoriza su publicación.",
          "Check the coordinates and authorize publication.",
        ),
      );
      return;
    }
    setLocationError("");
    const location =
      data.get("mapMode") === "hidden"
        ? null
        : manual
          ? { latitude, longitude, precision: "public" as const }
          : cityLocation(city, person.region, person.country);
    send({
      type: "profile",
      name,
      city,
      bio,
      coverage,
      language,
      location,
      socialLinks,
    });
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
                        key === "googleBusiness"
                          ? socialLinksSchema.shape.googleBusiness.safeParse(
                              input.value.trim(),
                            ).success
                            ? ""
                            : t(
                                "Introduce un enlace público de Google Maps o del Perfil de Empresa.",
                                "Enter a public Google Maps or Business Profile link.",
                              )
                          : !input.value.trim() ||
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
            <a className="text-link" href="#/workspace/contractor/google">
              {t("Administrar conexión con Google", "Manage Google connection")}
            </a>
          </fieldset>
          <fieldset className="map-profile-fields">
            <legend>
              {t("Ubicación en el mapa público", "Public map location")}
            </legend>
            <Field label={t("Tipo de ubicación", "Location type")}>
              <select
                name="mapMode"
                defaultValue={
                  person.location?.precision === "public"
                    ? "public"
                    : person.location === null
                      ? "hidden"
                      : "city"
                }
              >
                <option value="city">
                  {t(
                    "Centro aproximado de la ciudad",
                    "Approximate city center",
                  )}
                </option>
                <option value="public">
                  {t("Punto público autorizado", "Authorized public point")}
                </option>
                <option value="hidden">
                  {t("Sin marcador público", "No public marker")}
                </option>
              </select>
            </Field>
            <p className="eco-note">
              {t(
                "El centro de ciudad no representa una dirección ni verifica tu cobertura. Si la ciudad no está en el piloto, puedes indicar un punto público autorizado o mantener la ficha sin marcador.",
                "A city center is not an address or verified coverage. For other cities, choose an authorized public point or keep the listing without a marker.",
              )}
            </p>
            <div className="eco-form-grid">
              <Field label={t("Latitud pública", "Public latitude")}>
                <Input
                  type="number"
                  name="latitude"
                  step="any"
                  min={-90}
                  max={90}
                  defaultValue={person.location?.latitude ?? ""}
                />
              </Field>
              <Field label={t("Longitud pública", "Public longitude")}>
                <Input
                  type="number"
                  name="longitude"
                  step="any"
                  min={-180}
                  max={180}
                  defaultValue={person.location?.longitude ?? ""}
                />
              </Field>
            </div>
            <label className="verified-filter">
              <input type="checkbox" name="publicLocation" />
              {t(
                "Autorizo mostrar este punto al seleccionar punto público. No es una dirección privada.",
                "I authorize this point to be displayed when choosing public point. It is not a private address.",
              )}
            </label>
            {locationError && <p role="alert">{locationError}</p>}
          </fieldset>
          <Button type="submit">{t("Guardar ficha", "Save record")}</Button>
          {saved && (
            <p role="status" className="eco-success">
              {t("Ficha actualizada.", "Record updated.")}
            </p>
          )}
        </form>
      </Panel>
      <AttachmentsPanel targetId={professionalId} purpose="portfolio" />
      <AttachmentsPanel targetId={professionalId} purpose="credential" />
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
