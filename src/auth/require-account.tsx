import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth-provider";
import type { AccountRole } from "./types";
export function RequireAccount({
  role,
  children,
}: {
  role: AccountRole;
  children: ReactNode;
}) {
  const { user, checking } = useAuth();
  useEffect(() => {
    if (!checking && (!user || user.role !== role)) {
      const next = window.location.hash.slice(1) || "/";
      window.location.replace("#/login?next=" + encodeURIComponent(next));
    }
  }, [checking, user, role]);
  if (checking)
    return (
      <p className="account-loading" role="status">
        Comprobando sesión…
      </p>
    );
  if (!user || user.role !== role)
    return (
      <p className="account-loading" role="status">
        Abriendo inicio de sesión…
      </p>
    );
  return children;
}
