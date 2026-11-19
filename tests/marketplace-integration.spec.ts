import { test, expect, origins } from "./fixtures";

test("cotizar y escribir como visitante abren un solo diálogo con el registro y enlaces públicos", async ({
  page,
  context,
  demoSession,
}) => {
  await page.goto(origins.contractor + "/#/workspace/contractor/profile");
  await page
    .locator('input[name="website"]')
    .fill("https://example.com/contratista");
  await page
    .locator('input[name="instagram"]')
    .fill("https://www.instagram.com/contratista");
  const saving = page.waitForResponse(
    (response) =>
      response.url().includes("/api/demo/commands") &&
      response.request().postDataJSON()?.type === "profile",
  );
  await page
    .getByRole("button", { name: "Guardar ficha", exact: true })
    .click();
  expect((await saving).ok()).toBe(true);

  const guestContext = await context.browser()!.newContext();
  try {
    await guestContext.addInitScript(
      (session) => localStorage.setItem("servinexo.demo-session", session),
      demoSession,
    );
    const guest = await guestContext.newPage();
    const profile = origins.web + "/#/professionals/ruiz";
    await guest.goto(profile);
    for (const [action, title, next] of [
      [
        "Solicitar presupuesto",
        "Solicita un presupuesto",
        "/quote?professional=ruiz&service=remodeling-1",
      ],
      [
        "Escribir un mensaje",
        "Escribe al contratista",
        "/workspace/owner/messages?professional=ruiz",
      ],
    ]) {
      await guest.getByRole("button", { name: action, exact: true }).click();
      const dialog = guest.getByRole("dialog", { name: title });
      await expect(guest.getByRole("dialog")).toHaveCount(1);
      await expect(
        dialog.getByRole("heading", { name: "Continúa en HOME CONNECT" }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Enlaces de Construcciones Ruiz" }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("link", { name: "Página web" }),
      ).toHaveAttribute("href", "https://example.com/contratista");
      await expect(
        dialog.getByRole("link", { name: "Instagram" }),
      ).toHaveAttribute("href", "https://www.instagram.com/contratista");
      await expect(dialog.getByRole("link", { name: "Facebook" })).toHaveCount(
        0,
      );
      await expect(
        dialog.getByRole("link", { name: "Crear cuenta" }),
      ).toHaveAttribute("href", "#/register?" + new URLSearchParams({ next }));
      await guest.keyboard.press("Escape");
      await expect(guest).toHaveURL(profile);
    }
    await guest.goto(
      origins.web + "/#/quote?professional=ruiz&service=remodeling-1",
    );
    await guest
      .getByRole("dialog")
      .getByRole("link", { name: "Iniciar sesión" })
      .click();
    await guest
      .getByRole("textbox", { name: "Correo electrónico", exact: true })
      .fill("carolina@example.test");
    await guest.locator('input[name="password"]').fill("Servinexo2026!");
    await guest
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(guest.getByLabel("Título del proyecto")).toBeVisible();
    await expect(guest.getByRole("dialog")).toHaveCount(0);

    for (const action of ["create", "read", "message"]) {
      const blocked = await guestContext.request.post(
        "http://127.0.0.1:5197/api/demo/guest-quote/" +
          action +
          "?session=" +
          demoSession,
        { data: {} },
      );
      expect(blocked.status()).toBe(404);
    }
  } finally {
    await guestContext.close();
  }
});

test.describe("registro desde el contacto", () => {
  test.use({ autoLogin: false });
  test("vuelve a la cotización tras confirmar la cuenta", async ({
    page,
    demoSession,
  }) => {
    const quote = "/#/quote?professional=ruiz&service=remodeling-1";
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(quote);
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Vista previa de los canales", { exact: false }),
    ).toBeVisible();
    await expect(dialog.getByText("Instagram", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Instagram" })).toHaveCount(
      0,
    );
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await dialog.getByRole("link", { name: "Crear cuenta" }).click();
    await page.getByLabel("Nombre completo").fill("Cliente de prueba");
    await page
      .getByLabel("Correo electrónico", { exact: true })
      .fill(`contacto-${demoSession}@example.test`);
    await page.locator('input[name="password"]').fill("Prueba2026!");
    await page.locator('input[name="confirmation"]').fill("Prueba2026!");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Crear cuenta", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Ver buzón de pruebas local" })
      .click();
    await page
      .getByRole("link", { name: "Abrir enlace de prueba" })
      .first()
      .click();
    await page.getByRole("button", { name: "Confirmar mi correo" }).click();
    await page.getByRole("link", { name: "Continuar a HOME CONNECT" }).click();
    await expect(page).toHaveURL(origins.web + quote);
    await expect(page.getByLabel("Título del proyecto")).toBeVisible();
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
    .locator('input[name="googleBusiness"]')
    .fill("https://maps.app.goo.gl/example");
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
  await expect(
    publicPage.getByRole("link", { name: /Abrir Perfil de Empresa en Google/ }),
  ).toHaveAttribute("href", "https://maps.app.goo.gl/example");
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
      name: "Solicitar cotización",
      exact: true,
    }),
  ).toHaveAttribute("href", /#\/quote\?professional=ruiz&service=/);
  await expect(
    publicPage
      .locator(".cart-services")
      .getByRole("link", { name: "Pagar en la web del contratista" }),
  ).toHaveCount(0);
});
