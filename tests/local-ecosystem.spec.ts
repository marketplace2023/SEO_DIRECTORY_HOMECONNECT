import { test, expect, origins } from "./fixtures";
import type { APIRequestContext } from "@playwright/test";
const api = "http://127.0.0.1:5197";
async function verifiedAccount(
  request: APIRequestContext,
  session: string,
  email: string,
  role: "owner" | "contractor" = "owner",
) {
  const response = await request.post(
    `${api}/api/auth/register?session=${session}`,
    {
      data: {
        role,
        ...(role === "contractor"
          ? { categoryId: "roofing", city: "Lawrenceville" }
          : {}),
        name: "Cliente de prueba",
        email,
        password: "Prueba2026!",
      },
    },
  );
  expect(response.status()).toBe(201);
  const account = await response.json();
  const inbox = await request.get(
      `${api}/api/auth/local-inbox?session=${session}`,
      { headers: { Authorization: "Bearer " + account.token } },
    ),
    mail = (await inbox.json()).messages[0];
  const token = new URLSearchParams(
    new URL(mail.text.match(/https?:\/\/\S+/)[0]).hash.split("?")[1],
  ).get("token");
  expect(
    (
      await request.post(`${api}/api/auth/verify-email?session=${session}`, {
        data: { token },
      })
    ).ok(),
  ).toBeTruthy();
  return account;
}
test("SEO local entrega HTML rastreable, canonical, JSON-LD y 404 reales sin indexar la demo", async ({
  request,
}) => {
  const response = await request.get("/georgia");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("<h1>Find home service professionals in Georgia</h1>");
  expect(html).toContain('rel="canonical"');
  expect(html).toContain("noindex,follow");
  expect(html).not.toContain("aggregateRating");
  const schema = JSON.parse(
    html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/)![1],
  );
  expect(schema.some((x: any) => x["@type"] === "BreadcrumbList")).toBeTruthy();
  expect((await request.get("/georgia/non-existent-city")).status()).toBe(404);
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "<loc>",
  );
});
test("piloto Georgia: negocio publicado, propuesta, entrega y respuesta a una reseña desde su panel", async ({
  request,
  browser,
  demoSession,
}) => {
  const owner = await verifiedAccount(
      request,
      demoSession,
      "pilot-owner@example.test",
    ),
    pro = await verifiedAccount(
      request,
      demoSession,
      "pilot-pro@example.test",
      "contractor",
    );
  const admin = (
    await (
      await request.post(`${api}/api/auth/login?session=${demoSession}`, {
        data: {
          email: "admin@example.test",
          password: "Servinexo2026!",
          application: "admin",
        },
      })
    ).json()
  ).token;
  const command = async (token: string, actor: string, action: any) => {
    const id = crypto.randomUUID();
    const response = await request.post(
      `${api}/api/demo/commands?session=${demoSession}`,
      {
        headers: { Authorization: "Bearer " + token },
        data: {
          id,
          at: new Date().toISOString(),
          actingProfessional: pro.user.professionalId,
          actor,
          ...action,
        },
      },
    );
    expect(response.status()).toBe(200);
    return { id, state: await response.json() };
  };
  await command(admin, "admin", {
    type: "publication",
    professionalId: pro.user.professionalId,
  });
  const req = await command(owner.token, "owner", {
    type: "request",
    value: {
      title: "Georgia roof project",
      categoryId: "roofing",
      serviceId: "roofing-1",
      location: "Lawrenceville, Georgia",
      description: "Repair the roof following an on-site assessment.",
      budget: null,
      date: "",
    },
  });
  const proposal = await command(pro.token, "contractor", {
    type: "proposal",
    value: {
      requestId: req.id,
      amount: 800,
      days: 3,
      description: "Roof repair after scope confirmation.",
    },
  });
  expect(proposal.state.proposals.some((p: any) => p.id === proposal.id)).toBe(
    true,
  );
  const project = await command(owner.token, "owner", {
    type: "accept",
    proposalId: proposal.id,
  });
  for (const milestone of ["planning", "work", "delivery"])
    await command(pro.token, "contractor", {
      type: "milestone",
      projectId: project.id,
      milestoneId: milestone,
    });
  const post = (path: string, token: string, data: any) =>
    request.post(`${api}${path}?session=${demoSession}`, {
      headers: { Authorization: "Bearer " + token },
      data,
    });
  expect(
    (
      await post("/api/projects/confirm", owner.token, {
        projectId: project.id,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await post("/api/reviews", owner.token, {
        projectId: project.id,
        rating: 5,
        text: "Clear communication and the agreed work was completed.",
      })
    ).status(),
  ).toBe(201);
  const review = (
    await (
      await request.get(
        `${api}/api/reviews?session=${demoSession}&moderation=1`,
        { headers: { Authorization: "Bearer " + admin } },
      )
    ).json()
  ).reviews[0];
  await post("/api/reviews/moderate", admin, {
    id: review.id,
    status: "published",
    note: "The review describes this documented project.",
  });
  const context = await browser.newContext();
  try {
    await context.addInitScript(
      ({ session, token }) => {
        localStorage.setItem("servinexo.demo-session", session);
        localStorage.setItem("servinexo.auth." + session, token);
      },
      { session: demoSession, token: pro.token },
    );
    const page = await context.newPage();
    await page.goto(origins.contractor + "/#/workspace/contractor/reviews");
    await page
      .getByRole("textbox", { name: "Respuesta del negocio", exact: true })
      .fill("Thank you for trusting our team with your project.");
    await page.getByRole("button", { name: "Guardar respuesta" }).click();
    await expect(
      page.getByText("Thank you for trusting our team with your project.", {
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
test("adjuntos: propiedad, formatos, documentos privados y publicación explícita del portafolio", async ({
  request,
  demoSession,
}) => {
  const contractor = await verifiedAccount(
      request,
      demoSession,
      "files-pro@example.test",
      "contractor",
    ),
    other = await verifiedAccount(
      request,
      demoSession,
      "files-owner@example.test",
    );
  const upload = (token: string, body: any) =>
    request.post(`${api}/api/files?session=${demoSession}`, {
      headers: { Authorization: "Bearer " + token },
      data: body,
    });
  const pdf = Buffer.from("%PDF-1.4\nExample test document\n%%EOF").toString(
    "base64",
  );
  const privateFile = await upload(contractor.token, {
    name: "Evidencia de prueba",
    data: pdf,
    purpose: "credential",
    targetId: contractor.user.professionalId,
  });
  expect(privateFile.status()).toBe(201);
  const { id } = await privateFile.json();
  expect(
    (await request.get(`${api}/media/${id}?session=${demoSession}`)).status(),
  ).toBe(404);
  expect(
    (
      await request.get(`${api}/media/${id}?session=${demoSession}`, {
        headers: { Authorization: "Bearer " + other.token },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.get(`${api}/media/${id}?session=${demoSession}`, {
        headers: { Authorization: "Bearer " + contractor.token },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await upload(contractor.token, {
        name: "Invalid",
        data: Buffer.from("<script>alert(1)</script>").toString("base64"),
        purpose: "credential",
        targetId: contractor.user.professionalId,
      })
    ).status(),
  ).toBe(400);
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=";
  const photo = await upload(contractor.token, {
    name: "Trabajo de muestra",
    data: png,
    purpose: "portfolio",
    targetId: contractor.user.professionalId,
    publicConsent: true,
  });
  expect(photo.status()).toBe(201);
  const publicId = (await photo.json()).id;
  expect(
    (
      await request.get(`${api}/media/${publicId}?session=${demoSession}`)
    ).status(),
  ).toBe(404);
  const admin = (
    await (
      await request.post(`${api}/api/auth/login?session=${demoSession}`, {
        data: {
          email: "admin@example.test",
          password: "Servinexo2026!",
          application: "admin",
        },
      })
    ).json()
  ).token;
  expect(
    (
      await request.post(`${api}/api/demo/commands?session=${demoSession}`, {
        headers: { Authorization: "Bearer " + admin },
        data: {
          type: "publication",
          actor: "admin",
          professionalId: contractor.user.professionalId,
          actingProfessional: "ruiz",
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
        },
      })
    ).status(),
  ).toBe(200);
  const publicImage = await request.get(
    `${api}/media/${publicId}?session=${demoSession}`,
  );
  expect(publicImage.status()).toBe(200);
  expect(publicImage.headers()["content-type"]).toBe("image/png");
  expect(
    (await request.get(`${api}/media/${id}?session=${demoSession}`)).status(),
  ).toBe(404);
});
test("administración puede guardar páginas SEO y contratistas ven el estado real de Google", async ({
  page,
}) => {
  await page.goto(origins.admin + "/#/workspace/admin/seo");
  await expect(
    page.getByRole("heading", { name: "SEO local · Georgia" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Localidad", exact: true })
    .selectOption("lawrenceville");
  await page
    .getByRole("combobox", { name: "Especialidad", exact: true })
    .selectOption("roofing");
  await page
    .getByRole("textbox", { name: "Título SEO", exact: true })
    .fill("Roofing professionals in Lawrenceville, Georgia");
  await page
    .getByRole("textbox", { name: "Descripción SEO", exact: true })
    .fill(
      "Find roofing professionals serving Lawrenceville, Georgia and compare project proposals.",
    );
  await page
    .getByRole("textbox", { name: "Contenido local útil", exact: true })
    .fill(
      "Compare the declared service areas of roofing professionals in Lawrenceville, Georgia. Describe the property and request a site assessment before agreeing to a final project price.",
    );
  await page
    .getByRole("checkbox", { name: "Publicar página", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Guardar página SEO", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Configuración SEO guardada.",
  );
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: /Roofing professionals in Lawrenceville/,
    }),
  ).toBeVisible();
  await page.goto(origins.contractor + "/#/workspace/contractor/google");
  await expect(
    page.getByRole("heading", { name: "Google Business Profile" }),
  ).toBeVisible();
  await expect(
    page.getByText("Pendiente de configuración", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conectar con Google" }),
  ).toBeDisabled();
});
test("email: confirmación de un solo uso, recuperación y revocación de sesiones", async ({
  request,
  demoSession,
}) => {
  const response = await request.post(
      `${api}/api/auth/register?session=${demoSession}`,
      {
        data: {
          name: "Persona Email",
          email: "EMAIL@example.test",
          password: "Prueba2026!",
          role: "owner",
        },
      },
    ),
    account = await response.json();
  expect(account.user.emailVerified).toBe(false);
  const headers = { Authorization: "Bearer " + account.token };
  const command = {
    type: "request",
    actor: "owner",
    actingProfessional: "ruiz",
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    value: {
      title: "Proyecto protegido",
      categoryId: "remodeling",
      serviceId: "remodeling-1",
      location: "Miami",
      description: "Una solicitud protegida por confirmación de correo.",
      budget: null,
      date: "",
    },
  };
  expect(
    (
      await request.post(`${api}/api/demo/commands?session=${demoSession}`, {
        headers,
        data: command,
      })
    ).status(),
  ).toBe(403);
  let messages = (
    await (
      await request.get(`${api}/api/auth/local-inbox?session=${demoSession}`, {
        headers,
      })
    ).json()
  ).messages;
  let token = new URLSearchParams(
    new URL(messages[0].text.match(/https?:\/\/\S+/)[0]).hash.split("?")[1],
  ).get("token");
  expect(
    (
      await request.post(
        `${api}/api/auth/verify-email?session=${demoSession}`,
        { data: { token } },
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post(
        `${api}/api/auth/verify-email?session=${demoSession}`,
        { data: { token } },
      )
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post(
        `${api}/api/auth/forgot-password?session=${demoSession}`,
        { data: { email: "email@example.test", application: "web" } },
      )
    ).status(),
  ).toBe(200);
  messages = (
    await (
      await request.get(`${api}/api/auth/local-inbox?session=${demoSession}`, {
        headers,
      })
    ).json()
  ).messages;
  token = new URLSearchParams(
    new URL(messages[0].text.match(/https?:\/\/\S+/)[0]).hash.split("?")[1],
  ).get("token");
  expect(
    (
      await request.post(
        `${api}/api/auth/reset-password?session=${demoSession}`,
        { data: { token, password: "Nueva2026!" } },
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.get(`${api}/api/auth/me?session=${demoSession}`, {
        headers,
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post(`${api}/api/auth/login?session=${demoSession}`, {
        data: {
          email: "email@example.test",
          password: "Nueva2026!",
          application: "web",
        },
      })
    ).status(),
  ).toBe(200);
});
test("API y SSE no entregan solicitudes privadas a otra cuenta ni a visitantes", async ({
  request,
  demoSession,
}) => {
  const owner = await verifiedAccount(
      request,
      demoSession,
      "owner-a@example.test",
    ),
    other = await verifiedAccount(request, demoSession, "owner-b@example.test");
  const command = {
    type: "request",
    actor: "owner",
    actingProfessional: "ruiz",
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    value: {
      title: "Solicitud privada del cliente A",
      categoryId: "remodeling",
      serviceId: "remodeling-1",
      location: "Miami",
      description:
        "Contenido privado para comprobar el aislamiento de cuentas.",
      budget: null,
      date: "",
    },
  };
  expect(
    (
      await request.post(`${api}/api/demo/commands?session=${demoSession}`, {
        headers: { Authorization: "Bearer " + owner.token },
        data: command,
      })
    ).status(),
  ).toBe(200);
  for (const token of ["", other.token]) {
    const state = await (
      await request.post(`${api}/api/demo/bootstrap?session=${demoSession}`, {
        headers: token ? { Authorization: "Bearer " + token } : {},
        data: {},
      })
    ).json();
    expect(state.requests).toHaveLength(0);
    expect(state.audit).toHaveLength(0);
    expect(
      state.professionals.every((p: any) =>
        p.credentials.every((c: any) => !c.reference && !c.note),
      ),
    ).toBeTruthy();
  }
  const grant = await (
    await request.post(`${api}/api/demo/stream-ticket?session=${demoSession}`, {
      headers: { Authorization: "Bearer " + other.token },
      data: {},
    })
  ).json();
  const controller = new AbortController();
  try {
    const response = await fetch(
        `${api}/api/demo/events?session=${demoSession}&ticket=${grant.ticket}`,
        { signal: controller.signal },
      ),
      reader = response.body!.getReader();
    let text = "";
    while (!text.includes("data:"))
      text += new TextDecoder().decode((await reader.read()).value);
    expect(text).not.toContain("Solicitud privada del cliente A");
  } finally {
    controller.abort();
  }
  expect(
    (
      await request.post(`${api}/api/demo/commands?session=${demoSession}`, {
        headers: { Authorization: "Bearer " + other.token },
        data: { ...command, type: "cancel", requestId: command.id },
      })
    ).status(),
  ).toBe(403);
});
test("cierre, reseña moderada y soporte siguen el rol de cada cuenta", async ({
  request,
  demoSession,
}) => {
  const login = async (application: string, email: string) =>
    (
      await (
        await request.post(`${api}/api/auth/login?session=${demoSession}`, {
          data: { application, email, password: "Servinexo2026!" },
        })
      ).json()
    ).token;
  const owner = await login("web", "carolina@example.test"),
    admin = await login("admin", "admin@example.test");
  const post = (path: string, token: string, data: any) =>
    request.post(`${api}${path}?session=${demoSession}`, {
      headers: { Authorization: "Bearer " + token },
      data,
    });
  const state = await (await post("/api/demo/bootstrap", owner, {})).json(),
    project = state.projects.find((p: any) => p.status === "completed");
  expect(project).toBeTruthy();
  expect(
    (
      await post("/api/projects/confirm", owner, { projectId: project.id })
    ).status(),
  ).toBe(200);
  expect(
    (
      await post("/api/reviews", owner, {
        projectId: project.id,
        rating: 5,
        text: "Excelente comunicación y un trabajo de prueba bien organizado.",
      })
    ).status(),
  ).toBe(201);
  const pending = (
    await (
      await request.get(
        `${api}/api/reviews?session=${demoSession}&moderation=1`,
        { headers: { Authorization: "Bearer " + admin } },
      )
    ).json()
  ).reviews;
  expect(pending).toHaveLength(1);
  expect(
    (
      await post("/api/reviews/moderate", admin, {
        id: pending[0].id,
        status: "published",
        note: "Interacción documentada y contenido válido.",
      })
    ).status(),
  ).toBe(200);
  const published = await (
    await request.get(
      `${api}/api/reviews?session=${demoSession}&professional=${project.professionalId}`,
    )
  ).json();
  expect(published.reviews).toHaveLength(1);
  expect(published.reviews[0].ownerId).toBeUndefined();
  expect(
    (
      await post("/api/support", owner, {
        subject: "Consulta del proyecto",
        message: "Necesito revisar el cierre de este proyecto de demostración.",
      })
    ).status(),
  ).toBe(201);
  const tickets = (
    await (
      await request.get(`${api}/api/support?session=${demoSession}`, {
        headers: { Authorization: "Bearer " + admin },
      })
    ).json()
  ).tickets;
  expect(tickets).toHaveLength(1);
  expect(
    (
      await post("/api/support/update", admin, {
        id: tickets[0].id,
        status: "resolved",
        response: "Hemos revisado el cierre solicitado.",
      })
    ).status(),
  ).toBe(200);
});
