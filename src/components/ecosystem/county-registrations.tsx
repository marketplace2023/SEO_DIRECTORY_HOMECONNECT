import { useState, useEffect } from "react";
import { useStore } from "@/domain/store";
import { Panel, copy } from "@/components/ecosystem/primitives";
import { countyById } from "@/domain/us-area";
import type { Language } from "@/domain/types";
import { portalHref } from "@/lib/portals";
import { apiRequest } from "@/lib/http";

type CountyCounts = { county: string; customers: number; contractors: number };

export function CountyRegistrations({
  language,
  county,
}: {
  language: Language;
  county?: string;
}) {
  const t = copy(language);
  const { state } = useStore();
  const [counts, setCounts] = useState<CountyCounts[]>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiRequest<CountyCounts[]>(
      county
        ? "/api/public/county-registrations"
        : "/api/admin/county-registrations",
    )
      .then((rows) => {
        if (active)
          setCounts(
            county ? rows.filter((row) => row.county === county) : rows,
          );
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [county]);
  return (
    <Panel title={t("Registros por condado", "Registrations by county")}>
      <p className="eco-note">
        {t(
          "Cuentas creadas que declararon su condado al registrarse. Se excluyen las cuentas de demostración.",
          "Created accounts that selected their county at registration. Demo accounts are excluded.",
        )}
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : counts ? (
        <div className="table-scroll">
          <table className="eco-table">
            <thead>
              <tr>
                <th>{t("Condado", "County")}</th>
                <th>{t("Clientes", "Customers")}</th>
                <th>{t("Contratistas", "Contractors")}</th>
                <th>{t("Ficha de demostración", "Demo profile")}</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((row) => {
                const demo = state.professionals.find(
                  (p) =>
                    p.id === "demo-" + row.county &&
                    p.publication === "published",
                );
                return (
                  <tr key={row.county}>
                    <th scope="row">
                      <a
                        className="underline"
                        href={portalHref(
                          "web",
                          "/areas?state=GA&county=" + row.county,
                        )}
                      >
                        {countyById.get(row.county)} County, Georgia
                      </a>
                    </th>
                    <td>{row.customers}</td>
                    <td>{row.contractors}</td>
                    <td>
                      {demo ? (
                        <a
                          className="underline"
                          href={portalHref("web", "/professionals/" + demo.id)}
                        >
                          {demo.name} · {demo.city}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p role="status">
          {t("Cargando registros…", "Loading registrations…")}
        </p>
      )}
      {county && (
        <div className="eco-actions">
          <a
            className="underline"
            href={portalHref("web", "/register?county=" + county)}
          >
            {t("Registrarme como cliente", "Register as a customer")}
          </a>
          <a
            className="underline"
            href={portalHref("contractor", "/register?county=" + county)}
          >
            {t("Registrarme como contratista", "Register as a contractor")}
          </a>
        </div>
      )}
    </Panel>
  );
}
