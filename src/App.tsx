import { isUsProfessional } from "@/domain/us-area";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  PiArrowLeft,
  PiArrowUpRight,
  PiGlobeHemisphereWest,
  PiBookOpen,
} from "react-icons/pi";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StoreProvider, useStore } from "@/domain/store";
import { roleNames, type Language, type Role } from "@/domain/types";
import { rolePortal, workspaceHref } from "@/lib/portals";
import { navigate, useRoute } from "@/lib/navigation";
import {
  CatalogPage,
  DirectoryPage,
  ProfilePage,
  ServicePage,
  Missing,
} from "@/components/ecosystem/public-pages";
import { RequestPage } from "@/components/ecosystem/request-page";
import { ContactAccountDialog } from "@/components/ecosystem/contact-account-dialog";
import { copy } from "@/components/ecosystem/primitives";
import { EnvironmentAccess } from "@/components/ecosystem/environment-access";
import { MapSurface } from "@/components/ecosystem/map-surface";
import { LoadBoundary } from "@/components/load-boundary";
import { AuthProvider, useAuth } from "@/auth/auth-provider";
import { RequireAccount } from "@/auth/require-account";
import { LoginPage } from "@/modules/auth/login-page";
import { RegisterPage } from "@/modules/auth/register-page";
import { EmailPage, VerificationNotice } from "@/auth/email-pages";
import "@/styles/ecosystem.css";
import "@/styles/yelp-theme.css";
import "@/styles/portals.css";
import "@/styles/discovery.css";
import "@/styles/us-area.css";
import "@/styles/search.css";
import { searchParams } from "@/domain/search";
import { mostRequestedProfessionals } from "@/domain/queries";
import { CartProvider } from "@/domain/cart";
import {
  CartPage,
  NotificationsPage,
} from "@/components/ecosystem/customer-pages";
const HomePage = lazy(() =>
  import("@/components/home-page").then((module) => ({
    default: module.HomePage,
  })),
);
const AreaExplorer = lazy(() =>
  import("@/components/ecosystem/area-explorer").then((module) => ({
    default: module.AreaExplorer,
  })),
);
const Workspace = lazy(() =>
  import("@/components/ecosystem/workspace").then((module) => ({
    default: module.Workspace,
  })),
);
const Resources = lazy(() =>
  import("@/components/ecosystem/resources").then((module) => ({
    default: module.Resources,
  })),
);
function Loading() {
  return (
    <div
      className="site-container loading-home"
      role="status"
      aria-label="Cargando / Loading"
    >
      <div />
      <div />
    </div>
  );
}
export default function App() {
  return (
    <AuthProvider application="web">
      <StoreProvider>
        <CartProvider>
          <Ecosystem />
        </CartProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
function Ecosystem() {
  const route = useRoute();
  const { user, checking } = useAuth();
  const { state, role, setRole, storageError, syncError } = useStore();
  const [language, setLanguage] = useState<Language>("es");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const t = copy(language);
  const parts = route.path.split("/").filter(Boolean);
  const workspaceRole =
    parts[0] === "workspace" && Object.hasOwn(roleNames, parts[1])
      ? (parts[1] as Role)
      : undefined;
  useEffect(() => {
    if (workspaceRole && rolePortal(workspaceRole) !== "web") {
      window.location.replace(
        workspaceHref(
          workspaceRole,
          `${route.path}${route.params.size ? `?${route.params}` : ""}`,
        ),
      );
      return;
    }
    if (workspaceRole === "owner" && role !== "owner") setRole("owner");
    else if (route.path === "/quote" && role !== "owner") setRole("owner");
  }, [workspaceRole, route.path, role, setRole]);
  useEffect(() => {
    document.documentElement.lang = language;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      robots.content = "noindex,follow";
      document.head.append(robots);
    }
    robots.dataset.publicRobots ||= robots.content;
    robots.content =
      [
        "/login",
        "/register",
        "/quote",
        "/verify-email",
        "/forgot-password",
        "/reset-password",
      ].includes(route.path) || route.path.startsWith("/workspace/")
        ? "noindex,nofollow"
        : robots.dataset.publicRobots;
    document.title =
      route.path === "/"
        ? "HOME CONNECT — Grandes ideas. Las manos correctas."
        : `HOME CONNECT · ${route.path.startsWith("/workspace") ? t("Mi espacio", "My workspace") : route.path.startsWith("/catalog") ? t("Catálogo", "Catalog") : t("Conecta con profesionales", "Connect with professionals")}`;
  }, [language, route.path]);
  const search = {
    language,
    query,
    city,
    country,
    onQuery: setQuery,
    onCity: setCity,
    onCountry: setCountry,
    onSearch: () => {
      navigate("/professionals", searchParams(query, city, country));
    },
  };
  const people = mostRequestedProfessionals(state);
  const content = () => {
    if (route.path === "/cart") return <CartPage language={language} />;
    if (route.path === "/notifications")
      return <NotificationsPage language={language} />;
    if (route.path === "/")
      return (
        <HomePage
          search={search}
          professionals={people}
          onCategory={(id) =>
            navigate("/catalog", new URLSearchParams({ category: id }))
          }
          onProfile={(id) => navigate(`/professionals/${id}`)}
          onExplore={() => navigate("/professionals")}
          onQuote={() => navigate("/quote")}
        />
      );
    if (route.path === "/catalog")
      return <CatalogPage route={route} language={language} />;
    if (route.path === "/professionals")
      return <DirectoryPage route={route} language={language} />;
    if (parts[0] === "professionals" && parts.length === 2)
      return (
        <ProfilePage
          id={parts[1]}
          language={language}
          resumeReview={route.params.get("review") === "1"}
        />
      );
    if (parts[0] === "services" && parts.length === 2)
      return <ServicePage id={parts[1]} language={language} />;
    const quote = route.path === "/quote";
    const message = route.path === "/workspace/owner/messages";
    if ((quote || message) && checking) return <Loading />;
    if ((quote || message) && !user) {
      const params = new URLSearchParams(route.params);
      params.delete("guest");
      const professional = state.professionals.find(
        (person) =>
          person.id === params.get("professional") &&
          person.publication === "published" &&
          isUsProfessional(person),
      );
      const next = route.path + (params.size ? "?" + params : "");
      return (
        <ContactAccountDialog
          key={next}
          next={next}
          message={message}
          person={professional}
          language={language}
        />
      );
    }
    if (quote)
      return (
        <RequestPage
          key={route.params.toString()}
          route={route}
          language={language}
        />
      );
    if (parts[0] === "workspace")
      return workspaceRole &&
        (rolePortal(workspaceRole) !== "web" || role !== workspaceRole) ? (
        <Loading />
      ) : (
        <RequireAccount role="owner">
          <Workspace route={route} language={language} />
        </RequireAccount>
      );
    if (parts[0] === "resources" && parts.length <= 2)
      return <Resources id={parts[1]} language={language} />;
    if (route.path === "/coverage") return <CoveragePage language={language} />;
    if (route.path === "/areas")
      return <AreaExplorer route={route} language={language} />;
    return <Missing language={language} />;
  };
  if (route.path === "/login") return <LoginPage />;
  if (route.path === "/register") return <RegisterPage />;
  if (
    ["/verify-email", "/forgot-password", "/reset-password"].includes(
      route.path,
    )
  )
    return (
      <EmailPage
        mode={route.path.slice(1) as "verify-email"}
        application="web"
      />
    );
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
          document.getElementById("main-content")?.scrollIntoView();
        }}
      >
        {t("Saltar al contenido", "Skip to content")}
      </a>
      <SiteHeader
        search={route.path === "/" ? search : undefined}
        language={language}
        onLanguage={setLanguage}
        path={route.path}
        onNavigate={navigate}
      />
      <EnvironmentAccess language={language} path={route.path} />
      <div className="ecosystem-strip site-container">
        <button onClick={() => navigate("/catalog")}>
          {t("Catálogo de servicios", "Service catalog")}
          <PiArrowUpRight />
        </button>
        <button onClick={() => navigate("/coverage")}>
          <PiGlobeHemisphereWest />
          {t("Cobertura", "Coverage")}
        </button>
        <button onClick={() => navigate("/areas")}>
          <PiGlobeHemisphereWest />
          {t("Mapa de zonas", "Area map")}
        </button>
        <button onClick={() => navigate("/resources")}>
          <PiBookOpen />
          {t("Guías y recursos", "Guides and resources")}
        </button>
        <span>
          {t("Ecosistema de demostración", "Demonstration ecosystem")}
        </span>
      </div>
      {storageError && (
        <p role="alert" className="site-container eco-error">
          {t(
            "Este navegador no permite guardar los cambios. Permanecerán disponibles mientras la pestaña esté abierta.",
            "This browser cannot save changes. They remain available while this tab is open.",
          )}
        </p>
      )}
      {syncError && (
        <p className="site-container eco-error">
          {t(
            "Sin conexión al servicio de datos. Los cambios quedan en este navegador hasta recuperar la conexión.",
            "The shared data service is unavailable. Changes remain in this browser until reconnection.",
          )}
        </p>
      )}
      <main id="main-content" tabIndex={-1} data-application="marketplace">
        <div className="site-container">
          <VerificationNotice />
        </div>
        <LoadBoundary key={route.path} language={language} scope="page">
          <Suspense fallback={<Loading />}>
            {route.path === "/" ? (
              content()
            ) : (
              <div className="inner-page site-container">
                <div className="page-breadcrumb">
                  <button onClick={() => navigate("/")}>
                    <PiArrowLeft />
                    {t("Inicio", "Home")}
                  </button>
                  <span>
                    /{" "}
                    {parts[0] === "workspace"
                      ? t("Mi espacio", "My workspace")
                      : parts[0] === "quote"
                        ? t("Publicar proyecto", "Post a project")
                        : parts[0] === "catalog"
                          ? t("Catálogo", "Catalog")
                          : parts[0] === "resources"
                            ? t("Guías", "Guides")
                            : t("Explorar", "Explore")}
                  </span>
                </div>
                {content()}
              </div>
            )}
          </Suspense>
        </LoadBoundary>
      </main>
      <SiteFooter
        language={language}
        onLanguage={setLanguage}
        onNavigate={navigate}
      />
    </>
  );
}
function CoveragePage({ language }: { language: Language }) {
  return <MapSurface language={language} />;
}
