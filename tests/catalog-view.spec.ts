import { test, expect } from "./fixtures";

test("catálogo: categorías, áreas y mapa conservan la selección", async ({
  page,
}) => {
  await page.goto("/#/catalog?category=siding");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Revestimientos exteriores",
  );
  await expect(page.locator("[data-catalog-area]")).toHaveCount(2);
  await expect(page.locator(".service-tile")).toHaveCount(5);
  const navigation = page.getByRole("navigation", {
    name: "Categorías del catálogo",
  });
  await expect(navigation.locator('[aria-current="page"]')).toContainText(
    "Revestimientos exteriores",
  );
  await page
    .locator('[data-catalog-area="siding-installation"]')
    .getByRole("button", { name: "Buscar profesionales de esta área" })
    .click();
  await expect(page).toHaveURL(
    /professionals\?category=siding&subcategory=siding-installation&region=Georgia/,
  );
  await page.goto("/#/catalog?category=siding");
  await page
    .getByRole("button", { name: "Ver profesionales", exact: true })
    .click();
  await expect(page).toHaveURL(/professionals\?category=siding&region=Georgia/);
  await page.goto("/#/catalog?category=siding");
  await page
    .getByRole("button", { name: "Explorar en el mapa", exact: true })
    .click();
  await expect(page).toHaveURL(/coverage\?category=siding&region=Georgia/);
  await page.goto("/#/catalog?category=siding");
  await page
    .getByRole("searchbox", { name: "Buscar categoría" })
    .fill("plomería");
  await navigation
    .getByRole("button", { name: "Plomería", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plomería");
  await page.getByRole("button", { name: "Preparar mi solicitud" }).click();
  await expect(page).toHaveURL(/quote\?category=plumbing/);
  await expect(
    page.getByRole("combobox", { name: "Categoría", exact: true }),
  ).toHaveValue("plumbing");
});

test("catálogo móvil: selector, servicio y búsqueda sin resultados", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/catalog?category=siding");
  await page
    .getByRole("combobox", { name: "Seleccionar categoría" })
    .selectOption("painting");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pintura");
  await page
    .getByRole("button", { name: "Pintura de interiores", exact: true })
    .click();
  await expect(page).toHaveURL(/services\/painting-1/);
  await page.goto("/#/catalog");
  await page
    .getByRole("searchbox", { name: "Buscar categoría" })
    .fill("categoría inexistente xyz");
  await expect(
    page.getByRole("heading", { name: "No encontramos esa categoría" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await expect(page.locator(".catalog-category")).toHaveCount(48);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
