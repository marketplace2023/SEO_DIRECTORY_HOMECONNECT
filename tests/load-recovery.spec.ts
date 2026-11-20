import { test, expect } from "./fixtures";

test("un módulo de mapa fallido conserva la navegación y permite recuperar la vista", async ({
  page,
}) => {
  await page.route("**/src/components/ecosystem/coverage-map.tsx*", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Grandes ideas.",
  );
  await page
    .getByRole("navigation", { name: "Entornos del ecosistema" })
    .getByRole("link", { name: "Mapa de profesionales", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "No pudimos cargar el mapa.",
  );
  await expect(
    page.getByRole("navigation", { name: "Entornos del ecosistema" }),
  ).toBeVisible();
  await page.unroute("**/src/components/ecosystem/coverage-map.tsx*");
  await page.getByRole("button", { name: "Recargar página" }).click();
  await expect(page.locator(".contractor-marker")).toHaveCount(9);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
