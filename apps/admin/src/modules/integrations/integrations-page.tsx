import { useSectionFilter } from "@/components/ecosystem/section-filter";
import { useEffect, useState } from "react";
import { Panel } from "@/components/ecosystem/primitives";
import { apiRequest } from "@/lib/http";
export function IntegrationsPage() {
  const [status, setStatus] = useState<any>(),
    [error, setError] = useState("");
  const integrations = status
    ? [
        {
          name: "Correo electrónico",
          state:
            status.email.mode === "local"
              ? "Buzón local de pruebas"
              : status.email.configured
                ? "SMTP configurado"
                : "Pendiente de SMTP",
          details: [
            "El modo local permite probar los enlaces; no envía mensajes a direcciones reales.",
          ],
        },
        {
          name: "Google Business Profile",
          state: status.google.configured
            ? "Listo para autorizar"
            : "Pendiente de Google Cloud",
          details: [
            "Solo fichas autorizadas por sus propietarios.",
            "Configuración pendiente: " +
              (status.google.missing.join(", ") || "ninguna"),
          ],
        },
        {
          name: "SerpApi",
          state: status.serpApi?.configured
            ? "Credencial configurada"
            : "Pendiente de credencial",
          details: ["Google Maps y Local Pack para el Centro SEO local."],
        },
        {
          name: "Dominio y SEO",
          state: status.seo.indexingEnabled
            ? "Indexación habilitada"
            : "Preparación · noindex",
          details: [
            status.seo.origin,
            "Se necesitan dominio HTTPS y oferta real publicada.",
          ],
        },
      ]
    : [];
  const filter = useSectionFilter(
    integrations,
    (i) => [i.name, i.state, ...i.details],
    "Proveedor, estado o dominio",
  );
  useEffect(() => {
    apiRequest("/api/integrations/status")
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Panel title="Integraciones del ecosistema">
      {filter.controls}
      {status ? (
        <div className="eco-stats-grid">
          {filter.visible.map((i) => (
            <article className="eco-panel" key={i.name}>
              <h3>{i.name}</h3>
              <strong>{i.state}</strong>
              {i.details.map((text: string) => (
                <p key={text}>{text}</p>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <p role="status">Consultando configuración…</p>
      )}
      {error && <p role="alert">{error}</p>}
      <p className="eco-note">
        Las credenciales se configuran en el servidor mediante variables de
        entorno. Esta pantalla nunca muestra secretos ni tokens. Tener
        parámetros configurados no confirma que un proveedor haya aprobado el
        proyecto.
      </p>
    </Panel>
  );
}
