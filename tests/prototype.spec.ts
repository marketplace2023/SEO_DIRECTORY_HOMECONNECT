import { test, expect } from "./fixtures";

test("portada y carruseles navegan sin errores", async ({ page }) => {
  const errors: string[] = [];
  await page.emulateMedia({ reducedMotion: "no-preference" });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Grandes ideas.",
  );
  await expect(
    page.getByRole("button", { name: "Categorías anteriores" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Siguientes categorías" }).click();
  await expect(
    page.getByRole("button", { name: "Categorías anteriores" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Siguientes profesionales" }).click();
  await expect(
    page.getByRole("button", { name: "Profesionales anteriores" }),
  ).toBeEnabled();
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
    window.scrollTo(0, 0);
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
    .getByPlaceholder("Pintar, remodelar, reparar…")
    .fill("electricidad");
  await page.getByRole("button", { name: "Encontrar", exact: true }).click();
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
    .getByRole("combobox", { name: "País", exact: true })
    .selectOption("Venezuela");
  await page.getByRole("button", { name: "Encontrar", exact: true }).click();
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
  await page.getByRole("button", { name: "Find a pro", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("12 published profiles");
});
