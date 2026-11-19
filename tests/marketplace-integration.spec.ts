import { test, expect, origins } from "./fixtures";

test.describe("solicitud pública integrada con los permisos de la API", () => {
  test.use({ autoLogin: false });
  test("un invitado envía un presupuesto y recibe únicamente su solicitud", async ({
    page,
    context,
  }) => {
    await page.goto("/#/quote?professional=peachtree&service=roofing-1");
    await page
      .getByRole("button", { name: "Omitir y continuar como invitado" })
      .click();
    await page
      .locator('input[name="title"]')
      .fill("Reparación de techo sin cuenta");
    await page
      .locator('textarea[name="description"]')
      .fill("Revisar y reparar una filtración del techo.");
    await page.locator('input[name="contactName"]').fill("Cliente de prueba");
    await page
      .locator('input[name="contactEmail"]')
      .fill("cliente@example.test");
    const sending = page.waitForResponse((response) =>
      response.url().includes("/api/demo/guest-requests"),
    );
    await page
      .getByRole("button", {
        name: "Enviar solicitud de presupuesto",
        exact: true,
      })
      .click();
    const response = await sending;
    expect(response.status()).toBe(201);
    const state = await response.json();
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0].guestContact.email).toBe("cliente@example.test");
    expect(state.proposals).toHaveLength(0);
    expect(state.messages).toHaveLength(0);
    await expect(
      page.getByRole("heading", { name: "Solicitud enviada", exact: true }),
    ).toBeVisible();
    const retry = await context.request.post(response.url(), {
      data: response.request().postDataJSON(),
    });
    expect(retry.status()).toBe(200);
    expect((await retry.json()).requests).toHaveLength(1);
  });
});

test("la ficha guarda redes y ubicación, y su perfil permite conservar servicios en el carrito", async ({
  page,
  context,
}) => {
  await page.goto(origins.contractor + "/#/workspace/contractor/profile");
  await page
    .locator('input[name="website"]')
    .fill("https://example.com/contratista");
  await page
    .locator('input[name="instagram"]')
    .fill("https://www.instagram.com/contratista");
  await page.locator('select[name="mapMode"]').selectOption("public");
  await page.locator('input[name="latitude"]').fill("25.774");
  await page.locator('input[name="longitude"]').fill("-80.194");
  await page.locator('input[name="publicLocation"]').check();
  const saving = page.waitForResponse(
    (response) =>
      response.url().includes("/api/demo/commands") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Guardar ficha", exact: true })
    .click();
  expect((await saving).ok()).toBe(true);
  await page.reload();
  await expect(page.locator('input[name="website"]')).toHaveValue(
    "https://example.com/contratista",
  );
  await expect(page.locator('select[name="mapMode"]')).toHaveValue("public");
  const publicPage = await context.newPage();
  await publicPage.goto("/#/professionals/ruiz");
  await expect(
    publicPage.getByRole("link", { name: /Abrir Página web/ }),
  ).toHaveAttribute("href", "https://example.com/contratista");
  await publicPage
    .getByRole("button", { name: "Añadir al carrito", exact: true })
    .first()
    .click();
  await publicPage
    .locator(".site-header")
    .getByRole("button", { name: "Carrito (1)", exact: true })
    .click();
  await expect(publicPage.locator(".cart-services li")).toHaveCount(1);
  await publicPage.reload();
  await expect(publicPage.locator(".cart-services li")).toHaveCount(1);
  await expect(
    publicPage.getByRole("link", {
      name: "Abrir web del contratista",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://example.com/contratista");
});
