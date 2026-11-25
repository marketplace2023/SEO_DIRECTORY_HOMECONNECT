import { useEffect, useState } from "react";
import {
  PiListPlus,
  PiRuler,
  PiCalculator,
  PiChartBar,
  PiReceipt,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, Field, Panel, copy } from "@/components/ecosystem/primitives";
import { apiRequest } from "@/lib/http";
import {
  lineAmount,
  valuationQuantity,
  workUnits,
  type Estimate,
  type EstimateWorkspace,
  type WorkItem,
  type WorkResource,
} from "@/domain/contractor-estimates";
import { money, type Language } from "@/domain/types";
import { exportBudget } from "@/lib/contractor-documents";
import { CatalogImport, ResourceEditor } from "./catalog-tools";
import { EstimatePlan } from "./estimate-plan";
import { EntryForm, read, type Save } from "./estimate-actions";
import {
  ChangeOrders,
  commercialPending,
  decisionLabel,
  Invoices,
  RetentionSettings,
  ValuationActions,
  valuationCanInvoice,
} from "./estimate-commercial-panel";

const endpoint = "/api/contractor/estimates";
type Translate = ReturnType<typeof copy>;
type Stage = "items" | "measurement" | "budget" | "valuation" | "billing";
const formatQuantity = (value: number, language: Language) =>
  new Intl.NumberFormat(language === "es" ? "es-US" : "en-US", {
    maximumFractionDigits: 3,
  }).format(value / 1000);

export function EstimateWorkspacePanel({ language }: { language: Language }) {
  const t = copy(language);
  const [workspace, setWorkspace] = useState<EstimateWorkspace>();
  const [stage, setStage] = useState<Stage>("items");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    apiRequest<EstimateWorkspace>(endpoint)
      .then((data) => {
        if (active) setWorkspace(data);
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setWorkspace(await apiRequest<EstimateWorkspace>(endpoint));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function save(body: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await apiRequest<{ id: string }>(endpoint, body);
      setMessage(t("Cambios guardados.", "Changes saved."));
      try {
        setWorkspace(await apiRequest<EstimateWorkspace>(endpoint));
      } catch {
        setError(
          t(
            "Se guardó el registro. Actualiza para ver los datos actuales.",
            "The record was saved. Refresh to see the latest data.",
          ),
        );
      }
      return result.id;
    } finally {
      setSaving(false);
    }
  }
  const estimate =
    workspace?.estimates.find((record) => record.id === selected) ??
    workspace?.estimates[0];
  const steps = [
    { id: "items", label: t("Partidas", "Work items"), Icon: PiListPlus },
    { id: "measurement", label: t("Mediciones", "Takeoffs"), Icon: PiRuler },
    { id: "budget", label: t("Presupuestos", "Estimates"), Icon: PiCalculator },
    {
      id: "valuation",
      label: t("Valuaciones", "Progress valuations"),
      Icon: PiChartBar,
    },
    {
      id: "billing",
      label: t("Facturas y cobros", "Invoices and payments"),
      Icon: PiReceipt,
    },
  ];
  return (
    <div className="space-y-5">
      <Panel
        title={t("Presupuestos de obra", "Construction estimates")}
        action={
          <Button
            type="button"
            variant="outline"
            disabled={loading || saving}
            onClick={() => void refresh()}
          >
            {t("Actualizar", "Refresh")}
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          {t(
            "Carga tu catálogo, mide la obra, acuerda el presupuesto y factura cada valuación aprobada.",
            "Set up your catalog, take off quantities, agree on the estimate and invoice each approved valuation.",
          )}
        </p>
      </Panel>
      {message && (
        <p
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {!workspace && !error && (
        <p role="status">{t("Cargando presupuestos…", "Loading estimates…")}</p>
      )}
      {workspace && (
        <Tabs
          value={stage}
          onValueChange={(value) => {
            setStage(value as Stage);
            setMessage("");
          }}
        >
          <div className="overflow-x-auto">
            <TabsList
              aria-label={t("Flujo de presupuesto", "Estimate workflow")}
            >
              {steps.map(({ id, label, Icon }) => (
                <TabsTrigger key={id} value={id}>
                  <Icon aria-hidden />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {stage !== "items" && workspace.estimates.length > 0 && (
            <div className="mt-3 max-w-xl">
              <Field label={t("Expediente de obra", "Job file")}>
                <NativeSelect
                  value={estimate?.id}
                  onChange={(event) => {
                    setSelected(event.target.value);
                    setMessage("");
                  }}
                >
                  {workspace.estimates.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.title}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          )}
          <TabsContent value="items">
            <WorkItems
              items={workspace.items}
              save={save}
              t={t}
              language={language}
            />
          </TabsContent>
          <TabsContent value="measurement">
            <Measurements
              key={estimate?.id ?? "new"}
              workspace={workspace}
              estimate={estimate}
              save={save}
              t={t}
              language={language}
              onCreated={setSelected}
              goToBudget={() => setStage("budget")}
            />
          </TabsContent>
          <TabsContent value="budget">
            {estimate ? (
              <BudgetPanel
                key={estimate.id}
                estimate={estimate}
                items={workspace.items}
                save={save}
                t={t}
                language={language}
              />
            ) : (
              <Empty
                title={t(
                  "Crea un expediente en Mediciones",
                  "Create a job file in Takeoffs",
                )}
              />
            )}
          </TabsContent>
          <TabsContent value="valuation">
            {estimate ? (
              <Valuations
                key={estimate.id}
                estimate={estimate}
                save={save}
                t={t}
                language={language}
                goToBilling={() => setStage("billing")}
              />
            ) : (
              <Empty
                title={t(
                  "Aún no hay presupuestos de obra",
                  "No construction estimates yet",
                )}
              />
            )}
          </TabsContent>
          <TabsContent value="billing">
            {estimate ? (
              <Invoices
                key={estimate.id}
                estimate={estimate}
                language={language}
                save={save}
              />
            ) : (
              <Empty
                title={t(
                  "Crea un expediente en Mediciones",
                  "Create a job file in Takeoffs",
                )}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function WorkItems({
  items,
  save,
  t,
  language,
}: {
  items: WorkItem[];
  save: Save;
  t: Translate;
  language: Language;
}) {
  const [editing, setEditing] = useState<WorkItem>();
  const [resources, setResources] = useState<WorkResource[]>([]);
  function edit(item?: WorkItem) {
    setEditing(item);
    setResources(item?.resources ?? []);
  }
  return (
    <div className="space-y-5">
      <CatalogImport
        language={language}
        save={(items, updatePrices) =>
          save({ action: "import-items", items, updatePrices })
        }
      />
      <Panel
        title={
          editing
            ? t("Editar partida", "Edit item")
            : t("Cargar partida", "Add work item")
        }
      >
        <EntryForm
          key={editing?.id ?? "new"}
          label={t("Guardar partida", "Save item")}
          save={async (data) => {
            await save({
              action: "item",
              id: editing?.id,
              code: read(data, "code"),
              description: read(data, "description"),
              unit: read(data, "unit"),
              unitPriceCents: resources.length
                ? 1
                : Math.round(Number(read(data, "price")) * 100),
              resources: resources.map((resource) => ({
                ...resource,
                description: resource.description.trim(),
                unit: resource.unit.trim(),
              })),
              priceSource: read(data, "source"),
              active: data.has("active"),
            });
            edit();
          }}
        >
          <Field label={t("Código", "Code")}>
            <Input
              name="code"
              required
              maxLength={40}
              defaultValue={editing?.code}
            />
          </Field>
          <Field label={t("Descripción de la partida", "Item description")}>
            <Input
              name="description"
              required
              maxLength={160}
              defaultValue={editing?.description}
            />
          </Field>
          <Field label={t("Unidad", "Unit")}>
            <NativeSelect name="unit" defaultValue={editing?.unit ?? "ea"}>
              {workUnits.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("Precio unitario en USD", "Unit price in USD")}>
            <Input
              name="price"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              required={!resources.length}
              disabled={resources.length > 0}
              defaultValue={editing ? editing.unitPriceCents / 100 : undefined}
            />
          </Field>
          <Field
            label={t(
              "Referencia del precio (opcional)",
              "Price reference (optional)",
            )}
          >
            <Input
              name="source"
              maxLength={160}
              defaultValue={editing?.priceSource}
              placeholder={t(
                "Tarifa propia o cotización de proveedor",
                "Own rate or supplier quote",
              )}
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              name="active"
              type="checkbox"
              defaultChecked={editing?.active ?? true}
            />
            {t("Disponible para medir", "Available for takeoffs")}
          </label>
          <ResourceEditor
            language={language}
            resources={resources}
            setResources={setResources}
          />
        </EntryForm>
        {editing && (
          <Button
            className="mt-3"
            type="button"
            variant="ghost"
            onClick={() => edit()}
          >
            {t("Cancelar edición", "Cancel editing")}
          </Button>
        )}
      </Panel>
      <Panel title={t("Mi listado de partidas", "My work items")}>
        {items.length ? (
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <strong>
                    {item.code} · {item.description}
                  </strong>
                  <p className="break-words text-muted-foreground">
                    {money(item.unitPriceCents / 100, language)} / {item.unit}
                    {item.priceSource && ` · ${item.priceSource}`}
                    {!!item.resources?.length &&
                      ` · APU (${item.resources.length})`}
                    {!item.active && ` · ${t("Archivada", "Archived")}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => edit(item)}
                >
                  {t("Editar", "Edit")}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title={t("Carga tu primera partida", "Add your first work item")}
          />
        )}
      </Panel>
    </div>
  );
}

function Measurements({
  workspace,
  estimate,
  save,
  t,
  language,
  onCreated,
  goToBudget,
}: {
  workspace: EstimateWorkspace;
  estimate?: Estimate;
  save: Save;
  t: Translate;
  language: Language;
  onCreated: (id: string) => void;
  goToBudget: () => void;
}) {
  const active = workspace.items.filter((item) => item.active);
  const [removing, setRemoving] = useState("");
  const [deleteError, setDeleteError] = useState("");
  return (
    <div className="space-y-5">
      <Panel title={t("Nuevo expediente de obra", "New job file")}>
        {active.length ? (
          <EntryForm
            label={t("Crear expediente", "Create job file")}
            save={async (data) => {
              const id = await save({
                action: "estimate",
                title: read(data, "title"),
                requestId: read(data, "requestId"),
              });
              onCreated(id);
            }}
          >
            <Field label={t("Nombre de la obra", "Job name")}>
              <Input name="title" required maxLength={160} />
            </Field>
            <Field label={t("Solicitud vinculada", "Linked request")}>
              <NativeSelect name="requestId">
                <option value="">{t("Obra externa", "External job")}</option>
                {workspace.opportunities.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.title} · {request.location}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </EntryForm>
        ) : (
          <Empty
            title={t(
              "Primero carga una partida activa",
              "Add an active work item first",
            )}
          />
        )}
      </Panel>
      {estimate && (
        <Panel title={t("Mediciones de la obra", "Job takeoffs")}>
          {!estimate.budget && active.length > 0 && (
            <EntryForm
              label={t("Agregar medición", "Add takeoff")}
              save={async (data) => {
                await save({
                  action: "measurement",
                  estimateId: estimate.id,
                  itemId: read(data, "itemId"),
                  location: read(data, "location"),
                  factors: ["first", "second", "third"]
                    .map((key) => read(data, key))
                    .filter(Boolean)
                    .map(Number),
                });
              }}
            >
              <Field label={t("Partida a medir", "Work item")}>
                <NativeSelect name="itemId" required>
                  {active.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.description} ({item.unit})
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("Ubicación o elemento", "Location or element")}>
                <Input name="location" required maxLength={160} />
              </Field>
              <Field label={t("Cantidad o largo", "Quantity or length")}>
                <Input
                  name="first"
                  type="number"
                  min="0.001"
                  max="1000000"
                  step="0.001"
                  required
                />
              </Field>
              <Field label={t("Ancho (opcional)", "Width (optional)")}>
                <Input
                  name="second"
                  type="number"
                  min="0.001"
                  max="1000000"
                  step="0.001"
                />
              </Field>
              <Field
                label={t(
                  "Alto o profundidad (opcional)",
                  "Height or depth (optional)",
                )}
              >
                <Input
                  name="third"
                  type="number"
                  min="0.001"
                  max="1000000"
                  step="0.001"
                />
              </Field>
              <p className="self-end text-xs leading-5 text-muted-foreground">
                {t(
                  "Se multiplican los factores indicados. Usa medidas compatibles con la unidad de la partida.",
                  "Entered factors are multiplied. Use dimensions compatible with the work item's unit.",
                )}
              </p>
            </EntryForm>
          )}
          {deleteError && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {deleteError}
            </p>
          )}
          {estimate.measurements.length > 0 && (
            <div className="mt-4 divide-y">
              {estimate.measurements.map((measurement) => {
                const item = (estimate.budget?.lines ?? workspace.items).find(
                  (record) => record.id === measurement.itemId,
                );
                return (
                  <div
                    key={measurement.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <strong>
                        {item?.code} · {measurement.location}
                      </strong>
                      <p className="text-muted-foreground">
                        {measurement.factors.join(" × ")} ={" "}
                        {formatQuantity(measurement.quantity, language)}{" "}
                        {item?.unit}
                      </p>
                      {measurement.source && (
                        <p className="break-all text-muted-foreground">
                          {measurement.source.format.toUpperCase()} ·{" "}
                          {measurement.source.label}
                        </p>
                      )}
                    </div>
                    {!estimate.budget && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!!removing}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              t(
                                "¿Quitar esta medición del borrador?",
                                "Remove this takeoff from the draft?",
                              ),
                            )
                          )
                            return;
                          setRemoving(measurement.id);
                          setDeleteError("");
                          try {
                            await save({
                              action: "measurement-remove",
                              estimateId: estimate.id,
                              measurementId: measurement.id,
                            });
                          } catch (cause) {
                            setDeleteError((cause as Error).message);
                          } finally {
                            setRemoving("");
                          }
                        }}
                      >
                        {t("Quitar medición", "Remove takeoff")}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {estimate.measurements.length ? (
            <Button
              className="mt-3"
              variant="outline"
              type="button"
              onClick={goToBudget}
            >
              {t("Ir al presupuesto", "Go to estimate")}
            </Button>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {t(
                "Todavía no hay mediciones en este expediente.",
                "This job file has no takeoffs yet.",
              )}
            </p>
          )}
        </Panel>
      )}
      {estimate && !estimate.budget && active.length > 0 && (
        <EstimatePlan
          language={language}
          items={active}
          save={(input) =>
            save({ action: "measurement", estimateId: estimate.id, ...input })
          }
        />
      )}
    </div>
  );
}

function BudgetPanel({
  estimate,
  items,
  save,
  t,
  language,
}: {
  estimate: EstimateWorkspace["estimates"][number];
  items: WorkItem[];
  save: Save;
  t: Translate;
  language: Language;
}) {
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const lines =
    estimate.budget?.lines ??
    items.flatMap((item) => {
      const quantity = estimate.measurements
        .filter((record) => record.itemId === item.id)
        .reduce((sum, record) => sum + record.quantity, 0);
      return quantity
        ? [
            {
              ...item,
              quantity,
              amountCents: lineAmount(quantity, item.unitPriceCents),
            },
          ]
        : [];
    });
  const total = lines.reduce((sum, line) => sum + line.amountCents, 0);
  async function download(
    format: "pdf" | "xlsx",
    documentLines = lines,
    revision = estimate.budget?.closedAt,
  ) {
    setExportError("");
    setExporting(true);
    try {
      await exportBudget(
        estimate.id,
        estimate.title,
        documentLines,
        format,
        language,
        revision
          ? `${t("Fecha de cierre", "Closed on")} · ${revision.slice(0, 10)}`
          : t("Borrador", "Draft"),
      );
    } catch (cause) {
      setExportError((cause as Error).message);
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="space-y-5">
      <Panel title={t("Presupuesto por partidas", "Itemized estimate")}>
        {!lines.length ? (
          <Empty
            title={t(
              "Agrega mediciones para calcular el presupuesto",
              "Add takeoffs to calculate the estimate",
            )}
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {estimate.budget
                ? t(
                    "Presupuesto cerrado. Se conservaron las cantidades y precios unitarios al cierre.",
                    "Estimate closed. Quantities and rates were preserved at close.",
                  )
                : t(
                    "Borrador calculado con las mediciones y los precios vigentes de tu catálogo.",
                    "Draft calculated from your takeoffs and current catalog rates.",
                  )}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="border-b text-left">
                  <tr>
                    <th className="py-2">{t("Partida", "Item")}</th>
                    <th>{t("Cantidad", "Quantity")}</th>
                    <th>{t("Precio unitario", "Unit price")}</th>
                    <th className="text-right">{t("Importe", "Amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-3 pr-3">
                        {line.code} · {line.description}
                      </td>
                      <td className="pr-3 whitespace-nowrap">
                        {formatQuantity(line.quantity, language)} {line.unit}
                      </td>
                      <td className="pr-3 whitespace-nowrap">
                        {money(line.unitPriceCents / 100, language)}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {money(line.amountCents / 100, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t">
                  <tr>
                    <th scope="row" colSpan={3} className="py-3 text-left">
                      {t("Total USD", "Total USD")}
                    </th>
                    <td className="text-right font-semibold">
                      {money(total / 100, language)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="my-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={exporting}
                onClick={() => void download("pdf")}
              >
                {t("Descargar PDF", "Download PDF")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={exporting}
                onClick={() => void download("xlsx")}
              >
                {t("Descargar Excel", "Download Excel")}
              </Button>
              {estimate.budget &&
                !estimate.proposalStatus &&
                !estimate.agreement &&
                !estimate.valuations.length && (
                  <EntryForm
                    outline
                    label={t("Reabrir como borrador", "Reopen as draft")}
                    save={async () => {
                      if (
                        window.confirm(
                          t(
                            "¿Guardar esta versión y reabrir el presupuesto?",
                            "Save this revision and reopen the estimate?",
                          ),
                        )
                      )
                        await save({
                          action: "reopen",
                          estimateId: estimate.id,
                        });
                    }}
                  />
                )}
            </div>
            {exportError && (
              <p role="alert" className="text-sm text-red-700">
                {exportError}
              </p>
            )}
            {!estimate.budget && (
              <EntryForm
                label={t("Cerrar presupuesto", "Close estimate")}
                save={async () => {
                  if (
                    window.confirm(
                      t(
                        "¿Cerrar el presupuesto y fijar las cantidades y precios?",
                        "Close the estimate and lock quantities and prices?",
                      ),
                    )
                  )
                    await save({ action: "close", estimateId: estimate.id });
                }}
              >
                {null}
              </EntryForm>
            )}
          </>
        )}
      </Panel>
      {!!estimate.revisions?.length && (
        <Panel title={t("Versiones del presupuesto", "Estimate versions")}>
          <ul className="divide-y">
            {estimate.revisions.map((revision, index) => (
              <li
                key={`${revision.closedAt}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span>
                  {t("Versión", "Version")} {index + 1} ·{" "}
                  {revision.closedAt.slice(0, 10)} ·{" "}
                  {money(revision.totalCents / 100, language)}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exporting}
                    onClick={() =>
                      void download("pdf", revision.lines, revision.closedAt)
                    }
                  >
                    PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exporting}
                    onClick={() =>
                      void download("xlsx", revision.lines, revision.closedAt)
                    }
                  >
                    Excel
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {estimate.budget &&
        (estimate.requestId ? (
          <Panel title={t("Propuesta al cliente", "Customer proposal")}>
            {estimate.proposalStatus ? (
              <p className="text-sm">
                {estimate.proposalStatus === "accepted"
                  ? t(
                      "Propuesta aceptada. La obra admite valuaciones.",
                      "Proposal accepted. Progress can be valued.",
                    )
                  : estimate.proposalStatus === "declined"
                    ? t(
                        "Propuesta cerrada por el cliente.",
                        "Proposal closed by the customer.",
                      )
                    : t(
                        "Propuesta enviada. Actualiza la vista para consultar la decisión del cliente.",
                        "Proposal sent. Refresh this view to see the customer's decision.",
                      )}
              </p>
            ) : (
              <EntryForm
                label={t(
                  "Enviar presupuesto como propuesta",
                  "Send estimate as proposal",
                )}
                save={async (data) => {
                  await save({
                    action: "send",
                    estimateId: estimate.id,
                    days: Number(read(data, "days")),
                    description: read(data, "description"),
                  });
                }}
              >
                <Field
                  label={t(
                    "Plazo estimado en días",
                    "Estimated duration in days",
                  )}
                >
                  <Input
                    name="days"
                    required
                    type="number"
                    min="1"
                    max="3650"
                  />
                </Field>
                <Field
                  label={t("Alcance y condiciones", "Scope and conditions")}
                >
                  <Textarea name="description" maxLength={4000} required />
                </Field>
              </EntryForm>
            )}
          </Panel>
        ) : (
          <Panel title={t("Acuerdo de obra externa", "External job agreement")}>
            {estimate.agreement ? (
              <p className="text-sm">
                {t("Referencia registrada", "Recorded reference")} ·{" "}
                {estimate.agreement}
              </p>
            ) : (
              <EntryForm
                label={t(
                  "Registrar acuerdo externo",
                  "Record external agreement",
                )}
                save={async (data) => {
                  await save({
                    action: "agreement",
                    estimateId: estimate.id,
                    reference: read(data, "reference"),
                  });
                }}
              >
                <Field
                  label={t(
                    "Referencia del acuerdo con el cliente",
                    "Customer agreement reference",
                  )}
                >
                  <Input name="reference" required maxLength={160} />
                </Field>
              </EntryForm>
            )}
          </Panel>
        ))}
      {estimate.budget &&
        (estimate.proposalStatus === "accepted" || estimate.agreement) && (
          <ChangeOrders
            estimate={estimate}
            language={language}
            items={items}
            save={save}
          />
        )}
    </div>
  );
}

function Valuations({
  estimate,
  save,
  t,
  language,
  goToBilling,
}: {
  estimate: EstimateWorkspace["estimates"][number];
  save: Save;
  t: Translate;
  language: Language;
  goToBilling: () => void;
}) {
  const budget = estimate.budget;
  if (!budget)
    return (
      <Empty
        title={t("Primero cierra el presupuesto", "Close the estimate first")}
      />
    );
  if (
    !(estimate.requestId
      ? estimate.proposalStatus === "accepted"
      : estimate.agreement)
  )
    return (
      <Empty
        title={t(
          "Se requiere un presupuesto acordado",
          "An agreed estimate is required",
        )}
        description={t(
          "Espera la aceptación del cliente o registra el acuerdo externo en Presupuestos.",
          "Wait for customer acceptance or record an external agreement in Estimates.",
        )}
      />
    );
  const prior = valuationQuantity(estimate);
  const remaining = budget.lines.filter(
    (line) => line.quantity > (prior.get(line.id) ?? 0),
  );
  const accumulated =
    estimate.valuations
      .filter(({ status }) => !status || status === "approved")
      .at(-1)?.accumulatedCents ?? 0;
  return (
    <div className="space-y-5">
      <RetentionSettings estimate={estimate} language={language} save={save} />
      <Panel
        title={t("Registrar avance por período", "Record progress by period")}
      >
        <dl className="mb-5 grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <dt>{t("Presupuestado", "Budgeted")}</dt>
            <dd className="font-semibold">
              {money(budget.totalCents / 100, language)}
            </dd>
          </div>
          <div>
            <dt>{t("Valuado acumulado", "Valued to date")}</dt>
            <dd className="font-semibold">
              {money(accumulated / 100, language)}
            </dd>
          </div>
          <div>
            <dt>{t("Saldo por valuar", "Remaining to value")}</dt>
            <dd className="font-semibold">
              {money((budget.totalCents - accumulated) / 100, language)}
            </dd>
          </div>
        </dl>
        {commercialPending(estimate) ? (
          <p className="text-sm">
            {t(
              "Resuelve la valuación o la orden de cambio pendiente para registrar otro período.",
              "Resolve the pending valuation or change order before recording another period.",
            )}
          </p>
        ) : remaining.length ? (
          <EntryForm
            label={t("Guardar valuación", "Save valuation")}
            save={async (data) => {
              const lines = remaining.flatMap((line) => {
                const quantity = Math.round(Number(read(data, line.id)) * 1000);
                return quantity ? [{ itemId: line.id, quantity }] : [];
              });
              if (!lines.length)
                throw new Error(
                  t(
                    "Indica la cantidad ejecutada de al menos una partida.",
                    "Enter completed quantity for at least one work item.",
                  ),
                );
              if (
                !window.confirm(
                  t(
                    "¿Guardar el avance de este período? La valuación quedará en el historial.",
                    "Save progress for this period? The valuation will remain in the history.",
                  ),
                )
              )
                return false;
              await save({
                action: "valuation",
                estimateId: estimate.id,
                start: read(data, "start"),
                end: read(data, "end"),
                notes: read(data, "notes"),
                lines,
              });
            }}
          >
            <Field label={t("Inicio del período", "Period start")}>
              <Input name="start" type="date" required />
            </Field>
            <Field label={t("Fin del período", "Period end")}>
              <Input name="end" type="date" required />
            </Field>
            {remaining.map((line) => {
              const pending = line.quantity - (prior.get(line.id) ?? 0);
              return (
                <Field
                  key={line.id}
                  label={`${t("Ejecutado en el período", "Completed this period")} · ${line.code} (${line.unit})`}
                >
                  <Input
                    name={line.id}
                    type="number"
                    min="0"
                    max={pending / 1000}
                    step="0.001"
                    placeholder={`${t("Pendiente", "Remaining")} ${formatQuantity(pending, language)}`}
                  />
                </Field>
              );
            })}
            <Field label={t("Observaciones del avance", "Progress notes")}>
              <Textarea name="notes" maxLength={2000} />
            </Field>
          </EntryForm>
        ) : (
          <p className="text-sm">
            {t(
              "Todas las cantidades del presupuesto ya están valuadas.",
              "All budgeted quantities have been valued.",
            )}
          </p>
        )}
      </Panel>
      <Panel
        title={t("Historial de valuaciones", "Valuation history")}
        action={
          estimate.invoices?.length ? (
            <Button type="button" variant="outline" onClick={goToBilling}>
              {t("Ver facturas y cobros", "View invoices and payments")}
            </Button>
          ) : undefined
        }
      >
        {estimate.valuations.length ? (
          <div className="divide-y">
            {estimate.valuations.map((valuation) => (
              <details
                className="py-3 text-sm"
                key={valuation.id}
                open={
                  valuation.status === "draft" ||
                  valuation.status === "submitted" ||
                  valuationCanInvoice(estimate, valuation) ||
                  undefined
                }
              >
                <summary className="cursor-pointer font-semibold">
                  {valuation.start} – {valuation.end} ·{" "}
                  {money(valuation.amountCents / 100, language)}
                  {" · "}
                  {decisionLabel(valuation.status, language)}
                </summary>
                <p className="mt-2">
                  {t("Acumulado del presupuesto", "Cumulative value")} ·{" "}
                  {money(valuation.accumulatedCents / 100, language)}
                </p>
                <ul className="mt-2 space-y-1">
                  {valuation.lines.map((line) => {
                    const item = budget.lines.find(
                      (record) => record.id === line.itemId,
                    );
                    return (
                      <li key={line.itemId}>
                        {item?.code} · {formatQuantity(line.quantity, language)}{" "}
                        {item?.unit} · {money(line.amountCents / 100, language)}{" "}
                        · {t("Acumulado", "To date")}{" "}
                        {formatQuantity(line.accumulated, language)}{" "}
                        {item?.unit}
                      </li>
                    );
                  })}
                </ul>
                {valuation.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {valuation.notes}
                  </p>
                )}
                <ValuationActions
                  estimate={estimate}
                  valuation={valuation}
                  save={save}
                  language={language}
                />
              </details>
            ))}
          </div>
        ) : (
          <Empty
            title={t(
              "Todavía no hay avances valuados",
              "No progress valuations yet",
            )}
          />
        )}
      </Panel>
    </div>
  );
}
