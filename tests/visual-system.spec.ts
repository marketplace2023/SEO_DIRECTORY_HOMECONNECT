import { test, expect } from "./fixtures";

test("portada: familias shadcn filtran Swiper y la galería permite explorar la especialidad activa", async ({
  page,
}) => {
  await page.goto("/");
  const trades = page.getByRole("tablist");
  await trades.getByRole("tab", { name: "Exterior", exact: true }).click();
  await expect(
    trades.getByRole("tab", { name: "Exterior", exact: true }),
  ).toHaveAttribute("data-state", "active");
  await expect(page.locator(".home-category-grid")).toContainText(
    "Techos y cubiertas",
  );
  await expect(page.locator(".home-category-grid")).not.toContainText(
    "Plomería",
  );
  await trades.getByRole("tab", { name: "Instalaciones", exact: true }).click();
  await expect(page.locator(".home-category-grid")).toContainText("Plomería");
  const gallery = page.getByLabel("Inspiración para tu hogar", { exact: true });
  await gallery.locator(".swiper-pagination-bullet").nth(1).click();
  await expect(gallery.locator(".swiper-slide-active")).toContainText(
    "Cada detalle empieza con un plan.",
  );
  await gallery
    .locator(".swiper-slide-active")
    .getByRole("button", { name: "Explorar especialidad", exact: true })
    .click();
  await expect(page).toHaveURL(/categories\/general-contractors/);
});

test("portada: acción Magic UI accesible por teclado y controles sin desbordamiento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const action = page
    .locator('[data-design-system="homeconnect-v2"]')
    .getByRole("button", {
      name: "Cuéntanos tu proyecto",
      exact: true,
    });
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/quote/);
  await page.goto("/");
  await expect(
    page.locator('[data-design-system="homeconnect-v2"]'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
