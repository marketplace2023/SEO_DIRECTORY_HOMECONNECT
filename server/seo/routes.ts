import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import type { Database } from "../database/database";
import type { DemoState } from "../../src/domain/types";
import type { AuthUser } from "../../src/auth/types";
import { categories } from "../../src/data/catalog";
import { renderLocal, sitemap, georgiaCities, type SeoEntry } from "./local";
export async function readSetting<T>(
  db: Database,
  namespace: string,
  key: string,
  fallback: T,
): Promise<T> {
  return (
    (
      await db.sql.query<{ data: T }>(
        "SELECT data FROM ir_config_parameter WHERE namespace=$1 AND id=$2",
        [namespace, key],
      )
    ).rows[0]?.data || fallback
  );
}
export async function writeSetting(
  db: Database,
  namespace: string,
  key: string,
  value: unknown,
) {
  await db.sql.query(
    "INSERT INTO ir_config_parameter(namespace,id,data) VALUES($1,$2,$3) ON CONFLICT(namespace,id) DO UPDATE SET data=excluded.data",
    [namespace, key, JSON.stringify(value)],
  );
}
export async function seoRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  db: Database,
  state: DemoState,
  user: AuthUser | null,
  namespace: string,
  send: (code: number, data: any) => void,
  body?: any,
) {
  const path = url.pathname,
    origin = (
      process.env.PUBLIC_SITE_URL ||
      process.env.SERVINEXO_WEB_ORIGIN ||
      "http://127.0.0.1:5175"
    ).replace(/\/$/, "");
  const enabled =
    process.env.SEO_INDEXING_ENABLED === "true" &&
    origin.startsWith("https://");
  if (
    req.method === "GET" &&
    (/^\/(georgia(?:\/|$)|contractors\/)/.test(path) ||
      path === "/sitemap.xml" ||
      path === "/robots.txt")
  ) {
    const entries = await readSetting<SeoEntry[]>(
        db,
        namespace,
        "seo:pages",
        [],
      ),
      contacts = await readSetting<Record<string, any>>(
        db,
        namespace,
        "seo:contacts",
        {},
      );
    if (path === "/robots.txt") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(
        `User-agent: *\nDisallow: /api/\nDisallow: /admin/\nDisallow: /contractor/\n${enabled ? "" : "Disallow: /\n"}Sitemap: ${origin}/sitemap.xml\n`,
      );
      return true;
    }
    if (path === "/sitemap.xml") {
      res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
      res.end(sitemap(state, entries, origin, enabled, contacts));
      return true;
    }
    const page = renderLocal(path, state, entries, origin, enabled, contacts);
    if (page.redirect) {
      res.writeHead(308, { Location: page.redirect });
      res.end();
      return true;
    }
    res.writeHead(page.status, {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": page.indexable ? "index,follow" : "noindex,follow",
      "Content-Security-Policy":
        "default-src 'self'; style-src 'unsafe-inline'; script-src 'none'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    });
    res.end(page.html);
    return true;
  }
  if (!path.startsWith("/api/seo/")) return false;
  if (user?.role !== "admin") {
    send(403, { error: "Acceso de administración requerido." });
    return true;
  }
  if (req.method === "GET" && path === "/api/seo/config") {
    send(200, {
      origin,
      indexingEnabled: enabled,
      requiresDomain: !process.env.PUBLIC_SITE_URL,
      pages: await readSetting(db, namespace, "seo:pages", []),
      contacts: await readSetting(db, namespace, "seo:contacts", {}),
      cities: georgiaCities,
      categories: categories.map((c) => ({ id: c.id, name: c.name.en })),
    });
    return true;
  }
  if (req.method === "POST" && path === "/api/seo/page") {
    const entry = z
      .object({
        id: z.string().max(100),
        city: z.string(),
        categoryId: z.string(),
        title: z.string().trim().min(15).max(120),
        description: z.string().trim().min(40).max(320),
        content: z.string().trim().min(80).max(6000),
        published: z.boolean(),
        indexable: z.boolean(),
      })
      .parse(body);
    if (
      !georgiaCities.some((city) => city.slug === entry.city) ||
      (entry.categoryId && !categories.some((c) => c.id === entry.categoryId))
    ) {
      send(400, { error: "Ciudad o especialidad no válida." });
      return true;
    }
    entry.id = `${entry.city}:${entry.categoryId}`;
    const pages = await readSetting<SeoEntry[]>(db, namespace, "seo:pages", []);
    await writeSetting(db, namespace, "seo:pages", [
      ...pages.filter((e) => e.id !== entry.id),
      entry,
    ]);
    send(200, { ok: true });
    return true;
  }
  if (req.method === "POST" && path === "/api/seo/contact") {
    const input = z
      .object({
        professionalId: z.string(),
        telephone: z.string().max(50),
        address: z.string().max(250),
        publish: z.boolean(),
      })
      .parse(body);
    if (
      !state.professionals.some(
        (p) => p.id === input.professionalId && p.publication === "published",
      )
    ) {
      send(400, { error: "La ficha debe estar publicada." });
      return true;
    }
    const contacts = await readSetting<Record<string, any>>(
      db,
      namespace,
      "seo:contacts",
      {},
    );
    contacts[input.professionalId] = input;
    await writeSetting(db, namespace, "seo:contacts", contacts);
    send(200, { ok: true });
    return true;
  }
  send(404, { error: "Ruta SEO no disponible." });
  return true;
}
