import {
  PiArrowUpRight,
  PiGlobeHemisphereWest,
  PiUserCircle,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import type { Language } from "@/domain/types";
import { useAuth } from "@/auth/auth-provider";

export function SiteHeader({
  language,
  onLanguage,
  path,
  onNavigate,
}: {
  language: Language;
  onLanguage: (value: Language) => void;
  path: string;
  onNavigate: (path: string) => void;
}) {
  const es = language === "es";
  const { user, logout } = useAuth();
  const links = [
    ["/", es ? "Descubre" : "Discover"],
    ["/catalog", es ? "Servicios" : "Services"],
    ["/professionals", es ? "Profesionales" : "Professionals"],
    ["/workspace/owner", es ? "Mi dashboard" : "My dashboard"],
  ];
  return (
    <>
      <div className="announcement">
        <span className="status-dot" />
        {es
          ? "Buenas ideas. Gente que las hace realidad."
          : "Good ideas. People who make them happen."}
        <span className="announcement-note">
          {es ? "Una nueva forma de conectar" : "A new way to connect"}
        </span>
      </div>
      <header className="site-header">
        <div className="site-container header-inner">
          <Brand onClick={() => onNavigate("/")} />
          <nav
            aria-label={es ? "Navegación principal" : "Main navigation"}
            className="main-nav"
          >
            {links.map(([target, text]) => (
              <button
                key={target}
                onClick={() => onNavigate(target)}
                aria-current={
                  (
                    target === "/"
                      ? path === "/"
                      : path.startsWith(target.split("/").slice(0, 2).join("/"))
                  )
                    ? "page"
                    : undefined
                }
                className={
                  (
                    target === "/"
                      ? path === "/"
                      : path.startsWith(target.split("/").slice(0, 2).join("/"))
                  )
                    ? "is-active"
                    : ""
                }
              >
                {text}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <label className="language-switch">
              <PiGlobeHemisphereWest />
              <span className="sr-only">Idioma / Language</span>
              <select
                value={language}
                onChange={(e) => onLanguage(e.target.value as Language)}
              >
                <option value="es">ES</option>
                <option value="en">EN</option>
              </select>
            </label>
            <Button
              variant="ghost"
              className="account-button"
              onClick={() => onNavigate(user ? "/workspace/owner" : "/login")}
              aria-label={es ? "Mi cuenta" : "My account"}
            >
              <PiUserCircle className="size-6" />
              <span>
                {user
                  ? user.name.split(" ")[0]
                  : es
                    ? "Inicia sesión"
                    : "Sign in"}
              </span>
            </Button>
            {user && (
              <button
                className="web-signout"
                aria-label="Cerrar sesión"
                onClick={() => void logout().finally(() => onNavigate("/"))}
              >
                {es ? "Salir" : "Sign out"}
              </button>
            )}
            <Button className="header-cta" onClick={() => onNavigate("/quote")}>
              {es ? "Publica tu proyecto" : "Post a project"}
              <PiArrowUpRight />
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
