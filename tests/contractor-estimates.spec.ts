import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { test, expect, origins } from "./fixtures";
import type {
  Estimate,
  EstimateWorkspace,
} from "../src/domain/contractor-estimates";
import { stripeWebhook } from "../server/contractor-checkout";
import { Database } from "../server/database/database";

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
  await page.getByRole("button", { name: "Reabrir como borrador" }).click();
  await expect(page.getByText("Versiones del presupuesto")).toBeVisible();
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar PDF" }).click();
  expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
  const excel = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar Excel" }).click();
  expect((await excel).suggestedFilename()).toMatch(/\.xlsx$/);
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
  page,
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
  const itemId = await save({
    ...item,
    unitPriceCents: 1,
    resources: [
      {
        kind: "labor",
        description: "Pintor",
        unit: "hr",
        quantity: 500,
        rateCents: 202,
      },
    ],
  });
  expect((await workspace()).items[0].unitPriceCents).toBe(101);
  const importItem = { ...item, code: "CATALOGO-1" };
  expect(
    (
      await send({ action: "import-items", items: [importItem, item] })
    ).status(),
  ).toBe(409);
  expect((await workspace()).items.map(({ code }) => code)).toEqual([
    item.code,
  ]);
  await save({ action: "import-items", items: [importItem] });
  await save({
    action: "import-items",
    updatePrices: true,
    items: [{ ...importItem, unitPriceCents: 200 }],
  });
  expect(
    (await workspace()).items.find(({ code }) => code === importItem.code)
      ?.unitPriceCents,
  ).toBe(200);
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
  const project = await ownerCommand({
    type: "accept",
    proposalId: proposal[0].id,
  });
  const ownerEndpoint = `${url("/api/owner/estimate")}&project=${project.id}`;
  const current = async () =>
    (await workspace()).estimates.find((entry) => entry.id === estimateId)!;
  const related = async () =>
    (await request.get(ownerEndpoint, { headers: owner })).json();
  const review = (
    kind: string,
    recordId: string,
    approved: boolean,
    note = "",
  ) =>
    request.post(ownerEndpoint, {
      headers: owner,
      data: { action: "review", estimateId, kind, recordId, approved, note },
    });
  await save({ action: "retention", estimateId, bps: 1000 });
  await save(first);
  const recordId = (await current()).valuations[0].id;
  expect((await related()).valuations).toEqual([]);
  expect(
    (await send({ action: "invoice", estimateId, recordId })).status(),
  ).toBe(409);
  await save({ action: "valuation-submit", estimateId, recordId });
  expect(
    (
      await send({
        action: "review",
        estimateId,
        kind: "valuation",
        recordId,
        approved: true,
        note: "",
      })
    ).status(),
  ).toBe(403);
  await page.goto(`${origins.web}/#/workspace/owner/projects/${project.id}`);
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await expect(page.getByText(/Valuación · .* · Aprobada/)).toBeVisible();
  await save({ action: "invoice", estimateId, recordId });
  await save({ action: "invoice", estimateId, recordId });
  expect((await related()).invoices).toMatchObject([
    { grossCents: 51, retainedCents: 5, dueCents: 46, canPay: false },
  ]);
  const invoice = (await current()).invoices![0];
  const payment = {
    action: "payment",
    estimateId,
    recordId: invoice.id,
    reference: "REC-01",
    amountCents: 46,
  };
  expect((await send({ ...payment, amountCents: 47 })).status()).toBe(400);
  await save(payment);
  await save(payment);
  expect((await related()).invoices[0].paidCents).toBe(46);
  expect((await send(first)).status()).toBe(400);
  const change = {
    action: "change",
    estimateId,
    reason: "El cliente agrega medio pie cuadrado",
    lines: [{ itemId, quantity: 500 }],
  };
  await save(change);
  const changeId = (await current()).changes![0].id;
  expect((await related()).changes[0].lines[0]).not.toHaveProperty("resources");
  await expect(await review("change", changeId, true)).toBeOK();
  expect((await current()).revisions?.[0].totalCents).toBe(152);
  expect((await current()).budget?.totalCents).toBe(202);
  const second = { ...first, start: "2026-11-08", end: "2026-11-15" };
  expect(
    (await send({ ...second, lines: [{ itemId, quantity: 1501 }] })).status(),
  ).toBe(400);
  await save({ ...second, lines: [{ itemId, quantity: 1500 }] });
  const secondId = (await current()).valuations[1].id;
  await save({ action: "valuation-submit", estimateId, recordId: secondId });
  await expect(await review("valuation", secondId, true)).toBeOK();
  await save({ action: "invoice", estimateId, recordId: secondId });
  await save({ action: "release-retention", estimateId });
  expect((await related()).invoices.at(-1)).toMatchObject({
    dueCents: 20,
    retainedCents: 0,
  });
  const estimate = (await workspace()).estimates.find(
    (entry) => entry.id === estimateId,
  );
  expect(estimate?.valuations.map((value) => value.amountCents)).toEqual([
    51, 151,
  ]);
  expect(estimate?.valuations.at(-1)?.accumulatedCents).toBe(202);
  expect(
    (await request.get(ownerEndpoint, { headers: contractor })).status(),
  ).toBe(403);
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

test("El webhook confirma la factura únicamente con firma y cuenta válidas, sin duplicar pagos", async () => {
  const env = {
    STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_CONTRACTOR_ACCOUNTS: '{"ruiz":"acct_fixture"}',
    STRIPE_WEBHOOK_SECRET: "whsec_fixture",
    PUBLIC_SITE_URL: "https://homeconnect.example.test",
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((name) => [name, process.env[name]]),
  );
  Object.assign(process.env, env);
  const database = new Database();
  try {
    await database.initialize();
    const invoiceId = randomUUID();
    const id = randomUUID();
    const sessionId = "cs_test_fixture";
    const estimate: Estimate = {
      id,
      title: "Factura de prueba",
      requestId: "",
      measurements: [],
      valuations: [],
      invoices: [
        {
          id: invoiceId,
          number: "HC-TEST-1",
          issuedAt: "2026-11-23",
          grossCents: 1200,
          retainedCents: 200,
          dueCents: 1000,
          payments: [],
          checkout: {
            id: sessionId,
            url: "https://checkout.stripe.com/",
            expiresAt: Date.now() + 60_000,
          },
        },
      ],
    };
    await database.sql.query(
      "INSERT INTO contractor_estimate(namespace, professional_id, id, data) VALUES('default','ruiz',$1,$2)",
      [id, JSON.stringify(estimate)],
    );
    const event = {
      type: "checkout.session.completed",
      account: "acct_fixture",
      livemode: false,
      data: {
        object: {
          id: sessionId,
          currency: "usd",
          metadata: { invoice_id: invoiceId },
          payment_status: "paid",
          amount_total: 1000,
          status: "complete",
        },
      },
    };
    const timestamp = Math.floor(Date.now() / 1000);
    const signed = (payload: Buffer) =>
      `t=${timestamp},v1=${createHmac("sha256", env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.`).update(payload).digest("hex")}`;
    const body = Buffer.from(JSON.stringify(event));
    const wrongAccount = Buffer.from(
      JSON.stringify({ ...event, account: "acct_other" }),
    );
    const stored = async () =>
      (
        await database.sql.query<{ data: Estimate }>(
          "SELECT data FROM contractor_estimate WHERE id=$1",
          [id],
        )
      ).rows[0].data.invoices?.[0].payments;
    expect(await stripeWebhook(database, wrongAccount, signed(body))).toBe(400);
    expect(
      await stripeWebhook(database, wrongAccount, signed(wrongAccount)),
    ).toBe(200);
    expect(await stored()).toEqual([]);
    expect(await stripeWebhook(database, body, signed(body))).toBe(200);
    expect(await stripeWebhook(database, body, signed(body))).toBe(200);
    expect(await stored()).toMatchObject([
      { reference: sessionId, amountCents: 1000, source: "stripe" },
    ]);
  } finally {
    await database.close();
    for (const [name, value] of Object.entries(previous))
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
  }
});

test("Importa CSV y Excel y registra longitud calibrada desde PDF, DXF e IFC", async ({
  page,
}) => {
  await page.goto(origins.contractor + "/#/workspace/contractor/proposals");
  const catalog = page.getByLabel("Archivo Excel o CSV");
  const header = [
    "code",
    "description",
    "unit",
    "unit_price_usd",
    "price_source",
  ];
  await catalog.setInputFiles({
    name: "partidas.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `${header.join(",")}\nCSV-01,"Trazos, por pie",lf,2.50,Catálogo propio\n`,
    ),
  });
  await page.getByRole("button", { name: "Importar partidas" }).click();
  await expect(
    page.getByText("CSV-01 · Trazos, por pie", { exact: true }),
  ).toBeVisible();
  const workbook = new ExcelJS.Workbook();
  workbook
    .addWorksheet("Partidas")
    .addRows([
      header,
      ["XLS-01", "Partida desde Excel", "ea", 16.75, "Proveedor de prueba"],
    ]);
  await catalog.setInputFiles({
    name: "partidas.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  });
  await page.getByRole("button", { name: "Importar partidas" }).click();
  await expect(
    page.getByText("XLS-01 · Partida desde Excel", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Mediciones", exact: true }).click();
  await page.getByLabel("Nombre de la obra").fill("Trabajo medido sobre plano");
  await page.getByRole("button", { name: "Crear expediente" }).click();
  const pdf = await PDFDocument.create();
  pdf
    .addPage([480, 300])
    .drawRectangle({ x: 25, y: 25, width: 400, height: 240 });
  const dxf = [
    0,
    "SECTION",
    2,
    "ENTITIES",
    0,
    "LINE",
    8,
    "0",
    10,
    0,
    20,
    0,
    30,
    0,
    11,
    20,
    21,
    10,
    31,
    0,
    0,
    "ENDSEC",
    0,
    "EOF",
    "",
  ].join("\r\n");
  const ifc = await readFile(
    new URL("./fixtures/estimate-slab.ifc", import.meta.url),
  );
  for (const [name, buffer, mimeType] of [
    ["planta.pdf", Buffer.from(await pdf.save()), "application/pdf"],
    ["planta.dxf", Buffer.from(dxf), "application/dxf"],
    ["losa.ifc", ifc, "application/octet-stream"],
  ] as const) {
    await page
      .getByLabel("Plano PDF, DXF o IFC")
      .setInputFiles({ name, mimeType, buffer });
    const plan = page.getByLabel(/Plano para marcar puntos/);
    await expect(plan).toBeVisible();
    await page.getByLabel("Distancia de referencia").fill("20");
    await plan.click({ position: { x: 30, y: 30 } });
    await plan.click({ position: { x: 130, y: 30 } });
    await page.getByRole("button", { name: "Trazar longitud" }).click();
    await plan.click({ position: { x: 30, y: 50 } });
    await plan.click({ position: { x: 80, y: 50 } });
    await page.getByLabel("Ubicación del trazo").fill(name);
    await page
      .getByRole("button", { name: "Guardar medición del plano" })
      .click();
    await expect(
      page.getByText(`CSV-01 · ${name}`, { exact: true }),
    ).toBeVisible();
  }
});
