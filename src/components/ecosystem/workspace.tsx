import { SupportPanel } from "./pilot-panels";
import {
  PiSquaresFour,
  PiClipboardText,
  PiFolderOpen,
  PiHeart,
  PiChatCircleDots,
  PiGlobeHemisphereWest,
  PiArrowUpRight,
} from "react-icons/pi";
import { useStore } from "@/domain/store";
import { useAuth } from "@/auth/auth-provider";
import { navigate, type Route } from "@/lib/navigation";
import type { Language } from "@/domain/types";
import { PageTitle, Panel, Stat, Empty, copy } from "./primitives";
import { PersonCard, Missing } from "./public-pages";
import { RequestList, RequestDetail, Projects } from "./workflows";
import { Messages, CoveragePanel } from "./operations";
import { Button } from "@/components/ui/button";
const sections = [
  {
    key: "support",
    es: "Ayuda y soporte",
    en: "Help and support",
    icon: PiChatCircleDots,
  },
  { key: "overview", es: "Resumen", en: "Overview", icon: PiSquaresFour },
  { key: "requests", es: "Solicitudes", en: "Requests", icon: PiClipboardText },
  { key: "projects", es: "Proyectos", en: "Projects", icon: PiFolderOpen },
  { key: "favorites", es: "Guardados", en: "Saved", icon: PiHeart },
  { key: "messages", es: "Mensajes", en: "Messages", icon: PiChatCircleDots },
  {
    key: "coverage",
    es: "Cobertura",
    en: "Coverage",
    icon: PiGlobeHemisphereWest,
  },
];
export function Workspace({
  route,
  language,
}: {
  route: Route;
  language: Language;
}) {
  const { state } = useStore(),
    { user } = useAuth(),
    t = copy(language);
  const [, root, role, tab = "overview", id, ...rest] = route.path.split("/");
  if (
    root !== "workspace" ||
    role !== "owner" ||
    rest.length ||
    !sections.some((s) => s.key === tab) ||
    (id && !["requests", "projects"].includes(tab))
  )
    return <Missing language={language} />;
  return (
    <>
      <PageTitle
        eyebrow={t("MI CUENTA", "MY ACCOUNT")}
        title={t("Panel del consumidor", "Consumer dashboard")}
        description={
          user?.name +
          " · " +
          t(
            "Tus solicitudes, presupuestos y proyectos.",
            "Your requests, quotes and projects.",
          )
        }
      />
      <div className="workspace-shell workspace-owner">
        <nav
          className="workspace-tabs"
          aria-label={t("Secciones del espacio", "Workspace sections")}
        >
          {sections.map((item) => (
            <button
              key={item.key}
              aria-label={item[language]}
              aria-current={item.key === tab ? "page" : undefined}
              className={item.key === tab ? "selected" : ""}
              onClick={() => navigate("/workspace/owner/" + item.key)}
            >
              <item.icon />
              {item[language]}
            </button>
          ))}
        </nav>
        <div className="workspace-content">
          {tab === "support" && <SupportPanel />}
          {tab === "overview" && (
            <>
              <div className="eco-stats-grid">
                <Stat
                  label={t("Solicitudes abiertas", "Open requests")}
                  value={
                    state.requests.filter((r) => r.status === "open").length
                  }
                />
                <Stat
                  label={t("Propuestas recibidas", "Received proposals")}
                  value={
                    state.proposals.filter(
                      (p) =>
                        state.requests.some((r) => r.id === p.requestId) &&
                        p.status === "submitted",
                    ).length
                  }
                />
                <Stat
                  label={t("Proyectos en marcha", "Active projects")}
                  value={
                    state.projects.filter((p) => p.status === "active").length
                  }
                />
                <Stat
                  label={t("Perfiles guardados", "Saved profiles")}
                  value={state.favorites.length}
                />
              </div>
              <div className="workspace-welcome">
                <div>
                  <p className="eyebrow">
                    {t("UN PASO A LA VEZ", "ONE STEP AT A TIME")}
                  </p>
                  <h2>
                    {t(
                      "Dale espacio a tu próxima idea.",
                      "Make room for your next idea.",
                    )}
                  </h2>
                  <p>
                    {t(
                      "Publica una solicitud, revisa propuestas y sigue cada avance desde un mismo lugar.",
                      "Post a request, review proposals and follow every milestone in one place.",
                    )}
                  </p>
                </div>
                <Button onClick={() => navigate("/quote")}>
                  {t("Publicar proyecto", "Post project")}
                  <PiArrowUpRight />
                </Button>
              </div>
              <RequestList language={language} />
            </>
          )}
          {tab === "requests" &&
            (id ? (
              <RequestDetail key={id} id={id} language={language} />
            ) : (
              <RequestList language={language} />
            ))}
          {tab === "projects" && <Projects id={id} language={language} />}
          {tab === "messages" && <Messages route={route} language={language} />}
          {tab === "coverage" && <CoveragePanel language={language} />}
          {tab === "favorites" && (
            <Panel title={t("Profesionales guardados", "Saved professionals")}>
              {state.professionals.some(
                (p) =>
                  state.favorites.includes(p.id) &&
                  p.publication === "published",
              ) ? (
                <div className="eco-people-grid">
                  {state.professionals
                    .filter(
                      (p) =>
                        state.favorites.includes(p.id) &&
                        p.publication === "published",
                    )
                    .map((p) => (
                      <PersonCard key={p.id} person={p} language={language} />
                    ))}
                </div>
              ) : (
                <Empty
                  title={t(
                    "Guarda una buena conexión",
                    "Save a good connection",
                  )}
                  description={t(
                    "Abre una ficha y pulsa Guardar para encontrarla aquí.",
                    "Open a profile and choose Save to find it here.",
                  )}
                >
                  <Button onClick={() => navigate("/professionals")}>
                    {t("Explorar profesionales", "Explore professionals")}
                  </Button>
                </Empty>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
