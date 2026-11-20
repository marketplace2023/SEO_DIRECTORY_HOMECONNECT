import { test, expect } from "./fixtures";
import { categories, subcategories } from "../src/data/catalog";
import {
  categoryGuides,
  subcategoryConcepts,
} from "../src/data/category-guides";

test.use({ autoLogin: false });

test("guías editoriales completas para todas las categorías y subcategorías", () => {
  expect(Object.keys(categoryGuides).sort()).toEqual(
    categories.map((category) => category.id).sort(),
  );
  expect(Object.keys(subcategoryConcepts).sort()).toEqual(
    subcategories.map((area) => area.id).sort(),
  );
  for (const language of ["es", "en"] as const) {
    const concepts = Object.values(categoryGuides).map(
      (guide) => guide.concept[language],
    );
    const areas = Object.values(subcategoryConcepts).map(
      (concept) => concept[language],
    );
    expect(new Set(concepts).size).toBe(48);
    expect(new Set(areas).size).toBe(96);
    expect(concepts.every((text) => text.trim().length > 0)).toBe(true);
    expect(areas.every((text) => text.trim().length > 0)).toBe(true);
    expect(
      Object.values(categoryGuides).every(
        (guide) => guide.when[language].trim().length > 0,
      ),
    ).toBe(true);
  }
});

test("HVAC explica el concepto, cuándo se necesita y sus dos áreas sin concatenar servicios", async ({
  page,
}) => {
  await page.goto("/#/categories/hvac");
  const concept = page.locator("[data-category-concept]");
  await expect(concept).toContainText(
    "regulan la temperatura, la humedad y la renovación del aire",
  );
  await expect(concept).toContainText(
    "HVAC: calefacción, ventilación y aire acondicionado",
  );
  await expect(
    page.getByRole("heading", { name: "¿Cuándo necesitas un profesional?" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-category-subcategory="hvac-installation"]'),
  ).toContainText("funcionen como un sistema");
  await expect(
    page.locator('[data-category-subcategory="hvac-care"]'),
  ).toContainText("El diagnóstico busca explicar");
  await expect(
    page.locator('[data-category-subcategory="hvac-care"]'),
  ).not.toContainText("Esta área de climatización comprende:");
  await page.screenshot({
    path: ".artifacts/hvac-concept-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".artifacts/hvac-concept-mobile.png",
    fullPage: true,
  });
  await page.locator(".language-switch select").selectOption("en");
  await expect(concept).toContainText(
    "indoor temperature, humidity and air renewal",
  );
  await page.goto("/#/categories/hvac/hvac-care");
  await expect(page.locator("[data-category-concept]")).toContainText(
    "Diagnostics investigates issues",
  );
});

test("páginas dedicadas: categorías, búsqueda por subcategoría y alcance exclusivo", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "Servicios", exact: true })
    .click();
  await page
    .locator("#header-services-menu")
    .getByRole("link", { name: "Categorías y subcategorías", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/categories$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Categorías y subcategorías",
  );
  await expect(page.locator("[data-category-summary]")).toHaveCount(48);
  await expect(page.locator("[data-category-summary] li")).toHaveCount(96);
  await page
    .getByRole("searchbox", { name: "Buscar categorías o subcategorías" })
    .fill("Daños y conservación");
  await expect(page.locator("[data-category-summary]")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Conocer esta categoría", exact: true })
    .click();
  await expect(page).toHaveURL(/categories\/siding$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Revestimientos exteriores",
  );
  await expect(page.locator("[data-category-page]")).toContainText(
    "El revestimiento exterior es la capa que recubre las fachadas",
  );
  await expect(page.locator("[data-category-subcategory]")).toHaveCount(2);
  await expect(
    page.getByRole("navigation", { name: "Categorías del catálogo" }),
  ).toHaveCount(0);
  await expect(page).toHaveTitle("Revestimientos exteriores · HOME CONNECT");
  await page.screenshot({
    path: ".artifacts/category-page-desktop.png",
    fullPage: true,
  });
  await page.locator(".language-switch select").selectOption("en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Siding");
  await expect(page).toHaveTitle("Siding · HOME CONNECT");
  await expect(
    page.getByRole("heading", { name: "Subcategories of siding" }),
  ).toBeVisible();
});

test("subcategoría propia: servicios correctos, regreso y enlaces inválidos", async ({
  page,
}) => {
  await page.goto("/#/categories/siding");
  await page
    .locator('[data-category-subcategory="siding-installation"]')
    .getByRole("link", { name: "Explorar subcategoría" })
    .click();
  await expect(page).toHaveURL(/categories\/siding\/siding-installation$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fachadas y revestimientos",
  );
  await expect(
    page.getByRole("link", { name: "Ver profesionales de esta especialidad" }),
  ).toHaveAttribute(
    "href",
    "#/professionals?category=siding&subcategory=siding-installation",
  );
  await expect(
    page.locator('[data-category-page] a[href^="#/services/"]'),
  ).toHaveCount(2);
  await page
    .getByRole("link", { name: "Revestimiento de fachadas", exact: true })
    .click();
  await expect(page).toHaveURL(/services\/siding-1$/);
  await page.goto("/#/categories/siding/siding-installation");
  await page.getByRole("link", { name: "Volver a la categoría" }).click();
  await expect(page).toHaveURL(/categories\/siding$/);
  await page.goto("/#/categories/plumbing/siding-care");
  await expect(
    page.getByRole("heading", { name: "Esta página no está disponible" }),
  ).toBeVisible();
});

test("categorías en móvil: imágenes completas, búsqueda vacía y enlaces compartibles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/categories/siding");
  const photo = page.locator('[data-category-page="siding"] header img');
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Revestimientos exteriores",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".artifacts/category-page-mobile.png",
    fullPage: true,
  });
  await page.goto("/#/categories");
  await page
    .getByRole("searchbox", { name: "Buscar categorías o subcategorías" })
    .fill("xxxxx-no-existe");
  await expect(
    page.getByRole("heading", { name: "No encontramos esa especialidad" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await expect(page.locator("[data-category-summary]")).toHaveCount(48);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
