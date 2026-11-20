import { useState, type ReactNode } from "react";
import type {
  SeoWorkspace,
  SeoKeyword,
  SeoContent,
  SeoDirectory,
  SeoListing,
} from "@/domain/local-seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Empty, Field, Panel } from "@/components/ecosystem/primitives";
import { SeoForm, value, type SeoAction } from "./forms";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PiPlus } from "react-icons/pi";

export const stamp = (s?: string) =>
  s ? new Date(s).toLocaleString() : "Sin actualizar";
export const statusLabels: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente de revisión",
  published: "Publicado",
  archived: "Archivado",
  rejected: "Rechazado",
  in_progress: "En proceso",
  correction: "Requiere corrección",
  not_applicable: "No aplica",
  unverified: "No verificado",
  configured: "Configurado",
  inactive: "Inactivo",
  post: "Post",
  news: "Noticia",
  review: "Reseña",
};
export function TextField({
  label,
  name,
  initial = "",
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  initial?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <Field label={label}>
      <Input
        name={name}
        type={type}
        defaultValue={initial}
        required={required}
        maxLength={type === "url" ? 2000 : 600}
      />
    </Field>
  );
}
export function Pages<T>({
  rows,
  render,
}: {
  rows: T[];
  render: (row: T) => ReactNode;
}) {
  const [page, setPage] = useState(0);
  const count = Math.max(1, Math.ceil(rows.length / 10)),
    current = Math.min(page, count - 1);
  return (
    <>
      <div className="space-y-4">
        {rows.slice(current * 10, current * 10 + 10).map(render)}
      </div>
      {count > 1 && (
        <div className="mt-5 flex items-center gap-3">
          <Button
            variant="outline"
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            Anterior
          </Button>
          <span className="text-xs">
            {current + 1} / {count}
          </span>
          <Button
            variant="outline"
            disabled={current === count - 1}
            onClick={() => setPage(current + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </>
  );
}
export function KeywordsPanel({
  workspace,
  act,
  busy,
  preview,
}: {
  workspace: SeoWorkspace;
  act: SeoAction;
  busy: boolean;
  preview: (lines: string) => Promise<any>;
}) {
  const [lines, setLines] = useState(""),
    [result, setResult] = useState<
      { keyword: string; reason: string }[] | null
    >(null),
    [editing, setEditing] = useState<SeoKeyword | null>(null),
    [error, setError] = useState("");
  const records = workspace.project.keywords || [],
    manage = workspace.permissions?.manage;
  return (
    <div className="space-y-6">
      <Panel
        title={`Keywords · ${records.filter((k) => k.active).length} / 25 activas`}
      >
        <p className="mb-5 text-sm text-neutral-500">
          Hasta 25 activas por contratista. Las consultas históricas se
          conservan al editar o desactivar palabras clave.
        </p>
        {manage && (
          <>
            <Field label="Agregar una o varias keywords, una por línea">
              <Textarea
                value={lines}
                onChange={(e) => {
                  setLines(e.target.value);
                  setResult(null);
                }}
                maxLength={15000}
                rows={5}
              />
            </Field>
            <Button
              className="mt-4"
              variant="outline"
              disabled={busy || !lines.trim()}
              onClick={async () => {
                try {
                  setError("");
                  setResult((await preview(lines)).preview);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Previsualizar carga
            </Button>
            {error && <p role="alert">{error}</p>}
            {result && (
              <div className="mt-4 space-y-3">
                <Pages
                  rows={result}
                  render={(r) => (
                    <p key={r.keyword + result.indexOf(r)} className="text-sm">
                      {r.keyword || "(vacía)"} · {r.reason}
                    </p>
                  )}
                />
                <Button
                  disabled={
                    busy ||
                    !result.some((r) => r.reason === "agregar") ||
                    result.some((r) => r.reason.includes("excede"))
                  }
                  onClick={async () => {
                    try {
                      await act("keywords", { lines });
                      setResult(null);
                      setLines("");
                    } catch {}
                  }}
                >
                  Confirmar carga
                </Button>
              </div>
            )}
          </>
        )}
        {!records.length && <Empty title="Aún no hay keywords registradas" />}
        <div className="mt-6">
          <Pages
            rows={records}
            render={(k) => (
              <article
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <h3 className="font-semibold">{k.keyword}</h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    {k.active ? "Activa" : "Inactiva"} · {stamp(k.updatedAt)}
                  </p>
                </div>
                {manage && (
                  <Button variant="outline" onClick={() => setEditing(k)}>
                    Editar keyword
                  </Button>
                )}
              </article>
            )}
          />
        </div>
      </Panel>
      {manage && editing && (
        <Panel title="Editar keyword">
          <SeoForm
            key={editing.id + editing.updatedAt}
            busy={busy}
            submit="Guardar keyword"
            onSubmit={async (data) => {
              await act("keyword", {
                id: editing.id,
                keyword: value(data, "keyword"),
                active: data.has("active"),
              });
              setEditing(null);
            }}
          >
            <TextField
              label="Keyword"
              name="keyword"
              initial={editing.keyword}
              required
            />
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                defaultChecked={editing.active}
              />
              Activa
            </label>
          </SeoForm>
          <Button
            className="mt-4"
            variant="ghost"
            onClick={async () => {
              if (
                window.confirm(
                  "¿Eliminar esta keyword sin referencias históricas?",
                )
              ) {
                try {
                  await act("keyword-remove", { id: editing.id });
                  setEditing(null);
                } catch {}
              }
            }}
          >
            Eliminar keyword
          </Button>
        </Panel>
      )}
    </div>
  );
}
export function NapPanel({
  workspace,
  act,
  busy,
}: {
  workspace: SeoWorkspace;
  act: SeoAction;
  busy: boolean;
}) {
  const p = workspace.project,
    b = workspace.business;
  return (
    <div className="space-y-6">
      <Panel title="NAP · registro maestro del contratista">
        <dl className="grid gap-5 text-sm sm:grid-cols-2">
          {Object.entries({
            "Nombre comercial": p.nap.name,
            Dirección: p.nap.address || "Falta dirección",
            Teléfono: p.nap.phone || "Falta teléfono",
            "Sitio web": p.nap.website || "Sin sitio web",
            Ubicación: [b?.city, b?.region, b?.country, b?.postalCode]
              .filter(Boolean)
              .join(", "),
            Cobertura: b?.coverage.join(", ") || "Sin cobertura",
          }).map(([key, v]) => (
            <div key={key}>
              <dt className="text-neutral-500">{key}</dt>
              <dd className="mt-1 break-words font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs leading-6 text-neutral-500">
          Fuente: ficha maestra del contratista.{" "}
          {p.serviceAreaBusiness
            ? "Negocio por área de servicio; dirección privada."
            : "Negocio con dirección de atención."}{" "}
          Consultado al cargar esta vista. Última gestión SEO:{" "}
          {stamp(p.updatedAt)}.
        </p>
        {workspace.permissions?.master && (
          <details className="mt-6 rounded-xl border p-4">
            <summary className="cursor-pointer font-semibold">
              Corregir ficha maestra
            </summary>
            <div className="mt-5">
              <SeoForm
                busy={busy}
                reset={false}
                submit="Guardar en ficha maestra"
                onSubmit={(d) =>
                  act("master", {
                    name: value(d, "name"),
                    phone: value(d, "phone"),
                    address: value(d, "address"),
                    website: value(d, "website"),
                    postalCode: value(d, "postalCode"),
                    serviceAreaBusiness: d.has("serviceAreaBusiness"),
                  })
                }
              >
                <TextField
                  label="Nombre comercial"
                  name="name"
                  initial={p.nap.name}
                  required
                />
                <TextField
                  label="Teléfono comercial"
                  name="phone"
                  initial={p.nap.phone}
                />
                <TextField
                  label="Dirección comercial"
                  name="address"
                  initial={p.nap.address}
                />
                <TextField
                  label="Sitio web oficial"
                  name="website"
                  type="url"
                  initial={p.nap.website}
                />
                <TextField
                  label="Código postal"
                  name="postalCode"
                  initial={b?.postalCode}
                />
                <label className="flex gap-2">
                  <input
                    name="serviceAreaBusiness"
                    type="checkbox"
                    defaultChecked={p.serviceAreaBusiness}
                  />
                  Atiende por área de servicio
                </label>
              </SeoForm>
            </div>
          </details>
        )}
        {workspace.permissions?.manage && p.legacyNap && (
          <details className="mt-4 text-sm">
            <summary>Referencia anterior conservada</summary>
            <p className="mt-3">
              {p.legacyNap.name} · {p.legacyNap.address} · {p.legacyNap.phone}.
              No reemplaza los datos maestros.
            </p>
          </details>
        )}
      </Panel>
      {workspace.permissions?.manage && (
        <Panel title="Configuración del perfil SEO">
          <SeoForm
            key={p.updatedAt}
            reset={false}
            busy={busy}
            submit="Guardar configuración SEO"
            onSubmit={(d) =>
              act("settings", {
                status: value(d, "status"),
                reviewUrl: value(d, "reviewUrl"),
                exportAllowed: workspace.permissions?.master
                  ? d.has("exportAllowed")
                  : !!p.exportAllowed,
              })
            }
          >
            <Field label="Estado del perfil">
              <NativeSelect
                name="status"
                defaultValue={p.status || "configured"}
              >
                <option value="configured">Configurado</option>
                <option value="inactive">Inactivo</option>
              </NativeSelect>
            </Field>
            <TextField
              label="Enlace para solicitar reseñas"
              name="reviewUrl"
              type="url"
              initial={p.reviewUrl}
            />
            {workspace.permissions.master && (
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  name="exportAllowed"
                  defaultChecked={p.exportAllowed}
                />
                Autorizar exportación al contratista
              </label>
            )}
          </SeoForm>
        </Panel>
      )}
    </div>
  );
}

export function ContentPanel({
  workspace,
  act,
  busy,
}: {
  workspace: SeoWorkspace;
  act: SeoAction;
  busy: boolean;
}) {
  const [type, setType] = useState("post"),
    [editing, setEditing] = useState<SeoContent | null>(null),
    [search, setSearch] = useState(""),
    [editorOpen, setEditorOpen] = useState(false),
    [savedMessage, setSavedMessage] = useState("");
  const manage = workspace.permissions?.manage,
    records = (workspace.project.contents || []).filter(
      (c) =>
        c.type === type &&
        `${c.title} ${c.body}`.toLowerCase().includes(search.toLowerCase()),
    );
  const selected = editing?.type === type ? editing : null;
  const createLabels: Record<string, string> = {
    post: "Crear post",
    review: "Registrar reseña",
    news: "Crear noticia",
  };
  const pluralLabels: Record<string, string> = {
    post: "Posts",
    review: "Reseñas",
    news: "Noticias",
  };
  function create(contentType: string) {
    setType(contentType);
    setEditing(null);
    setEditorOpen(true);
    setSavedMessage("");
  }
  return (
    <div className="space-y-6">
      {manage && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-2 font-semibold">
            Registrar contenido del negocio
          </h3>
          <p className="mb-4 text-sm text-neutral-500">
            Selecciona qué vas a guardar para {workspace.project.nap.name}.
          </p>
          <div className="flex flex-wrap gap-3">
            {["post", "review", "news"].map((t) => (
              <Button
                key={t}
                variant={t === "post" ? "default" : "outline"}
                onClick={() => create(t)}
              >
                <PiPlus aria-hidden="true" />
                {createLabels[t]}
              </Button>
            ))}
          </div>
        </div>
      )}
      {savedMessage && (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {savedMessage}
        </p>
      )}
      <Panel title="Posts, Reviews y Noticias">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Consultar registros guardados
        </p>
        <div className="mb-5 flex flex-wrap gap-3">
          {["post", "review", "news"].map((t) => (
            <Button
              key={t}
              variant={type === t ? "default" : "outline"}
              onClick={() => {
                setType(t);
                setEditing(null);
                setSearch("");
              }}
            >
              {pluralLabels[t]} (
              {workspace.project.contents?.filter((c) => c.type === t).length ||
                0}
              )
            </Button>
          ))}
        </div>
        <Field label="Buscar contenido">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <p className="my-4 text-xs leading-6 text-neutral-500">
          Repositorio de seguimiento. Guardar aquí no publica en Google ni en
          otros sitios. Las reseñas requieren evidencia de su origen. El
          contratista consulta contenido publicado y confirmado.
        </p>
        {!records.length && (
          <Empty
            title={
              search
                ? "No hay registros que coincidan con la búsqueda"
                : `Todavía no hay ${pluralLabels[type].toLowerCase()} guardados`
            }
          >
            {manage && !search && (
              <Button onClick={() => create(type)}>
                <PiPlus aria-hidden="true" />
                {createLabels[type]}
              </Button>
            )}
          </Empty>
        )}
        <Pages
          rows={records}
          render={(c) => (
            <article key={c.id} className="rounded-xl border p-5">
              {c.image && (
                <img
                  src={c.image}
                  alt=""
                  className="mb-4 h-40 w-full rounded-lg object-cover"
                  loading="lazy"
                />
              )}
              <p className="mb-2 text-xs text-primary">
                {statusLabels[c.status]} · {stamp(c.updatedAt)}
              </p>
              <h3 className="font-semibold">{c.title || c.author}</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                {c.body}
              </p>
              {c.rating && (
                <p className="mt-3 text-sm">
                  Calificación: {c.rating}/5 · {c.author}
                </p>
              )}
              {c.reply && (
                <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm">
                  Respuesta: {c.reply}
                </p>
              )}
              {c.sourceUrl && (
                <a
                  className="mt-3 block text-sm text-primary underline"
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fuente / publicación original
                </a>
              )}
              <p className="mt-3 text-xs text-neutral-500">
                {c.keywordIds
                  .map(
                    (id) =>
                      workspace.project.keywords?.find((k) => k.id === id)
                        ?.keyword,
                  )
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {manage && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setEditing(c);
                    setEditorOpen(true);
                    setSavedMessage("");
                  }}
                >
                  Editar contenido
                </Button>
              )}
            </article>
          )}
        />
      </Panel>
      {manage && (
        <Dialog
          open={editorOpen}
          onOpenChange={(open) => {
            if (!busy) setEditorOpen(open);
          }}
        >
          <DialogContent
            onEscapeKeyDown={(event) => {
              if (busy) event.preventDefault();
            }}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <div className="pr-10">
              <DialogTitle className="text-xl font-bold">
                {selected
                  ? `Editar ${statusLabels[type].toLowerCase()}`
                  : createLabels[type]}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-neutral-500">
                {workspace.project.nap.name} · Se guardará en el contenido SEO
                de este negocio.{" "}
                {type === "review"
                  ? "Registra una opinión auténtica con su autor y fuente."
                  : "Puedes guardar un borrador sin publicarlo en sitios externos."}
              </DialogDescription>
            </div>
            <SeoForm
              key={selected?.id || type}
              busy={busy}
              submit={
                type === "post"
                  ? "Guardar post"
                  : type === "review"
                    ? "Guardar reseña"
                    : "Guardar noticia"
              }
              reset={false}
              footerClassName="sticky -bottom-6 z-10 -mx-6 -mb-6 border-t bg-white px-6 py-4"
              actions={
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setEditorOpen(false)}
                >
                  Cancelar
                </Button>
              }
              onSubmit={async (d) => {
                await act("content", {
                  id: selected?.id,
                  type,
                  title: value(d, "title"),
                  body: value(d, "body"),
                  image: value(d, "image"),
                  sourceUrl: value(d, "sourceUrl"),
                  targetUrl: value(d, "targetUrl"),
                  keywordIds: d.getAll("keywordIds"),
                  status: value(d, "status"),
                  publishedAt: value(d, "publishedAt")
                    ? new Date(value(d, "publishedAt")).toISOString()
                    : "",
                  author: value(d, "author"),
                  rating: value(d, "rating")
                    ? Number(value(d, "rating"))
                    : null,
                  reply: value(d, "reply"),
                  evidence: value(d, "evidence"),
                });
                setSearch("");
                setSavedMessage(
                  `${statusLabels[type]} ${selected ? "actualizado" : "guardado"} correctamente para ${workspace.project.nap.name}.`,
                );
                setEditing(null);
                setEditorOpen(false);
              }}
            >
              <TextField
                label="Título"
                name="title"
                initial={selected?.title}
                required={type !== "review"}
              />
              <Field
                label={
                  type === "review"
                    ? "Testimonio original del cliente"
                    : "Contenido"
                }
              >
                <Textarea
                  name="body"
                  defaultValue={selected?.body}
                  required
                  maxLength={15000}
                  rows={5}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Imagen (URL https)"
                  name="image"
                  type="url"
                  initial={selected?.image}
                />
                <TextField
                  label="Fuente / URL publicada"
                  name="sourceUrl"
                  type="url"
                  initial={selected?.sourceUrl}
                  required={type === "review"}
                />
                <TextField
                  label="URL de destino"
                  name="targetUrl"
                  type="url"
                  initial={selected?.targetUrl}
                />
                <TextField
                  label="Autor público"
                  name="author"
                  initial={selected?.author}
                  required={type === "review"}
                />
              </div>
              <Field label="Keywords relacionadas">
                {!workspace.project.keywords?.length && (
                  <p className="text-xs text-neutral-500">
                    Este negocio todavía no tiene keywords; puedes guardar el
                    contenido sin asociarlas.
                  </p>
                )}
                <NativeSelect
                  name="keywordIds"
                  multiple
                  defaultValue={selected?.keywordIds || []}
                  className="h-28"
                >
                  {workspace.project.keywords?.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.keyword}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Estado del contenido">
                <NativeSelect
                  name="status"
                  defaultValue={selected?.status || "draft"}
                >
                  {[
                    "draft",
                    "pending",
                    "published",
                    "archived",
                    "rejected",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <TextField
                label="Fecha de publicación confirmada"
                name="publishedAt"
                type="datetime-local"
                initial={
                  selected?.publishedAt
                    ? new Date(
                        Date.parse(selected.publishedAt) -
                          new Date(selected.publishedAt).getTimezoneOffset() *
                            60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
              />
              {type === "review" && (
                <>
                  <Field label="Calificación original">
                    <Input
                      name="rating"
                      type="number"
                      min={1}
                      max={5}
                      defaultValue={selected?.rating || ""}
                    />
                  </Field>
                  <Field label="Respuesta del negocio">
                    <Textarea
                      name="reply"
                      defaultValue={selected?.reply}
                      maxLength={5000}
                    />
                  </Field>
                </>
              )}
              <Field label="Evidencia de origen / publicación">
                <Textarea
                  name="evidence"
                  defaultValue={selected?.evidence}
                  maxLength={2000}
                />
              </Field>
              <p className="text-xs text-neutral-500">
                Publicado requiere URL, fecha y evidencia. Para retirar un
                registro del listado, archívalo conservando su historial.
              </p>
            </SeoForm>
            {selected?.status === "draft" && selected.type !== "review" && (
              <Button
                variant="ghost"
                className="mt-3"
                onClick={async () => {
                  if (window.confirm("¿Eliminar este borrador editorial?")) {
                    try {
                      await act("content-remove", { id: selected.id });
                      setEditing(null);
                      setEditorOpen(false);
                    } catch {}
                  }
                }}
              >
                Eliminar borrador
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function DirectoriesPanel({
  workspace,
  act,
  busy,
}: {
  workspace: SeoWorkspace;
  act: SeoAction;
  busy: boolean;
}) {
  const [directory, setDirectory] = useState<SeoDirectory | null>(null),
    [listing, setListing] = useState<SeoListing | null>(null);
  const dirs = workspace.directories || [],
    manage = workspace.permissions?.manage;
  return (
    <div className="space-y-6">
      <Panel title="Perfiles del contratista en directorios">
        <p className="mb-5 text-sm leading-7 text-neutral-500">
          Cada asociación registra la URL específica del negocio y su última
          verificación. Una asociación guardada no crea un perfil externo.
        </p>
        {!workspace.project.listings?.length && (
          <Empty title="Aún no hay directorios asociados" />
        )}
        <Pages
          rows={workspace.project.listings || []}
          render={(l) => (
            <article key={l.id} className="rounded-xl border p-5">
              <h3 className="font-semibold">
                {dirs.find((d) => d.id === l.directoryId)?.name || "Directorio"}
              </h3>
              <p className="my-2 text-sm">
                {statusLabels[l.status]} · Verificación: {stamp(l.verifiedAt)}
              </p>
              {l.url && (
                <a
                  className="break-all text-sm text-primary underline"
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir perfil del negocio
                </a>
              )}
              {manage && (
                <>
                  <p className="my-3 text-sm">{l.notes}</p>
                  <Button variant="outline" onClick={() => setListing(l)}>
                    Actualizar listado
                  </Button>
                </>
              )}
            </article>
          )}
        />
      </Panel>
      {manage && (
        <Panel title="Asociar o actualizar directorio">
          <SeoForm
            key={listing?.id || "new"}
            busy={busy}
            submit="Guardar listado del negocio"
            onSubmit={async (d) => {
              await act("listing", {
                directoryId: value(d, "directoryId"),
                url: value(d, "url"),
                status: value(d, "status"),
                verifiedAt: value(d, "verifiedAt")
                  ? new Date(value(d, "verifiedAt")).toISOString()
                  : "",
                notes: value(d, "notes"),
                evidence: value(d, "evidence"),
              });
              setListing(null);
            }}
          >
            <Field label="Directorio">
              <NativeSelect
                name="directoryId"
                required
                defaultValue={listing?.directoryId || ""}
              >
                <option value="">Selecciona un directorio</option>
                {dirs
                  .filter((d) => d.active || d.id === listing?.directoryId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
            <TextField
              label="URL específica del negocio"
              name="url"
              type="url"
              initial={listing?.url}
            />
            <Field label="Estado del listado">
              <NativeSelect
                name="status"
                defaultValue={listing?.status || "pending"}
              >
                {[
                  "pending",
                  "in_progress",
                  "published",
                  "correction",
                  "not_applicable",
                  "unverified",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s === "pending" ? "Pendiente" : statusLabels[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <TextField
              label="Última verificación"
              name="verifiedAt"
              type="datetime-local"
              initial={
                listing?.verifiedAt
                  ? new Date(
                      Date.parse(listing.verifiedAt) -
                        new Date(listing.verifiedAt).getTimezoneOffset() *
                          60000,
                    )
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
            />
            <Field label="Observaciones">
              <Textarea
                name="notes"
                defaultValue={listing?.notes}
                maxLength={3000}
              />
            </Field>
            <Field label="Evidencia de verificación">
              <Textarea
                name="evidence"
                defaultValue={listing?.evidence}
                maxLength={2000}
              />
            </Field>
          </SeoForm>
          {listing && (
            <Button
              className="mt-3"
              variant="ghost"
              onClick={() => setListing(null)}
            >
              Cancelar edición
            </Button>
          )}
        </Panel>
      )}
      {workspace.permissions?.directories && (
        <Panel title="Catálogo global de directorios">
          <div className="mb-6">
            <Pages
              rows={dirs}
              render={(d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap justify-between gap-3 border-b py-3"
                >
                  <div>
                    <strong>{d.name}</strong>
                    <p className="text-xs">
                      {d.active ? "Activo" : "Inactivo"} · {d.url}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setDirectory(d)}>
                    Editar directorio
                  </Button>
                </div>
              )}
            />
          </div>
          <SeoForm
            key={directory?.id || "new-directory"}
            busy={busy}
            submit="Guardar directorio del catálogo"
            onSubmit={async (d) => {
              await act("directory", {
                id: directory?.id,
                name: value(d, "name"),
                url: value(d, "url"),
                description: value(d, "description"),
                active: d.has("active"),
              });
              setDirectory(null);
            }}
          >
            <TextField
              label="Nombre del directorio"
              name="name"
              initial={directory?.name}
              required
            />
            <TextField
              label="URL principal del directorio"
              name="url"
              initial={directory?.url}
              type="url"
              required
            />
            <Field label="Descripción del directorio">
              <Textarea
                name="description"
                defaultValue={directory?.description}
              />
            </Field>
            <label className="flex gap-2">
              <input
                name="active"
                type="checkbox"
                defaultChecked={directory?.active ?? true}
              />
              Activo
            </label>
          </SeoForm>
          {directory && (
            <Button
              className="mt-3"
              variant="ghost"
              onClick={() => setDirectory(null)}
            >
              Cancelar edición
            </Button>
          )}
        </Panel>
      )}
    </div>
  );
}
