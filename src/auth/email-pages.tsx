import { useEffect, useState, type FormEvent } from "react";
import { authRequest } from "./auth-client";
import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brand } from "@/components/brand";
import "./auth.css";
export function VerificationNotice() {
  const { user, refresh } = useAuth();
  const [message, setMessage] = useState(""),
    [mail, setMail] = useState<{ subject: string; text: string }[]>([]);
  if (!user || user.emailVerified) return null;
  return (
    <section className="eco-panel" style={{ marginBottom: 24 }}>
      <h2>Confirma tu correo electrónico</h2>
      <p>
        Revisa el enlace de confirmación para {user.email}. Confirma tu email
        antes de publicar solicitudes, enviar propuestas o conectar Google.
      </p>
      <div className="eco-actions">
        <Button
          variant="outline"
          onClick={() =>
            void refresh()
              .then(() =>
                setMessage(
                  "Si ya confirmaste el correo, podrás continuar con tu solicitud.",
                ),
              )
              .catch((error) => setMessage(error.message))
          }
        >
          Ya confirmé mi correo
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            void authRequest("resend-verification", {
              application: user.role === "owner" ? "web" : user.role,
            })
              .then(() =>
                setMessage("Solicitud de envío registrada. Revisa tu correo."),
              )
              .catch((e) => setMessage(e.message))
          }
        >
          Reenviar confirmación
        </Button>
        {import.meta.env.DEV && (
          <Button
            variant="ghost"
            onClick={() =>
              void authRequest<{ messages: typeof mail }>("local-inbox")
                .then((data) => setMail(data.messages))
                .catch((e) => setMessage(e.message))
            }
          >
            Ver buzón de pruebas local
          </Button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      {mail.map((item, index) => {
        const url = item.text.match(/https?:\/\/\S+/)?.[0];
        return (
          <article key={index}>
            <h3>{item.subject}</h3>
            {url && <a href={url}>Abrir enlace de prueba</a>}
          </article>
        );
      })}
    </section>
  );
}
export function EmailPage({
  mode,
  application,
}: {
  mode: "verify-email" | "forgot-password" | "reset-password";
  application: "web" | "contractor" | "admin";
}) {
  const auth = useAuth();
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const params = new URLSearchParams(window.location.hash.split("?")[1] || ""),
    token = params.get("token") || "";
  const targetSession = params.get("session");
  const [contactReturn] = useState(() => {
    try {
      const next = sessionStorage.getItem("homeconnect.contact-return");
      return next &&
        (/^\/(?:quote|workspace\/owner\/messages)(?:\?|$)/.test(next) ||
          /^\/professionals\/[\w-]+\?review=1$/.test(next))
        ? next
        : "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    if (targetSession && /^[\w-]{1,80}$/.test(targetSession))
      localStorage.setItem("servinexo.demo-session", targetSession);
  }, [targetSession]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "verify-email") {
        await authRequest("verify-email", { token });
        if (auth.user) await auth.refresh();
        setMessage("Correo confirmado. Ya puedes iniciar sesión.");
      } else if (mode === "forgot-password") {
        await authRequest("forgot-password", {
          email: data.get("email"),
          application,
        });
        setMessage(
          "Si existe una cuenta con ese correo, recibirás un enlace para restablecerla.",
        );
      } else {
        if (data.get("password") !== data.get("confirmation"))
          throw Error("Las contraseñas no coinciden.");
        await authRequest("reset-password", {
          token,
          password: data.get("password"),
        });
        await auth.logout();
        setMessage(
          "Contraseña actualizada. Inicia sesión con tu nueva contraseña.",
        );
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="account-main" style={{ minHeight: "100dvh" }}>
      <div className="account-form-container">
        <Brand
          onClick={() => {
            window.location.hash = "/";
          }}
        />
        <h1 style={{ fontSize: 26, marginTop: 32 }}>
          {mode === "verify-email"
            ? "Confirmar email"
            : mode === "forgot-password"
              ? "Recuperar contraseña"
              : "Nueva contraseña"}
        </h1>
        <form className="account-form" onSubmit={submit}>
          {mode === "forgot-password" ? (
            <label>
              Correo electrónico
              <Input name="email" type="email" required autoComplete="email" />
            </label>
          ) : mode === "reset-password" ? (
            <>
              <label>
                Nueva contraseña
                <Input
                  type="password"
                  name="password"
                  minLength={8}
                  maxLength={128}
                  required
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirmar contraseña
                <Input
                  type="password"
                  name="confirmation"
                  required
                  autoComplete="new-password"
                />
              </label>
            </>
          ) : (
            <p>Confirma el correo asociado a tu cuenta de HOME CONNECT.</p>
          )}
          {!message && (
            <Button disabled={busy || (mode !== "forgot-password" && !token)}>
              {busy
                ? "Procesando…"
                : mode === "verify-email"
                  ? "Confirmar mi correo"
                  : "Continuar"}
            </Button>
          )}
          {error && (
            <p role="alert" className="account-error">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
        </form>
        {mode === "verify-email" &&
        message &&
        application === "web" &&
        auth.user?.role === "owner" ? (
          <a
            href={`#${contactReturn || "/workspace/owner"}`}
            onClick={() => {
              try {
                sessionStorage.removeItem("homeconnect.contact-return");
              } catch {
                /* Continue without storage. */
              }
            }}
          >
            Continuar a HOME CONNECT
          </a>
        ) : (
          <a href="#/login">Volver al inicio de sesión</a>
        )}
      </div>
    </main>
  );
}
