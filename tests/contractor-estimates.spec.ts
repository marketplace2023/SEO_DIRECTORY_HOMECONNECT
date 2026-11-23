import { randomUUID } from "node:crypto";
import { test, expect, origins } from "./fixtures";
import type { EstimateWorkspace } from "../src/domain/contractor-estimates";

const api = "http://127.0.0.1:5197";
test("Propuestas: crea partidas propias, mide, cierra un presupuesto y valúa avance en una obra externa", async ({
  page,
}) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto(origins.contractor + "/#/workspace/contractor/proposals");
  await page.getByLabel("Código", { exact: true }).fill("PINT-01");
  await page.getByLabel("Descripción de la partida").fill("Pintura interior");
  await page
    .getByRole("combobox", { name: "Unidad", exact: true })
    .selectOption("ft²");
  await page.getByLabel("Precio unitario en USD").fill("2.55");
  await page.getByRole("button", { name: "Guardar partida" }).click();
  await expect(
    page.getByText("PINT-01 · Pintura interior", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Mediciones", exact: true }).click();
  await page.getByLabel("Nombre de la obra").fill("Pintura de sala");
  await page.getByRole("button", { name: "Crear expediente" }).click();
  await page.getByLabel("Ubicación o elemento").fill("Muro norte");
  await page.getByLabel("Cantidad o largo").fill("10");
  await page.getByLabel("Ancho (opcional)").fill("2.5");
  await page.getByRole("button", { name: "Agregar medición" }).click();
  await expect(page.getByText("10 × 2.5 = 25 ft²")).toBeVisible();
  await page.getByRole("button", { name: "Ir al presupuesto" }).click();
  await expect(
    page.getByRole("cell", { name: /63[,.]75/ }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar presupuesto" }).click();
  await page
    .getByLabel("Referencia del acuerdo con el cliente")
    .fill("Aprobación externa de prueba");
  await page.getByRole("button", { name: "Registrar acuerdo externo" }).click();
  await expect(page.getByText(/Aprobación externa de prueba/)).toBeVisible();
  await page.getByRole("tab", { name: "Valuaciones", exact: true }).click();
  await page.getByLabel("Inicio del período").fill("2026-11-01");
  await page.getByLabel("Fin del período").fill("2026-11-15");
  await page.getByLabel(/Ejecutado en el período/).fill("10");
  await page.getByRole("button", { name: "Guardar valuación" }).click();
  await expect(page.getByText(/2026-11-01.*2026-11-15/)).toContainText(
    /25[,.]5/,
  );
  await page.reload();
  await page.getByRole("tab", { name: "Valuaciones", exact: true }).click();
  await expect(page.getByText(/2026-11-01.*2026-11-15/)).toBeVisible();
});

test("Presupuestos API: comprador acepta total congelado, valuaciones por período e aislamiento por contratista", async ({
  request,
  demoSession,
}) => {
  const url = (path: string) => `${api}${path}?session=${demoSession}`;
  const endpoint = url("/api/contractor/estimates");
  async function login(email: string, application: "web" | "contractor") {
    const response = await request.post(url("/api/auth/login"), {
      data: { email, application, password: "Servinexo2026!" },
    });
    expect(response.ok()).toBeTruthy();
    return { Authorization: "Bearer " + (await response.json()).token };
  }
  const owner = await login("carolina@example.test", "web");
  const contractor = await login("ruiz@example.test", "contractor");
  const send = (data: Record<string, unknown>, headers = contractor) =>
    request.post(endpoint, { headers, data });
  async function save(data: Record<string, unknown>) {
    const response = await send(data);
    expect(response.ok(), await response.text()).toBeTruthy();
    return (await response.json()).id as string;
  }
  async function workspace(headers = contractor): Promise<EstimateWorkspace> {
    const response = await request.get(endpoint, { headers });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }
  async function ownerCommand(action: Record<string, unknown>) {
    const id = randomUUID();
    const response = await request.post(url("/api/demo/commands"), {
      headers: owner,
      data: {
        id,
        at: new Date().toISOString(),
        actor: "owner",
        actingProfessional: "ruiz",
        ...action,
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    return { id, state: await response.json() };
  }
  const job = await ownerCommand({
    type: "request",
    value: {
      title: "Pintura de prueba",
      categoryId: "remodeling",
      serviceId: "remodeling-1",
      professionalId: "ruiz",
      location: "Miami, Florida",
      description: "Trabajo de prueba para presupuesto medido.",
      budget: null,
      date: "",
    },
  });
  expect(
    (await workspace()).opportunities.some((entry) => entry.id === job.id),
  ).toBeTruthy();
  const item = {
    action: "item",
    code: "OB-1",
    description: "Partida presupuestada",
    unit: "ft²",
    unitPriceCents: 101,
    priceSource: "Tarifa propia",
    active: true,
  };
  const itemId = await save(item);
  const estimateId = await save({
    action: "estimate",
    title: "Obra vinculada",
    requestId: job.id,
  });
  expect((await send({ action: "close", estimateId })).status()).toBe(400);
  await save({
    action: "measurement",
    estimateId,
    itemId,
    location: "Muro A",
    factors: [3, 0.5],
  });
  await save({ action: "close", estimateId });
  await save({ ...item, id: itemId, unitPriceCents: 999 });
  await save({
    action: "send",
    estimateId,
    days: 2,
    description: "Alcance acordado según presupuesto.",
  });
  await save({
    action: "send",
    estimateId,
    days: 2,
    description: "Reintento de envío.",
  });
  const proposal = (
    await ownerCommand({ type: "favorite", professionalId: "ruiz" })
  ).state.proposals.filter(
    (entry: { requestId: string }) => entry.requestId === job.id,
  );
  expect(proposal).toHaveLength(1);
  expect(proposal[0].amount).toBe(1.52);
  const first = {
    action: "valuation",
    estimateId,
    start: "2026-11-01",
    end: "2026-11-07",
    notes: "",
    lines: [{ itemId, quantity: 500 }],
  };
  expect((await send(first)).status()).toBe(409);
  await ownerCommand({ type: "accept", proposalId: proposal[0].id });
  await save(first);
  expect((await send(first)).status()).toBe(400);
  const second = { ...first, start: "2026-11-08", end: "2026-11-15" };
  expect(
    (await send({ ...second, lines: [{ itemId, quantity: 1001 }] })).status(),
  ).toBe(400);
  await save({ ...second, lines: [{ itemId, quantity: 1000 }] });
  const estimate = (await workspace()).estimates.find(
    (entry) => entry.id === estimateId,
  );
  expect(estimate?.valuations.map((value) => value.amountCents)).toEqual([
    51, 101,
  ]);
  expect(estimate?.valuations.at(-1)?.accumulatedCents).toBe(152);
  expect((await request.get(endpoint, { headers: owner })).status()).toBe(403);
  const registered = await request.post(url("/api/auth/register"), {
    data: {
      role: "contractor",
      name: "Segundo contratista",
      email: "second-estimate@example.test",
      password: "Prueba2026!",
      categoryId: "roofing",
      city: "Lawrenceville",
    },
  });
  expect(registered.status()).toBe(201);
  const other = { Authorization: "Bearer " + (await registered.json()).token };
  expect((await workspace(other)).items).toEqual([]);
  expect((await send({ action: "close", estimateId }, other)).status()).toBe(
    404,
  );
  await expect(await send(item, other)).toBeOK();
});
