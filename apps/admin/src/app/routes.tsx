import { lazy, Suspense } from "react";
import {
  PiSquaresFour,
  PiSealCheck,
  PiUsers,
  PiClipboardText,
  PiGear,
  PiPackage,
  PiGlobeHemisphereWest,
} from "react-icons/pi";
import type { Language, Role } from "@/domain/types";
import type { Route } from "@/lib/navigation";
import { Missing } from "@/components/ecosystem/public-pages";
const Overview = lazy(() =>
  import("../modules/overview/overview-page").then((m) => ({
    default: m.OverviewPage,
  })),
);
const Verifications = lazy(() =>
  import("../modules/verifications/verifications-page").then((m) => ({
    default: m.ReviewQueue,
  })),
);
const Profiles = lazy(() =>
  import("../modules/profiles/profiles-page").then((m) => ({
    default: m.PublicationManager,
  })),
);
const Catalog = lazy(() =>
  import("../modules/catalog/catalog-page").then((m) => ({
    default: m.CatalogPage,
  })),
);
const Activity = lazy(() =>
  import("../modules/activity/activity-page").then((m) => ({
    default: m.Activity,
  })),
);
const Settings = lazy(() =>
  import("../modules/settings/settings-page").then((m) => ({
    default: m.DemoSettings,
  })),
);
const Seed = lazy(() =>
  import("../modules/seed/seed-page").then((m) => ({ default: m.SeedPage })),
);
const Coverage = lazy(() =>
  import("../modules/coverage/coverage-page").then((m) => ({
    default: m.CoveragePage,
  })),
);
const Inventory = lazy(() =>
  import("../modules/inventory/inventory-page").then((m) => ({
    default: m.SupplierPanel,
  })),
);
const Team = lazy(() =>
  import("../modules/team/team-page").then((m) => ({
    default: m.OrganizationPanel,
  })),
);
export const adminModules = [
  { key: "overview", es: "Resumen", en: "Overview", icon: PiSquaresFour },
  {
    key: "verifications",
    es: "Verificaciones",
    en: "Verifications",
    icon: PiSealCheck,
  },
  { key: "profiles", es: "Perfiles", en: "Profiles", icon: PiUsers },
  { key: "catalog", es: "Catálogo", en: "Catalog", icon: PiClipboardText },
  { key: "activity", es: "Actividad", en: "Activity", icon: PiClipboardText },
  { key: "settings", es: "Configuración", en: "Settings", icon: PiGear },
  { key: "seed", es: "Datos de prueba", en: "Sample data", icon: PiPackage },
  {
    key: "coverage",
    es: "Cobertura",
    en: "Coverage",
    icon: PiGlobeHemisphereWest,
  },
  { key: "inventory", es: "Inventario", en: "Inventory", icon: PiPackage },
  { key: "team", es: "Equipo", en: "Team", icon: PiUsers },
];
export const managementSections: Partial<Record<Role, string[]>> = {
  admin: [
    "overview",
    "verifications",
    "profiles",
    "catalog",
    "activity",
    "settings",
    "seed",
    "coverage",
  ],
  supplier: ["overview", "inventory", "coverage"],
  business: ["overview", "team", "coverage"],
  ally: ["overview", "verifications", "coverage"],
};
export function AdminRoutes({
  route,
  language,
}: {
  route: Route;
  language: Language;
}) {
  const [, root, role, tab = "overview", ...extra] = route.path.split("/");
  if (
    root !== "workspace" ||
    extra.length ||
    !managementSections[role as Role]?.includes(tab)
  )
    return <Missing language={language} />;
  return (
    <Suspense fallback={<p role="status">Cargando módulo…</p>}>
      {tab === "overview" ? (
        <Overview language={language} />
      ) : tab === "verifications" ? (
        <Verifications language={language} />
      ) : tab === "profiles" ? (
        <Profiles language={language} />
      ) : tab === "catalog" ? (
        <Catalog language={language} />
      ) : tab === "activity" ? (
        <Activity language={language} />
      ) : tab === "settings" ? (
        <Settings language={language} />
      ) : tab === "seed" ? (
        <Seed language={language} />
      ) : tab === "inventory" ? (
        <Inventory language={language} />
      ) : tab === "team" ? (
        <Team language={language} />
      ) : (
        <Coverage language={language} />
      )}
    </Suspense>
  );
}
