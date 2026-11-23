import {
  PiArrowUpRight,
  PiGlobeHemisphereWest,
  PiUserCircle,
  PiBell,
  PiHeart,
  PiShoppingCart,
  PiCaretDown,
} from "react-icons/pi";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import type { Language } from "@/domain/types";
import { useAuth } from "@/auth/auth-provider";
import { SearchBar, type SearchBarProps } from "@/components/search-bar";
import { categories } from "@/data/catalog";
import { useStore } from "@/domain/store";
import { useCart } from "@/domain/cart";
import { consumerNotifications } from "@/domain/notifications";
import "@/styles/customer-actions.css";

export function SiteHeader({
  language,
  onLanguage,
  path,
  onNavigate,
  search,
}: {
  language: Language;
  onLanguage: (value: Language) => void;
  path: string;
  onNavigate: (path: string) => void;
  search?: SearchBarProps;
}) {
  const es = language === "es";
  const { user, logout } = useAuth();
  const { state } = useStore();
  const { items } = useCart();
  const [servicesOpen, setServicesOpen] = useState(false);
  const notifications = user ? consumerNotifications(state, user.id).length : 0;
  const links = [
    ["/", es ? "Descubre" : "Discover"],
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
      <header className={`site-header${search ? " has-search" : ""}`}>
        <div className="site-container header-inner">
          <Brand onClick={() => onNavigate("/")} />
          {search && (
            <div className="header-search">
              <SearchBar {...search} />
            </div>
          )}
          <nav
            aria-label={es ? "Navegación principal" : "Main navigation"}
            className="main-nav"
          >
            <div
              className="header-services"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setServicesOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setServicesOpen(false);
              }}
            >
              <button
                type="button"
                aria-expanded={servicesOpen}
                aria-controls="header-services-menu"
                aria-current={
                  path.startsWith("/categories") || path === "/catalog"
                    ? "page"
                    : undefined
                }
                className={
                  path.startsWith("/categories") || path === "/catalog"
                    ? "is-active"
                    : undefined
                }
                onClick={() => setServicesOpen(!servicesOpen)}
              >
                {es ? "Servicios" : "Services"}
                <PiCaretDown aria-hidden="true" />
              </button>
              {servicesOpen && (
                <div className="header-services-menu" id="header-services-menu">
                  <a
                    className="header-all-services"
                    href="#/categories"
                    onClick={() => setServicesOpen(false)}
                  >
                    {es
                      ? "Categorías y subcategorías"
                      : "Categories and subcategories"}
                    <PiArrowUpRight />
                  </a>
                  <div>
                    {categories.map((category) => (
                      <a
                        key={category.id}
                        href={`#/categories/${category.id}`}
                        onClick={() => setServicesOpen(false)}
                      >
                        {category.name[language]}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
            {[
              {
                href: "/notifications",
                label: es ? "Notificaciones" : "Notifications",
                Icon: PiBell,
                count: notifications,
              },
              {
                href: "/workspace/owner/favorites",
                label: es ? "Favoritos" : "Favorites",
                Icon: PiHeart,
                count: user ? state.favorites.length : 0,
              },
              {
                href: "/cart",
                label: es ? "Carrito" : "Cart",
                Icon: PiShoppingCart,
                count: items.length,
              },
            ].map(({ href, label, Icon, count }) => (
              <button
                type="button"
                className="header-icon-action"
                key={href}
                title={label}
                aria-label={label + (count ? ` (${count})` : "")}
                onClick={() => {
                  setServicesOpen(false);
                  onNavigate(href);
                }}
              >
                <Icon aria-hidden="true" />
                {count > 0 && (
                  <span className="header-action-count" aria-hidden="true">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            ))}
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
