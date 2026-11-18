import {
  PiArrowUpRight,
  PiHouseLine,
  PiHardHat,
  PiShieldCheck,
  PiMapTrifold,
} from "react-icons/pi";
import type { Language } from "@/domain/types";
import { useStore } from "@/domain/store";
import { navigate } from "@/lib/navigation";
import { workspaceHref } from "@/lib/portals";
import { copy } from "./primitives";

export function EnvironmentAccess({
  language,
  path,
}: {
  language: Language;
  path: string;
}) {
  const t = copy(language);
  return (
    <nav
      className="environment-access"
      aria-label={t("Entornos del ecosistema", "Ecosystem environments")}
    >
      <div className="site-container environment-access-inner">
        <span>{t("Explora HOME CONNECT", "Explore HOME CONNECT")}</span>
        {[
          {
            path: "/workspace/owner",
            name: t("Consumidor", "Consumer"),
            Icon: PiHouseLine,
          },
          {
            path: "/workspace/contractor",
            name: t("Contratista", "Contractor"),
            Icon: PiHardHat,
          },
          {
            path: "/workspace/admin",
            name: t("Administrador", "Administrator"),
            Icon: PiShieldCheck,
          },
          {
            path: "/coverage",
            name: t("Mapa de profesionales", "Professional map"),
            Icon: PiMapTrifold,
          },
        ].map((item) => (
          <a
            key={item.path}
            href={
              item.path === "/workspace/contractor"
                ? workspaceHref("contractor")
                : item.path === "/workspace/admin"
                  ? workspaceHref("admin")
                  : `#${item.path}`
            }
            aria-current={path.startsWith(item.path) ? "page" : undefined}
          >
            <item.Icon />
            {item.name}
          </a>
        ))}
      </div>
    </nav>
  );
}
export function EnvironmentCards({ language }: { language: Language }) {
  const { state } = useStore();
  const t = copy(language);
  return (
    <section className="environment-cards-section site-container">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {t(
              "UN ECOSISTEMA. TRES FORMAS DE VIVIRLO.",
              "ONE ECOSYSTEM. THREE WAYS TO EXPLORE IT.",
            )}
          </p>
          <h2>{t("Entra a tu espacio.", "Enter your workspace.")}</h2>
        </div>
        <span className="eco-demo-flag">
          {t("Datos de prueba ya cargados", "Sample data already loaded")}
        </span>
      </div>
      <div className="environment-cards">
        {[
          {
            role: "owner",
            name: t("Soy consumidor", "For consumers"),
            Icon: PiHouseLine,
            text: t(
              "Tus solicitudes, presupuestos, favoritos y proyectos en un solo lugar.",
              "Your requests, quotes, saved profiles and projects in one place.",
            ),
            metric: `${state.requests.length} ${t("solicitudes de muestra", "sample requests")}`,
          },
          {
            role: "contractor",
            name: t("Soy contratista", "For contractors"),
            Icon: PiHardHat,
            text: t(
              "Encuentra oportunidades, envía propuestas y gestiona tu trabajo.",
              "Find opportunities, send proposals and manage your work.",
            ),
            metric: `${state.proposals.length} ${t("propuestas de muestra", "sample proposals")}`,
          },
          {
            role: "admin",
            name: t("Soy administrador", "For administrators"),
            Icon: PiShieldCheck,
            text: t(
              "Supervisa perfiles, verificaciones, catálogo y actividad del ecosistema.",
              "Manage profiles, verifications, catalog and ecosystem activity.",
            ),
            metric: `${state.professionals.length} ${t("contratistas de prueba", "sample contractors")}`,
          },
        ].map((item) => (
          <button
            className="environment-card"
            key={item.role}
            onClick={() => navigate(`/workspace/${item.role}`)}
          >
            <item.Icon />
            <h3>{item.name}</h3>
            <p>{item.text}</p>
            <span>
              {item.metric}
              <PiArrowUpRight />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
