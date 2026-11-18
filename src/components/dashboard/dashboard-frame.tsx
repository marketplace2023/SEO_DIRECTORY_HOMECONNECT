import { useEffect, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { PiArrowUpRight, PiList, PiX, PiSignOut } from "react-icons/pi";
import { Brand } from "@/components/brand";
import { useAuth } from "@/auth/auth-provider";
import { useStore } from "@/domain/store";
import { portalHref } from "@/lib/portals";
import { navigate } from "@/lib/navigation";
import type { Language } from "@/domain/types";
export type SidebarItem = {
  key: string;
  label: string;
  icon: IconType;
  badge?: number;
};
export function DashboardFrame({
  application,
  title,
  icon: Icon,
  language,
  onLanguage,
  items,
  active,
  path,
  children,
}: {
  application: "contractor" | "admin";
  title: string;
  icon: IconType;
  language: Language;
  onLanguage: (language: Language) => void;
  items: SidebarItem[];
  active: string;
  path: string;
  children: ReactNode;
}) {
  const { user, logout } = useAuth(),
    { syncError, storageError } = useStore();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [active, path]);
  return (
    <div
      className={`portal-application portal-${application}${open ? " sidebar-open" : ""}`}
      data-application={application}
    >
      <header className="portal-header">
        <div className="site-container portal-header-inner">
          <button
            className="portal-menu-toggle"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <PiX /> : <PiList />}
          </button>
          <Brand onClick={() => navigate(path)} />
          <span className="portal-product">
            <Icon />
            {title}
          </span>
          <div className="portal-header-actions">
            <label>
              <span className="sr-only">Idioma / Language</span>
              <select
                value={language}
                onChange={(event) => onLanguage(event.target.value as Language)}
              >
                <option value="es">ES</option>
                <option value="en">EN</option>
              </select>
            </label>
            <a
              href={portalHref("web", "/")}
              aria-label={
                language === "es"
                  ? "Volver al marketplace"
                  : "Back to marketplace"
              }
            >
              <span className="portal-return-label">
                {language === "es"
                  ? "Volver al marketplace"
                  : "Back to marketplace"}
              </span>
              <PiArrowUpRight />
            </a>
            <button
              className="portal-logout"
              onClick={() =>
                void logout().finally(() => {
                  window.location.hash = "/login";
                })
              }
              aria-label="Cerrar sesión"
            >
              <PiSignOut />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>
      {open && (
        <button
          className="portal-sidebar-backdrop"
          aria-label="Cerrar menú lateral"
          onClick={() => setOpen(false)}
        />
      )}
      <main className="site-container portal-main" id="main-content">
        <nav
          className="workspace-tabs dashboard-sidebar"
          aria-label={
            language === "es" ? "Secciones del espacio" : "Workspace sections"
          }
        >
          <div className="sidebar-account">
            <span>{user?.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(`${path}/${item.key}`)}
              aria-label={item.label}
              aria-current={item.key === active ? "page" : undefined}
              className={item.key === active ? "selected" : ""}
            >
              <item.icon />
              {item.label}
              {!!item.badge && <span>{item.badge}</span>}
            </button>
          ))}
        </nav>
        {syncError && (
          <p role="alert" className="eco-error">
            No hay conexión con el servicio local de datos.
          </p>
        )}
        {storageError && (
          <p role="alert" className="eco-error">
            Este navegador no permite guardar cambios.
          </p>
        )}
        <div className={`workspace-content workspace-${application}`}>
          {children}
        </div>
      </main>
      <footer className="portal-footer site-container">
        <span>HOME CONNECT · {title}</span>
        <span>Prototipo local · Datos de prueba</span>
      </footer>
    </div>
  );
}
