import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Field, Panel, copy } from "@/components/ecosystem/primitives";
import {
  invoiceBalance,
  valuationQuantity,
  type Estimate,
  type Valuation,
  type WorkItem,
} from "@/domain/contractor-estimates";
import { money, type Language } from "@/domain/types";
import { exportInvoice } from "@/lib/contractor-documents";
import { EntryForm, read, type Save } from "./estimate-actions";

type Props = { estimate: Estimate; language: Language; save: Save };
const valuationPending = (estimate: Estimate) =>
  estimate.valuations.some(
    ({ status }) => status === "draft" || status === "submitted",
  );
export const changePending = (estimate: Estimate) =>
  estimate.changes?.some(({ status }) => status === "submitted") ?? false;
export const commercialPending = (estimate: Estimate) =>
  changePending(estimate) || valuationPending(estimate);

export const valuationCanInvoice = (estimate: Estimate, valuation: Valuation) =>
  valuation.status === "approved" &&
  valuation.amountCents > 0 &&
  !estimate.invoices?.some(({ valuationId }) => valuationId === valuation.id);

export function decisionLabel(status: Valuation["status"], language: Language) {
  const t = copy(language);
  switch (status) {
    case "draft":
      return t("Borrador", "Draft");
    case "submitted":
      return t("Pendiente de aprobación", "Pending approval");
    case "approved":
      return t("Aprobada", "Approved");
    case "rejected":
      return t("Rechazada", "Rejected");
    default:
      return t("Registro anterior", "Legacy record");
  }
}

function ExternalReview({
  estimate,
  language,
  save,
  kind,
  recordId,
}: Props & { kind: "change" | "valuation"; recordId: string }) {
  const t = copy(language);
  return (
    <div className="mt-2 rounded-lg border p-4">
      {estimate.requestId ? (
        <p className="text-sm">
          {t(
            "El cliente revisa este registro en su proyecto de HOME CONNECT.",
            "The customer reviews this record in their HOME CONNECT project.",
          )}
        </p>
      ) : (
        <EntryForm
          label={t("Guardar decisión externa", "Save external decision")}
          save={async (data) => {
            await save({
              action: "review",
              estimateId: estimate.id,
              kind,
              recordId,
              approved: read(data, "decision") === "approved",
              note: read(data, "note"),
            });
          }}
        >
          <Field label={t("Decisión del cliente", "Customer decision")}>
            <NativeSelect name="decision">
              <option value="approved">{t("Aprobada", "Approved")}</option>
              <option value="rejected">{t("Rechazada", "Rejected")}</option>
            </NativeSelect>
          </Field>
          <Field
            label={t(
              "Referencia o motivo de la decisión",
              "Decision reference or reason",
            )}
          >
            <Input name="note" maxLength={2000} required />
          </Field>
        </EntryForm>
      )}
    </div>
  );
}

export function ChangeOrders({
  estimate,
  language,
  save,
  items,
}: Props & { items: WorkItem[] }) {
  const t = copy(language);
  const budget = estimate.budget;
  const [rows, setRows] = useState(1);
  if (!budget) return null;
  const existing = new Set(budget.lines.map(({ id }) => id));
  const available = [
    ...budget.lines,
    ...items.filter(({ id, active }) => active && !existing.has(id)),
  ];
  const final = estimate.invoices?.some((invoice) => !invoice.valuationId);
  return (
    <Panel title={t("Órdenes de cambio", "Change orders")}>
      <div className="space-y-4">
        {final ? (
          <p className="text-sm">
            {t(
              "La retención final ya fue facturada.",
              "Final retainage has been invoiced.",
            )}
          </p>
        ) : commercialPending(estimate) ? (
          <p className="text-sm">
            {t(
              "Resuelve la orden o la valuación pendiente antes de registrar otro cambio.",
              "Resolve the open change order or valuation before creating another change.",
            )}
          </p>
        ) : (
          <EntryForm
            label={t("Enviar orden de cambio", "Submit change order")}
            save={async (data) => {
              const lines = Array.from({ length: rows }, (_, index) => ({
                itemId: read(data, `item-${index}`),
                quantity: Math.round(
                  Number(read(data, `delta-${index}`)) * 1000,
                ),
              }));
              if (lines.some(({ quantity }) => !quantity))
                throw Error(
                  t(
                    "Cada ajuste debe tener una cantidad distinta de cero.",
                    "Each adjustment must have a nonzero quantity.",
                  ),
                );
              await save({
                action: "change",
                estimateId: estimate.id,
                reason: read(data, "reason"),
                lines,
              });
              setRows(1);
            }}
          >
            <div className="md:col-span-2">
              <Field label={t("Motivo del cambio", "Reason for change")}>
                <Textarea name="reason" required maxLength={2000} />
              </Field>
            </div>
            <p className="text-sm text-muted-foreground md:col-span-2">
              {t(
                "Usa una cantidad positiva para ampliar el alcance y una negativa para reducirlo. Las partidas vigentes conservan su precio pactado.",
                "Use a positive quantity to add scope and a negative quantity to reduce it. Existing items keep their agreed rate.",
              )}
            </p>
            {Array.from({ length: rows }, (_, index) => (
              <div
                className="grid gap-3 md:col-span-2 md:grid-cols-2"
                key={index}
              >
                <Field label={`${t("Partida", "Item")} ${index + 1}`}>
                  <NativeSelect name={`item-${index}`} required defaultValue="">
                    <option value="" disabled>
                      {t("Selecciona una partida", "Choose a work item")}
                    </option>
                    {available.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {item.description} ({item.unit})
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field
                  label={`${t("Cantidad a sumar o restar", "Quantity to add or subtract")} ${index + 1}`}
                >
                  <Input
                    name={`delta-${index}`}
                    type="number"
                    min="-1000000"
                    max="1000000"
                    step="0.001"
                    required
                  />
                </Field>
              </div>
            ))}
            <div className="flex gap-2 md:col-span-2">
              <Button
                type="button"
                variant="outline"
                disabled={rows >= Math.min(200, available.length)}
                onClick={() => setRows(rows + 1)}
              >
                {t("Añadir partida a la orden", "Add item to change order")}
              </Button>
              {rows > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRows(rows - 1)}
                >
                  {t("Quitar última partida", "Remove last item")}
                </Button>
              )}
            </div>
          </EntryForm>
        )}
        {estimate.changes?.map((record) => (
          <details
            key={record.id}
            className="rounded-lg border p-4 text-sm"
            open={record.status === "submitted" || undefined}
          >
            <summary className="cursor-pointer font-semibold">
              {decisionLabel(record.status, language)} ·{" "}
              {money(record.amountCents / 100, language)}
            </summary>
            <p className="mt-2 whitespace-pre-wrap">{record.reason}</p>
            <ul className="mt-2">
              {record.lines.map((line) => (
                <li key={line.id}>
                  {line.code} · {line.quantity > 0 ? "+" : ""}
                  {line.quantity / 1000} {line.unit} ·{" "}
                  {money(line.amountCents / 100, language)}
                </li>
              ))}
            </ul>
            {record.reviewNote && (
              <p className="mt-2 break-words text-muted-foreground">
                {record.reviewNote}
              </p>
            )}
            {record.status === "submitted" && (
              <ExternalReview
                estimate={estimate}
                language={language}
                save={save}
                kind="change"
                recordId={record.id}
              />
            )}
          </details>
        ))}
      </div>
    </Panel>
  );
}

export function ValuationActions({
  estimate,
  valuation,
  language,
  save,
}: Props & { valuation: Valuation }) {
  const t = copy(language);
  const action = (name: string) => async () => {
    await save({
      action: name,
      estimateId: estimate.id,
      recordId: valuation.id,
    });
  };
  return (
    <div className="mt-3 space-y-2">
      {valuation.reviewNote && (
        <p className="break-words text-muted-foreground">
          {valuation.reviewNote}
        </p>
      )}
      {valuation.status === "draft" && (
        <div className="flex flex-wrap gap-2">
          <EntryForm
            label={
              estimate.requestId
                ? t("Enviar al cliente", "Send to customer")
                : t("Pasar a revisión", "Submit for review")
            }
            save={action("valuation-submit")}
          />
          <EntryForm
            label={t("Retirar borrador", "Remove draft")}
            outline
            save={async () => {
              if (
                window.confirm(
                  t(
                    "¿Retirar este borrador de valuación?",
                    "Remove this valuation draft?",
                  ),
                )
              )
                await action("valuation-remove")();
            }}
          />
        </div>
      )}
      {valuation.status === "submitted" && (
        <ExternalReview
          estimate={estimate}
          language={language}
          save={save}
          kind="valuation"
          recordId={valuation.id}
        />
      )}
      {valuationCanInvoice(estimate, valuation) && (
        <EntryForm
          label={t(
            "Emitir factura de esta valuación",
            "Invoice this valuation",
          )}
          save={action("invoice")}
        />
      )}
    </div>
  );
}

export function RetentionSettings({ estimate, language, save }: Props) {
  const t = copy(language);
  const percent = (estimate.retentionBps ?? 0) / 100;
  const locked =
    estimate.valuations.some(({ status }) => status !== "rejected") ||
    !!estimate.invoices?.length;
  return (
    <Panel title={t("Retención del contrato", "Contract retainage")}>
      {locked ? (
        <p className="text-sm">
          {t("Porcentaje pactado", "Agreed rate")} · {percent}%
        </p>
      ) : (
        <EntryForm
          label={t("Guardar retención", "Save retainage")}
          reset={false}
          save={async (data) => {
            await save({
              action: "retention",
              estimateId: estimate.id,
              bps: Math.round(Number(read(data, "percent")) * 100),
            });
          }}
        >
          <Field label={t("Porcentaje de retención", "Retainage percentage")}>
            <Input
              name="percent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={percent}
              required
            />
          </Field>
        </EntryForm>
      )}
    </Panel>
  );
}

export function Invoices({ estimate, language, save }: Props) {
  const t = copy(language);
  const [error, setError] = useState("");
  const invoices = estimate.invoices ?? [];
  const held = invoices.reduce(
    (sum, invoice) => sum + invoice.retainedCents,
    0,
  );
  const progress = valuationQuantity(estimate);
  const releasable =
    held > 0 &&
    !commercialPending(estimate) &&
    !invoices.some((invoice) => !invoice.valuationId) &&
    estimate.budget?.lines.every(
      (line) => (progress.get(line.id) ?? 0) === line.quantity,
    ) &&
    estimate.valuations.every(
      (record) =>
        record.status !== "approved" ||
        record.amountCents === 0 ||
        invoices.some((invoice) => invoice.valuationId === record.id),
    );
  return (
    <Panel
      title={t(
        "Facturas, retenciones y cobros",
        "Invoices, retainage and payments",
      )}
    >
      <div className="space-y-4">
        {invoices.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t(
              "Emite la primera factura desde una valuación aprobada.",
              "Issue the first invoice from an approved valuation.",
            )}
          </p>
        )}
        {held > 0 && (
          <p className="text-sm">
            {t(
              "Total retenido en facturas de avance",
              "Total withheld on progress invoices",
            )}{" "}
            · {money(held / 100, language)}
          </p>
        )}
        {releasable && (
          <EntryForm
            label={t(
              "Facturar liberación de retención",
              "Invoice retainage release",
            )}
            save={async () => {
              await save({
                action: "release-retention",
                estimateId: estimate.id,
              });
            }}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {invoices.map((invoice) => {
          const balance = invoiceBalance(invoice);
          return (
            <details
              key={invoice.id}
              className="space-y-3 rounded-lg border p-4 text-sm"
            >
              <summary className="cursor-pointer font-semibold">
                {invoice.number} ·{" "}
                {invoice.valuationId
                  ? t("Avance", "Progress")
                  : t("Liberación de retención", "Retainage release")}{" "}
                ·{" "}
                {balance === 0
                  ? t("Saldo liquidado", "Settled")
                  : money(balance / 100, language)}
              </summary>
              <p>
                {t("Importe bruto", "Gross")}{" "}
                {money(invoice.grossCents / 100, language)} ·{" "}
                {t("Retenido", "Withheld")}{" "}
                {money(invoice.retainedCents / 100, language)} ·{" "}
                {t("Pagado", "Paid")}{" "}
                {money((invoice.dueCents - balance) / 100, language)}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  setError("");
                  try {
                    await exportInvoice(
                      estimate.title,
                      invoice,
                      invoice.dueCents - balance,
                      language,
                    );
                  } catch (cause) {
                    setError((cause as Error).message);
                  }
                }}
              >
                {t("Descargar factura PDF", "Download invoice PDF")}
              </Button>
              <ul className="space-y-1">
                {invoice.payments.map((payment) => (
                  <li className="break-words" key={payment.reference}>
                    {payment.receivedAt.slice(0, 10)} ·{" "}
                    {payment.source === "stripe" ? "Stripe" : payment.reference}{" "}
                    · {money(payment.amountCents / 100, language)}
                  </li>
                ))}
              </ul>
              {balance > 0 && (
                <EntryForm
                  label={t(
                    "Registrar pago recibido",
                    "Record received payment",
                  )}
                  save={async (data) => {
                    await save({
                      action: "payment",
                      estimateId: estimate.id,
                      recordId: invoice.id,
                      reference: read(data, "reference"),
                      amountCents: Math.round(
                        Number(read(data, "amount")) * 100,
                      ),
                    });
                  }}
                >
                  <Field
                    label={t("Referencia del comprobante", "Payment reference")}
                  >
                    <Input name="reference" maxLength={160} required />
                  </Field>
                  <Field
                    label={t("Importe recibido USD", "Received amount USD")}
                  >
                    <Input
                      name="amount"
                      type="number"
                      min="0.01"
                      max={balance / 100}
                      step="0.01"
                      required
                    />
                  </Field>
                </EntryForm>
              )}
            </details>
          );
        })}
      </div>
    </Panel>
  );
}
