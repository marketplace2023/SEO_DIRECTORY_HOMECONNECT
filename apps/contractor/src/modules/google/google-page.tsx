import { useEffect, useState } from "react";
import { PiGoogleLogo, PiArrowSquareOut } from "react-icons/pi";
import { Panel } from "@/components/ecosystem/primitives";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/http";
export function GooglePage() {
  const [status, setStatus] = useState<any>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function load() {
    try {
      setStatus(await apiRequest("/api/google/status"));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    void load();
    if (location.hash.includes("error="))
      setError("La autorización no se completó. Puedes volver a intentarlo.");
  }, []);
  async function action(path: string, body: unknown = {}) {
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest("/api/google/" + path, body);
      if (result.authorizationUrl) {
        location.assign(result.authorizationUrl);
        return;
      }
      setMessage(
        path === "sync"
          ? `Sincronización completada: ${result.count} fichas autorizadas.`
          : "Cambios guardados.",
      );
      await load();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Google Business Profile">
      <p className="eco-body">
        Conecta la cuenta de Google con la que administras tu negocio. HOME
        CONNECT consultará tus fichas autorizadas para ayudarte a mantener
        información local consistente.
      </p>
      <p className="eco-note">
        Conectar Google Business Profile no verifica una licencia profesional ni
        garantiza posicionamiento. Esta versión consulta datos; no modifica ni
        publica cambios en Google.
      </p>
      {!status ? (
        <p role="status">Consultando conexión…</p>
      ) : (
        <>
          <div className="seed-overview">
            <PiGoogleLogo size={26} />
            <div>
              <strong>
                {status.connected
                  ? "Google conectado"
                  : status.configured
                    ? "Listo para conectar"
                    : "Pendiente de configuración"}
              </strong>
              <p>
                {status.requiresEmail
                  ? "Confirma primero tu correo."
                  : status.connected
                    ? "Autorización del propietario registrada."
                    : "Se requiere autorización del propietario o administrador de la ficha."}
              </p>
            </div>
          </div>
          {!status.configured && (
            <p className="eco-note">
              El operador debe configurar Google Cloud, acceso a las APIs y
              OAuth. Tu cuenta de HOME CONNECT seguirá funcionando mientras
              tanto.
            </p>
          )}
          <div className="eco-actions">
            <Button
              disabled={busy || !status.configured || status.requiresEmail}
              onClick={() => void action("connect")}
            >
              {status.connected
                ? "Volver a autorizar Google"
                : "Conectar con Google"}
            </Button>
            {status.connected && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void action("sync")}
                >
                  Sincronizar fichas
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void action("disconnect")}
                >
                  Desconectar y eliminar datos
                </Button>
              </>
            )}
          </div>
          {status.syncedAt && (
            <p className="eco-note">
              Última consulta: {new Date(status.syncedAt).toLocaleString()}
            </p>
          )}
          <div className="eco-records">
            {status.locations.map((item: any) => (
              <article className="eco-record" key={item.name}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.phoneNumbers?.primaryPhone}</p>
                  <p>
                    {item.serviceArea
                      ? "Negocio con área de servicio"
                      : item.storefrontAddress?.locality}
                  </p>
                  {item.metadata?.mapsUri && (
                    <a
                      href={item.metadata.mapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver en Google Maps <PiArrowSquareOut />
                    </a>
                  )}
                </div>
                <Button
                  disabled={busy || status.selected === item.name}
                  variant="outline"
                  onClick={() => void action("location", { name: item.name })}
                >
                  {status.selected === item.name
                    ? "Ficha vinculada"
                    : "Vincular a mi perfil"}
                </Button>
              </article>
            ))}
          </div>
          {status.connected && !status.locations.length && (
            <p>
              No hay fichas cargadas. Pulsa sincronizar; Google solo devuelve
              las que tu cuenta puede administrar.
            </p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="eco-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="eco-success">
          {message}
        </p>
      )}
    </Panel>
  );
}
