import { useEffect, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { PiArrowUpRight, PiList, PiX, PiSignOut } from "react-icons/pi";
import { Brand } from "@/components/brand";
import { GoogleNotice } from "./google-notice";
import { VerificationNotice } from "@/auth/email-pages";
import { useAuth } from "@/auth/auth-provider";
import { useStore } from "@/domain/store";
import { portalHref } from "@/lib/portals";
import { navigate } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
            {application === "contractor" && user && (
              <GoogleNotice key={user.id} language={language} />
            )}
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
          <Separator className="my-3" />
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[.14em] text-neutral-400 uppercase">
            {language === "es" ? "Tu espacio de trabajo" : "Your workspace"}
          </p>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 pr-2">
              {items.map((item) => (
                <Button
                  variant="ghost"
                  key={item.key}
                  onClick={() => navigate(`${path}/${item.key}`)}
                  aria-label={item.label}
                  aria-current={item.key === active ? "page" : undefined}
                  className={`h-auto w-full justify-start gap-3 rounded-lg px-3 py-3 text-left text-[13px] font-medium ${item.key === active ? "selected bg-accent text-accent-foreground hover:bg-accent" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"}`}
                >
                  <item.icon />
                  {item.label}
                  {!!item.badge && (
                    <Badge
                      variant="secondary"
                      className="ml-auto rounded-md px-1.5 py-0 text-[10px]"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
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
          <VerificationNotice />
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
