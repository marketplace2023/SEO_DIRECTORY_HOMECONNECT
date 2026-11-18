import { test, expect, origins } from "./fixtures";
import { readFileSync } from "node:fs";
import { categories, services } from "../src/data/catalog";
import { createSeed } from "../src/data/seed";
import { findProfessionals, filtersFromParams } from "../src/domain/queries";
import { displayedLocation, parseBounds } from "../src/domain/geography";

test("catálogo ampliado: IDs históricos, alcance bilingüe, dibujos distintos y modos de inspección", () => {
  expect(categories).toHaveLength(48);
  expect(services).toHaveLength(240);
  const art = new Set<string>();
  for (const category of categories) {
    for (const language of ["es", "en"] as const) {
      expect(category.description[language].length).toBeGreaterThan(40);
      expect(category.excluded[language].length).toBeGreaterThan(35);
    }
    const svg = readFileSync(
      new URL(`../public${category.illustration}`, import.meta.url),
      "utf8",
    );
    expect(svg).toContain('viewBox="0 0 480 320"');
    art.add(svg);
    for (const number of [1, 2, 3])
      expect(
        services.some((s) => s.id === `${category.id}-${number}`),
      ).toBeTruthy();
  }
  expect(art.size).toBe(48);
  expect(services.find((s) => s.id === "roofing-3")?.mode).toBe("assessment");
  expect(services.find((s) => s.id === "electrical-3")?.mode).toBe(
    "assessment",
  );
});

test("búsqueda geográfica: un área atendida cuenta aunque la sede esté fuera; sin coordenadas inventadas", () => {
  const state = createSeed();
  const filters = filtersFromParams(
    new URLSearchParams({
      category: "hvac",
      region: "Georgia",
      bounds: "34,-84.4,34.1,-84.3",
    }),
  );
  const results = findProfessionals(state, filters);
  expect(results.map((p) => p.id)).toEqual(["atlanta-clima"]);
  const point = displayedLocation(results[0], filters.bounds)!;
  expect(point.serviceArea).toBe(true);
  expect(point.label).toBe("Roswell");
  const p = state.professionals.find((p) => p.id === "atlanta-clima")!;
  p.location = null;
  expect(displayedLocation(p, filters.bounds)).toBeNull();
  expect(findProfessionals(state, filters)).toHaveLength(0);
  expect(
    findProfessionals(state, { categoryId: "hvac", region: "Georgia" }),
  ).toHaveLength(1);
  expect(parseBounds("34,-84,33,-85")).toBeUndefined();
  expect(parseBounds("-100,-180,90,180")).toBeUndefined();
});

test("catálogo explicado, nueva especialidad y selección de servicio accesibles en móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/catalog?category=home-automation");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Domótica");
  const scope = page.getByRole("region", { name: "Significado y alcance" });
  await expect(scope).toContainText("Configuración de controles, sensores");
  await expect(scope).toContainText("Cableado de potencia");
  const image = scope.getByRole("img");
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await expect(page.locator(".service-tile")).toHaveCount(5);
  await page
    .getByRole("button", { name: /Configuración de sensores domésticos/ })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Configuración de sensores domésticos",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".artifacts/category-scope-mobile.png",
    fullPage: true,
  });
});

test("mapa y directorio comparten filtros y área; el móvil conserva la búsqueda al alternar vistas", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 33.956, longitude: -83.988 });
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.goto(
    "/#/professionals?category=plumbing&city=Lawrenceville&region=Georgia",
  );
  await expect(page.getByRole("status")).toHaveText("1 perfiles publicados");
  await page
    .getByRole("button", { name: "Ver en el mapa", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "1 contratistas en el mapa",
  );
  await expect(page.locator(".contractor-marker")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Buscar en esta área", exact: true })
    .click();
  await expect(page).toHaveURL(/bounds=/);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Ciudad o área atendida" }),
  ).toHaveValue("Lawrenceville");
  await page
    .getByRole("button", { name: "Abrir directorio", exact: true })
    .click();
  await expect(page).toHaveURL(/bounds=/);
  await expect(page.getByRole("status")).toHaveText("1 perfiles publicados");
  await page
    .getByRole("button", { name: "Ver en el mapa", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  const filterToggle = page.getByRole("button", { name: /^Filtros/ });
  await filterToggle.click();
  await expect(
    page.getByRole("combobox", { name: "Especialidad en el mapa" }),
  ).toBeVisible();
  await filterToggle.click();
  await expect(
    page.getByRole("combobox", { name: "Especialidad en el mapa" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Contratistas del mapa" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(page.locator(".real-map")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Ciudad o área atendida" }),
  ).toHaveValue("Lawrenceville");
  await page.getByRole("button", { name: "Mi ubicación", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Ciudad o área atendida" }),
  ).toHaveValue("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("un negocio nuevo puede guardar su punto público, aparecer en el mapa y retirar su marcador sin perder su ficha", async ({
  request,
  browser,
  page,
  demoSession,
}) => {
  const api = "http://127.0.0.1:5197";
  const registered = await request.post(
    `${api}/api/auth/register?session=${demoSession}`,
    {
      data: {
        name: "Gabinetes del piloto",
        email: "map-business@example.test",
        password: "Prueba2026!",
        role: "contractor",
        categoryId: "cabinetry",
        city: "Lawrenceville",
      },
    },
  );
  expect(registered.status()).toBe(201);
  const account = await registered.json();
  const context = await browser.newContext();
  try {
    await context.addInitScript(
      ({ session, token }) => {
        localStorage.setItem("servinexo.demo-session", session);
        localStorage.setItem("servinexo.auth." + session, token);
      },
      { session: demoSession, token: account.token },
    );
    const pro = await context.newPage();
    await pro.goto(origins.contractor + "/#/workspace/contractor/profile");
    await pro
      .getByRole("combobox", { name: "Tipo de ubicación", exact: true })
      .selectOption("public");
    await pro
      .getByRole("spinbutton", { name: "Latitud pública" })
      .fill("33.96");
    await pro
      .getByRole("spinbutton", { name: "Longitud pública" })
      .fill("-84.01");
    await pro
      .getByRole("checkbox", { name: /Autorizo mostrar este punto/ })
      .check();
    await pro
      .getByRole("button", { name: "Guardar ficha", exact: true })
      .click();
    await expect(
      pro.getByText("Ficha actualizada.", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const state = await (
          await request.post(
            `${api}/api/demo/bootstrap?session=${demoSession}`,
            { headers: { Authorization: "Bearer " + account.token }, data: {} },
          )
        ).json();
        return state.professionals.find(
          (p: any) => p.id === account.user.professionalId,
        )?.location;
      })
      .toEqual({ latitude: 33.96, longitude: -84.01, precision: "public" });
    await pro.reload();
    await expect(
      pro.getByRole("spinbutton", { name: "Latitud pública" }),
    ).toHaveValue("33.96");
    const admin = (
      await (
        await request.post(`${api}/api/auth/login?session=${demoSession}`, {
          data: {
            application: "admin",
            email: "admin@example.test",
            password: "Servinexo2026!",
          },
        })
      ).json()
    ).token;
    const command = (token: string, actor: string, details: any) =>
      request.post(`${api}/api/demo/commands?session=${demoSession}`, {
        headers: { Authorization: "Bearer " + token },
        data: {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          actor,
          actingProfessional: account.user.professionalId,
          ...details,
        },
      });
    expect(
      (
        await command(admin, "admin", {
          type: "publication",
          professionalId: account.user.professionalId,
        })
      ).status(),
    ).toBe(200);
    await page.route("https://tile.openstreetmap.org/**", (route) =>
      route.abort(),
    );
    await page.goto("/#/coverage?category=cabinetry&region=Georgia");
    await expect(
      page.locator('.contractor-marker[title="Gabinetes del piloto"]'),
    ).toHaveCount(1);
    expect(
      (
        await command(account.token, "contractor", {
          type: "profile",
          name: "Gabinetes del piloto",
          city: "Lawrenceville",
          coverage: ["Lawrenceville"],
          bio: "Gabinetes a medida para espacios residenciales.",
          language: "es",
          location: { latitude: 100, longitude: 0, precision: "public" },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await command(account.token, "contractor", {
          type: "profile",
          name: "Gabinetes del piloto",
          city: "Lawrenceville",
          coverage: ["Lawrenceville"],
          bio: "Gabinetes a medida para espacios residenciales.",
          language: "es",
          location: null,
        })
      ).status(),
    ).toBe(200);
    await expect(page.locator(".contractor-marker")).toHaveCount(0);
    await expect(page.locator(".map-results article")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Ver ficha", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Ver ficha", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Gabinetes del piloto",
    );
  } finally {
    await context.close();
  }
});
