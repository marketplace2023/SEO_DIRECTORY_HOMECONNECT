import { test, expect } from "./fixtures";

test("portada y cuadrículas de categorías y profesionales navegan sin errores", async ({
  page,
}) => {
  const errors: string[] = [];
  await page.emulateMedia({ reducedMotion: "no-preference" });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Grandes ideas.",
  );
  await expect(page.locator(".home-category-grid .category-tile")).toHaveCount(
    48,
  );
  await expect(page.locator(".home-professional-grid article")).toHaveCount(9);
  await page.locator(".category-footnote").scrollIntoViewIfNeeded();
  await expect(page.locator(".category-footnote")).toContainText(
    "48 especialidades",
  );
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await expect(page.locator(".how-step").first().locator("..")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(page.locator(".category-footnote")).toContainText(
    "48 especialidades",
  );
  await expect
    .poll(() =>
      page
        .locator(".how-image img")
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: ".artifacts/home-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("buscador, filtros y perfil conservan su comportamiento", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "¿Qué necesitas?", exact: true })
    .fill("electricidad");
  await page
    .getByRole("button", { name: "Buscar profesionales", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("2 perfiles");
  await page
    .getByRole("button", { name: "BrightSpark Electric", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "BrightSpark Electric" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Volver a profesionales", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "¿Dónde?", exact: true })
    .fill("Venezuela");
  await page
    .getByRole("listbox", { name: "Ubicaciones sugeridas" })
    .getByRole("option", { name: "Venezuela", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Buscar profesionales", exact: true })
    .click();
  await expect(
    page.getByText("No hay perfiles publicados con estos filtros."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.getByRole("status")).toContainText("12 perfiles");
});

test("móvil sin desbordamiento y cambio de idioma", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fits).toBeTruthy();
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".how-image img")
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: ".artifacts/home-mobile.png", fullPage: true });
  await page
    .getByRole("combobox", { name: "Idioma / Language" })
    .selectOption("en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Big ideas.",
  );
  await page
    .getByRole("button", { name: "Find professionals", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("12 published profiles");
});
