import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AuthUser } from "../src/auth/types";
import type { DemoState } from "../src/domain/types";
import { allowedRequests, reducer } from "../src/domain/store";
import {
  lineAmount,
  workUnits,
  type Budget,
  type Estimate,
  type EstimateWorkspace,
  type Valuation,
  type WorkItem,
} from "../src/domain/contractor-estimates";
import type { Database } from "./database/database";

const id = z.uuid();
const title = z.string().trim().min(1).max(160);
const quantity = z.number().int().min(1).max(1_000_000_000);
const factor = z
  .number()
  .positive()
  .max(1_000_000)
  .refine(
    (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 0.000001,
  );
const date = z.iso.date();
const actions = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("item"),
    id: id.optional(),
    code: title.max(40),
    description: title,
    unit: z.enum(workUnits),
    unitPriceCents: z.number().int().min(1).max(100_000_000),
    priceSource: z.string().trim().max(160),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal("estimate"),
    title,
    requestId: z.string().max(160),
  }),
  z.object({
    action: z.literal("measurement"),
    estimateId: id,
    itemId: id,
    location: title,
    factors: z.array(factor).min(1).max(3),
  }),
  z.object({
    action: z.literal("measurement-remove"),
    estimateId: id,
    measurementId: id,
  }),
  z.object({ action: z.literal("close"), estimateId: id }),
  z.object({
    action: z.literal("agreement"),
    estimateId: id,
    reference: title,
  }),
  z.object({
    action: z.literal("send"),
    estimateId: id,
    days: z.number().int().min(1).max(3650),
    description: z.string().trim().min(1).max(4000),
  }),
  z.object({
    action: z.literal("valuation"),
    estimateId: id,
    start: date,
    end: date,
    notes: z.string().trim().max(2000),
    lines: z
      .array(z.object({ itemId: id, quantity }))
      .min(1)
      .max(200),
  }),
]);

class EstimateError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function requireBudget(estimate: Estimate): Budget {
  if (!estimate.budget)
    throw new EstimateError("Primero cierra el presupuesto.");
  return estimate.budget;
}

function prepareBudget(estimate: Estimate, items: WorkItem[]): Budget {
  const quantities = new Map<string, number>();
  for (const measurement of estimate.measurements)
    quantities.set(
      measurement.itemId,
      (quantities.get(measurement.itemId) ?? 0) + measurement.quantity,
    );
  if (!quantities.size)
    throw new EstimateError("Registra al menos una medición.");
  const lines = Array.from(quantities, ([itemId, measured]) => {
    const item = items.find((record) => record.id === itemId);
    if (!item)
      throw new EstimateError("Una partida del cómputo ya no está disponible.");
    if (!quantity.safeParse(measured).success)
      throw new EstimateError("La cantidad de una partida supera el límite.");
    return {
      ...item,
      quantity: measured,
      amountCents: lineAmount(measured, item.unitPriceCents),
    };
  });
  const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  if (totalCents < 1 || totalCents > 1_000_000_000_000)
    throw new EstimateError(
      "El total del presupuesto está fuera del rango permitido.",
    );
  return { lines, totalCents, closedAt: new Date().toISOString() };
}

function prepareValuation(
  estimate: Estimate,
  input: Extract<z.infer<typeof actions>, { action: "valuation" }>,
): Valuation {
  const budget = requireBudget(estimate);
  const previous = estimate.valuations.at(-1);
  if (input.start > input.end || (previous && input.start <= previous.end))
    throw new EstimateError(
      "Las fechas deben formar un período posterior al último, sin solaparse.",
    );
  if (
    new Set(input.lines.map((line) => line.itemId)).size !== input.lines.length
  )
    throw new EstimateError("Incluye cada partida una sola vez.");
  const quantities = new Map<string, number>();
  for (const valuation of estimate.valuations)
    for (const line of valuation.lines)
      quantities.set(line.itemId, line.accumulated);
  const lines = input.lines.map((line) => {
    const approved = budget.lines.find((record) => record.id === line.itemId);
    if (!approved)
      throw new EstimateError("Una partida no pertenece a este presupuesto.");
    const prior = quantities.get(line.itemId) ?? 0;
    const accumulated = prior + line.quantity;
    if (accumulated > approved.quantity)
      throw new EstimateError(
        `La partida ${approved.code} supera la cantidad presupuestada.`,
      );
    // Subtract rounded cumulative totals so partitioning a quantity never adds or loses cents.
    const amountCents =
      lineAmount(accumulated, approved.unitPriceCents) -
      lineAmount(prior, approved.unitPriceCents);
    return { ...line, accumulated, amountCents };
  });
  const amountCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  return {
    id: randomUUID(),
    start: input.start,
    end: input.end,
    notes: input.notes,
    lines,
    amountCents,
    accumulatedCents: (previous?.accumulatedCents ?? 0) + amountCents,
  };
}

export async function contractorEstimateRoutes(
  path: string,
  method: "GET" | "POST",
  body: unknown,
  db: Database,
  user: AuthUser | null,
  namespace: string,
  state: DemoState,
  send: (status: number, body: unknown) => void,
  saveMarketplace: (next: DemoState) => Promise<void>,
) {
  if (path !== "/api/contractor/estimates") return false;
  const professionalId = user?.professionalId;
  if (
    !user ||
    user.role !== "contractor" ||
    !professionalId ||
    !state.professionals.some((record) => record.id === professionalId)
  ) {
    send(user ? 403 : 401, {
      error:
        "Inicia sesión con una cuenta vinculada a tu ficha de contratista.",
    });
    return true;
  }
  const scope = [namespace, professionalId];
  const items = (
    await db.sql.query<{ data: WorkItem }>(
      "SELECT data FROM contractor_work_item WHERE namespace=$1 AND professional_id=$2 ORDER BY code",
      scope,
    )
  ).rows.map(({ data }) => data);
  const estimates = (
    await db.sql.query<{ data: Estimate }>(
      "SELECT data FROM contractor_estimate WHERE namespace=$1 AND professional_id=$2 ORDER BY data->>'title', id",
      scope,
    )
  ).rows.map(({ data }) => data);
  const ownProposals = state.proposals.filter(
    (proposal) => proposal.professionalId === professionalId,
  );
  const opportunities = allowedRequests(state, professionalId).filter(
    (request) =>
      !ownProposals.some((proposal) => proposal.requestId === request.id),
  );
  const workspace = (): EstimateWorkspace => ({
    items,
    estimates: estimates.map((estimate) => ({
      ...estimate,
      proposalStatus: ownProposals.find(
        (proposal) => proposal.contractorEstimateId === estimate.id,
      )?.status,
    })),
    opportunities: opportunities.map(({ id, title, location }) => ({
      id,
      title,
      location,
    })),
  });
  if (method === "GET") {
    send(200, workspace());
    return true;
  }
  const parsed = actions.safeParse(body);
  if (!parsed.success) {
    send(400, {
      error:
        "Revisa los campos, las fechas y los límites de cantidades o precios.",
    });
    return true;
  }
  const input = parsed.data;
  try {
    if (input.action === "item") {
      const previous = items.find((item) => item.id === input.id);
      if (input.id && !previous)
        throw new EstimateError("Partida no disponible.", 404);
      const code = input.code.toUpperCase();
      if (items.some((item) => item.code === code && item.id !== input.id))
        throw new EstimateError("Ya tienes una partida con ese código.", 409);
      if (!previous && items.length >= 500)
        throw new EstimateError("El catálogo admite hasta 500 partidas.");
      if (
        previous &&
        previous.unit !== input.unit &&
        estimates.some((record) =>
          record.measurements.some(
            (measurement) => measurement.itemId === previous.id,
          ),
        )
      )
        throw new EstimateError(
          "La unidad ya se usó en mediciones. Crea una partida para la nueva unidad.",
        );
      const { action: _, ...fields } = input;
      const item: WorkItem = {
        ...fields,
        id: previous?.id ?? randomUUID(),
        code,
      };
      await db.sql.query(
        "INSERT INTO contractor_work_item(namespace,professional_id,id,code,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(namespace,professional_id,id) DO UPDATE SET code=excluded.code,data=excluded.data",
        [...scope, item.id, item.code, JSON.stringify(item)],
      );
      send(200, { id: item.id });
      return true;
    }

    let estimate: Estimate;
    if (input.action === "estimate") {
      if (!items.some((item) => item.active))
        throw new EstimateError("Carga al menos una partida activa.");
      if (estimates.length >= 200)
        throw new EstimateError("Alcanzaste el límite de expedientes.");
      if (
        input.requestId &&
        !opportunities.some((request) => request.id === input.requestId)
      )
        throw new EstimateError(
          "La solicitud ya no está disponible para este contratista.",
          404,
        );
      estimate = {
        id: randomUUID(),
        title: input.title,
        requestId: input.requestId,
        measurements: [],
        valuations: [],
      };
    } else {
      const record = estimates.find(
        (candidate) => candidate.id === input.estimateId,
      );
      if (!record) throw new EstimateError("Expediente no disponible.", 404);
      estimate = record;
      const proposal = ownProposals.find(
        (entry) => entry.contractorEstimateId === estimate.id,
      );
      switch (input.action) {
        case "measurement":
          if (estimate.budget)
            throw new EstimateError("El presupuesto ya está cerrado.", 409);
          if (estimate.measurements.length >= 200)
            throw new EstimateError(
              "El expediente admite hasta 200 mediciones.",
            );
          if (!items.some((item) => item.id === input.itemId && item.active))
            throw new EstimateError(
              "Selecciona una partida activa de tu catálogo.",
            );
          const product = input.factors.reduce(
            (accumulator, value) =>
              accumulator * BigInt(Math.round(value * 1000)),
            1n,
          );
          const divisor = 1000n ** BigInt(input.factors.length - 1);
          const measured = Number((product + divisor / 2n) / divisor);
          if (!quantity.safeParse(measured).success)
            throw new EstimateError(
              "La cantidad calculada debe ser de 0,001 a 1.000.000 unidades.",
            );
          estimate.measurements.push({
            id: randomUUID(),
            itemId: input.itemId,
            location: input.location,
            factors: input.factors,
            quantity: measured,
          });
          break;
        case "measurement-remove":
          if (estimate.budget)
            throw new EstimateError("El presupuesto ya está cerrado.", 409);
          if (
            !estimate.measurements.some(
              (measurement) => measurement.id === input.measurementId,
            )
          )
            throw new EstimateError("Medición no disponible.", 404);
          estimate.measurements = estimate.measurements.filter(
            (measurement) => measurement.id !== input.measurementId,
          );
          break;
        case "close":
          if (estimate.budget)
            throw new EstimateError("El presupuesto ya está cerrado.", 409);
          estimate.budget = prepareBudget(estimate, items);
          break;
        case "agreement":
          requireBudget(estimate);
          if (estimate.requestId || estimate.agreement)
            throw new EstimateError(
              "Este expediente no admite confirmar un acuerdo externo.",
              409,
            );
          estimate.agreement = input.reference;
          break;
        case "send": {
          if (!user.emailVerified)
            throw new EstimateError(
              "Confirma tu correo antes de enviar la propuesta.",
              403,
            );
          const budget = requireBudget(estimate);
          if (proposal) {
            send(200, { id: estimate.id });
            return true;
          }
          const next = reducer(state, {
            type: "proposal",
            actor: "contractor",
            actingProfessional: professionalId,
            actorId: user.id,
            id: randomUUID(),
            at: new Date().toISOString(),
            value: {
              requestId: estimate.requestId,
              amount: budget.totalCents / 100,
              days: input.days,
              description: input.description,
              contractorEstimateId: estimate.id,
            },
          });
          if (next === state)
            throw new EstimateError(
              "Esta solicitud ya no admite una propuesta de tu cuenta.",
              409,
            );
          await saveMarketplace(next);
          send(200, { id: estimate.id });
          return true;
        }
        case "valuation":
          if (
            !(estimate.requestId
              ? proposal?.status === "accepted"
              : estimate.agreement)
          )
            throw new EstimateError(
              "La valuación requiere una propuesta aceptada o un acuerdo externo registrado.",
              409,
            );
          if (estimate.valuations.length >= 200)
            throw new EstimateError(
              "El expediente admite hasta 200 valuaciones.",
            );
          estimate.valuations.push(prepareValuation(estimate, input));
          break;
      }
    }
    await db.sql.query(
      "INSERT INTO contractor_estimate(namespace,professional_id,id,data) VALUES($1,$2,$3,$4) ON CONFLICT(namespace,professional_id,id) DO UPDATE SET data=excluded.data",
      [...scope, estimate.id, JSON.stringify(estimate)],
    );
    send(200, { id: estimate.id });
  } catch (error) {
    if (!(error instanceof EstimateError)) throw error;
    send(error.status, { error: error.message });
  }
  return true;
}
