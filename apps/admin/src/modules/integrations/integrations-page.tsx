import { useEffect, useState } from "react";
import { Panel } from "@/components/ecosystem/primitives";
import { apiRequest } from "@/lib/http";
export function IntegrationsPage() {
  const [status, setStatus] = useState<any>(),
    [error, setError] = useState("");
  useEffect(() => {
    apiRequest("/api/integrations/status")
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Panel title="Integraciones del ecosistema">
      {status ? (
        <div className="eco-stats-grid">
          <article className="eco-panel">
            <h3>Correo electrónico</h3>
            <strong>
              {status.email.mode === "local"
                ? "Buzón local de pruebas"
                : status.email.configured
                  ? "SMTP configurado"
                  : "Pendiente de SMTP"}
            </strong>
            <p>
              El modo local permite probar los enlaces; no envía mensajes a
              direcciones reales.
            </p>
          </article>
          <article className="eco-panel">
            <h3>Google Business Profile</h3>
            <strong>
              {status.google.configured
                ? "Listo para autorizar"
                : "Pendiente de Google Cloud"}
            </strong>
            <p>Solo fichas autorizadas por sus propietarios.</p>
            <p>
              Configuración pendiente:{" "}
              {status.google.missing.join(", ") || "ninguna"}
            </p>
          </article>
          <article className="eco-panel">
            <h3>Dominio y SEO</h3>
            <strong>
              {status.seo.indexingEnabled
                ? "Indexación habilitada"
                : "Preparación · noindex"}
            </strong>
            <p>{status.seo.origin}</p>
            <p>Se necesitan dominio HTTPS y oferta real publicada.</p>
          </article>
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
