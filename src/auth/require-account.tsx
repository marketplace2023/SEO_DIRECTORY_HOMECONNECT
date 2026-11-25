import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth-provider";
import type { AccountRole } from "./types";
import { VerificationNotice } from "./email-pages";
export function RequireAccount({
  role,
  children,
}: {
  role: AccountRole;
  children: ReactNode;
}) {
  const { user, checking } = useAuth();
  const authorized =
    user?.role === role || (role === "admin" && user?.role === "seo");
  const requested = window.location.hash.slice(1) || "/";
  useEffect(() => {
    if (
      !checking &&
      !authorized &&
      !/^\/(login|register)(\?|$)/.test(requested) &&
      window.location.hash.slice(1) === requested
    ) {
      window.location.replace("#/login?next=" + encodeURIComponent(requested));
    }
  }, [checking, user, role, requested, authorized]);
  if (checking)
    return (
      <p className="account-loading" role="status">
        Comprobando sesión…
      </p>
    );
  if (!user || !authorized)
    return (
      <p className="account-loading" role="status">
        Abriendo inicio de sesión…
      </p>
    );
  if (!user.emailVerified && window.location.hash.startsWith("#/quote"))
    return <VerificationNotice />;
  return children;
}
