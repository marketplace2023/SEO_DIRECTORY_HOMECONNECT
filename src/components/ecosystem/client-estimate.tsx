import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ClientEstimate } from "@/domain/contractor-estimates";
import { money, type Language } from "@/domain/types";
import { exportInvoice } from "@/lib/contractor-documents";
import { apiRequest } from "@/lib/http";
import { Field, Panel, copy } from "./primitives";

type Review = {
  kind: "change" | "valuation";
  recordId: string;
  approved: boolean;
  note: string;
};

function ReviewForm({
  language,
  save,
  disabled,
}: {
  language: Language;
  save: (data: Pick<Review, "approved" | "note">) => Promise<void>;
  disabled: boolean;
}) {
  const t = copy(language);
  const [note, setNote] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const button = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    if (!button) return;
    const approved = button.value === "approve";
    if (!approved && !note.trim()) return;
    void save({ approved, note: note.trim() });
  }
  return (
    <form className="space-y-3" onSubmit={submit}>
      <Field
        label={t(
          "Comentario (obligatorio para rechazar)",
          "Comment (required to reject)",
        )}
      >
        <Textarea
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={disabled}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" value="approve" disabled={disabled}>
          {t("Aprobar", "Approve")}
        </Button>
        <Button
          type="submit"
          value="reject"
          variant="outline"
          disabled={disabled || !note.trim()}
        >
          {t("Rechazar", "Reject")}
        </Button>
      </div>
    </form>
  );
}

export function ClientEstimatePanel({
  projectId,
  language,
}: {
  projectId: string;
  language: Language;
}) {
  const t = copy(language);
  const endpoint = `/api/owner/estimate?project=${encodeURIComponent(projectId)}`;
  const [data, setData] = useState<ClientEstimate>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let mounted = true;
    apiRequest<ClientEstimate>(endpoint)
      .then((value) => {
        if (mounted) setData(value);
      })
      .catch((cause: Error) => {
        if (mounted) setError(cause.message);
      });
    return () => {
      mounted = false;
    };
  }, [endpoint]);

  async function run(action?: Record<string, unknown>) {
    setError("");
    setBusy(true);
    try {
      if (action && data) {
        const result = await apiRequest<{
          workspace: ClientEstimate;
          checkoutUrl?: string;
        }>(endpoint, { ...action, estimateId: data.estimateId });
        setData(result.workspace);
        if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      } else setData(await apiRequest<ClientEstimate>(endpoint));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const decision = (status: string | undefined) =>
    status === "approved"
      ? t("Aprobada", "Approved")
      : status === "rejected"
        ? t("Rechazada", "Rejected")
        : t("Pendiente de tu revisión", "Awaiting your review");

  return (
    <Panel
      title={t("Cambios, avances y facturas", "Changes, progress and invoices")}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void run()}
        >
          {t("Actualizar", "Refresh")}
        </Button>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {!data && !error && (
          <p role="status" className="text-sm">
            {t("Cargando expediente…", "Loading job file…")}
          </p>
        )}
        {data && (
          <p className="text-sm">
            {t("Presupuesto vigente", "Current budget")} ·{" "}
            <strong>{money(data.budgetTotalCents / 100, language)}</strong>
          </p>
        )}
        {data &&
          !data.changes.length &&
          !data.valuations.length &&
          !data.invoices.length && (
            <p className="text-sm text-muted-foreground">
              {t(
                "Aquí aparecerán las órdenes de cambio, valuaciones y facturas que envíe tu contratista.",
                "Change orders, valuations and invoices from your contractor will appear here.",
              )}
            </p>
          )}
        {data?.changes.map((record) => (
          <details
            key={record.id}
            className="space-y-3 rounded-lg border p-4 text-sm"
            open={record.status === "submitted" || undefined}
          >
            <summary className="cursor-pointer font-semibold">
              {t("Orden de cambio", "Change order")} · {decision(record.status)}{" "}
              · {money(record.amountCents / 100, language)}
            </summary>
            <p className="break-words whitespace-pre-wrap">{record.reason}</p>
            <ul className="space-y-1">
              {record.lines.map((line) => (
                <li key={line.id}>
                  {line.code} · {line.description} ·{" "}
                  {line.quantity > 0 ? "+" : ""}
                  {line.quantity / 1000} {line.unit} ·{" "}
                  {money(line.amountCents / 100, language)}
                </li>
              ))}
            </ul>
            {record.reviewNote && (
              <p className="break-words text-muted-foreground">
                {record.reviewNote}
              </p>
            )}
            {record.status === "submitted" && (
              <ReviewForm
                language={language}
                disabled={busy}
                save={(form) =>
                  run({
                    action: "review",
                    kind: "change",
                    recordId: record.id,
                    ...form,
                  })
                }
              />
            )}
          </details>
        ))}
        {data?.valuations.map((record) => (
          <details
            key={record.id}
            className="space-y-3 rounded-lg border p-4 text-sm"
            open={record.status === "submitted" || undefined}
          >
            <summary className="cursor-pointer font-semibold">
              {t("Valuación", "Valuation")} · {record.start} – {record.end} ·{" "}
              {decision(record.status)} ·{" "}
              {money(record.amountCents / 100, language)}
            </summary>
            {record.notes && (
              <p className="break-words whitespace-pre-wrap">{record.notes}</p>
            )}
            <ul className="space-y-1">
              {record.lines.map((line) => (
                <li key={line.itemId}>
                  {line.code} · {line.description} · {line.quantity / 1000}{" "}
                  {line.unit} · {money(line.amountCents / 100, language)}
                </li>
              ))}
            </ul>
            {record.reviewNote && (
              <p className="break-words text-muted-foreground">
                {record.reviewNote}
              </p>
            )}
            {record.status === "submitted" && (
              <ReviewForm
                language={language}
                disabled={busy}
                save={(form) =>
                  run({
                    action: "review",
                    kind: "valuation",
                    recordId: record.id,
                    ...form,
                  })
                }
              />
            )}
          </details>
        ))}
        {data?.invoices.map((invoice) => {
          const balance = invoice.dueCents - invoice.paidCents;
          return (
            <section
              key={invoice.id}
              className="space-y-3 rounded-lg border p-4 text-sm"
            >
              <h3 className="font-semibold">
                {invoice.number} ·{" "}
                {invoice.valuationId
                  ? t("Factura de avance", "Progress invoice")
                  : t("Liberación de retención", "Retainage release")}
              </h3>
              <p>
                {t("Facturado", "Invoiced")}{" "}
                {money(invoice.dueCents / 100, language)} ·{" "}
                {t("Retenido", "Withheld")}{" "}
                {money(invoice.retainedCents / 100, language)} ·{" "}
                {t("Saldo", "Balance")} {money(balance / 100, language)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setError("");
                    try {
                      await exportInvoice(
                        data.title,
                        invoice,
                        invoice.paidCents,
                        language,
                      );
                    } catch (cause) {
                      setError((cause as Error).message);
                    }
                  }}
                >
                  {t("Descargar factura PDF", "Download invoice PDF")}
                </Button>
                {balance > 0 && invoice.canPay && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run({
                        action: "checkout",
                        recordId: invoice.id,
                        verifyOnly: false,
                      })
                    }
                  >
                    {t("Pagar en línea", "Pay online")}
                  </Button>
                )}
                {balance > 0 && invoice.hasCheckout && invoice.canPay && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run({
                        action: "checkout",
                        recordId: invoice.id,
                        verifyOnly: true,
                      })
                    }
                  >
                    {t("Verificar pago", "Check payment")}
                  </Button>
                )}
              </div>
              {balance > 0 && !invoice.canPay && (
                <p className="text-muted-foreground">
                  {t(
                    "El contratista puede registrar los pagos recibidos por fuera de HOME CONNECT.",
                    "Your contractor can record payments received outside HOME CONNECT.",
                  )}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
