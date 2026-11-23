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

export type WorkItem = {
  id: string;
  code: string;
  description: string;
  unit: WorkUnit;
  unitPriceCents: number;
  priceSource: string;
  active: boolean;
};

export type Measurement = {
  id: string;
  itemId: string;
  location: string;
  factors: number[];
  quantity: number; // Thousandths of the item's unit.
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
};

export type Estimate = {
  id: string;
  title: string;
  requestId: string;
  measurements: Measurement[];
  budget?: Budget;
  agreement?: string;
  valuations: Valuation[];
};

export type EstimateWorkspace = {
  items: WorkItem[];
  estimates: (Estimate & {
    proposalStatus?: "submitted" | "accepted" | "declined";
  })[];
  opportunities: { id: string; title: string; location: string }[];
};

export function lineAmount(quantity: number, unitPriceCents: number) {
  return Number((BigInt(quantity) * BigInt(unitPriceCents) + 500n) / 1000n);
}
