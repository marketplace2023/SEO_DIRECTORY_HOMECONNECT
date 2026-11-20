import { test, expect, origins } from "./fixtures";
import { Database } from "../server/database/database";
import { localSeoRoutes } from "../server/local-seo/routes";
import { createSeed } from "../src/data/seed";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
const api = "http://127.0.0.1:5197";
test("SEO migración: conserva campañas antiguas, referencias y keywords tras reiniciar", async () => {
  const folder = mkdtempSync(join(tmpdir(), "seo-management-"));
  let db = new Database(folder);
  await db.initialize();
  const state = createSeed();
  await db.saveState("migration", state);
  const campaigns = Array.from({ length: 27 }, (_, i) => ({
    id: randomUUID(),
    keyword: "Legacy " + i,
    createdAt: "2026-11-01T00:00:00Z",
    engine: "google_maps",
    language: "en",
    center: { latitude: 34, longitude: -84 },
    size: 3,
    depth: 20,
    spacingKm: 1,
  }));
  await db.sql.query(
    "INSERT INTO local_seo_project(namespace,id,data) VALUES($1,$2,$3)",
    [
      "migration",
      "ruiz",
      JSON.stringify({
        professionalId: "ruiz",
        nap: {
          name: "Referencia anterior",
          address: "Dirección antigua",
          phone: "123",
          website: "",
        },
        serviceAreaBusiness: true,
        reviewUrl: "",
        tasks: [],
        citations: [],
        competitors: [],
        plans: [],
        campaigns,
      }),
    ],
  );
  const user = {
    id: "admin",
    role: "admin" as const,
    name: "Admin",
    email: "admin@example.test",
    demo: true,
  };
  let result: any;
  const invoke = async (path: string, method: string, body: any) =>
    localSeoRoutes(
      "/api/local-seo/" + path,
      method,
      new URLSearchParams({ professional: "ruiz" }),
      body,
      db,
      user,
      "migration",
      state,
      (status, data) => {
        expect(status).toBe(200);
        result = data;
      },
    );
  try {
    await invoke("workspace", "GET", undefined);
    expect(result.project.keywords).toHaveLength(27);
    expect(result.project.keywords.filter((k: any) => k.active)).toHaveLength(
      25,
    );
    expect(result.project.legacyNap.name).toBe("Referencia anterior");
    expect(result.project.nap.name).toBe("Construcciones Ruiz");
    const ids = result.project.keywords.map((k: any) => k.id);
    await invoke("audit", "POST", {});
    await db.close();
    db = new Database(folder);
    await db.initialize();
    await invoke("workspace", "GET", undefined);
    expect(result.project.keywords.map((k: any) => k.id).sort()).toEqual(
      ids.sort(),
    );
    expect(result.project.campaigns.map((c: any) => c.id)).toEqual(
      campaigns.map((c) => c.id),
    );
    expect(result.audits).toHaveLength(1);
    expect(result.project.legacyNap.phone).toBe("123");
  } finally {
    await db.close();
  }
});
async function login(
  request: any,
  session: string,
  application = "admin",
  email = "admin@example.test",
  password = "Servinexo2026!",
) {
  const response = await request.post(
    `${api}/api/auth/login?session=${session}`,
    { data: { application, email, password } },
  );
  expect(response.status()).toBe(200);
  return (await response.json()).token;
}
test("SEO especificación: límite transaccional, maestro, contenido auténtico y directorios", async ({
  request,
  demoSession,
}) => {
  const headers = {
    Authorization: "Bearer " + (await login(request, demoSession)),
  };
  const url = (path: string) =>
    `${api}/api/local-seo/${path}?session=${demoSession}&professional=ruiz`;
  const post = (path: string, data: any) =>
    request.post(url(path), { headers, data });
  const get = async () =>
    (await request.get(url("workspace"), { headers })).json();
  const preview = await post("keyword-preview", {
    lines: "  Plumber   Atlanta \nplumber atlanta\n\nHVAC Georgia",
  });
  expect((await preview.json()).preview.map((r: any) => r.reason)).toEqual([
    "agregar",
    "duplicada",
    "vacía",
    "agregar",
  ]);
  expect(
    (
      await post("keywords", {
        lines: Array.from({ length: 26 }, (_, i) => "service " + i).join("\n"),
      })
    ).status(),
  ).toBe(400);
  expect((await get()).project.keywords).toHaveLength(0);
  expect(
    (
      await post("keywords", {
        lines: Array.from({ length: 25 }, (_, i) => "service " + i).join("\n"),
      })
    ).status(),
  ).toBe(200);
  expect((await post("keywords", { lines: "extra keyword" })).status()).toBe(
    400,
  );
  let snapshot = await get();
  const keyword = snapshot.project.keywords[0];
  expect(
    (
      await post("keyword", {
        id: keyword.id,
        keyword: keyword.keyword,
        active: false,
      })
    ).status(),
  ).toBe(200);
  expect(
    (await post("keywords", { lines: "replacement keyword" })).status(),
  ).toBe(200);
  expect(
    (
      await post("keyword", {
        id: keyword.id,
        keyword: keyword.keyword,
        active: true,
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await post("master", {
        name: "Maestro Ruiz",
        address: "",
        phone: "4045551234",
        website: "https://example.com",
        postalCode: "30001",
        serviceAreaBusiness: true,
      })
    ).status(),
  ).toBe(200);
  expect((await get()).project.nap.name).toBe("Maestro Ruiz");
  expect(
    (await post("profile", { nap: { name: "Otro nombre" } })).status(),
  ).toBe(409);
  snapshot = await get();
  const active = snapshot.project.keywords.find((k: any) => k.active);
  const content = {
    type: "post",
    title: "Nueva instalación",
    body: "Contenido editorial real",
    image: "",
    sourceUrl: "",
    targetUrl: "",
    keywordIds: [active.id],
    status: "draft",
    publishedAt: "",
    author: "Equipo SEO",
    rating: null,
    reply: "",
    evidence: "",
  };
  expect(
    (await post("content", { ...content, status: "published" })).status(),
  ).toBe(400);
  expect((await post("content", content)).status()).toBe(200);
  expect(
    (
      await post("content", { ...content, type: "review", author: "Cliente" })
    ).status(),
  ).toBe(400);
  const review = {
    ...content,
    type: "review",
    author: "Cliente real",
    sourceUrl: "https://example.com/review",
    evidence: "Captura del testimonio original",
    rating: 5,
  };
  expect((await post("content", review)).status()).toBe(200);
  snapshot = await get();
  const savedReview = snapshot.project.contents.find(
    (c: any) => c.type === "review",
  );
  expect(
    (
      await post("content", {
        ...review,
        id: savedReview.id,
        body: "Testimonio cambiado",
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await post("directory", {
        name: "Directorio local",
        url: "https://example.com",
        description: "Directorio de prueba",
        active: true,
      })
    ).status(),
  ).toBe(200);
  snapshot = await get();
  const directoryId = snapshot.directories[0].id;
  const listing = {
    directoryId,
    url: "https://example.com",
    status: "published",
    verifiedAt: "2026-11-01T00:00:00Z",
    notes: "Observado",
    evidence: "Comprobación manual",
  };
  expect((await post("listing", listing)).status()).toBe(400);
  expect(
    (
      await post("listing", {
        ...listing,
        url: "https://example.com/business/ruiz",
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await post("listing", {
        ...listing,
        url: "https://example.com/business/ruiz-2",
      })
    ).status(),
  ).toBe(200);
  snapshot = await get();
  expect(snapshot.project.listings).toHaveLength(1);
  expect(snapshot.activity[0].before).toBeDefined();
  expect(snapshot.activity[0].after).toBeDefined();
  const contractor = {
    Authorization:
      "Bearer " +
      (await login(request, demoSession, "contractor", "ruiz@example.test")),
  };
  for (const path of [
    "master",
    "profile",
    "settings",
    "keywords",
    "keyword",
    "content",
    "directory",
    "listing",
    "campaign",
    "run",
    "audit",
    "task",
    "remove",
    "users",
  ])
    expect(
      (
        await request.post(url(path), { headers: contractor, data: {} })
      ).status(),
    ).toBe(403);
  const own = await (
    await request.get(url("workspace"), { headers: contractor })
  ).json();
  expect(own.project.nap.name).toBe("Maestro Ruiz");
  expect(own.project.contents).toHaveLength(0);
  expect(own.activity).toHaveLength(0);
  expect(own.permissions.export).toBe(false);
  expect(
    (
      await request.get(
        `${api}/api/local-seo/workspace?session=${demoSession}&professional=peachtree`,
        { headers: contractor },
      )
    ).status(),
  ).toBe(403);
});

test("SEO: invitación y acceso limitado a contratistas asignados", async ({
  request,
  page,
  demoSession,
}) => {
  const adminHeaders = {
    Authorization: "Bearer " + (await login(request, demoSession)),
  };
  const endpoint = (path: string) =>
    `${api}/api/local-seo/${path}?session=${demoSession}&professional=ruiz`;
  const invitation = await request.post(endpoint("users"), {
    headers: adminHeaders,
    data: {
      name: "Especialista SEO",
      email: "seo@example.test",
      seoAccess: {
        professionalIds: ["ruiz"],
        manageDirectories: false,
        exportReports: false,
      },
    },
  });
  expect(invitation.status()).toBe(200);
  const user = await invitation.json();
  const inbox = await (
    await request.get(
      `${api}/api/auth/local-inbox?session=${demoSession}&user=${user.id}`,
      { headers: adminHeaders },
    )
  ).json();
  const link = inbox.messages[0].text.match(/https?:\/\/\S+/)[0];
  const secret = new URLSearchParams(new URL(link).hash.split("?")[1]).get(
    "token",
  );
  expect(
    (
      await request.post(
        `${api}/api/auth/reset-password?session=${demoSession}`,
        { data: { token: secret, password: "SeoSecure2026!" } },
      )
    ).status(),
  ).toBe(200);
  const token = await login(
    request,
    demoSession,
    "admin",
    "seo@example.test",
    "SeoSecure2026!",
  );
  const headers = { Authorization: "Bearer " + token };
  expect(
    (
      await request.post(endpoint("keywords"), {
        headers,
        data: { lines: "plumber Atlanta" },
      })
    ).status(),
  ).toBe(200);
  expect(
    (await request.post(endpoint("master"), { headers, data: {} })).status(),
  ).toBe(400);
  expect(
    (await request.post(endpoint("directory"), { headers, data: {} })).status(),
  ).toBe(403);
  expect(
    (
      await request.get(
        `${api}/api/local-seo/workspace?session=${demoSession}&professional=peachtree`,
        { headers },
      )
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.get(
        `${api}/api/integrations/status?session=${demoSession}`,
        { headers },
      )
    ).status(),
  ).toBe(403);
  const profiles = await (
    await request.get(endpoint("profiles"), { headers })
  ).json();
  expect(profiles.map((p: any) => p.id)).toEqual(["ruiz"]);
  await page.goto(origins.admin + "/#/login");
  await page.evaluate(
    ({ token, session }) =>
      localStorage.setItem("servinexo.auth." + session, token),
    { token, session: demoSession },
  );
  await page.reload();
  await page.goto(origins.admin + "/#/workspace/admin/local-seo");
  await expect(
    page.getByRole("heading", { name: "Centro SEO local", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Negocio a gestionar" }),
  ).toHaveValue("ruiz");
  await expect(
    page.getByRole("link", { name: "Integraciones", exact: true }),
  ).toHaveCount(0);
  // Revocation applies to an already issued token.
  expect(
    (
      await request.post(endpoint("users"), {
        headers: adminHeaders,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          seoAccess: {
            professionalIds: [],
            manageDirectories: false,
            exportReports: false,
          },
        },
      })
    ).status(),
  ).toBe(200);
  expect((await request.get(endpoint("workspace"), { headers })).status()).toBe(
    404,
  );
});

test("SEO paneles: gestión administrativa y consulta sin controles de escritura", async ({
  page,
  request,
  demoSession,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto(origins.admin + "/#/workspace/admin/local-seo");
  await page
    .getByRole("combobox", { name: "Negocio a gestionar" })
    .selectOption("ruiz");
  await page.getByRole("tab", { name: "NAP y perfil", exact: true }).click();
  await page.getByText("Corregir ficha maestra", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Teléfono comercial", exact: true })
    .fill("4045551234");
  await page
    .getByRole("button", { name: "Guardar en ficha maestra", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados");
  await page.getByRole("tab", { name: "Keywords", exact: true }).click();
  await page
    .getByRole("textbox", {
      name: "Agregar una o varias keywords, una por línea",
    })
    .fill("plumber Georgia\nhvac Atlanta");
  await page.getByRole("button", { name: "Previsualizar carga" }).click();
  await page.getByRole("button", { name: "Confirmar carga" }).click();
  await expect(
    page.getByRole("heading", { name: /Keywords · 2/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Local Grid / Local Pack" }).click();
  await page
    .getByRole("combobox", { name: "Palabra clave", exact: true })
    .selectOption({ label: "plumber Georgia" });
  await page
    .getByRole("button", { name: "Crear cuadrícula sin mediciones" })
    .click();
  await expect(page.getByRole("button", { name: /Punto fila/ })).toHaveCount(9);
  await page.getByRole("button", { name: "Nueva medición manual" }).click();
  await page
    .getByRole("spinbutton", { name: "Posición observada en este punto" })
    .fill("3");
  await page.getByRole("button", { name: "Añadir punto al borrador" }).click();
  await page
    .getByRole("textbox", { name: "Fuente / procedimiento" })
    .fill("Prueba manual documentada");
  await page
    .getByRole("button", { name: "Guardar medición con evidencia" })
    .click();
  await expect(
    page.getByText("100.0 %", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "Reportes e historial", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  expect((await download).suggestedFilename()).toBe(
    "homeconnect-seo-report.json",
  );
  await page.screenshot({
    path: ".artifacts/seo-management-admin.png",
    fullPage: true,
  });
  await page.goto(origins.contractor + "/#/workspace/contractor/local-seo");
  await expect(
    page.getByText("Solo lectura · Información gestionada por el equipo SEO"),
  ).toBeVisible();
  for (const tab of [
    "NAP y perfil",
    "Keywords",
    "Contenido",
    "Directorios",
    "Local Grid / Local Pack",
    "Auditoría y tareas",
    "Reportes e historial",
  ]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: /Guardar|Crear|Ejecutar|Eliminar|Editar|Previsualizar|Confirmar|Nueva medición|Exportar/,
      }),
    ).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".artifacts/seo-management-contractor-mobile.png",
    fullPage: true,
  });
});
