import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  invoiceBalance,
  lineAmount,
  valuationQuantity,
  type Budget,
  type Estimate,
  type BudgetLine,
  type ClientEstimate,
  type WorkItem,
} from "../src/domain/contractor-estimates";
import {
  checkCheckout,
  checkoutEnabled,
  checkoutRange,
  startCheckout,
} from "./contractor-checkout";

const id = z.uuid();
const note = z.string().trim().max(2000);
const reference = z.string().trim().min(1).max(160);
export const commercialActions = [
  z.object({
    action: z.literal("retention"),
    estimateId: id,
    bps: z.number().int().min(0).max(10_000),
  }),
  z.object({
    action: z.literal("change"),
    estimateId: id,
    reason: note.min(1),
    lines: z
      .array(
        z.object({
          itemId: id,
          quantity: z
            .number()
            .int()
            .min(-1_000_000_000)
            .max(1_000_000_000)
            .refine(Boolean),
        }),
      )
      .min(1)
      .max(200),
  }),
  z.object({
    action: z.literal("valuation-submit"),
    estimateId: id,
    recordId: id,
  }),
  z.object({
    action: z.literal("review"),
    estimateId: id,
    kind: z.enum(["change", "valuation"]),
    recordId: id,
    approved: z.boolean(),
    note,
  }),
  z.object({ action: z.literal("invoice"), estimateId: id, recordId: id }),
  z.object({ action: z.literal("release-retention"), estimateId: id }),
  z.object({
    action: z.literal("payment"),
    estimateId: id,
    recordId: id,
    reference,
    amountCents: z.number().int().min(1).max(1_000_000_000_000),
  }),
  z.object({
    action: z.literal("checkout"),
    estimateId: id,
    recordId: id,
    verifyOnly: z.boolean(),
  }),
] as const;
export const commercialSchema = z.discriminatedUnion(
  "action",
  commercialActions,
);
type CommercialAction = z.infer<typeof commercialSchema>;

export class EstimateError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function requireBudget(estimate: Estimate): Budget {
  if (!estimate.budget)
    throw new EstimateError("Primero cierra el presupuesto.");
  return estimate.budget;
}

export const hasValuationInReview = (estimate: Estimate) =>
  estimate.valuations.some(
    (entry) => entry.status === "draft" || entry.status === "submitted",
  );
export const hasChangeInReview = (estimate: Estimate) =>
  estimate.changes?.some((entry) => entry.status === "submitted") ?? false;

function changeLines(
  estimate: Estimate,
  input: Extract<CommercialAction, { action: "change" }>,
  items: WorkItem[],
) {
  const budget = requireBudget(estimate);
  const progress = valuationQuantity(estimate);
  if (
    new Set(input.lines.map((line) => line.itemId)).size !== input.lines.length
  )
    throw new EstimateError("Cada partida puede aparecer una vez por orden.");
  const lines = input.lines.map(({ itemId, quantity }) => {
    const current = budget.lines.find((line) => line.id === itemId);
    const item =
      current ?? items.find((entry) => entry.id === itemId && entry.active);
    if (!item) throw new EstimateError("La partida no está disponible.");
    const adjusted = (current?.quantity ?? 0) + quantity;
    if (adjusted < (progress.get(itemId) ?? 0) || adjusted > 1_000_000_000)
      throw new EstimateError(
        `La nueva cantidad de ${item.code} no puede quedar por debajo del avance ni exceder el límite.`,
      );
    const amountCents =
      lineAmount(adjusted, item.unitPriceCents) - (current?.amountCents ?? 0);
    return { ...item, quantity, amountCents };
  });
  const total =
    budget.totalCents + lines.reduce((sum, line) => sum + line.amountCents, 0);
  if (total < 1 || total > 1_000_000_000_000)
    throw new EstimateError("Total de obra fuera del rango permitido.");
  return lines;
}

function applyChange(budget: Budget, changes: BudgetLine[]) {
  for (const change of changes) {
    const existing = budget.lines.find((line) => line.id === change.id);
    const quantity = (existing?.quantity ?? 0) + change.quantity;
    const amountCents = (existing?.amountCents ?? 0) + change.amountCents;
    if (existing) Object.assign(existing, { quantity, amountCents });
    else budget.lines.push({ ...change, quantity, amountCents });
    budget.totalCents += change.amountCents;
  }
}

export async function applyCommercialAction(
  estimate: Estimate,
  input: CommercialAction,
  items: WorkItem[],
  professionalId: string,
  actor: "contractor" | "owner",
  projectId = "",
) {
  const budget = requireBudget(estimate);
  const now = new Date().toISOString();
  const changes = (estimate.changes ??= []);
  const invoices = (estimate.invoices ??= []);
  if (
    actor === "owner" &&
    input.action !== "review" &&
    input.action !== "checkout"
  )
    throw new EstimateError("Operación reservada al contratista.", 403);
  switch (input.action) {
    case "retention":
      if (
        estimate.valuations.some((entry) => entry.status !== "rejected") ||
        invoices.length
      )
        throw new EstimateError(
          "La retención se fija antes de registrar avances.",
          409,
        );
      estimate.retentionBps = input.bps;
      return;
    case "change": {
      if (invoices.some((entry) => !entry.valuationId))
        throw new EstimateError(
          "La obra ya tiene una factura de liberación de retención.",
          409,
        );
      if (hasValuationInReview(estimate) || hasChangeInReview(estimate))
        throw new EstimateError(
          "Resuelve la orden o valuación pendiente antes de cambiar el presupuesto.",
          409,
        );
      if (changes.length >= 200)
        throw new EstimateError("Se alcanzó el límite de órdenes.");
      const lines = changeLines(estimate, input, items);
      const updatedItemCount = new Set(
        [...budget.lines, ...lines].map((line) => line.id),
      ).size;
      if (updatedItemCount > 200)
        throw new EstimateError("El presupuesto admite hasta 200 partidas.");
      changes.push({
        id: randomUUID(),
        reason: input.reason,
        lines,
        amountCents: lines.reduce((sum, line) => sum + line.amountCents, 0),
        status: "submitted",
        createdAt: now,
      });
      return;
    }
    case "valuation-submit": {
      const record = estimate.valuations.find(
        (entry) => entry.id === input.recordId,
      );
      if (!record || record.status !== "draft")
        throw new EstimateError(
          "Solo se puede enviar una valuación en borrador.",
          409,
        );
      record.status = "submitted";
      return;
    }
    case "review": {
      if (actor === "contractor" && estimate.requestId)
        throw new EstimateError(
          "La revisión corresponde al cliente de la obra.",
          403,
        );
      if ((!input.approved || actor === "contractor") && !input.note)
        throw new EstimateError(
          "Indica el motivo del rechazo o la referencia de la conformidad externa.",
        );
      const record = (
        input.kind === "change" ? changes : estimate.valuations
      ).find((entry) => entry.id === input.recordId);
      if (!record || record.status !== "submitted")
        throw new EstimateError(
          "El registro no está pendiente de revisión.",
          409,
        );
      record.status = input.approved ? "approved" : "rejected";
      record.reviewedAt = now;
      record.reviewNote = input.note;
      if (input.kind === "change" && input.approved && "reason" in record) {
        (estimate.revisions ??= []).push(structuredClone(budget));
        applyChange(budget, record.lines);
      }
      return;
    }
    case "invoice": {
      const valuation = estimate.valuations.find(
        (entry) => entry.id === input.recordId,
      );
      if (
        !valuation ||
        valuation.status !== "approved" ||
        valuation.amountCents < 1
      )
        throw new EstimateError(
          "Selecciona una valuación aprobada con importe positivo.",
          409,
        );
      if (invoices.some((entry) => entry.valuationId === valuation.id)) return;
      const retainedCents = Number(
        (BigInt(valuation.amountCents) * BigInt(estimate.retentionBps ?? 0) +
          5000n) /
          10000n,
      );
      invoices.push({
        id: randomUUID(),
        number: `HC-${estimate.id.slice(0, 8).toUpperCase()}-${invoices.length + 1}`,
        valuationId: valuation.id,
        issuedAt: now,
        grossCents: valuation.amountCents,
        retainedCents,
        dueCents: valuation.amountCents - retainedCents,
        payments: [],
      });
      return;
    }
    case "release-retention": {
      if (invoices.some((entry) => !entry.valuationId)) return;
      const progress = valuationQuantity(estimate);
      const pendingInvoice = estimate.valuations.some(
        (entry) =>
          entry.status === "approved" &&
          entry.amountCents > 0 &&
          !invoices.some((invoice) => invoice.valuationId === entry.id),
      );
      const retainedCents = invoices.reduce(
        (sum, entry) => sum + entry.retainedCents,
        0,
      );
      if (
        hasValuationInReview(estimate) ||
        hasChangeInReview(estimate) ||
        pendingInvoice ||
        !retainedCents ||
        budget.lines.some(
          (line) => (progress.get(line.id) ?? 0) !== line.quantity,
        )
      )
        throw new EstimateError(
          "La liberación requiere terminar la obra y facturar todas sus valuaciones aprobadas.",
          409,
        );
      invoices.push({
        id: randomUUID(),
        number: `HC-${estimate.id.slice(0, 8).toUpperCase()}-RET`,
        issuedAt: now,
        grossCents: retainedCents,
        retainedCents: 0,
        dueCents: retainedCents,
        payments: [],
      });
      return;
    }
    case "payment": {
      const invoice = invoices.find((entry) => entry.id === input.recordId);
      if (!invoice) throw new EstimateError("Factura no disponible.", 404);
      if (
        invoice.payments.some(
          (payment) =>
            payment.source === "external" &&
            payment.reference === input.reference,
        )
      )
        return;
      const status =
        invoice.checkout && invoiceBalance(invoice) > 0
          ? await checkCheckout(professionalId, invoice)
          : undefined;
      if (status === "paid") return;
      if (status === "open")
        throw new EstimateError(
          "Hay una sesión de pago activa. Verifica su resultado antes de registrar otro cobro.",
          409,
        );
      if (input.amountCents > invoiceBalance(invoice))
        throw new EstimateError("El cobro supera el saldo de la factura.");
      invoice.payments.push({
        reference: input.reference,
        amountCents: input.amountCents,
        receivedAt: now,
        source: "external",
      });
      return;
    }
    case "checkout": {
      if (actor !== "owner" || !projectId)
        throw new EstimateError(
          "El pago en línea corresponde al cliente de la obra.",
          403,
        );
      const invoice = invoices.find((entry) => entry.id === input.recordId);
      if (!invoice) throw new EstimateError("Factura no disponible.", 404);
      const balance = invoiceBalance(invoice);
      if (balance === 0) return;
      if (!input.verifyOnly && !checkoutRange(balance))
        throw new EstimateError(
          "El saldo está fuera del rango de cobro en línea.",
          409,
        );
      const status = await checkCheckout(professionalId, invoice);
      if (status === "paid" || input.verifyOnly) return;
      if (status === "open" && invoice.checkout) return invoice.checkout.url;
      return startCheckout(professionalId, invoice, projectId);
    }
  }
}

export function clientEstimate(
  estimate: Estimate,
  professionalId: string,
): ClientEstimate {
  return {
    estimateId: estimate.id,
    title: estimate.title,
    budgetTotalCents: estimate.budget?.totalCents ?? 0,
    changes: (estimate.changes ?? []).map(
      ({ id, reason, amountCents, status, reviewNote, lines }) => ({
        id,
        reason,
        amountCents,
        status,
        reviewNote,
        lines: lines.map(
          ({ id, code, description, unit, quantity, amountCents }) => ({
            id,
            code,
            description,
            unit,
            quantity,
            amountCents,
          }),
        ),
      }),
    ),
    valuations: estimate.valuations
      .filter((record) => record.status && record.status !== "draft")
      .map(
        ({
          id,
          start,
          end,
          amountCents,
          notes,
          status,
          reviewNote,
          lines,
        }) => ({
          id,
          start,
          end,
          amountCents,
          notes,
          status,
          reviewNote,
          lines: lines.map((line) => {
            const item = estimate.budget?.lines.find(
              (entry) => entry.id === line.itemId,
            );
            return {
              ...line,
              code: item?.code ?? "",
              description: item?.description ?? "",
              unit: item?.unit ?? "",
            };
          }),
        }),
      ),
    invoices: (estimate.invoices ?? []).map(
      ({ checkout, payments, ...invoice }) => ({
        ...invoice,
        paidCents: payments.reduce(
          (sum, payment) => sum + payment.amountCents,
          0,
        ),
        canPay:
          checkoutEnabled(professionalId) &&
          checkoutRange(invoiceBalance({ ...invoice, payments })),
        hasCheckout: !!checkout,
      }),
    ),
  };
}
