import { test, expect } from "./fixtures";

test("un módulo de mapa fallido no borra la portada y permite recuperarla", async ({
  page,
}) => {
  await page.route("**/src/components/ecosystem/coverage-map.tsx*", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Grandes ideas.",
  );
  await expect(page.getByRole("alert")).toContainText(
    "No pudimos cargar el mapa.",
  );
  await expect(
    page.getByRole("navigation", { name: "Entornos del ecosistema" }),
  ).toBeVisible();
  await page.unroute("**/src/components/ecosystem/coverage-map.tsx*");
  await page.getByRole("button", { name: "Recargar página" }).click();
  await expect(page.locator(".contractor-marker")).toHaveCount(4);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
