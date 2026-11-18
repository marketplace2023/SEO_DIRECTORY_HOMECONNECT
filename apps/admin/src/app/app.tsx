import { EmailPage } from "@/auth/email-pages";
import { useEffect, useState } from "react";
import { AuthProvider } from "@/auth/auth-provider";
import { RequireAccount } from "@/auth/require-account";
import { StoreProvider } from "@/domain/store";
import { useRoute } from "@/lib/navigation";
import type { Language } from "@/domain/types";
import { LoadBoundary } from "@/components/load-boundary";
import { Missing } from "@/components/ecosystem/public-pages";
import { LoginPage } from "../modules/auth/login-page";
import { AdminLayout } from "../layouts/admin-layout";
export function AdminApp() {
  return (
    <AuthProvider application="admin">
      <StoreProvider initialRole="admin">
        <Application />
      </StoreProvider>
    </AuthProvider>
  );
}
function Application() {
  const route = useRoute(),
    [language, setLanguage] = useState<Language>("es");
  useEffect(() => {
    document.title = "HOME CONNECT · Administración";
    document.documentElement.lang = language;
  }, [language]);
  if (
    ["/verify-email", "/forgot-password", "/reset-password"].includes(
      route.path,
    )
  )
    return (
      <EmailPage
        mode={route.path.slice(1) as "verify-email"}
        application="admin"
      />
    );
  return (
    <LoadBoundary key={route.path} language={language}>
      {route.path === "/login" || route.path === "/" ? (
        <LoginPage />
      ) : route.path === "/register" ? (
        <Missing language={language} />
      ) : (
        <RequireAccount role="admin">
          <AdminLayout
            route={route}
            language={language}
            onLanguage={setLanguage}
          />
        </RequireAccount>
      )}
    </LoadBoundary>
  );
}
