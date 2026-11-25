import { PiGlobeHemisphereWest, PiMapPin } from "react-icons/pi";
import { Brand } from "@/components/brand";
import { useStore } from "@/domain/store";
import { searchLocations, searchParams } from "@/domain/search";
import { portalHref } from "@/lib/portals";
import { navigate } from "@/lib/navigation";
import type { Language } from "@/domain/types";
import "@/styles/footer.css";

export function SiteFooter({
  language,
  onLanguage,
  onNavigate,
}: {
  language: Language;
  onLanguage: (language: Language) => void;
  onNavigate: (path: string) => void;
}) {
  const es = language === "es";
  const { state } = useStore();
  const locations = searchLocations(state.professionals, language).sort(
    (a, b) => a.label.localeCompare(b.label, language),
  );
  const groups = [
    {
      title: es ? "Explora HOME CONNECT" : "Explore HOME CONNECT",
      links: [
        [
          "#/categories",
          es ? "Categorías y subcategorías" : "Categories and subcategories",
        ],
        [
          "#/professionals",
          es ? "Directorio de contratistas" : "Contractor directory",
        ],
        [
          "#/areas",
          es ? "Explorar por estado y ciudad" : "Explore by state and city",
        ],
        ["/georgia", es ? "Servicios en Georgia" : "Georgia local services"],
        ["#/coverage", es ? "Mapa de profesionales" : "Professional map"],
        ["#/", es ? "Volver al inicio" : "Back to home"],
      ],
    },
    {
      title: es ? "Para consumidores" : "For consumers",
      links: [
        ["#/quote", es ? "Solicitar un presupuesto" : "Request a quote"],
        ["#/workspace/owner", es ? "Mi espacio" : "My workspace"],
        ["#/workspace/owner/requests", es ? "Mis solicitudes" : "My requests"],
        ["#/workspace/owner/projects", es ? "Mis proyectos" : "My projects"],
        [
          "#/workspace/owner/favorites",
          es ? "Profesionales favoritos" : "Favorite professionals",
        ],
        ["#/register", es ? "Crear una cuenta" : "Create an account"],
      ],
    },
    {
      title: es ? "Para contratistas" : "For contractors",
      links: [
        [
          portalHref("contractor", "/login"),
          es ? "Acceder al portal" : "Portal sign in",
        ],
        [
          portalHref("contractor", "/register"),
          es ? "Registrar mi empresa" : "Register my business",
        ],
        [
          portalHref("contractor", "/workspace/contractor/profile"),
          es ? "Mi ficha profesional" : "My professional profile",
        ],
        [
          portalHref("contractor", "/workspace/contractor/requests"),
          es ? "Oportunidades de trabajo" : "Job opportunities",
        ],
        [
          portalHref("contractor", "/workspace/contractor/proposals"),
          es ? "Mis propuestas" : "My proposals",
        ],
      ],
    },
    {
      title: es ? "Guías y recursos" : "Guides and resources",
      links: [
        ["#/resources", es ? "Todas las guías" : "All guides"],
        [
          "#/resources/planificar",
          es ? "Planificar un proyecto" : "Plan a project",
        ],
        [
          "#/resources/comparar",
          es ? "Comparar presupuestos" : "Compare quotes",
        ],
        [
          "#/resources/credenciales",
          es ? "Entender las credenciales" : "Understand credentials",
        ],
        [
          portalHref("admin", "/workspace/admin"),
          es ? "Administración del ecosistema" : "Ecosystem administration",
        ],
      ],
    },
  ];
  return (
    <footer className="site-footer footer-directory">
      <div className="site-container">
        <div className="footer-directory-grid">
          {groups.map((group) => (
            <nav
              key={group.title}
              aria-label={group.title}
              className="footer-directory-column"
            >
              <h2>{group.title}</h2>
              <ul>
                {group.links.map(([href, title]) => (
                  <li key={href}>
                    <a href={href}>{title}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="footer-directory-column footer-preferences">
            <h2>{es ? "Preferencias" : "Preferences"}</h2>
            <label>
              <span>
                <PiGlobeHemisphereWest aria-hidden="true" />
                {es ? "Idioma" : "Language"}
              </span>
              <select
                aria-label={es ? "Idioma" : "Language"}
                value={language}
                onChange={(event) => onLanguage(event.target.value as Language)}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              <span>
                <PiMapPin aria-hidden="true" />
                {es ? "Ciudad o zona" : "City or area"}
              </span>
              <select
                aria-label={es ? "Ciudad o zona" : "City or area"}
                value=""
                onChange={(event) => {
                  if (!event.target.value) return;
                  const location = locations[Number(event.target.value)];
                  navigate(
                    "/professionals",
                    searchParams("", location.city, location.country),
                  );
                }}
              >
                <option value="">
                  {es ? "Explora una ubicación" : "Explore a location"}
                </option>
                {locations.map((location, index) => (
                  <option value={index} key={location.city + location.country}>
                    {location.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="footer-directory-bottom">
          <Brand full onClick={() => onNavigate("/")} />
          <div>
            <p>© {new Date().getFullYear()} HOME CONNECT</p>
            <p>
              {es
                ? "Prototipo · Perfiles y proyectos ilustrativos. Sin contrataciones reales."
                : "Prototype · Illustrative profiles and projects. No real bookings."}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
