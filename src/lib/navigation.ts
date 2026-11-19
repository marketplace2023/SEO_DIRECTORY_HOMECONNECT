import { useEffect, useState } from "react";
import { currentPortal, rolePortal, portalHref } from "./portals";
import { roleNames, type Role } from "@/domain/types";
export type Route = { path: string; params: URLSearchParams };
export function readRoute(): Route {
  const [path, query = ""] = window.location.hash.slice(1).split("?");
  return { path: path || "/", params: new URLSearchParams(query) };
}
export function navigate(path: string, params?: URLSearchParams) {
  const role = path.split("/")[2];
  const target =
    path.startsWith("/workspace/") && Object.hasOwn(roleNames, role)
      ? rolePortal(role as Role)
      : ["/login", "/register"].includes(path)
        ? currentPortal()
        : "web";
  const route = `${path}${params?.size ? `?${params}` : ""}`;
  if (target !== currentPortal()) {
    window.location.assign(portalHref(target, route));
    return;
  }
  window.location.hash = route;
}
export function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    let currentPath = readRoute().path;
    const onChange = () => {
      const next = readRoute();
      setRoute(next);
      if (currentPath !== "/areas" || next.path !== "/areas")
        window.scrollTo({ top: 0, behavior: "instant" });
      currentPath = next.path;
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
