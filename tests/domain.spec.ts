import { test, expect } from "@playwright/test";
import { createSeed as createPopulatedSeed } from "../src/data/seed";
const createSeed = () => ({
  ...createPopulatedSeed(),
  requests: [],
  proposals: [],
  projects: [],
  favorites: [],
  messages: [],
  audit: [],
});
import { reducer } from "../src/domain/store";
import { stateSchema, hasValidRelations } from "../src/domain/schema";
import { findProfessionals } from "../src/domain/queries";
import type { DemoState } from "../src/domain/types";

type Action = Parameters<typeof reducer>[1];
const meta = {
  actor: "owner" as const,
  actingProfessional: "ruiz",
  id: "request-1",
  at: "2026-11-17T12:00:00Z",
};
const request: Action = {
  ...meta,
  type: "request",
  value: {
    title: "Renovar cocina",
    categoryId: "remodeling",
    serviceId: "remodeling-1",
    location: "Miami",
    description: "Renovar los gabinetes",
    budget: 1500,
    date: "",
  },
};
function withProposal() {
  const state = reducer(createSeed(), request);
  return reducer(state, {
    ...meta,
    id: "proposal-1",
    actor: "contractor",
    type: "proposal",
    value: {
      requestId: "request-1",
      amount: 1200,
      days: 7,
      description: "Incluye materiales.",
    },
  });
}

test("un proyecto solo puede adjudicarse una vez y por el propietario", () => {
  const state = withProposal();
  expect(
    reducer(state, {
      ...meta,
      actor: "contractor",
      id: "invalid",
      type: "accept",
      proposalId: "proposal-1",
    }),
  ).toEqual(state);
  const awarded = reducer(state, {
    ...meta,
    id: "project-1",
    type: "accept",
    proposalId: "proposal-1",
  });
  expect(awarded.projects).toHaveLength(1);
  expect(
    reducer(awarded, {
      ...meta,
      id: "project-2",
      type: "accept",
      proposalId: "proposal-1",
    }),
  ).toEqual(awarded);
  expect(hasValidRelations(awarded)).toBeTruthy();
});

test("no se admiten propuestas duplicadas, importes negativos ni respuestas a solicitudes canceladas", () => {
  const state = withProposal();
  const duplicate: Action = {
    ...meta,
    actor: "contractor",
    id: "duplicate",
    type: "proposal",
    value: {
      requestId: "request-1",
      amount: 1000,
      days: 3,
      description: "Segunda propuesta",
    },
  };
  expect(reducer(state, duplicate)).toEqual(state);
  expect(
    reducer(state, {
      ...duplicate,
      actingProfessional: "habita",
      value: { ...duplicate.value, amount: -50 },
    }),
  ).toEqual(state);
  const cancelled = reducer(state, {
    ...meta,
    type: "cancel",
    requestId: "request-1",
  });
  expect(
    reducer(cancelled, { ...duplicate, actingProfessional: "habita" }),
  ).toEqual(cancelled);
  expect(
    reducer(cancelled, { ...meta, type: "accept", proposalId: "proposal-1" }),
  ).toEqual(cancelled);
});

test("el adaptador valida estructura y relaciones antes de restaurar", () => {
  const seed = createSeed();
  expect(stateSchema.safeParse(seed).success).toBeTruthy();
  expect(hasValidRelations(seed)).toBeTruthy();
  expect(
    stateSchema.safeParse({ ...seed, professionals: null }).success,
  ).toBeFalsy();
  expect(hasValidRelations({ ...seed, professionals: [] })).toBeFalsy();
  expect(hasValidRelations({ ...seed, favorites: ["unknown"] })).toBeFalsy();
  const invalid = structuredClone(withProposal()) as DemoState;
  invalid.proposals[0].requestId = "unknown";
  expect(hasValidRelations(invalid)).toBeFalsy();
});

test("la búsqueda usa cobertura declarada y retira las fichas no publicadas", () => {
  const state = createSeed();
  expect(
    findProfessionals(state, { categoryId: "remodeling", city: "Doral" }).map(
      (p) => p.id,
    ),
  ).toEqual(["ruiz", "habita"]);
  const draft = reducer(state, {
    ...meta,
    actor: "admin",
    type: "publication",
    professionalId: "ruiz",
  });
  expect(
    findProfessionals(draft, { categoryId: "remodeling", city: "Doral" }).map(
      (p) => p.id,
    ),
  ).toEqual(["habita"]);
});
