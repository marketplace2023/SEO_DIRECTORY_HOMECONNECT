import { lazy, Suspense } from "react";
import {
  PiSquaresFour,
  PiClipboardText,
  PiFolderOpen,
  PiChatCircleDots,
  PiIdentificationCard,
  PiGlobeHemisphereWest,
  PiGear,
} from "react-icons/pi";
import type { Language } from "@/domain/types";
import type { Route } from "@/lib/navigation";
import { Missing } from "@/components/ecosystem/public-pages";
const Overview = lazy(() =>
  import("../modules/overview/overview-page").then((m) => ({
    default: m.OverviewPage,
  })),
);
const Opportunities = lazy(() =>
  import("../modules/opportunities/opportunities-page").then((m) => ({
    default: m.OpportunitiesPage,
  })),
);
const Proposals = lazy(() =>
  import("../modules/proposals/proposals-page").then((m) => ({
    default: m.ProposalsPage,
  })),
);
const Projects = lazy(() =>
  import("../modules/projects/projects-page").then((m) => ({
    default: m.ProjectsPage,
  })),
);
const Profile = lazy(() =>
  import("../modules/profile/profile-page").then((m) => ({
    default: m.ProfileEditor,
  })),
);
const Messages = lazy(() =>
  import("../modules/messages/messages-page").then((m) => ({
    default: m.MessagesPage,
  })),
);
const Coverage = lazy(() =>
  import("../modules/coverage/coverage-page").then((m) => ({
    default: m.CoveragePage,
  })),
);
const Account = lazy(() =>
  import("../modules/account/account-page").then((m) => ({
    default: m.AccountPage,
  })),
);
export const contractorModules = [
  { key: "overview", es: "Resumen", en: "Overview", icon: PiSquaresFour },
  { key: "requests", es: "Solicitudes", en: "Requests", icon: PiClipboardText },
  {
    key: "proposals",
    es: "Propuestas",
    en: "Proposals",
    icon: PiClipboardText,
  },
  { key: "projects", es: "Proyectos", en: "Projects", icon: PiFolderOpen },
  {
    key: "profile",
    es: "Mi ficha FUR",
    en: "My FUR profile",
    icon: PiIdentificationCard,
  },
  { key: "messages", es: "Mensajes", en: "Messages", icon: PiChatCircleDots },
  {
    key: "coverage",
    es: "Cobertura",
    en: "Coverage",
    icon: PiGlobeHemisphereWest,
  },
  { key: "account", es: "Mi cuenta", en: "My account", icon: PiGear },
];
export function ContractorRoutes({
  route,
  language,
  professionalId,
}: {
  route: Route;
  language: Language;
  professionalId: string;
}) {
  const [, root, role, tab = "overview", id, ...rest] = route.path.split("/");
  if (
    root !== "workspace" ||
    role !== "contractor" ||
    rest.length ||
    !contractorModules.some((m) => m.key === tab) ||
    (id && !["requests", "projects"].includes(tab))
  )
    return <Missing language={language} />;
  return (
    <Suspense fallback={<p role="status">Cargando módulo…</p>}>
      {tab === "overview" ? (
        <Overview language={language} />
      ) : tab === "requests" ? (
        <Opportunities id={id} language={language} />
      ) : tab === "proposals" ? (
        <Proposals language={language} />
      ) : tab === "projects" ? (
        <Projects id={id} language={language} />
      ) : tab === "profile" ? (
        <Profile key={`${professionalId}-${language}`} language={language} />
      ) : tab === "messages" ? (
        <Messages route={route} language={language} />
      ) : tab === "coverage" ? (
        <Coverage language={language} />
      ) : (
        <Account />
      )}
    </Suspense>
  );
}
