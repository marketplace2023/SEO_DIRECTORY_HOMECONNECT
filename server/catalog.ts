import { z } from "zod";
import {
  builtInCatalog,
  currentCatalog,
  installCatalog,
} from "../src/data/catalog";
import type { AuthUser } from "../src/auth/types";
import type { Database } from "./database/database";
import { tables } from "./database/tables";

const identifier = z
  .string()
  .trim()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const name = z.object({
  es: z.string().trim().min(2).max(140),
  en: z.string().trim().min(2).max(140),
});
const paragraph = z.object({
  es: z.string().trim().min(5).max(3000),
  en: z.string().trim().min(5).max(3000),
});
const image = z
  .string()
  .trim()
  .max(1500)
  .refine((value) => {
    if (
      /^\/(CATEGORY_PICS|category-art)\/[a-z0-9/_-]+\.(jpg|jpeg|png|webp|svg)$/i.test(
        value,
      )
    )
      return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Usa una imagen del catálogo o una URL HTTPS.");
const common = { id: identifier, name, create: z.boolean() };
const edits = z.discriminatedUnion("kind", [
  z.object({
    ...common,
    kind: z.literal("category"),
    description: paragraph,
    concept: paragraph,
    when: paragraph,
    excluded: paragraph,
    image,
  }),
  z.object({
    ...common,
    kind: z.literal("subcategory"),
    categoryId: identifier,
    concept: paragraph,
    when: paragraph,
    image,
  }),
  z.object({
    ...common,
    kind: z.literal("service"),
    subcategoryId: identifier,
    additionalSubcategoryIds: z.array(identifier).max(30),
    mode: z.enum([
      "installation",
      "repair",
      "maintenance",
      "assessment",
      "design",
      "cleaning",
    ]),
    scope: paragraph,
    requirements: paragraph,
    completion: paragraph,
    separate: paragraph,
  }),
]);

async function overlay<T extends { id: string }>(
  db: Database,
  table: string,
  kind: string,
  base: T[],
) {
  const records = new Map(base.map((record) => [record.id, record]));
  const { rows } = await db.sql.query<{ data: T }>(
    `SELECT data FROM ${table} WHERE namespace='__catalog__' AND kind=$1 ORDER BY position,id`,
    [`${kind}_edit`],
  );
  for (const { data } of rows) records.set(data.id, data);
  return [...records.values()];
}

export async function loadStoredCatalog(db: Database) {
  const [categories, subcategories, services] = await Promise.all([
    overlay(db, tables.categories, "category", builtInCatalog.categories),
    overlay(db, tables.categories, "subcategory", builtInCatalog.subcategories),
    overlay(db, tables.services, "service", builtInCatalog.services),
  ]);
  installCatalog({ categories, subcategories, services });
}

export async function catalogRoutes(
  method: "GET" | "POST",
  body: unknown,
  db: Database,
  user: AuthUser | null,
  send: (status: number, data: unknown) => void,
) {
  const catalog = currentCatalog();
  if (method === "GET") {
    send(200, catalog);
    return;
  }
  if (user?.role !== "admin") {
    send(user ? 403 : 401, {
      error: "Se requiere acceso de administración para editar el catálogo.",
    });
    return;
  }
  const parsed = edits.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    send(400, {
      error: `Revisa ${issue.path.join(".") || "los datos"} del catálogo. ${issue.message}`,
    });
    return;
  }
  const { kind, create, ...record } = parsed.data;
  const collection =
    kind === "category"
      ? catalog.categories
      : kind === "subcategory"
        ? catalog.subcategories
        : catalog.services;
  const existing = collection.find((item) => item.id === record.id);
  if (create && existing) {
    send(409, { error: "Ese identificador ya existe." });
    return;
  }
  if (!create && !existing) {
    send(404, { error: "Registro del catálogo no encontrado." });
    return;
  }
  let data:
    | (typeof catalog.categories)[number]
    | (typeof catalog.subcategories)[number]
    | (typeof catalog.services)[number];
  if ("description" in record) {
    const previous = catalog.categories.find((item) => item.id === record.id);
    data = {
      ...previous,
      ...record,
      reference:
        previous?.reference ??
        Math.max(0, ...catalog.categories.map(({ reference }) => reference)) +
          1,
      illustration: previous?.illustration ?? record.image,
      included: previous?.included ?? [],
    };
  } else if ("categoryId" in record) {
    const previous = catalog.subcategories.find(
      (item) => item.id === record.id,
    );
    if (
      (previous && previous.categoryId !== record.categoryId) ||
      !catalog.categories.some(({ id }) => id === record.categoryId)
    ) {
      send(400, {
        error: "Selecciona una categoría válida para la subcategoría.",
      });
      return;
    }
    data = record;
  } else {
    const previous = catalog.services.find((item) => item.id === record.id);
    const area = catalog.subcategories.find(
      (item) => item.id === record.subcategoryId,
    );
    if (!area || (previous && previous.subcategoryId !== area.id)) {
      send(400, { error: "Selecciona una subcategoría principal válida." });
      return;
    }
    const extra = [...new Set(record.additionalSubcategoryIds)].filter(
      (id) => id !== area.id,
    );
    if (
      extra.some((id) => !catalog.subcategories.some((item) => item.id === id))
    ) {
      send(400, { error: "Hay subcategorías relacionadas que no existen." });
      return;
    }
    data = {
      ...record,
      categoryId: area.categoryId,
      additionalSubcategoryIds: extra,
    };
  }
  const table = kind === "service" ? tables.services : tables.categories;
  const position = existing
    ? collection.findIndex((item) => item.id === record.id)
    : collection.length;
  await db.sql.query(
    `INSERT INTO ${table}(namespace,id,position,kind,data) VALUES('__catalog__',$1,$2,$3,$4) ON CONFLICT(namespace,kind,id) DO UPDATE SET data=excluded.data`,
    [record.id, position, `${kind}_edit`, JSON.stringify(data)],
  );
  await loadStoredCatalog(db);
  send(create ? 201 : 200, currentCatalog());
}
