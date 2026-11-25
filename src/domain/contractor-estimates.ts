export const workUnits = [
  "ea",
  "lf",
  "ft²",
  "ft³",
  "yd³",
  "hr",
  "m",
  "m²",
  "m³",
  "kg",
  "lot",
] as const;
export type WorkUnit = (typeof workUnits)[number];
export const resourceKinds = ["material", "labor", "equipment"] as const;
export type WorkResource = {
  kind: (typeof resourceKinds)[number];
  description: string;
  unit: string;
  quantity: number;
  rateCents: number;
};

export type WorkItem = {
  id: string;
  code: string;
  description: string;
  unit: WorkUnit;
  unitPriceCents: number;
  priceSource: string;
  active: boolean;
  resources?: WorkResource[];
};

export type Measurement = {
  id: string;
  itemId: string;
  location: string;
  factors: number[];
  quantity: number; // Thousandths of the item's unit.
  source?: { format: "pdf" | "dxf" | "ifc"; label: string };
};

export type BudgetLine = WorkItem & { quantity: number; amountCents: number };
export type Budget = {
  lines: BudgetLine[];
  totalCents: number;
  closedAt: string;
};

export type ValuationLine = {
  itemId: string;
  quantity: number;
  accumulated: number;
  amountCents: number;
};
export type Valuation = {
  id: string;
  start: string;
  end: string;
  notes: string;
  lines: ValuationLine[];
  amountCents: number;
  accumulatedCents: number;
  status?: "draft" | "submitted" | "approved" | "rejected";
  reviewedAt?: string;
  reviewNote?: string;
};

export type ChangeOrder = {
  id: string;
  reason: string;
  lines: BudgetLine[];
  amountCents: number;
  status: "submitted" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
};

export type Invoice = {
  id: string;
  number: string;
  valuationId?: string;
  issuedAt: string;
  grossCents: number;
  retainedCents: number;
  dueCents: number;
  payments: {
    reference: string;
    amountCents: number;
    receivedAt: string;
    source: "external" | "stripe";
  }[];
  checkout?: { id: string; url: string; expiresAt: number };
};

export type Estimate = {
  id: string;
  title: string;
  requestId: string;
  measurements: Measurement[];
  budget?: Budget;
  agreement?: string;
  valuations: Valuation[];
  revisions?: Budget[];
  changes?: ChangeOrder[];
  retentionBps?: number;
  invoices?: Invoice[];
};

export type EstimateWorkspace = {
  items: WorkItem[];
  estimates: (Estimate & {
    proposalStatus?: "submitted" | "accepted" | "declined";
  })[];
  opportunities: { id: string; title: string; location: string }[];
};

export type ClientEstimate = {
  estimateId: string;
  title: string;
  budgetTotalCents: number;
  changes: (Pick<
    ChangeOrder,
    "id" | "reason" | "amountCents" | "status" | "reviewNote"
  > & {
    lines: Pick<
      BudgetLine,
      "id" | "code" | "description" | "unit" | "quantity" | "amountCents"
    >[];
  })[];
  valuations: (Pick<
    Valuation,
    "id" | "start" | "end" | "amountCents" | "notes" | "status" | "reviewNote"
  > & {
    lines: (ValuationLine & {
      code: string;
      unit: WorkUnit | "";
      description: string;
    })[];
  })[];
  invoices: (Omit<Invoice, "checkout" | "payments"> & {
    paidCents: number;
    canPay: boolean;
    hasCheckout: boolean;
  })[];
};

export function lineAmount(quantity: number, unitPriceCents: number) {
  return Number((BigInt(quantity) * BigInt(unitPriceCents) + 500n) / 1000n);
}

export function valuationQuantity(estimate: Estimate) {
  const quantities = new Map<string, number>();
  for (const valuation of estimate.valuations) {
    if (valuation.status === "rejected") continue;
    for (const line of valuation.lines)
      quantities.set(line.itemId, line.accumulated);
  }
  return quantities;
}

export function invoiceBalance(invoice: Invoice) {
  return (
    invoice.dueCents -
    invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0)
  );
}
