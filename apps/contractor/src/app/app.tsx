import { EmailPage } from "@/auth/email-pages";
import { useEffect, useState } from "react";
import { AuthProvider } from "@/auth/auth-provider";
import { RequireAccount } from "@/auth/require-account";
import { StoreProvider } from "@/domain/store";
import { useRoute } from "@/lib/navigation";
import type { Language } from "@/domain/types";
import { LoadBoundary } from "@/components/load-boundary";
import { LoginPage } from "../modules/auth/login-page";
import { RegisterPage } from "../modules/auth/register-page";
import { ContractorLayout } from "../layouts/contractor-layout";
export function ContractorApp() {
  return (
    <AuthProvider application="contractor">
      <StoreProvider initialRole="contractor">
        <Application />
      </StoreProvider>
    </AuthProvider>
  );
}
function Application() {
  const route = useRoute(),
    [language, setLanguage] = useState<Language>("es");
  useEffect(() => {
    document.title = "HOME CONNECT · Contratistas";
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
        application="contractor"
      />
    );
  return (
    <LoadBoundary key={route.path} language={language}>
      {route.path === "/register" ? (
        <RegisterPage />
      ) : route.path === "/login" || route.path === "/" ? (
        <LoginPage />
      ) : (
        <RequireAccount role="contractor">
          <ContractorLayout
            route={route}
            language={language}
            onLanguage={setLanguage}
          />
        </RequireAccount>
      )}
    </LoadBoundary>
  );
}
