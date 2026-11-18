import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

const section = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Secciones del espacio" })
    .getByRole("button", { name, exact: true });
async function role(page: Page, value: string) {
  const prefix =
    value === "contractor"
      ? "/contractor/"
      : ["admin", "supplier", "business", "ally"].includes(value)
        ? "/admin/"
        : "/";
  await page.goto(prefix + "#/workspace/" + value);
  await expect(
    page.getByRole("navigation", { name: "Secciones del espacio" }),
  ).toBeVisible();
}
async function createRequest(page: Page) {
  await page.goto("/#/quote");
  await page
    .getByRole("textbox", { name: "Título del proyecto" })
    .fill("Renovar cocina familiar");
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption("remodeling");
  await page
    .getByRole("combobox", { name: "Servicio", exact: true })
    .selectOption("remodeling-1");
  await page
    .getByRole("textbox", { name: "Ciudad y país" })
    .fill("Miami, Estados Unidos");
  await page
    .getByRole("textbox", { name: "Descripción del proyecto" })
    .fill("Cambiar acabados y renovar los gabinetes de la cocina.");
  await page
    .getByRole("spinbutton", { name: /Presupuesto orientativo/ })
    .fill("1500");
  await page
    .getByRole("button", { name: "Publicar solicitud de prueba" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Renovar cocina familiar", exact: true }),
  ).toBeVisible();
  return page.url();
}
async function propose(page: Page, amount: string) {
  await section(page, "Solicitudes").click();
  await page
    .locator(".eco-record")
    .filter({ hasText: "Renovar cocina familiar" })
    .click();
  await page
    .getByRole("spinbutton", { name: "Importe total · USD" })
    .fill(amount);
  await page
    .getByRole("spinbutton", { name: "Plazo estimado · días" })
    .fill("7");
  await page
    .getByRole("textbox", { name: "Alcance, materiales y condiciones" })
    .fill(
      "Incluye preparación, materiales y limpieza. Visita previa acordada.",
    );
  await page
    .getByRole("button", { name: "Enviar propuesta de prueba" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tu propuesta", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enviar propuesta de prueba" }),
  ).toHaveCount(0);
}

test("catálogo normalizado, servicio y enlace compartible con filtros", async ({
  page,
}) => {
  await page.goto("/#/catalog");
  await expect(page.locator(".catalog-category")).toHaveCount(32);
  await page
    .locator(".catalog-category")
    .filter({ hasText: "Pintura" })
    .click();
  await expect(page).toHaveURL(/category=painting/);
  await expect(page.locator(".service-tile")).toHaveCount(3);
  await page.getByRole("button", { name: /Pintura de interiores/ }).click();
  await expect(page).toHaveURL(/services\/painting-1/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Pintura de interiores",
  );
  await page.goto("/#/professionals?category=remodeling&city=Doral");
  await expect(page.getByRole("status")).toHaveText("2 perfiles de ejemplo");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Categoría", exact: true }),
  ).toHaveValue("remodeling");
  await expect(
    page.getByRole("textbox", { name: "Ciudad", exact: true }),
  ).toHaveValue("Doral");
  await expect(page.getByRole("status")).toHaveText("2 perfiles de ejemplo");
});

test("solicitud → comparación de propuestas → proyecto → hitos, con persistencia", async ({
  page,
}) => {
  const requestUrl = await createRequest(page);
  await role(page, "contractor");
  await propose(page, "1400");
  await page
    .getByRole("combobox", { name: "Perfil de prueba" })
    .selectOption("habita");
  await propose(page, "1250");
  await page.goto(requestUrl);
  await expect(page.locator(".proposal-card")).toHaveCount(2);
  const proposal = page
    .locator(".proposal-card")
    .filter({ hasText: "Estudio Habita" });
  await proposal
    .getByRole("button", { name: "Aceptar propuesta de prueba" })
    .click();
  await expect(page).toHaveURL(/owner\/projects\//);
  const projectId = page.url().split("/").at(-1)!;
  await expect(page.getByText("0%", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Renovar cocina familiar", exact: true }),
  ).toBeVisible();
  await role(page, "contractor");
  await page
    .getByRole("combobox", { name: "Perfil de prueba" })
    .selectOption("habita");
  await section(page, "Proyectos").click();
  await page.getByRole("button", { name: /Renovar cocina familiar/ }).click();
  for (const label of [
    "Visita y planificación",
    "Ejecución del trabajo",
    "Entrega y revisión final",
  ])
    await page.getByRole("checkbox", { name: label }).check();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.getByText("Completado", { exact: true })).toBeVisible();
  await page.goto(`/#/workspace/owner/projects/${projectId}`);
  await expect(page.getByRole("checkbox").first()).toBeDisabled();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("servinexo.ecosystem.v1")!),
  );
  expect(saved.projects).toHaveLength(3);
  expect(
    saved.proposals.filter((p: { status: string }) => p.status === "accepted"),
  ).toHaveLength(3);
  expect(
    saved.proposals.filter((p: { status: string }) => p.status === "declined"),
  ).toHaveLength(2);
  await page.screenshot({
    path: ".artifacts/ecosystem-project-desktop.png",
    fullPage: true,
  });
});

test("credenciales: devolución con observación, reenvío y aprobación", async ({
  page,
}) => {
  await page.goto("/#/workspace/ally/verifications");
  const aquafix = page
    .locator(".review-card")
    .filter({ hasText: "AquaFix Solutions" });
  await aquafix.getByRole("button", { name: "Solicitar cambios" }).click();
  await expect(aquafix).toBeVisible();
  await aquafix
    .getByRole("textbox", { name: "Observación de la revisión" })
    .fill("Completa la referencia del documento de muestra.");
  await aquafix.getByRole("button", { name: "Solicitar cambios" }).click();
  await expect(
    page.locator(".review-card").filter({ hasText: "AquaFix Solutions" }),
  ).toHaveCount(0);
  await role(page, "contractor");
  await page
    .getByRole("combobox", { name: "Perfil de prueba" })
    .selectOption("aquafix");
  await section(page, "Mi ficha FUR").click();
  const credential = page
    .locator(".credential-editor")
    .filter({ hasText: "Identidad comercial" });
  await expect(
    credential.getByText("Requiere cambios", { exact: true }),
  ).toBeVisible();
  await credential
    .getByRole("textbox", { name: "Referencia del documento" })
    .fill("DEMO-ID-CORREGIDO");
  await credential.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(
    credential.getByText("En revisión", { exact: true }),
  ).toBeVisible();
  await role(page, "admin");
  await section(page, "Verificaciones").click();
  await page
    .locator(".review-card")
    .filter({ hasText: "AquaFix Solutions" })
    .getByRole("button", { name: "Aprobar en demo" })
    .click();
  await page.goto("/#/professionals/aquafix");
  await expect(
    page
      .locator(".credential-public")
      .filter({ hasText: "Identidad comercial" })
      .getByText("Verificado · demo"),
  ).toBeVisible();
});

test("favoritos, mensajes entre roles y publicación", async ({ page }) => {
  await page.goto("/#/professionals/ruiz");
  await page.getByRole("button", { name: "Guardado", exact: true }).click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Guardado", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/#/workspace/owner/favorites");
  await expect(
    page.getByRole("button", { name: "Construcciones Ruiz", exact: true }),
  ).toBeVisible();
  await page.goto("/#/workspace/owner/messages?professional=ruiz");
  await page
    .getByRole("textbox", { name: "Mensaje", exact: true })
    .fill("¿Incluye visita previa?");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await role(page, "contractor");
  await section(page, "Mensajes").click();
  await expect(
    page.getByText("¿Incluye visita previa?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Mensaje", exact: true })
    .fill("Sí, coordinamos una visita antes de empezar.");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await role(page, "owner");
  await section(page, "Mensajes").click();
  await expect(
    page.getByText("Sí, coordinamos una visita antes de empezar.", {
      exact: true,
    }),
  ).toBeVisible();
  await role(page, "admin");
  await section(page, "Perfiles").click();
  await page
    .locator(".publication-row")
    .filter({ hasText: "Construcciones Ruiz" })
    .getByRole("button", { name: "Retirar publicación" })
    .click();
  await page.goto("/#/professionals/ruiz");
  await expect(
    page.getByRole("heading", { name: "Esta página no está disponible" }),
  ).toBeVisible();
});

test("proveedor, organización y reinicio controlado de datos", async ({
  page,
}) => {
  await page.goto("/#/workspace/supplier/inventory");
  await page
    .getByRole("textbox", { name: "Nombre del material" })
    .fill("Sellador de demostración");
  await page
    .getByRole("textbox", { name: "Unidad", exact: true })
    .fill("envase");
  await page.getByRole("spinbutton", { name: "Existencias" }).fill("9");
  await page.getByRole("spinbutton", { name: "Precio · USD" }).fill("20");
  await page
    .getByRole("button", { name: "Añadir material", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Sellador de demostración" }),
  ).toBeVisible();
  await role(page, "business");
  await section(page, "Equipo").click();
  await page
    .getByRole("textbox", { name: "Nombre del integrante" })
    .fill("Marta Demo");
  await page
    .getByRole("textbox", { name: "Responsabilidad" })
    .fill("Diseño de espacios");
  await page
    .getByRole("button", { name: "Añadir integrante de prueba" })
    .click();
  await expect(page.getByRole("heading", { name: "Marta Demo" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Marta Demo" })).toBeVisible();
  await role(page, "admin");
  await section(page, "Configuración").click();
  await page.getByRole("button", { name: "Restablecer demostración" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("servinexo.ecosystem.v1")!),
  );
  expect(saved.team).toHaveLength(3);
  await page.getByRole("button", { name: "Restablecer demostración" }).click();
  await page
    .getByRole("button", { name: "Confirmar restablecimiento" })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Demostración restablecida.",
  );
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("servinexo.ecosystem.v1")!),
  );
  expect(saved.team).toHaveLength(2);
  expect(saved.materials).toHaveLength(3);
});

test("pantallas móviles, rutas desconocidas y recuperación de almacenamiento inválido", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/catalog?category=painting",
    "/professionals/ruiz",
    "/quote",
    "/workspace/owner",
    "/workspace/supplier/inventory",
    "/workspace/ally/verifications",
    "/resources",
    "/coverage",
  ]) {
    await page.goto(`/#${path}`);
    await expect(page.locator("main h1, main h2").first()).toBeVisible();
    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      offenders: [...document.querySelectorAll("main *")]
        .filter(
          (el) => el.getBoundingClientRect().right > window.innerWidth + 1,
        )
        .slice(0, 8)
        .map((el) => ({
          tag: el.tagName,
          className: el.className,
          width: el.getBoundingClientRect().width,
        })),
    }));
    expect(
      layout.width,
      `${path}: ${JSON.stringify(layout.offenders)}`,
    ).toBeLessThanOrEqual(layout.viewport);
  }
  await page.goto("/#/workspace/contractor/profile");
  await page.screenshot({
    path: ".artifacts/ecosystem-profile-mobile.png",
    fullPage: true,
  });
  await page.goto("/#/workspace/toString");
  await expect(
    page.getByRole("heading", { name: "Esta página no está disponible" }),
  ).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem("servinexo.ecosystem.v1", "{broken json"),
  );
  await page.reload();
  await page.goto("/#/professionals");
  await expect(page.getByRole("status")).toHaveText("12 perfiles de ejemplo");
  expect(errors).toEqual([]);
});
