import { test, expect, origins } from "./fixtures";
import type { Page } from "@playwright/test";
test.use({ autoLogin: false });
async function login(page: Page, email: string) {
  await page
    .getByRole("textbox", { name: "Correo electrónico", exact: true })
    .fill(email);
  await page.locator('input[name="password"]').fill("Servinexo2026!");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
}
async function register(
  page: Page,
  name: string,
  email: string,
  contractor = false,
) {
  await page
    .getByRole("textbox", {
      name: contractor ? "Nombre profesional o empresa" : "Nombre completo",
      exact: true,
    })
    .fill(name);
  await page
    .getByRole("textbox", { name: "Correo electrónico", exact: true })
    .fill(email);
  await page.locator('input[name="password"]').fill("Prueba2026!");
  await page.locator('input[name="confirmation"]').fill("Prueba2026!");
  if (contractor) {
    await page
      .getByRole("combobox", { name: "Especialidad", exact: true })
      .selectOption("painting");
    await page
      .getByRole("textbox", { name: "Ciudad de trabajo", exact: true })
      .fill("Caracas");
  }
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page).toHaveURL(/workspace/);
  const dashboard = page.url();
  await page
    .getByRole("button", { name: "Ver buzón de pruebas local" })
    .click();
  await page
    .getByRole("link", { name: "Abrir enlace de prueba" })
    .first()
    .click();
  await page.getByRole("button", { name: "Confirmar mi correo" }).click();
  await expect(page.getByRole("status")).toContainText("Correo confirmado");
  await page.goto(dashboard);
}

test("los tres accesos privados requieren sesión y conservan la ruta solicitada", async ({
  page,
}) => {
  for (const [origin, path] of [
    [origins.web, "/workspace/owner/projects"],
    [origins.contractor, "/workspace/contractor/proposals"],
    [origins.admin, "/workspace/admin/activity"],
  ]) {
    await page.goto(origin + "/#" + path);
    await expect(page).toHaveURL(/#\/login\?next=/);
    await expect(
      page.getByRole("heading", { name: "Inicia sesión", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".dashboard-sidebar")).toHaveCount(0);
  }
  await login(page, "admin@example.test");
  await expect(page).toHaveURL(origins.admin + "/#/workspace/admin/activity");
  await expect(
    page.getByRole("heading", { name: "Actividad del ecosistema" }),
  ).toBeVisible();
});

test("login valida credenciales, separa roles y cierra la sesión", async ({
  page,
}) => {
  await page.goto(origins.contractor + "/#/login");
  await page
    .getByRole("textbox", { name: "Correo electrónico", exact: true })
    .fill("ruiz@example.test");
  await page.locator('input[name="password"]').fill("incorrecta");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Correo o contraseña incorrectos",
  );
  await login(page, "admin@example.test");
  await expect(page.getByRole("alert")).toContainText("otro portal");
  await login(page, "ruiz@example.test");
  await expect(
    page.getByRole("heading", { name: "Panel del contratista", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Panel del contratista", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page.goto(origins.contractor + "/#/workspace/contractor/profile");
  await expect(page).toHaveURL(/#\/login/);
});

test("registro del consumidor crea una cuenta propia sin las solicitudes de otra cuenta", async ({
  page,
}) => {
  await page.goto("/#/register");
  await register(page, "Andrea López", "andrea@example.test");
  await expect(
    page.getByRole("heading", { name: "Panel del consumidor", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Tu próximo proyecto empieza aquí", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Una cocina más abierta/ }),
  ).toHaveCount(0);
  await page.goto("/#/quote");
  await page
    .getByRole("textbox", { name: "Título del proyecto", exact: true })
    .fill("Proyecto de Andrea");
  await page
    .getByRole("textbox", { name: "Ciudad y país", exact: true })
    .fill("Caracas, Venezuela");
  await page
    .getByRole("textbox", { name: "Descripción del proyecto", exact: true })
    .fill("Una solicitud de prueba vinculada a la cuenta nueva.");
  await page
    .getByRole("button", { name: "Publicar solicitud de prueba" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Proyecto de Andrea", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Proyecto de Andrea", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page.goto("/#/login");
  await login(page, "carolina@example.test");
  await expect(
    page.getByRole("heading", { name: "Panel del consumidor", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Proyecto de Andrea/ }),
  ).toHaveCount(0);
});

test("registro profesional crea ficha propia, permite completarla y publicarla desde administración", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origins.contractor + "/#/register");
  await register(page, "Taller Color Caracas", "color@example.test", true);
  await expect(
    page.getByRole("heading", { name: "Panel del contratista", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Perfil de prueba" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Ficha en borrador", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mi ficha FUR", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Nombre profesional", exact: true }),
  ).toHaveValue("Taller Color Caracas");
  await page
    .getByRole("textbox", { name: "Presentación", exact: true })
    .fill("Pintura residencial de prueba con planificación y acabados.");
  await page
    .getByRole("button", { name: "Guardar ficha", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Referencia del documento", exact: true })
    .fill("DOC-DEMO-COLOR");
  await page
    .getByRole("button", { name: "Enviar a revisión", exact: true })
    .click();
  await expect(page.getByText("En revisión", { exact: true })).toBeVisible();
  const admin = await context.newPage();
  await admin.goto(origins.admin + "/#/login");
  await login(admin, "admin@example.test");
  const review = admin
    .locator(".review-card")
    .filter({ hasText: "Taller Color Caracas" });
  await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Aprobar en demo" }).click();
  await admin.getByRole("button", { name: "Perfiles", exact: true }).click();
  const profile = admin
    .locator(".publication-row")
    .filter({ hasText: "Taller Color Caracas" });
  await profile
    .getByRole("button", { name: "Publicar ficha", exact: true })
    .click();
  await expect(profile.getByText("Publicada", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Ficha publicada", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Presentación", exact: true }),
  ).toHaveValue("Pintura residencial de prueba con planificación y acabados.");
  await expect(
    page.getByText("Verificado · demo", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await admin.close();
});

test("administración no admite registro público y la API rechaza acciones sin sesión o con otro rol", async ({
  page,
  request,
  demoSession,
}) => {
  await page.goto(origins.admin + "/#/login");
  await expect(
    page.getByRole("link", { name: "Regístrate", exact: true }),
  ).toHaveCount(0);
  await page.goto(origins.admin + "/#/register");
  await expect(
    page.getByRole("heading", { name: "Esta página no está disponible" }),
  ).toBeVisible();
  const url = "http://127.0.0.1:5197/api/demo/commands?session=" + demoSession;
  const action = {
    type: "reset",
    actor: "admin",
    actingProfessional: "ruiz",
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
  };
  expect((await request.post(url, { data: action })).status()).toBe(401);
  const auth = await request.post(
    "http://127.0.0.1:5197/api/auth/login?session=" + demoSession,
    {
      data: {
        email: "carolina@example.test",
        password: "Servinexo2026!",
        application: "web",
      },
    },
  );
  const { token } = await auth.json();
  expect(
    (
      await request.post(url, {
        headers: { Authorization: "Bearer " + token },
        data: action,
      })
    ).status(),
  ).toBe(403);
});

test("formularios de acceso y registro funcionan en móvil sin desbordamiento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of [
    origins.web + "/#/register",
    origins.contractor + "/#/register",
    origins.admin + "/#/login",
  ]) {
    await page.goto(url);
    await expect(page.locator("form")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.screenshot({
    path: ".artifacts/admin-login-mobile.png",
    fullPage: true,
  });
});
