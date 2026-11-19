import { z } from "zod";

const id = z.string().min(1).max(100);
const label = z.string().trim().min(1).max(150);
export const partInput = z.object({
  name: label,
  unit: z.string().trim().min(1).max(30),
  unitCents: z.number().int().min(1).max(100_000_000),
});
export const measurementInput = z.object({
  requestId: id,
  partId: id,
  quantity: z.number().min(0).max(1_000_000),
});
export const budgetInput = z.object({
  requestId: id,
  expectedCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  days: z.number().int().min(1).max(3650),
  description: z.string().trim().min(1).max(3000),
});
export const valuationInput = z.object({
  proposalId: id,
  progress: z.number().int().min(1).max(100),
});

const part = partInput.extend({ id, professionalId: id });
const measurement = measurementInput.extend({ professionalId: id });
export const budgetLineSchema = partInput.extend({
  partId: id,
  quantity: measurementInput.shape.quantity.refine((quantity) => quantity > 0),
});
const valuation = valuationInput.extend({ id, at: z.string().datetime() });
export const estimatingSchema = z.object({
  parts: z.array(part),
  measurements: z.array(measurement),
  valuations: z.array(valuation),
});
export type Estimating = z.infer<typeof estimatingSchema>;
export type BudgetLine = z.infer<typeof budgetLineSchema>;

export function budgetLines(
  estimating: Estimating,
  professionalId: string,
  requestId: string,
): BudgetLine[] {
  return estimating.parts
    .filter((part) => part.professionalId === professionalId)
    .flatMap(({ id, name, unit, unitCents }) => {
      const row = estimating.measurements.find(
        (measurement) =>
          measurement.professionalId === professionalId &&
          measurement.requestId === requestId &&
          measurement.partId === id,
      );
      return row
        ? [{ partId: id, name, unit, unitCents, quantity: row.quantity }]
        : [];
    });
}

export const lineCents = (line: BudgetLine) =>
  Math.round(line.unitCents * line.quantity);

export const budgetCents = (lines: BudgetLine[]) =>
  lines.reduce((total, line) => total + lineCents(line), 0);
