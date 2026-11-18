import { useEffect, useState, type FormEvent } from "react";
import {
  PiArrowLeft,
  PiArrowRight,
  PiCheckCircle,
  PiEye,
  PiEyeSlash,
  PiShieldCheck,
} from "react-icons/pi";
import { useAuth } from "./auth-provider";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories } from "@/data/catalog";
import { portalHref } from "@/lib/portals";
import "./auth.css";
export function AuthForm({
  application,
  mode,
  title,
  description,
  benefits,
}: {
  application: "web" | "contractor" | "admin";
  mode: "login" | "register";
  title: string;
  description: string;
  benefits: string[];
}) {
  const { user, login, register, checking } = useAuth();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const signingUp = mode === "register";
  const role = application === "web" ? "owner" : application;
  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const requested = params.get("next") || "";
  const home = `/workspace/${role}`;
  const next =
    requested.startsWith(home) ||
    (application === "web" &&
      /^\/(quote|professionals)(\/|\?|$)/.test(requested))
      ? requested
      : home;
  useEffect(() => {
    if (!checking && user?.role === role) window.location.replace("#" + next);
  }, [user, checking, next, role]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setError("");
    if (signingUp && password !== data.get("confirmation")) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      if (signingUp)
        await register({
          name: String(data.get("name")).trim(),
          email,
          password,
          ...(application === "contractor"
            ? {
                city: String(data.get("city")).trim(),
                categoryId: String(data.get("categoryId")),
              }
            : {}),
        });
      else await login(email, password);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No pudimos completar el acceso.",
      );
    } finally {
      setBusy(false);
    }
  }
  const sampleEmail =
    application === "admin"
      ? "admin@example.test"
      : application === "contractor"
        ? "ruiz@example.test"
        : "carolina@example.test";
  const suffix = requested ? "?next=" + encodeURIComponent(requested) : "";
  return (
    <div
      className={`account-page account-${application}`}
      data-auth-application={application}
    >
      <aside className="account-intro">
        <Brand onClick={() => window.location.assign(portalHref("web", "/"))} />
        <div>
          <span className="account-kicker">
            {application === "admin"
              ? "CENTRO DE ADMINISTRACIÓN"
              : application === "contractor"
                ? "HOME CONNECT PARA PROFESIONALES"
                : "TU PRÓXIMO PROYECTO EMPIEZA AQUÍ"}
          </span>
          <h1>{title}</h1>
          <p>{description}</p>
          <ul>
            {benefits.map((benefit) => (
              <li key={benefit}>
                <PiCheckCircle />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <a href={portalHref("web", "/")}>
          <PiArrowLeft />
          Volver al marketplace
        </a>
      </aside>
      <main className="account-main">
        <div className="account-form-container">
          <span className="account-lock">
            <PiShieldCheck />
          </span>
          <h2>{signingUp ? "Crea tu cuenta" : "Inicia sesión"}</h2>
          <p>
            {signingUp
              ? "Completa tus datos para empezar."
              : application === "admin"
                ? "Accede con tu cuenta de administración."
                : "Qué bueno tenerte de vuelta."}
          </p>
          <form onSubmit={submit} className="account-form">
            {signingUp && (
              <label>
                {application === "contractor"
                  ? "Nombre profesional o empresa"
                  : "Nombre completo"}
                <Input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              Correo electrónico
              <Input
                type="email"
                name="email"
                required
                maxLength={160}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Contraseña
              <div className="account-password">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={signingUp ? "new-password" : "current-password"}
                  required
                  minLength={signingUp ? 8 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <PiEyeSlash /> : <PiEye />}
                </button>
              </div>
              {signingUp && (
                <small>Al menos 8 caracteres, una letra y un número.</small>
              )}
            </label>
            {signingUp && (
              <>
                <label>
                  Confirmar contraseña
                  <Input
                    name="confirmation"
                    type="password"
                    required
                    autoComplete="new-password"
                  />
                </label>
                {application === "contractor" && (
                  <div className="account-form-row">
                    <label>
                      Especialidad
                      <select name="categoryId" required defaultValue="">
                        <option value="" disabled>
                          Selecciona tu oficio
                        </option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name.es}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Ciudad de trabajo
                      <Input name="city" required maxLength={100} />
                    </label>
                  </div>
                )}
                <label className="account-terms">
                  <input type="checkbox" required />
                  Entiendo que usaré datos ficticios en este prototipo.
                </label>
              </>
            )}
            {error && (
              <p className="account-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || checking}>
              {busy
                ? "Procesando…"
                : signingUp
                  ? "Crear cuenta"
                  : "Iniciar sesión"}
              <PiArrowRight />
            </Button>
          </form>
          {!signingUp && (
            <p className="account-switch">
              <a href="#/forgot-password">Olvidé mi contraseña</a>
            </p>
          )}
          {application !== "admin" ? (
            <p className="account-switch">
              {signingUp ? "¿Ya tienes cuenta?" : "¿Primera vez aquí?"}{" "}
              <a href={`#/${signingUp ? "login" : "register"}${suffix}`}>
                {signingUp ? "Inicia sesión" : "Regístrate"}
              </a>
            </p>
          ) : (
            <p className="account-switch">
              Las cuentas administrativas se provisionan por el equipo de
              gestión.
            </p>
          )}
          {!signingUp && (
            <details className="account-demo">
              <summary>Probar con una cuenta de demostración</summary>
              <p>
                {sampleEmail}
                <br />
                Contraseña: <strong>Servinexo2026!</strong>
              </p>
              <button
                type="button"
                onClick={() => {
                  setEmail(sampleEmail);
                  setPassword("Servinexo2026!");
                }}
              >
                Usar estos datos
              </button>
            </details>
          )}
          <p className="account-note">
            Prototipo local · Cuentas de prueba · Sesiones de 24 horas
          </p>
        </div>
      </main>
    </div>
  );
}
