import { test, expect, origins } from "./fixtures";

test("Contenido SEO: registrar post, reseña y noticia desde acciones visibles y persistir", async ({
  page,
  request,
  demoSession,
}) => {
  await page.goto(origins.admin + "/#/workspace/admin/local-seo");
  await page
    .getByRole("combobox", { name: "Negocio a gestionar" })
    .selectOption("ruiz");
  await page.getByRole("tab", { name: "Contenido", exact: true }).click();
  for (const name of ["Crear post", "Registrar reseña", "Crear noticia"])
    await expect(
      page.getByRole("button", { name, exact: true }).first(),
    ).toBeInViewport();
  for (const item of [
    {
      action: "Crear post",
      title: "Post de mantenimiento",
      save: "Guardar post",
      body: "Recomendaciones de mantenimiento del hogar.",
    },
    {
      action: "Registrar reseña",
      title: "Experiencia de cliente",
      save: "Guardar reseña",
      body: "El trabajo se completó en la fecha acordada.",
    },
    {
      action: "Crear noticia",
      title: "Nueva cobertura de servicio",
      save: "Guardar noticia",
      body: "Información sobre la nueva zona de atención.",
    },
  ]) {
    await page
      .getByRole("button", { name: item.action, exact: true })
      .first()
      .click();
    const editor = page.getByRole("dialog", { name: item.action, exact: true });
    await expect(editor).toBeVisible();
    await editor
      .getByRole("textbox", { name: "Título", exact: true })
      .fill(item.title);
    await editor
      .getByRole("textbox", {
        name:
          item.save === "Guardar reseña"
            ? "Testimonio original del cliente"
            : "Contenido",
        exact: true,
      })
      .fill(item.body);
    if (item.save === "Guardar reseña") {
      await editor
        .getByRole("textbox", { name: "Fuente / URL publicada", exact: true })
        .fill("https://example.com/review/evidencia");
      await editor
        .getByRole("textbox", { name: "Autor público", exact: true })
        .fill("Cliente con testimonio documentado");
      await editor
        .getByRole("textbox", {
          name: "Evidencia de origen / publicación",
          exact: true,
        })
        .fill("Testimonio y enlace revisados manualmente.");
    }
    await editor.getByRole("button", { name: item.save, exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: item.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/correctamente para Construcciones Ruiz/),
    ).toBeVisible();
  }
  await page.reload();
  await page.getByRole("tab", { name: "Contenido", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Post de mantenimiento", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar contenido", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Editar post", exact: true });
  await edit
    .getByRole("textbox", { name: "Título", exact: true })
    .fill("Post actualizado");
  await edit.getByRole("button", { name: "Guardar post", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Post actualizado", exact: true }),
  ).toBeVisible();
  const auth = await request.post(
    `http://127.0.0.1:5197/api/auth/login?session=${demoSession}`,
    {
      data: {
        application: "admin",
        email: "admin@example.test",
        password: "Servinexo2026!",
      },
    },
  );
  const headers = { Authorization: "Bearer " + (await auth.json()).token };
  const saved = await (
    await request.get(
      `http://127.0.0.1:5197/api/local-seo/workspace?session=${demoSession}&professional=ruiz`,
      { headers },
    )
  ).json();
  expect(saved.project.contents.map((c: any) => c.type).sort()).toEqual([
    "news",
    "post",
    "review",
  ]);
  expect(saved.project.contents.every((c: any) => c.status === "draft")).toBe(
    true,
  );
  const other = await (
    await request.get(
      `http://127.0.0.1:5197/api/local-seo/workspace?session=${demoSession}&professional=peachtree`,
      { headers },
    )
  ).json();
  expect(other.project.contents).toHaveLength(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Crear noticia", exact: true })
    .first()
    .click();
  const mobile = page.getByRole("dialog", {
    name: "Crear noticia",
    exact: true,
  });
  await expect(mobile).toBeVisible();
  await expect(
    mobile.getByRole("button", { name: "Guardar noticia", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".artifacts/seo-content-editor-mobile.png",
    fullPage: true,
  });
  await mobile.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(mobile).toHaveCount(0);
  await page.goto(origins.contractor + "/#/workspace/contractor/local-seo");
  await page.getByRole("tab", { name: "Contenido", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: /Crear post|Registrar reseña|Crear noticia|Guardar post|Editar contenido/,
    }),
  ).toHaveCount(0);
});
