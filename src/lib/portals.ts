import type { Role } from "@/domain/types";
export type Portal = "web" | "contractor" | "admin";
export function rolePortal(role: Role): Portal {
  if (role === "contractor") return "contractor";
  if (["admin", "ally", "supplier", "business"].includes(role)) return "admin";
  return "web";
}
export function currentPortal(): Portal {
  const application = import.meta.env?.VITE_APPLICATION;
  if (application === "contractor" || application === "admin")
    return application;
  return "web";
}
export function portalHref(portal: Portal, route: string): string {
  const origin =
    portal === "contractor"
      ? import.meta.env?.VITE_CONTRACTOR_ORIGIN || "http://127.0.0.1:5180"
      : portal === "admin"
        ? import.meta.env?.VITE_ADMIN_ORIGIN || "http://127.0.0.1:5181"
        : import.meta.env?.VITE_WEB_ORIGIN || "http://127.0.0.1:5175";
  return `${origin.replace(/\/$/, "")}/#${route}`;
}
export function workspaceHref(role: Role, path = `/workspace/${role}`): string {
  return portalHref(rolePortal(role), path);
}
