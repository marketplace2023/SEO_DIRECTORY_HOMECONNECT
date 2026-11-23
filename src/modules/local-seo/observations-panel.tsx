import { Panel, Empty } from "@/components/ecosystem/primitives";
import { Button } from "@/components/ui/button";
import { CitationForm, CompetitorForm, type SeoAction } from "./forms";
import { Pages, stamp } from "./management-panels";
import { napDifferences, type SeoWorkspace } from "@/domain/local-seo";
export function ObservationsPanel({
  workspace,
  act,
  busy,
}: {
  workspace: SeoWorkspace;
  act: SeoAction;
  busy: boolean;
}) {
  const manage = workspace.permissions?.manage,
    p = workspace.project;
  const remove = async (kind: string, id: string) => {
    if (
      window.confirm(
        "¿Eliminar este registro? Las mediciones históricas se conservan.",
      )
    ) {
      try {
        await act("remove", { kind, id });
      } catch {}
    }
  };
  return (
    <div className="space-y-6">
      {manage && (
        <Panel title="Registrar citación observada">
          <CitationForm act={act} busy={busy} />
        </Panel>
      )}
      <Panel title="Observaciones NAP de directorios">
        <p className="mb-5 text-xs leading-6 text-neutral-500">
          Las observaciones anteriores se conservan para auditoría. El catálogo
          y los estados de los listados se gestionan en Directorios; estos
          registros no los sustituyen ni verifican automáticamente.
        </p>
        {!p.citations.length && <Empty title="Sin observaciones NAP" />}
        <Pages
          rows={p.citations}
          render={(c) => (
            <article key={c.id} className="rounded-xl border p-4 text-sm">
              <a
                className="font-semibold text-primary underline"
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.directory}
              </a>
              <p className="my-3">{stamp(c.observedAt)}</p>
              <p>
                {c.nap.name} · {c.nap.phone} · {c.nap.address}
              </p>
              <p className="mt-3 text-xs">
                {napDifferences(p.nap, c.nap)
                  .map(
                    (f) =>
                      `${f.field}: ${f.status === "match" ? "Coincide" : f.status === "unknown" ? "Sin comprobar" : "Diferente"}`,
                  )
                  .join(" · ")}
              </p>
              {manage && (
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => void remove("citations", c.id)}
                >
                  Eliminar citación
                </Button>
              )}
            </article>
          )}
        />
      </Panel>
      {manage && (
        <Panel title="Documentar competidor">
          <CompetitorForm act={act} busy={busy} />
        </Panel>
      )}
      <Panel title="Competidores documentados">
        <Pages
          rows={p.competitors}
          render={(c) => (
            <article key={c.id} className="rounded-xl border p-4 text-sm">
              <h3 className="font-semibold">{c.name}</h3>
              <p className="mt-2">{stamp(c.observedAt)}</p>
              {c.website && (
                <a
                  className="mt-2 block text-primary underline"
                  href={c.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sitio web
                </a>
              )}
              {manage && (
                <>
                  <p className="my-3">{c.notes}</p>
                  <Button
                    variant="ghost"
                    onClick={() => void remove("competitors", c.id)}
                  >
                    Eliminar competidor
                  </Button>
                </>
              )}
            </article>
          )}
        />
      </Panel>
      <Panel title="Reseñas propias de HOME CONNECT">
        <p className="mb-4 text-sm">
          {workspace.reputation.count} reseñas publicadas · Media:{" "}
          {workspace.reputation.average?.toFixed(1) || "Sin datos"}
        </p>
        <Pages
          rows={workspace.reputation.reviews}
          render={(r) => (
            <article key={r.id} className="border-b py-4 text-sm">
              <p>
                {r.rating}/5 · {stamp(r.createdAt)}
              </p>
              <p className="mt-2">{r.text}</p>
              {r.reply && (
                <p className="mt-3 text-neutral-500">Respuesta: {r.reply}</p>
              )}
            </article>
          )}
        />
      </Panel>
    </div>
  );
}
