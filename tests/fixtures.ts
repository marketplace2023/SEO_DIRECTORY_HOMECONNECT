import { test as base, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
export const origins = {
  web: "http://127.0.0.1:5194",
  contractor: "http://127.0.0.1:5195",
  admin: "http://127.0.0.1:5196",
};
export const test = base.extend<{ demoSession: string; autoLogin: boolean }>({
  autoLogin: [true, { option: true }],
  demoSession: [
    async ({}, use) => {
      await use(randomUUID());
    },
    { auto: true },
  ],
  context: async ({ context, demoSession, autoLogin }, use) => {
    const tokens: Record<string, string> = {};
    if (autoLogin) {
      for (const [application, email] of [
        ["web", "carolina@example.test"],
        ["contractor", "ruiz@example.test"],
        ["admin", "admin@example.test"],
      ] as const) {
        const response = await context.request.post(
          "http://127.0.0.1:5197/api/auth/login?session=" + demoSession,
          { data: { application, email, password: "Servinexo2026!" } },
        );
        if (!response.ok()) throw Error(await response.text());
        tokens[origins[application]] = (await response.json()).token;
      }
    }
    await context.addInitScript(
      ({ session, tokens }) => {
        localStorage.setItem("servinexo.demo-session", session);
        if (tokens[location.origin])
          localStorage.setItem(
            "servinexo.auth." + session,
            tokens[location.origin],
          );
      },
      { session: demoSession, tokens },
    );
    await use(context);
  },
});
export { expect };

export async function submitEstimate(page: Page, price: string, days: string) {
  await page.getByRole("button", { name: "Preparar presupuesto" }).click();
  await expect(
    page.getByRole("button", { name: "Enviar presupuesto" }),
  ).toHaveCount(0);
  await page.getByLabel("Nombre de la partida").fill("Mano de obra");
  await page.getByLabel("Unidad", { exact: true }).fill("hora");
  await page.getByLabel("Precio unitario (USD)").fill(price);
  await page.getByRole("button", { name: "Añadir partida" }).click();
  await page
    .getByRole("combobox", { name: "Partida", exact: true })
    .selectOption({ label: "Mano de obra (hora)" });
  await page.getByLabel("Cantidad medida").fill("2");
  await page.getByRole("button", { name: "Guardar medición" }).click();
  await page.getByLabel("Plazo estimado en días").fill(days);
  await page
    .getByLabel("Alcance y condiciones")
    .fill("Incluye mano de obra y limpieza.");
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes("/api/demo/commands") &&
      response.request().postDataJSON()?.type === "budget",
  );
  await page.getByRole("button", { name: "Enviar presupuesto" }).click();
  const response = await saved;
  expect(response.ok()).toBe(true);
  expect((await response.json()).proposals).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        amount: Number(price) * 2,
        lines: [expect.objectContaining({ name: "Mano de obra", quantity: 2 })],
      }),
    ]),
  );
}
