import { PiArrowUpRight } from "react-icons/pi";
import { Brand } from "@/components/brand";
import type { Language } from "@/domain/types";
export function SiteFooter({
  language,
  onNavigate,
}: {
  language: Language;
  onNavigate: (path: string) => void;
}) {
  const es = language === "es";
  return (
    <footer className="site-footer site-container">
      <div className="footer-top">
        <div>
          <Brand onClick={() => onNavigate("/")} />
          <p>
            {es
              ? "El talento conecta. Las ideas toman forma."
              : "Talent connects. Ideas take shape."}
          </p>
        </div>
        <nav aria-label="Footer">
          <a href="/georgia">Georgia · Local services ↗</a>
          {[
            ["/catalog", es ? "Explorar servicios" : "Explore services"],
            ["/resources", es ? "Guías y recursos" : "Guides and resources"],
            [
              "/workspace/contractor",
              es ? "Espacio profesional" : "Professional space",
            ],
            [
              "/workspace/admin",
              es ? "Administración demo" : "Demo administration",
            ],
          ].map(([path, title]) => (
            <button key={path} onClick={() => onNavigate(path)}>
              {title}
              <PiArrowUpRight />
            </button>
          ))}
        </nav>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} HOME CONNECT</span>
        <p>
          {es
            ? "Prototipo · Perfiles y proyectos ilustrativos. Sin contrataciones reales."
            : "Prototype · Illustrative profiles and projects. No real bookings."}
        </p>
        <span>{es ? "Hecho para conectar ↗" : "Made to connect ↗"}</span>
      </div>
    </footer>
  );
}
