import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, Panel } from "@/components/ecosystem/primitives";
import { SerpScan } from "./serp-scan";
import {
  comparableBaseline,
  gridPoints,
  parseRankCsv,
  rankMetrics,
  type SeoPoint,
  type SeoWorkspace,
} from "@/domain/local-seo";
import {
  localDateTime,
  observationTime,
  SeoForm,
  value,
  type SeoAction,
} from "./forms";
const RankMap = lazy(() => import("./rank-map"));
const date = (value: string) => new Date(value).toLocaleString();
const percentage = (value: number | null) =>
  value === null ? "Sin datos" : `${value.toFixed(1)} %`;

export function RankGrid({
  workspace,
  act,
  busy,
  center,
  readOnly = false,
}: {
  workspace: SeoWorkspace;
  act: SeoAction;
  busy: boolean;
  center?: { latitude: number; longitude: number } | null;
  readOnly?: boolean;
}) {
  const [campaignId, setCampaignId] = useState("");
  const [targetId, setTargetId] = useState("business");
  const campaign =
    workspace.project.campaigns.find(
      (campaign) => campaign.id === campaignId,
    ) || workspace.project.campaigns[0];
  const [runId, setRunId] = useState("");
  const runs = workspace.runs
    .filter(
      (run) => run.campaignId === campaign?.id && run.targetId === targetId,
    )
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const run = runs.find((run) => run.id === runId) || runs[0];
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState<SeoPoint[]>([]);
  const [selected, setSelected] = useState(0),
    [rank, setRank] = useState(""),
    [notFound, setNotFound] = useState(false),
    [importError, setImportError] = useState("");
  useEffect(() => {
    setRunId("");
    setDraft([]);
    setEditing(false);
    setSelected(0);
    setRank("");
    setNotFound(false);
  }, [campaign?.id, targetId]);
  const points = campaign ? gridPoints(campaign) : [];
  const observed = editing ? draft : run?.points || [];
  const selectedPoint = points[selected];
  const evidence =
    !editing &&
    observed.find(
      (item) =>
        item.row === selectedPoint?.row &&
        item.column === selectedPoint?.column,
    )?.evidence;
  const metrics = rankMetrics(run);
  const foundRanks =
    run?.points.flatMap((point) => (point.rank === null ? [] : [point.rank])) ||
    [];
  const baseline = run ? comparableBaseline(run, runs) : undefined;
  const previous = rankMetrics(baseline);
  const delta =
    metrics.top3 !== null && previous.top3 !== null
      ? metrics.top3 - previous.top3
      : null;
  function select(index: number) {
    setSelected(index);
    const current = draft.find(
      (point) =>
        point.row === points[index].row &&
        point.column === points[index].column,
    );
    setRank(current?.rank?.toString() || "");
    setNotFound(!!current && current.rank === null);
  }
  async function importFile(file?: File) {
    if (!file || !campaign) return;
    setImportError("");
    try {
      if (file.size > 100000) throw Error("Máximo 100 KB por archivo.");
      const text = await file.text(),
        parsed = file.name.toLowerCase().endsWith(".csv")
          ? parseRankCsv(text)
          : JSON.parse(text);
      const data = Array.isArray(parsed) ? parsed : parsed.points;
      if (
        !Array.isArray(data) ||
        !data.length ||
        data.length > campaign.size ** 2 ||
        data.some(
          (point) =>
            !point ||
            !Number.isInteger(point.row) ||
            !Number.isInteger(point.column) ||
            point.row < 0 ||
            point.column < 0 ||
            point.row >= campaign.size ||
            point.column >= campaign.size ||
            (point.rank !== null &&
              (!Number.isInteger(point.rank) ||
                point.rank < 1 ||
                point.rank > campaign.depth)),
        ) ||
        new Set(data.map((point) => `${point.row}:${point.column}`)).size !==
          data.length
      )
        throw Error("Puntos inválidos, duplicados o fuera de la cuadrícula.");
      setDraft(
        data.map((point) => ({
          row: point.row,
          column: point.column,
          rank: point.rank,
        })),
      );
      setEditing(true);
    } catch (error) {
      setImportError((error as Error).message);
    }
  }
  return (
    <div className="space-y-6">
      {!readOnly && (
        <Panel title="Planificar seguimiento geográfico">
          <p className="mb-5 text-sm leading-6 text-neutral-500">
            Cada campaña fija palabra clave, motor, idioma, centro, separación y
            profundidad. Crear la cuadrícula no realiza búsquedas ni genera
            posiciones.
          </p>
          <SeoForm
            busy={busy}
            submit="Crear cuadrícula sin mediciones"
            onSubmit={(data) =>
              act("campaign", {
                keywordId: value(data, "keywordId"),
                keyword:
                  workspace.project.keywords?.find(
                    (k) => k.id === value(data, "keywordId"),
                  )?.keyword || "",
                engine: value(data, "engine"),
                language: value(data, "language"),
                center: {
                  latitude: Number(value(data, "latitude")),
                  longitude: Number(value(data, "longitude")),
                },
                size: Number(value(data, "size")),
                spacingKm: Number(value(data, "spacingKm")),
                depth: Number(value(data, "depth")),
              })
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Palabra clave">
                <NativeSelect name="keywordId" required>
                  <option value="">Selecciona una keyword activa</option>
                  {workspace.project.keywords
                    ?.filter((k) => k.active)
                    .map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.keyword}
                      </option>
                    ))}
                </NativeSelect>
              </Field>
              <Field label="Motor observado">
                <NativeSelect name="engine">
                  <option value="google_maps">Google Maps</option>
                  <option value="google_local">Google Local Pack</option>
                </NativeSelect>
              </Field>
              <Field label="Idioma de búsqueda">
                <NativeSelect name="language">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </NativeSelect>
              </Field>
              <Field label="Latitud del centro">
                <Input
                  name="latitude"
                  type="number"
                  step="any"
                  min={-80}
                  max={80}
                  defaultValue={center?.latitude}
                  required
                />
              </Field>
              <Field label="Longitud del centro">
                <Input
                  name="longitude"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  defaultValue={center?.longitude}
                  required
                />
              </Field>
              <Field label="Tamaño">
                <NativeSelect name="size">
                  <option value="3">3 × 3 (9 puntos)</option>
                  <option value="5">5 × 5 (25 puntos)</option>
                  <option value="7">7 × 7 (49 puntos)</option>
                </NativeSelect>
              </Field>
              <Field label="Separación entre puntos (km)">
                <Input
                  name="spacingKm"
                  type="number"
                  min={0.1}
                  max={20}
                  step={0.1}
                  defaultValue={1}
                  required
                />
              </Field>
              <Field label="Profundidad de búsqueda">
                <Input
                  name="depth"
                  type="number"
                  min={3}
                  max={100}
                  step={1}
                  defaultValue={20}
                  required
                />
              </Field>
            </div>
            <p className="text-xs leading-6 text-neutral-500">
              El centro propuesto puede ser aproximado. Confirma las coordenadas
              que quieres estudiar; la configuración se conserva para comparar
              mediciones equivalentes.
            </p>
          </SeoForm>
        </Panel>
      )}
      {campaign ? (
        <Panel title="Cuadrícula y mediciones">
          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <Field label="Campaña">
              <NativeSelect
                value={campaign.id}
                onChange={(event) => setCampaignId(event.target.value)}
              >
                {workspace.project.campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.keyword} · {campaign.size}×{campaign.size} ·{" "}
                    {campaign.language}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Medición guardada">
              <NativeSelect
                disabled={!runs.length || editing}
                value={run?.id || ""}
                onChange={(event) => setRunId(event.target.value)}
              >
                {!runs.length && <option value="">Todavía sin medir</option>}
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {date(run.observedAt)} · {run.source.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          {!editing && run && (
            <div className="mb-5 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-neutral-500">
                  Cobertura Top 3 observada
                </p>
                <strong className="text-xl">{percentage(metrics.top3)}</strong>
              </div>
              <div>
                <p className="text-xs text-neutral-500">
                  Puntos medidos / planificados
                </p>
                <strong className="text-xl">
                  {metrics.measured} / {points.length}
                </strong>
              </div>
              <div>
                <p className="text-xs text-neutral-500">
                  Posición media donde se encontró
                </p>
                <strong className="text-xl">
                  {metrics.averageFoundRank?.toFixed(1) || "No encontrado"}
                </strong>
              </div>
            </div>
          )}
          {run && !editing && (
            <div className="mb-5 grid gap-4 text-xs text-neutral-600 sm:grid-cols-3">
              <p>
                Mejor / peor posición:{" "}
                {foundRanks.length
                  ? `${Math.min(...foundRanks)} / ${Math.max(...foundRanks)}`
                  : "Sin resultados"}
              </p>
              <p>
                Cobertura Top 10:{" "}
                {percentage(
                  run.points.length
                    ? (100 * foundRanks.filter((rank) => rank <= 10).length) /
                        run.points.length
                    : null,
                )}
              </p>
              <p>Revisados sin encontrar: {metrics.measured - metrics.found}</p>
            </div>
          )}
          {run && !editing && (
            <p className="mb-5 text-xs leading-6 text-neutral-500">
              Fuente: {run.source.label}.{" "}
              {run.source.listingName && `Ficha: ${run.source.listingName}. `}
              Observado: {date(run.observedAt)}.
              {run.source.evidenceUrl && (
                <>
                  {" "}
                  <a
                    href={run.source.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Ver referencia
                  </a>
                </>
              )}{" "}
              {delta !== null
                ? `Cambio Top 3: ${delta > 0 ? "+" : ""}${delta.toFixed(1)} puntos porcentuales frente a ${date(baseline!.observedAt)} (misma campaña, fuente y puntos).`
                : "Sin línea base comparable de la misma fuente y puntos."}
            </p>
          )}
          <Field label="Negocio observado">
            <NativeSelect
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            >
              <option value="business">{workspace.project.nap.name}</option>
              {workspace.project.competitors.map((competitor) => (
                <option key={competitor.id} value={competitor.id}>
                  {competitor.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {!readOnly &&
            !editing &&
            workspace.providers.automaticRankings &&
            workspace.business && (
              <SerpScan
                key={`${campaign.id}:${targetId}`}
                campaign={campaign}
                targetId={targetId}
                professionalId={workspace.business.id}
                act={act}
                busy={busy}
                onSaved={() => setRunId("")}
              />
            )}
          <Suspense
            fallback={
              <div className="h-80 animate-pulse rounded-xl bg-neutral-100" />
            }
          >
            <RankMap
              campaign={campaign}
              observations={observed}
              select={select}
            />
          </Suspense>
          <p className="my-4 text-xs leading-6 text-neutral-500">
            Norte arriba. Verde: 1–3; ámbar: 4–10; rojo: &gt;10; gris oscuro: no
            encontrado dentro de la profundidad; —: sin medir. Cada medición
            conserva su fecha y fuente.
          </p>
          <div
            className="mx-auto grid max-w-xl gap-2"
            style={{
              gridTemplateColumns: `repeat(${campaign.size}, minmax(0, 1fr))`,
            }}
            aria-label="Puntos de la cuadrícula"
          >
            {points.map((point, index) => {
              const item = observed.find(
                (item) =>
                  item.row === point.row && item.column === point.column,
              );
              const color = !item
                ? "bg-neutral-50 text-neutral-400"
                : item.rank === null
                  ? "bg-neutral-200 text-neutral-700"
                  : item.rank <= 3
                    ? "bg-green-50 text-green-800"
                    : item.rank <= 10
                      ? "bg-amber-50 text-amber-800"
                      : "bg-red-50 text-red-800";
              return (
                <button
                  type="button"
                  key={index}
                  aria-label={`Punto fila ${point.row}, columna ${point.column}`}
                  aria-pressed={selected === index}
                  className={`min-h-11 rounded-lg border p-2 text-sm font-bold ${color} ${selected === index ? "ring-2 ring-primary" : ""}`}
                  onClick={() => select(index)}
                >
                  {!item
                    ? "—"
                    : item.rank === null
                      ? `>${campaign.depth}`
                      : item.rank}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-neutral-500">
            Punto seleccionado: fila {points[selected]?.row}, columna{" "}
            {points[selected]?.column} · {points[selected]?.latitude.toFixed(5)}
            , {points[selected]?.longitude.toFixed(5)}
          </p>
          {evidence && (
            <section
              aria-labelledby="point-evidence"
              className="mt-5 rounded-xl border border-neutral-200 p-4"
            >
              <h3 id="point-evidence" className="font-semibold">
                Competidores en este punto
              </h3>
              {evidence.searchId && (
                <p className="mt-1 break-all text-xs text-neutral-600">
                  Consulta SerpApi · {evidence.searchId}
                </p>
              )}
              {evidence.competitors.length ? (
                <ul className="mt-3 divide-y divide-neutral-200 text-sm">
                  {evidence.competitors.map((item) => (
                    <li
                      key={`${item.position}:${item.title}`}
                      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 py-2"
                    >
                      <span className="font-semibold tabular-nums">
                        #{item.position}
                      </span>
                      <span>
                        {item.title}
                        {item.rating !== undefined && (
                          <span className="ml-2 text-xs text-neutral-600">
                            {item.rating}/5
                            {item.reviews !== undefined &&
                              ` · ${item.reviews} reseñas`}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-neutral-600">
                  Sin competidores en los resultados de este punto.
                </p>
              )}
            </section>
          )}
          {!readOnly && (
            <div className="my-5 flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setEditing(true);
                  setDraft([]);
                  setRank("");
                  setNotFound(false);
                  setImportError("");
                }}
              >
                Nueva medición manual
              </Button>
              <label className="grid gap-1 text-xs text-neutral-500">
                Importar CSV normalizado o JSON
                <Input
                  type="file"
                  accept=".csv,.json"
                  onChange={(event) => void importFile(event.target.files?.[0])}
                  disabled={busy}
                />
              </label>
            </div>
          )}
          {!readOnly && (
            <p className="mb-4 text-xs leading-6 text-neutral-500">
              CSV: cabecera <code>row,column,rank</code>, filas/columnas desde
              0. Una posición vacía significa punto revisado sin encontrar el
              negocio; omite las filas no medidas. JSON: array de puntos con
              esas tres propiedades. Adapta los datos del proveedor a este
              formato antes de importar.
            </p>
          )}
          {importError && (
            <p role="alert" className="mb-4 text-sm text-red-700">
              {importError}
            </p>
          )}
          {!readOnly && editing && (
            <div className="space-y-6 rounded-xl border border-neutral-200 p-4">
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const point = points[selected];
                  setDraft((current) => [
                    ...current.filter(
                      (item) =>
                        item.row !== point.row || item.column !== point.column,
                    ),
                    {
                      row: point.row,
                      column: point.column,
                      rank: notFound ? null : Number(rank),
                    },
                  ]);
                }}
              >
                <Field label="Posición observada en este punto">
                  <Input
                    type="number"
                    min={1}
                    max={campaign.depth}
                    step={1}
                    required={!notFound}
                    disabled={notFound}
                    value={rank}
                    onChange={(event) => setRank(event.target.value)}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={notFound}
                    onChange={(event) => setNotFound(event.target.checked)}
                  />
                  Revisado: no encontrado hasta {campaign.depth}
                </label>
                <Button variant="secondary" className="w-fit">
                  Añadir punto al borrador
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const point = points[selected];
                    setDraft((current) =>
                      current.filter(
                        (item) =>
                          item.row !== point.row ||
                          item.column !== point.column,
                      ),
                    );
                  }}
                >
                  Retirar punto del borrador
                </Button>
              </form>
              <p className="text-sm">
                {draft.length} puntos observados listos para guardar. Los demás
                permanecerán sin medir.
              </p>
              <SeoForm
                busy={busy || !draft.length}
                reset={false}
                submit="Guardar medición con evidencia"
                onSubmit={async (data) => {
                  await act("run", {
                    campaignId: campaign.id,
                    targetId,
                    points: draft,
                    observedAt: observationTime(data),
                    source: {
                      kind: value(data, "sourceKind"),
                      label: value(data, "sourceLabel"),
                      evidenceUrl: value(data, "evidenceUrl"),
                    },
                  });
                  setEditing(false);
                  setDraft([]);
                  setRunId("");
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tipo de fuente declarada">
                    <NativeSelect name="sourceKind">
                      <option value="manual">Observación manual</option>
                      <option value="brightlocal_export">
                        Datos aportados de BrightLocal
                      </option>
                      <option value="other_export">Otro proveedor</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Fuente / procedimiento">
                    <Input
                      name="sourceLabel"
                      required
                      minLength={2}
                      placeholder="Cómo obtuviste estas posiciones"
                    />
                  </Field>
                  <Field label="URL de la evidencia (opcional)">
                    <Input type="url" name="evidenceUrl" />
                  </Field>
                  <Field label="Fecha y hora de la observación">
                    <Input
                      name="observedAt"
                      type="datetime-local"
                      required
                      defaultValue={localDateTime()}
                    />
                  </Field>
                </div>
              </SeoForm>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setDraft([]);
                }}
              >
                Descartar borrador sin guardar
              </Button>
            </div>
          )}
          {!!runs.length && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <caption className="mb-3 text-left font-semibold">
                  Historial de observaciones de esta campaña
                </caption>
                <thead>
                  <tr>
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Fuente</th>
                    <th className="p-2">Puntos</th>
                    <th className="p-2">Top 3</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-t">
                      <td className="p-2">{date(run.observedAt)}</td>
                      <td className="p-2">{run.source.label}</td>
                      <td className="p-2">{run.points.length}</td>
                      <td className="p-2">
                        {percentage(rankMetrics(run).top3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-sm text-neutral-500">
          Crea una campaña para definir sus puntos. No hay posiciones ni
          porcentajes de visibilidad hasta registrar una medición.
        </p>
      )}
    </div>
  );
}
