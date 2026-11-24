import { test, expect } from "@playwright/test";
import { Database } from "../server/database/database";
import { catalogRoutes, loadStoredCatalog } from "../server/catalog";
import {
  currentCatalog,
  installCatalog,
  serviceInCategory,
  type Catalog,
} from "../src/data/catalog";
import type { AuthUser } from "../src/auth/types";

test("el catálogo persiste altas, textos y relaciones sin cambiar los identificadores principales", async () => {
  const db = new Database();
  const initial = currentCatalog();
  const admin: AuthUser = {
    id: "catalog-admin",
    role: "admin",
    name: "Admin",
    email: "admin@example.test",
    demo: true,
  };
  const text = { es: "Trabajo de referencia", en: "Reference work" };
  async function request(method: "GET" | "POST", body?: object, user = admin) {
    let status = 0;
    let result: unknown;
    await catalogRoutes(method, body, db, user, (code, data) => {
      status = code;
      result = data;
    });
    return { status, data: result as Catalog };
  }
  const service = {
    kind: "service",
    create: true,
    id: "fixture-sensor",
    name: text,
    subcategoryId: "fixture-automation",
    additionalSubcategoryIds: ["electrical-installation"],
    mode: "installation",
    scope: text,
    requirements: text,
    completion: text,
    separate: text,
  };
  try {
    await db.initialize();
    await loadStoredCatalog(db);
    expect(
      (await request("POST", service, { ...admin, role: "seo" })).status,
    ).toBe(403);
    expect((await request("POST", service)).status).toBe(400);
    expect(
      (
        await request("POST", {
          kind: "category",
          create: true,
          id: "fixture-catalog",
          name: text,
          description: text,
          concept: text,
          when: text,
          excluded: text,
          image: "/CATEGORY_PICS/compatible/electrical.jpg",
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await request("POST", {
          kind: "subcategory",
          create: true,
          id: "fixture-automation",
          categoryId: "fixture-catalog",
          name: text,
          concept: text,
          when: text,
          image: "/CATEGORY_PICS/compatible/electrical.jpg",
        })
      ).status,
    ).toBe(201);
    expect((await request("POST", service)).status).toBe(201);
    expect((await request("POST", service)).status).toBe(409);
    expect(
      (
        await request("POST", {
          ...service,
          create: false,
          subcategoryId: "electrical-care",
        })
      ).status,
    ).toBe(400);
    const newScope = { es: "Alcance actualizado", en: "Updated service scope" };
    expect(
      (await request("POST", { ...service, create: false, scope: newScope }))
        .status,
    ).toBe(200);
    installCatalog(initial);
    await db.initialize();
    await loadStoredCatalog(db);
    const observed = (await request("GET")).data.services.find(
      (entry) => entry.id === service.id,
    )!;
    expect(observed.scope).toEqual(newScope);
    expect(observed.categoryId).toBe("fixture-catalog");
    expect(serviceInCategory(observed, "electrical")).toBe(true);
  } finally {
    installCatalog(initial);
    await db.close();
  }
});
