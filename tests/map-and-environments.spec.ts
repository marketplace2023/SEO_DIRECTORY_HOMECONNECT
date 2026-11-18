import { test, expect } from "./fixtures";
import { createSeed } from "../src/data/seed";
import { upgradeSeed } from "../src/data/seed-migration";
import { hasValidRelations } from "../src/domain/schema";

test("seeder completo y actualización de la demo sin perder cambios previos", () => {
  const seed = createSeed();
  expect(hasValidRelations(seed)).toBeTruthy();
  expect(seed.professionals).toHaveLength(12);
  expect(seed.requests).toHaveLength(6);
  expect(seed.proposals).toHaveLength(6);
  expect(seed.projects).toHaveLength(2);
  expect(seed.messages).toHaveLength(5);
  const legacy = {
    ...seed,
    seedRevision: undefined,
    requests: [],
    proposals: [],
    projects: [],
    messages: [],
    audit: [],
    favorites: [],
  };
  legacy.professionals[0].name = "Mi nombre conservado";
  const migrated = upgradeSeed(legacy);
  expect(migrated.professionals[0].name).toBe("Mi nombre conservado");
  expect(migrated.requests).toHaveLength(6);
  expect(hasValidRelations(migrated)).toBeTruthy();
  expect(upgradeSeed(migrated)).toEqual(migrated);
});

test("accesos principales abren los tres entornos y muestran datos desde el inicio", async ({
  page,
  request,
}) => {
  await page.goto("/");
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim(),
    ),
  ).toBe("#e00707");
  const environments = page.getByRole("navigation", {
    name: "Entornos del ecosistema",
  });
  await environments
    .getByRole("link", { name: "Consumidor", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Panel del consumidor",
  );
  await expect(
    page.getByRole("button", { name: /Una cocina más abierta en Miami/ }),
  ).toBeVisible();
  await page.screenshot({
    path: ".artifacts/consumer-red.png",
    fullPage: true,
  });
  await environments
    .getByRole("link", { name: "Contratista", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Panel del contratista",
  );
  await page
    .getByRole("navigation", { name: "Secciones del espacio" })
    .getByRole("button", { name: "Proyectos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Una cocina más abierta en Miami/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Volver al marketplace" }).click();
  await environments
    .getByRole("link", { name: "Administrador", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Centro de administración",
  );
  await expect(page.locator(".seed-overview")).toContainText(
    "12 contratistas · 6 solicitudes · 6 propuestas · 2 proyectos",
  );
  await page
    .getByRole("navigation", { name: "Secciones del espacio" })
    .getByRole("button", { name: "Datos de prueba", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Carolina Mendoza" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lucía Ramos" }),
  ).toBeVisible();
  const response = await request.get("/demo-seed.json");
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.accounts).toHaveLength(3);
  expect(data.projects).toHaveLength(2);
  await page.screenshot({ path: ".artifacts/admin-red.png", fullPage: true });
});

test("mapa real: filtros, marcadores, fichas y respaldo geográfico sin calles externas", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/coverage");
  await expect(page.getByRole("status")).toHaveText(
    "4 contratistas en el mapa",
  );
  await expect(page.locator(".contractor-marker")).toHaveCount(4);
  await expect
    .poll(() => page.locator(".leaflet-local-geography-pane path").count())
    .toBeGreaterThan(0);
  await page
    .getByRole("button", {
      name: "Localizar Peachtree Roof Studio",
      exact: true,
    })
    .click();
  await expect(page.locator(".map-results > article.selected")).toContainText(
    "Peachtree Roof Studio",
  );
  await page
    .getByRole("combobox", { name: "Especialidad en el mapa" })
    .selectOption("roofing");
  await expect(page.locator(".contractor-marker")).toHaveCount(1);
  await page.getByRole("button", { name: "Ver todos", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(
    "12 contratistas en el mapa",
  );
  await expect(page.locator(".contractor-marker")).toHaveCount(12);
  await page
    .getByRole("combobox", { name: "Región del mapa" })
    .selectOption("Georgia");
  await page
    .locator('.leaflet-marker-icon[title="Peachtree Roof Studio"]')
    .click();
  await expect(page.locator(".leaflet-popup")).toContainText("Lawrenceville");
  await page.screenshot({
    path: ".artifacts/map-red-desktop.png",
    fullPage: true,
  });
  await page
    .locator(".leaflet-popup")
    .getByRole("button", { name: "Ver ficha", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Peachtree Roof Studio",
  );
  expect(errors).toEqual([]);
});

test("mapa y accesos utilizables en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("/#/coverage");
  await expect(page.locator(".contractor-marker")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  for (const name of ["Consumidor", "Contratista", "Administrador"])
    await expect(
      page
        .getByRole("navigation", { name: "Entornos del ecosistema" })
        .getByRole("link", { name, exact: true }),
    ).toBeVisible();
  await page.screenshot({
    path: ".artifacts/map-red-mobile.png",
    fullPage: true,
  });
});
