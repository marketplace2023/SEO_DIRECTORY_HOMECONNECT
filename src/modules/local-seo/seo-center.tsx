import { ObservationsPanel } from "./observations-panel";
import { useEffect, useState } from "react";
import { PiChartLineUp, PiLockSimple, PiDownloadSimple } from "react-icons/pi";
import { useAuth } from "@/auth/auth-provider";
import { apiRequest } from "@/lib/http";
import type { SeoWorkspace } from "@/domain/local-seo";
import type { AuthUser } from "@/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, Panel, Empty, Stat } from "@/components/ecosystem/primitives";
import { RankGrid } from "./rank-grid";
import {
  SeoForm,
  value,
  CitationForm,
  CompetitorForm,
  type SeoAction,
} from "./forms";
import {
  NapPanel,
  KeywordsPanel,
  ContentPanel,
  DirectoriesPanel,
  Pages,
  stamp,
  statusLabels,
  TextField,
} from "./management-panels";
import { exportSeoJson, exportSeoCsv } from "./export";
type Profile = { id: string; name: string; city: string };
const sections = [
  ["overview", "Resumen"],
  ["profile", "NAP y perfil"],
  ["keywords", "Keywords"],
  ["content", "Contenido"],
  ["directories", "Directorios"],
  ["grid", "Local Grid / Local Pack"],
  ["audit", "Auditoría y tareas"],
  ["observations", "Citaciones y competidores"],
  ["reports", "Reportes e historial"],
];
export function LocalSeoPage({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]),
    [selected, setSelected] = useState(""),
    [search, setSearch] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiRequest<Profile[]>("/api/local-seo/profiles")
      .then((rows) => {
        if (active) setProfiles(rows);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);
  const professional = admin
    ? profiles.find((p) => p.id === selected)?.id || profiles[0]?.id
    : user?.professionalId;
  return (
    <section className="min-w-0 space-y-6" aria-label="Centro SEO local">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
            <PiChartLineUp /> HOME CONNECT · SEO LOCAL
          </p>
          <h2 className="text-3xl font-bold tracking-tight">
            {admin ? "Centro SEO local" : "Mi SEO local"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500">
            {admin
              ? "Gestiona la estrategia de cada contratista y conserva la evidencia de sus resultados."
              : "Consulta la estrategia y los resultados que el equipo SEO gestiona para tu negocio."}
          </p>
        </div>
        {admin && (
          <div className="grid w-full gap-3 sm:w-80">
            <Field label="Buscar contratista">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre o ciudad"
              />
            </Field>
            <Field label="Negocio a gestionar">
              <NativeSelect
                value={professional || ""}
                onChange={(e) => setSelected(e.target.value)}
              >
                {profiles
                  .filter(
                    (p) =>
                      p.id === professional ||
                      `${p.name} ${p.city}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.city}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
          </div>
        )}
      </header>
      {error && <p role="alert">{error}</p>}
      {professional ? (
        <Workspace key={professional} professional={professional} />
      ) : (
        <Empty
          title={
            admin
              ? "No tienes contratistas asignados"
              : "Tu cuenta necesita una ficha profesional vinculada"
          }
        />
      )}
      {user?.role === "admin" && <SeoUsers profiles={profiles} />}
    </section>
  );
}
function Workspace({ professional }: { professional: string }) {
  const [data, setData] = useState<SeoWorkspace | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("overview"),
    [message, setMessage] = useState("");
  const [from, setFrom] = useState(""),
    [until, setUntil] = useState(""),
    [keyword, setKeyword] = useState("");
  const suffix = `?professional=${encodeURIComponent(professional)}`;
  const load = () =>
    apiRequest<SeoWorkspace>("/api/local-seo/workspace" + suffix);
  useEffect(() => {
    let active = true;
    load()
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [professional]);
  const act: SeoAction = async (path, body) => {
    if (busy) throw Error("Espera a que termine la operación actual.");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/api/local-seo/" + path + suffix, body);
      setData(await load());
      setMessage("Cambios guardados.");
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const invoke = (path: string, body: unknown) => {
    void act(path, body).catch(() => {});
  };
  if (!data)
    return (
      <Panel title="Cargando espacio SEO">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <Button
              onClick={() => {
                setError("");
                void load()
                  .then(setData)
                  .catch((e) => setError(e.message));
              }}
            >
              Reintentar
            </Button>
          </>
        ) : (
          <p role="status">Cargando información del negocio…</p>
        )}
      </Panel>
    );
  const p = data.project,
    manage = !!data.permissions?.manage;
  const runs = data.runs.filter(
    (r) =>
      (!from || r.observedAt.slice(0, 10) >= from) &&
      (!until || r.observedAt.slice(0, 10) <= until) &&
      (!keyword ||
        p.campaigns.find((c) => c.id === r.campaignId)?.keywordId === keyword),
  );
  const filtered = { ...data, runs };
  return (
    <div className="min-w-0 space-y-6">
      {!manage && (
        <p className="flex items-center gap-2 rounded-lg border bg-neutral-50 px-4 py-3 text-sm">
          <PiLockSimple />
          Solo lectura · Información gestionada por el equipo SEO
        </p>
      )}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        {manage
          ? data.providers.message
          : "Aquí se muestran las mediciones registradas para tu negocio."}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}
      <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-6">
        <div className="min-w-0 overflow-x-auto pb-2">
          <TabsList className="h-11 w-max">
            {sections.map(([id, label]) => (
              <TabsTrigger key={id} value={id}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Perfil SEO"
              value={p.status ? statusLabels[p.status] : "Sin configurar"}
            />
            <Stat
              label="Keywords activas / 25"
              value={(p.keywords || []).filter((k) => k.active).length}
            />
            <Stat
              label="Directorios asociados"
              value={p.listings?.length || 0}
            />
            <Stat
              label="Mediciones propias"
              value={data.runs.filter((r) => r.targetId === "business").length}
            />
          </div>
          <Panel title="Estrategia de tu negocio">
            <div className="grid gap-6 text-sm sm:grid-cols-2">
              <div>
                <h3 className="font-semibold">{p.nap.name}</h3>
                <p className="mt-2">
                  {data.business?.city}, {data.business?.region}
                </p>
                <p className="mt-2">
                  {!p.nap.phone
                    ? "Falta teléfono en el registro maestro"
                    : "Teléfono registrado"}{" "}
                  ·{" "}
                  {p.serviceAreaBusiness
                    ? "Área de servicio"
                    : "Dirección de atención"}
                </p>
              </div>
              <div>
                <p>Última gestión: {stamp(p.updatedAt)}</p>
                <p className="mt-2">
                  Última medición:{" "}
                  {stamp(
                    [...data.runs].sort((a, b) =>
                      b.observedAt.localeCompare(a.observedAt),
                    )[0]?.observedAt,
                  )}
                </p>
                <p className="mt-2">
                  Contenido visible: {p.contents?.length || 0} registros
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Interacciones de HOME CONNECT">
            <div className="grid gap-5 text-sm sm:grid-cols-3">
              <p>
                <strong className="block text-2xl">
                  {data.metrics.profileViews}
                </strong>
                Vistas registradas
              </p>
              <p>
                <strong className="block text-2xl">
                  {data.metrics.websiteClicks}
                </strong>
                Clics al sitio
              </p>
              <p>
                <strong className="block text-2xl">
                  {data.metrics.quoteRequests}
                </strong>
                Solicitudes dirigidas
              </p>
            </div>
            <p className="mt-5 text-xs text-neutral-500">
              Eventos internos acumulados; no son visitantes únicos, llamadas ni
              métricas de Google.
            </p>
          </Panel>
        </TabsContent>
        <TabsContent value="profile">
          <NapPanel workspace={data} act={act} busy={busy} />
        </TabsContent>
        <TabsContent value="keywords">
          <KeywordsPanel
            workspace={data}
            act={act}
            busy={busy}
            preview={(lines) =>
              apiRequest("/api/local-seo/keyword-preview" + suffix, { lines })
            }
          />
        </TabsContent>
        <TabsContent value="content">
          <ContentPanel workspace={data} act={act} busy={busy} />
        </TabsContent>
        <TabsContent value="directories">
          <DirectoriesPanel workspace={data} act={act} busy={busy} />
        </TabsContent>
        <TabsContent value="grid">
          <RankGrid
            workspace={data}
            act={act}
            busy={busy}
            center={data.business?.location}
            readOnly={!manage}
          />
          <p className="mt-5 text-xs leading-6 text-neutral-500">
            Local Pack describe los resultados locales observados, no garantiza
            aparecer en Google. Los motores Google Maps y Google Local Pack se
            conservan por separado.
          </p>
        </TabsContent>
        <TabsContent value="audit" className="space-y-6">
          <Panel
            title="Diagnóstico interno"
            action={
              manage ? (
                <Button disabled={busy} onClick={() => invoke("audit", {})}>
                  Ejecutar auditoría interna
                </Button>
              ) : undefined
            }
          >
            <p className="mb-5 text-sm text-neutral-500">
              Revisa completitud y consistencia de HOME CONNECT; no mide
              posicionamiento en Google.
            </p>
            {!data.audits.length && (
              <Empty title="Aún no hay auditorías registradas" />
            )}
            <Pages
              rows={data.audits}
              render={(a) => (
                <details key={a.id} className="rounded-xl border p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {stamp(a.createdAt)} · {a.score}/100
                  </summary>
                  <ul className="mt-4 space-y-3">
                    {a.checks.map((c) => (
                      <li key={c.id} className="text-sm">
                        <strong>{c.title}</strong> ·{" "}
                        {c.status === "pass"
                          ? "Cumple"
                          : c.status === "fail"
                            ? "Revisar"
                            : "Sin datos externos"}
                        <p className="mt-1 leading-6 text-neutral-500">
                          {c.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            />
          </Panel>
          <Panel title="Tareas de mejora">
            <Pages
              rows={p.tasks}
              render={(t) => (
                <article
                  key={t.id + t.updatedAt}
                  className="rounded-xl border p-4"
                >
                  <h3 className="mb-3 font-semibold">{t.title}</h3>
                  {manage ? (
                    <SeoForm
                      reset={false}
                      busy={busy}
                      submit="Guardar tarea"
                      onSubmit={(d) =>
                        act("task", {
                          id: t.id,
                          status: value(d, "status"),
                          evidence: value(d, "evidence"),
                        })
                      }
                    >
                      <Field label="Estado de la tarea">
                        <NativeSelect name="status" defaultValue={t.status}>
                          <option value="todo">Pendiente</option>
                          <option value="doing">En progreso</option>
                          <option value="done">Realizada</option>
                        </NativeSelect>
                      </Field>
                      <Field label="Evidencia">
                        <Textarea
                          name="evidence"
                          defaultValue={t.evidence}
                          maxLength={2000}
                        />
                      </Field>
                    </SeoForm>
                  ) : (
                    <p className="text-sm">
                      {t.status === "done"
                        ? "Realizada"
                        : t.status === "doing"
                          ? "En progreso"
                          : "Pendiente"}{" "}
                      · {stamp(t.updatedAt)}
                    </p>
                  )}
                </article>
              )}
            />
          </Panel>
        </TabsContent>
        <TabsContent value="observations">
          <ObservationsPanel workspace={data} act={act} busy={busy} />
        </TabsContent>
        <TabsContent value="reports" className="space-y-6">
          <Panel title="Reportes e historial">
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <Field label="Desde">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </Field>
              <Field label="Hasta">
                <Input
                  type="date"
                  min={from}
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                />
              </Field>
              <Field label="Filtrar por keyword">
                <NativeSelect
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                >
                  <option value="">Todas</option>
                  {p.keywords?.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.keyword}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            {data.permissions?.export ? (
              <div className="mb-6 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => exportSeoJson(filtered)}
                >
                  <PiDownloadSimple />
                  Exportar JSON
                </Button>
                <Button
                  variant="outline"
                  disabled={!runs.length}
                  onClick={() => exportSeoCsv(filtered)}
                >
                  <PiDownloadSimple />
                  Exportar CSV
                </Button>
              </div>
            ) : (
              <p className="mb-5 text-xs text-neutral-500">
                La exportación no está habilitada para tu cuenta.
              </p>
            )}
            {!runs.length && <Empty title="Sin mediciones en este período" />}
            <Pages
              rows={runs}
              render={(r) => (
                <article key={r.id} className="rounded-xl border p-4 text-sm">
                  <h3 className="font-semibold">
                    {p.campaigns.find((c) => c.id === r.campaignId)?.keyword}
                  </h3>
                  <p className="mt-2">
                    {stamp(r.observedAt)} · {r.points.length} puntos observados
                    · {r.source.label}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    Fuente declarada, no verificada por API externa.
                  </p>
                </article>
              )}
            />
          </Panel>
          {manage && (
            <Panel title="Registro de cambios administrativos">
              <Pages
                rows={data.activity}
                render={(a) => (
                  <details key={a.id} className="border-b py-3 text-sm">
                    <summary className="cursor-pointer">
                      {stamp(a.at)} · {a.detail}
                    </summary>
                    <p className="mt-3">Actor: {a.actorId}</p>
                    <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">
                      {JSON.stringify(
                        { antes: a.before, después: a.after },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                )}
              />
            </Panel>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
function LocalInvitation({ id }: { id: string }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  return (
    <div>
      {url ? (
        <a href={url} className="text-primary underline">
          Abrir invitación local
        </a>
      ) : (
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              const inbox = await apiRequest<{ messages: { text: string }[] }>(
                "/api/auth/local-inbox?user=" + encodeURIComponent(id),
              );
              const link = inbox.messages[0]?.text.match(/https?:\/\/\S+/)?.[0];
              if (!link) throw Error("No hay invitación en el buzón local.");
              setUrl(link);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Ver invitación de desarrollo
        </Button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
function SeoUsers({ profiles }: { profiles: Profile[] }) {
  const [users, setUsers] = useState<AuthUser[]>([]),
    [selected, setSelected] = useState<AuthUser | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    void apiRequest<AuthUser[]>("/api/local-seo/users")
      .then(setUsers)
      .catch(() => {});
  }, []);
  return (
    <details className="rounded-xl border bg-white p-5">
      <summary className="cursor-pointer font-semibold">
        Equipo SEO · usuarios y asignaciones
      </summary>
      <div className="mt-5 space-y-5">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <span>
              {u.name} · {u.email} · {u.seoAccess?.professionalIds.length || 0}{" "}
              negocios
            </span>
            <Button variant="outline" onClick={() => setSelected(u)}>
              Editar acceso SEO
            </Button>
            {import.meta.env.DEV && <LocalInvitation id={u.id} />}
          </div>
        ))}
        <SeoForm
          key={selected?.id || "new"}
          busy={busy}
          submit={selected ? "Actualizar acceso SEO" : "Invitar usuario SEO"}
          onSubmit={async (d) => {
            setBusy(true);
            try {
              await apiRequest("/api/local-seo/users", {
                id: selected?.id,
                name: value(d, "name"),
                email: value(d, "email"),
                seoAccess: {
                  professionalIds: d.getAll("professionalIds"),
                  manageDirectories: d.has("manageDirectories"),
                  exportReports: d.has("exportReports"),
                },
              });
              setUsers(await apiRequest("/api/local-seo/users"));
              setSelected(null);
              setMessage(
                "Acceso guardado. Las cuentas nuevas reciben un enlace para establecer contraseña; en desarrollo consulta el buzón local de Integraciones.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <TextField
            label="Nombre del usuario SEO"
            name="name"
            initial={selected?.name}
            required
          />
          <TextField
            label="Correo del usuario SEO"
            name="email"
            type="email"
            initial={selected?.email}
            required
          />
          <Field label="Contratistas asignados (selección múltiple)">
            <NativeSelect
              name="professionalIds"
              multiple
              defaultValue={selected?.seoAccess?.professionalIds || []}
              className="h-36"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <label className="flex gap-2 text-sm">
            <input
              name="manageDirectories"
              type="checkbox"
              defaultChecked={selected?.seoAccess?.manageDirectories}
            />
            Administrar catálogo global de directorios
          </label>
          <label className="flex gap-2 text-sm">
            <input
              name="exportReports"
              type="checkbox"
              defaultChecked={selected?.seoAccess?.exportReports}
            />
            Exportar informes
          </label>
        </SeoForm>
        {selected && (
          <Button variant="ghost" onClick={() => setSelected(null)}>
            Cancelar edición de acceso
          </Button>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </div>
    </details>
  );
}
