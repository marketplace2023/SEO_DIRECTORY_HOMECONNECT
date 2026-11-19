import { test, expect, submitEstimate } from "./fixtures";

test("entradas independientes y dashboard del consumidor dentro de la web", async ({
  page,
  request,
}) => {
  const contractorHTML = await (await request.get(origins.contractor)).text();
  const adminHTML = await (await request.get(origins.admin)).text();
  expect(contractorHTML).toContain("/src/main.tsx");
  expect(adminHTML).toContain("/src/main.tsx");
  await page.goto("/#/workspace/owner");
  await expect(page.locator('[data-application="marketplace"]')).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Panel del consumidor",
  );
  await expect(
    page.getByRole("combobox", { name: "Rol de demostración" }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Entornos del ecosistema" })
    .getByRole("link", { name: "Contratista", exact: true })
    .click();
  await expect(page).toHaveURL(origins.contractor + "/#/workspace/contractor");
  await expect(page.locator('[data-application="contractor"]')).toBeVisible();
  expect(new URL(page.url()).origin).toBe(origins.contractor);
  await expect(page.locator(".workspace-tabs")).toHaveCSS("position", "fixed");
  await expect(page.locator("body")).toHaveCSS("font-family", /Open Sans/);
  await expect(page.locator("h1")).toHaveCSS("font-family", /Poppins/);
  await expect(page.locator(".site-header")).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Área de gestión" }),
  ).toHaveCount(0);
  await page.goto(origins.contractor + "/#/workspace/admin");
  await expect(
    page.getByRole("heading", { name: "Esta página no está disponible" }),
  ).toBeVisible();
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Centro de administración",
  );
  await expect(page.locator('[data-application="admin"]')).toBeVisible();
  expect(new URL(page.url()).origin).toBe(origins.admin);
  await expect(page.locator(".workspace-tabs")).toHaveCSS("position", "fixed");
  const roles = await page
    .getByRole("combobox", { name: "Área de gestión" })
    .locator("option")
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
  expect(roles).not.toContain("owner");
  expect(roles).not.toContain("contractor");
  await page.screenshot({
    path: ".artifacts/admin-independent.png",
    fullPage: true,
  });
});

test("las aplicaciones comparten la demo y sincronizan propuestas entre pestañas", async ({
  page: consumer,
  context,
}) => {
  const contractor = await context.newPage();
  await contractor.goto("/contractor/#/workspace/contractor/requests");
  await expect(contractor.getByRole("heading", { level: 1 })).toHaveText(
    "Panel del contratista",
  );
  await consumer.goto("/#/quote");
  await consumer
    .getByRole("textbox", { name: "Título del proyecto" })
    .fill("Conectar tres aplicaciones");
  await consumer
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption("remodeling");
  await consumer
    .getByRole("textbox", { name: "Ciudad y país" })
    .fill("Miami, Estados Unidos");
  await consumer
    .getByRole("textbox", { name: "Descripción del proyecto" })
    .fill("Una prueba completa del recorrido entre los frontends.");
  await consumer
    .getByRole("button", { name: "Publicar solicitud de prueba" })
    .click();
  await expect(
    consumer.getByRole("heading", { name: "Conectar tres aplicaciones" }),
  ).toBeVisible();
  await contractor
    .locator(".eco-record")
    .filter({ hasText: "Conectar tres aplicaciones" })
    .click();
  await submitEstimate(contractor, "350.25", "3");
  await expect(consumer.locator(".proposal-card")).toHaveCount(1);
  await expect(consumer.locator(".proposal-card")).toContainText(
    "Construcciones Ruiz",
  );
  await contractor.goto("/contractor/#/workspace/contractor/profile");
  await contractor
    .locator('input[name="website"]')
    .fill("https://example.com/pago");
  const profileResponse = contractor.waitForResponse(
    (response) =>
      response.url().includes("/api/demo/commands") &&
      response.request().postDataJSON()?.type === "profile",
  );
  await contractor.getByRole("button", { name: "Guardar ficha" }).click();
  expect((await profileResponse).ok()).toBe(true);
  await consumer
    .getByRole("button", { name: "Aceptar propuesta de prueba" })
    .click();
  await expect(consumer).toHaveURL(/\/\#\/workspace\/owner\/projects\//);
  await consumer
    .getByRole("link", { name: "Ir al carrito para pagar" })
    .click();
  const payment = consumer
    .locator(".eco-panel")
    .filter({
      has: consumer.getByRole("heading", {
        name: "Conectar tres aplicaciones",
        exact: true,
      }),
    })
    .getByRole("link", { name: "Pagar en la web del contratista" });
  await expect(payment).toHaveAttribute("href", "https://example.com/pago");
  await expect(payment).toHaveAttribute("target", "_blank");
  await contractor
    .getByRole("navigation", { name: "Secciones del espacio" })
    .getByRole("button", { name: "Propuestas", exact: true })
    .click();
  await contractor
    .getByRole("combobox", { name: "Solicitud para medir y presupuestar" })
    .selectOption({ label: "Conectar tres aplicaciones" });
  await contractor.getByLabel("Avance acumulado (%)").fill("40");
  const valuationResponse = contractor.waitForResponse(
    (response) =>
      response.url().includes("/api/demo/commands") &&
      response.request().postDataJSON()?.type === "valuation",
  );
  await contractor.getByRole("button", { name: "Registrar valuación" }).click();
  const valuationState = await (await valuationResponse).json();
  expect(valuationState.estimating.valuations).toEqual([
    expect.objectContaining({ progress: 40 }),
  ]);
  await contractor.reload();
  await expect(contractor.getByText(/40% · Período/)).toBeVisible();
  await contractor
    .getByRole("navigation", { name: "Secciones del espacio" })
    .getByRole("button", { name: "Proyectos", exact: true })
    .click();
  await expect(
    contractor.getByRole("button", { name: /Conectar tres aplicaciones/ }),
  ).toBeVisible();
  await contractor.screenshot({
    path: ".artifacts/contractor-independent.png",
    fullPage: true,
  });
  await contractor.close();
});

test("portales móviles separados sin desbordamiento horizontal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/contractor/", "/admin/", "/#/workspace/owner"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBeTruthy();
    if (path !== "/#/workspace/owner") {
      await page
        .getByRole("button", { name: "Abrir menú", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Cerrar menú", exact: true }),
      ).toHaveAttribute("aria-expanded", "true");
      await page
        .getByRole("navigation", { name: "Secciones del espacio" })
        .getByRole("button", { name: "Cobertura", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Abrir menú", exact: true }),
      ).toHaveAttribute("aria-expanded", "false");
    }
  }
});
