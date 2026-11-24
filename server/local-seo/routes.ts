import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../database/database";
import type { AuthUser } from "../../src/auth/types";
import type { DemoState } from "../../src/domain/types";
import type {
  SeoProject,
  SeoRun,
  SeoAudit,
  SeoAuditCheck,
  SeoActivity,
} from "../../src/domain/local-seo";
import { auditChecks } from "./audit";
import {
  findSerpListings,
  listingSchema,
  scanSerpGrid,
  serpApiConfigured,
  SerpApiError,
} from "./serpapi";
import {
  managementAction,
  directorySchema,
  normalizeKeyword,
  safeUrl,
} from "./management";
import type {
  SeoKeyword,
  SeoContent,
  SeoListing,
  SeoDirectory,
} from "../../src/domain/local-seo";

const text = z.string().trim().max(300);
const webUrl = safeUrl;
const nap = z.object({
  name: text,
  address: z.string().trim().max(600),
  phone: text,
  website: webUrl,
});
const observedAt = z
  .string()
  .datetime({ offset: true })
  .refine(
    (value) => new Date(value).getTime() <= Date.now() + 300000,
    "La observación no puede estar en el futuro.",
  );
const id = z.string().uuid();
const serpRequests = new Set<string>();

export async function localSeoRoutes(
  path: string,
  method: string,
  query: URLSearchParams,
  body: unknown,
  db: Database,
  user: AuthUser | null,
  namespace: string,
  state: DemoState,
  send: (status: number, data: any) => void,
) {
  if (!path.startsWith("/api/local-seo/")) return false;
  if (!user || !["admin", "seo", "contractor"].includes(user.role)) {
    send(user ? 403 : 401, {
      error: "Acceso de contratista o administración requerido.",
    });
    return true;
  }
  const manages = user.role === "admin" || user.role === "seo";
  if (method !== "GET" && !manages) {
    send(403, { error: "Tu acceso SEO es de solo lectura." });
    return true;
  }
  const allowed = state.professionals.filter(
    (p) =>
      user.role === "admin" ||
      (user.role === "seo"
        ? user.seoAccess?.professionalIds.includes(p.id)
        : p.id === user.professionalId),
  );
  if (method === "GET" && path === "/api/local-seo/profiles") {
    send(
      200,
      allowed.map((p) => ({ id: p.id, name: p.name, city: p.city })),
    );
    return true;
  }
  const directories = (
    await db.sql.query<{ data: SeoDirectory }>(
      "SELECT data FROM local_seo_directory WHERE namespace=$1 ORDER BY data->>'name'",
      [namespace],
    )
  ).rows.map((r) => r.data);
  if (path === "/api/local-seo/directory" && method === "POST") {
    if (!(user.role === "admin" || user.seoAccess?.manageDirectories)) {
      send(403, { error: "No tienes permiso para administrar el catálogo." });
      return true;
    }
    try {
      const input = directorySchema.parse(body);
      if (input.id && !directories.some((d) => d.id === input.id)) {
        send(404, { error: "Directorio no disponible." });
        return true;
      }
      if (
        directories.some(
          (d) =>
            d.id !== input.id &&
            (normalizeKeyword(d.name) === normalizeKeyword(input.name) ||
              d.url.replace(/\/$/, "") === input.url.replace(/\/$/, "")),
        )
      ) {
        send(409, { error: "El directorio ya existe." });
        return true;
      }
      const record = { ...input, id: input.id || randomUUID() };
      await db.sql.transaction(async (tx) => {
        await tx.query(
          "INSERT INTO local_seo_directory(namespace,id,data) VALUES($1,$2,$3) ON CONFLICT(namespace,id) DO UPDATE SET data=excluded.data",
          [namespace, record.id, JSON.stringify(record)],
        );
        await tx.query(
          "INSERT INTO local_seo_activity(namespace,id,professional_id,data) VALUES($1,$2,$3,$4)",
          [
            namespace,
            randomUUID(),
            "__catalog__",
            JSON.stringify({
              id: randomUUID(),
              at: new Date().toISOString(),
              actorId: user.id,
              action: "directory",
              detail: record.name,
              before: directories.find((d) => d.id === record.id) || null,
              after: record,
            }),
          ],
        );
      });
      send(200, { ok: true });
    } catch (error) {
      send(400, {
        error: error instanceof Error ? error.message : "Datos inválidos",
      });
    }
    return true;
  }
  const professionalId = manages
    ? query.get("professional")
    : user.professionalId;
  if (
    user.role === "contractor" &&
    query.has("professional") &&
    query.get("professional") !== professionalId
  ) {
    send(403, { error: "Solo puedes gestionar tu propio negocio." });
    return true;
  }
  const person = allowed.find((person) => person.id === professionalId);
  if (!person) {
    send(404, { error: "Negocio no disponible." });
    return true;
  }
  const params = [namespace, person.id];
  const rows = async <T>(
    table: "local_seo_audit" | "local_seo_rank_run" | "local_seo_activity",
  ) =>
    (
      await db.sql.query<{ data: T }>(
        `SELECT data FROM ${table} WHERE namespace=$1 AND professional_id=$2 ORDER BY data->>'createdAt' DESC,data->>'at' DESC`,
        params,
      )
    ).rows.map((row) => row.data);
  const saved = await db.sql.query<{ data: SeoProject }>(
    "SELECT data FROM local_seo_project WHERE namespace=$1 AND id=$2",
    params,
  );
  const project: SeoProject = saved.rows[0]?.data || {
    professionalId: person.id,
    nap: {
      name: person.name,
      address: "",
      phone: "",
      website: person.socialLinks?.website || "",
    },
    serviceAreaBusiness: true,
    reviewUrl: "",
    tasks: [],
    citations: [],
    competitors: [],
    campaigns: [],
    plans: [],
  };
  if (
    method === "POST" &&
    ["/api/local-seo/serp-lookup", "/api/local-seo/serp-scan"].includes(path)
  ) {
    const input = z
      .object({
        campaignId: id,
        targetId: z.string().max(100),
        intent: z.enum(["business", "service"]).default("business"),
        listing: listingSchema.optional(),
      })
      .safeParse(body);
    if (!input.success) {
      send(400, { error: "Revisa los datos de la campaña y de la ficha." });
      return true;
    }
    const { campaignId, targetId, listing, intent } = input.data;
    const campaign = project.campaigns.find((entry) => entry.id === campaignId);
    const targetName =
      targetId === "business"
        ? person.name
        : project.competitors.find((entry) => entry.id === targetId)?.name;
    if (!campaign || !targetName || project.status === "inactive") {
      send(404, { error: "Campaña o negocio no disponible para medir." });
      return true;
    }
    const lock = JSON.stringify(params);
    if (serpRequests.has(lock)) {
      send(409, {
        error: "Ya hay una consulta de SerpApi en curso para este negocio.",
      });
      return true;
    }
    serpRequests.add(lock);
    try {
      if (path.endsWith("serp-lookup")) {
        const keyword =
          intent === "service"
            ? campaign.keyword
            : [targetName, person.city, person.region]
                .filter(Boolean)
                .join(", ");
        send(200, {
          listings: await findSerpListings(
            keyword,
            campaign.center,
            campaign.language,
          ),
        });
      } else if (!listing) {
        send(400, {
          error: "Selecciona la ficha de Google Maps antes de medir.",
        });
      } else {
        const now = new Date().toISOString();
        const { measured, listingId } = await scanSerpGrid(campaign, listing);
        const run: SeoRun = {
          id: randomUUID(),
          campaignId,
          targetId,
          observedAt: now,
          createdAt: now,
          points: measured,
          source: {
            kind: "serpapi",
            label:
              campaign.engine === "google_maps"
                ? "SerpApi · Google Maps"
                : "SerpApi · Google Local Pack",
            evidenceUrl: "",
            listingId,
            listingName: listing.title,
          },
        };
        const activity: SeoActivity = {
          id: randomUUID(),
          at: now,
          actorId: user.id,
          action: "measurement",
          detail: `${run.source.label}: ${measured.length}/${campaign.size ** 2} puntos medidos para ${campaign.keyword}`,
        };
        await db.sql.transaction(async (tx) => {
          if (targetId !== "business") {
            const current = await tx.query<{ data: SeoProject }>(
              "SELECT data FROM local_seo_project WHERE namespace=$1 AND id=$2",
              params,
            );
            if (
              !current.rows[0]?.data.competitors.some(
                (entry) => entry.id === targetId,
              )
            )
              throw new SerpApiError(
                "El competidor dejó de estar disponible durante la medición.",
                409,
              );
          }
          await tx.query(
            "INSERT INTO local_seo_rank_run(namespace,id,professional_id,data) VALUES($1,$2,$3,$4)",
            [namespace, run.id, person.id, JSON.stringify(run)],
          );
          await tx.query(
            "INSERT INTO local_seo_activity(namespace,id,professional_id,data) VALUES($1,$2,$3,$4)",
            [namespace, activity.id, person.id, JSON.stringify(activity)],
          );
        });
        send(200, { ok: true, run });
      }
    } catch (error) {
      if (!(error instanceof SerpApiError)) throw error;
      send(error.status, { error: error.message });
    } finally {
      serpRequests.delete(lock);
    }
    return true;
  }
  const before = structuredClone(project);
  const selectRecords = async <T>(table: string) =>
    (
      await db.sql.query<{ data: T }>(
        `SELECT data FROM ${table} WHERE namespace=$1 AND professional_id=$2 ORDER BY data->>'createdAt'`,
        params,
      )
    ).rows.map((row) => row.data);
  project.keywords = await selectRecords<SeoKeyword>("local_seo_keyword");
  project.contents = await selectRecords<SeoContent>("local_seo_content");
  project.listings = await selectRecords<SeoListing>("local_seo_listing");
  // Retain the old editable reference as evidence; the live NAP comes only from res_partner.
  if (saved.rows.length && !project.createdAt)
    project.legacyNap ||= structuredClone(project.nap);
  project.nap = {
    name: person.name,
    address: person.address || "",
    phone: person.phone || "",
    website: person.socialLinks?.website || "",
  };
  project.serviceAreaBusiness = person.serviceAreaBusiness ?? true;
  project.exportAllowed ??= false;
  const existingBefore = {
    ...before,
    keywords: structuredClone(project.keywords),
    contents: structuredClone(project.contents),
    listings: structuredClone(project.listings),
  };
  // Adopt legacy campaign keywords without dropping campaigns, even if the historical set exceeds 25.
  for (const campaign of project.campaigns) {
    const normalized = normalizeKeyword(campaign.keyword);
    let keyword = project.keywords.find((k) => k.normalized === normalized);
    if (!keyword) {
      keyword = {
        id: campaign.id,
        keyword: campaign.keyword,
        normalized,
        active: project.keywords.filter((k) => k.active).length < 25,
        createdAt: campaign.createdAt,
        updatedAt: campaign.createdAt,
        createdBy: "migration",
      };
      project.keywords.push(keyword);
    }
    campaign.keywordId ||= keyword.id;
  }
  const reviews = (
    await db.sql.query<{ data: any }>(
      "SELECT data FROM rating_rating WHERE namespace=$1 AND data->>'professionalId'=$2 AND data->>'status'='published' ORDER BY data->>'createdAt' DESC",
      params,
    )
  ).rows.map((row) => row.data);
  if (method === "GET" && path === "/api/local-seo/workspace") {
    const events = (
      await db.sql.query<{ kind: string; count: string }>(
        "SELECT kind,count(*)::text AS count FROM local_seo_event WHERE namespace=$1 AND professional_id=$2 GROUP BY kind",
        params,
      )
    ).rows;
    const count = (kind: string) =>
      Number(events.find((event) => event.kind === kind)?.count || 0);
    send(200, {
      project: manages
        ? project
        : {
            ...project,
            legacyNap: undefined,
            contents: project.contents.filter((c) => c.status === "published"),
            plans: [],
            listings: project.listings.map((l) => ({
              ...l,
              notes: "",
              evidence: "",
              updatedBy: "",
            })),
            competitors: project.competitors.map((c) => ({ ...c, notes: "" })),
            tasks: project.tasks.map((t) => ({ ...t, evidence: "" })),
          },
      permissions: {
        manage: manages,
        master: user.role === "admin",
        directories:
          user.role === "admin" || !!user.seoAccess?.manageDirectories,
        export:
          user.role === "admin" ||
          (user.role === "seo"
            ? !!user.seoAccess?.exportReports
            : project.exportAllowed),
      },
      directories,
      business: {
        id: person.id,
        name: person.name,
        city: person.city,
        region: person.region,
        country: person.country,
        postalCode: person.postalCode,
        location: person.location,
        coverage: person.coverage,
      },
      audits: await rows<SeoAudit>("local_seo_audit"),
      runs: await rows<SeoRun>("local_seo_rank_run"),
      activity: manages
        ? (await rows<SeoActivity>("local_seo_activity")).slice(0, 200)
        : [],
      reputation: {
        count: reviews.length,
        average: reviews.length
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviews.length
          : null,
        unanswered: reviews.filter((review) => !review.reply).length,
        reviews: reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          text: review.text,
          reply: review.reply,
          createdAt: review.createdAt,
        })),
      },
      metrics: {
        profileViews: count("profile_view"),
        websiteClicks: count("website_click"),
        quoteRequests: state.requests.filter(
          (request) => request.professionalId === person.id,
        ).length,
      },
      providers: {
        automaticRankings: serpApiConfigured(),
        mode: serpApiConfigured() ? "serpapi" : "evidence_import",
        message: serpApiConfigured()
          ? "SerpApi disponible para medir Google Maps y Local Pack desde la cuadrícula."
          : "Registra observaciones manuales o importa puntos con fuente y fecha.",
      },
    });
    return true;
  }
  if (method !== "POST") {
    send(404, { error: "Operación no disponible." });
    return true;
  }
  try {
    let action = "",
      detail = "";
    let audit: SeoAudit | undefined, run: SeoRun | undefined;
    const now = new Date().toISOString();
    const managed = managementAction(
      project,
      path,
      body,
      user,
      person,
      directories,
    );
    if (managed?.preview && !managed.detail) {
      send(200, managed);
      return true;
    }
    if (managed) {
      action = path.split("/").pop()!;
      detail = managed.detail!;
    } else if (path === "/api/local-seo/profile") {
      send(409, {
        error:
          "El NAP se administra en la ficha maestra. Usa configuración del perfil SEO para sus opciones.",
      });
      return true;
    } else if (path === "/api/local-seo/audit") {
      const checks = auditChecks(project, person, reviews.length);
      const available = checks.filter(
        (check) => check.status !== "unavailable",
      );
      audit = {
        id: randomUUID(),
        createdAt: now,
        scope: "homeconnect",
        score: Math.round(
          (100 * available.filter((check) => check.status === "pass").length) /
            available.length,
        ),
        checks,
        basis: {
          nap: { ...project.nap },
          description: person.bio.es || person.bio.en,
          photoCount: person.portfolio.length,
          reviewCount: reviews.length,
          citationCount: project.citations.length,
          citationObservations: project.citations,
          profileName: person.name,
          descriptions: person.bio,
          publication: person.publication,
          coverage: person.coverage,
          serviceIds: person.serviceIds,
          serviceAreaBusiness: project.serviceAreaBusiness,
        },
      };
      for (const check of available) {
        const task = project.tasks.find((task) => task.id === check.id);
        if (check.status === "fail" && !task)
          project.tasks.push({
            id: check.id,
            title: check.title,
            priority: check.priority,
            status: "todo",
            evidence: "",
            updatedAt: now,
          });
        if (task && check.status === "pass") {
          task.status = "done";
          task.updatedAt = now;
        }
        if (task && check.status === "fail" && task.status === "done") {
          task.status = "todo";
          task.updatedAt = now;
        }
      }
      action = "audit";
      detail = `Auditoría interna ${audit.score}/100; ${checks.filter((check) => check.status === "unavailable").length} comprobaciones externas sin datos`;
    } else if (path === "/api/local-seo/task") {
      const input = z
        .object({
          id: z.string().max(80),
          status: z.enum(["todo", "doing", "done"]),
          evidence: z.string().trim().max(2000),
        })
        .parse(body);
      const task = project.tasks.find((task) => task.id === input.id);
      if (!task) {
        send(404, { error: "Tarea no disponible." });
        return true;
      }
      if (input.status === "done" && !input.evidence) {
        send(400, { error: "Añade evidencia de la acción realizada." });
        return true;
      }
      Object.assign(task, input, { updatedAt: now });
      action = "task";
      detail = `${task.title}: ${task.status}`;
    } else if (path === "/api/local-seo/citation") {
      const input = z
        .object({
          id: id.optional(),
          directory: text.min(2),
          url: webUrl.refine(Boolean, "Indica la URL de la ficha."),
          nap,
          observedAt,
          status: z.enum(["published", "submitted", "missing"]),
        })
        .parse(body);
      const record = { ...input, id: input.id || randomUUID() };
      const existing = project.citations.findIndex(
        (citation) => citation.id === record.id,
      );
      if (input.id && existing < 0) {
        send(404, { error: "Citación no disponible." });
        return true;
      }
      if (existing >= 0) project.citations[existing] = record;
      else project.citations.push(record);
      action = "citation";
      detail = `${input.directory}: observación registrada (${input.status})`;
    } else if (path === "/api/local-seo/competitor") {
      const input = z
        .object({
          name: text.min(2),
          website: webUrl,
          notes: z.string().trim().max(3000),
          observedAt,
        })
        .parse(body);
      project.competitors.push({ ...input, id: randomUUID() });
      action = "competitor";
      detail = `Competidor documentado: ${input.name}`;
    } else if (path === "/api/local-seo/campaign") {
      if (project.status === "inactive") {
        send(409, {
          error: "Activa el perfil SEO antes de crear un seguimiento.",
        });
        return true;
      }
      const input = z
        .object({
          keyword: text.min(2),
          keywordId: id,
          country: z.string().length(2).default("US"),
          engine: z.enum(["google_maps", "google_local"]),
          language: z.enum(["es", "en"]),
          center: z.object({
            latitude: z.number().min(-80).max(80),
            longitude: z.number().min(-180).max(180),
          }),
          size: z.union([z.literal(3), z.literal(5), z.literal(7)]),
          spacingKm: z.number().min(0.1).max(20),
          depth: z.number().int().min(3).max(100),
        })
        .parse(body);
      const keyword = project.keywords.find(
        (k) => k.id === input.keywordId && k.active,
      );
      if (!keyword || normalizeKeyword(input.keyword) !== keyword.normalized) {
        send(400, { error: "Selecciona una keyword activa de este perfil." });
        return true;
      }
      project.campaigns.push({ ...input, id: randomUUID(), createdAt: now });
      action = "campaign";
      detail = `Cuadrícula planificada: ${input.keyword}, ${input.size}×${input.size}; sin mediciones automáticas`;
    } else if (path === "/api/local-seo/run") {
      const input = z
        .object({
          campaignId: id,
          targetId: z.string().max(100).default("business"),
          observedAt,
          source: z.object({
            kind: z.enum(["manual", "brightlocal_export", "other_export"]),
            label: text.min(2),
            evidenceUrl: webUrl,
          }),
          points: z
            .array(
              z
                .object({
                  row: z.number().int().min(0),
                  column: z.number().int().min(0),
                  rank: z.number().int().min(1).max(100).nullable(),
                })
                .strict(),
            )
            .min(1)
            .max(49),
        })
        .parse(body);
      const campaign = project.campaigns.find(
        (campaign) => campaign.id === input.campaignId,
      );
      if (
        input.targetId !== "business" &&
        !project.competitors.some(
          (competitor) => competitor.id === input.targetId,
        )
      ) {
        send(404, { error: "Observation target unavailable" });
        return true;
      }
      if (!campaign) {
        send(404, { error: "Seguimiento no disponible." });
        return true;
      }
      if (
        input.points.some(
          (point) =>
            point.row >= campaign.size ||
            point.column >= campaign.size ||
            (point.rank !== null && point.rank > campaign.depth),
        ) ||
        new Set(input.points.map((point) => `${point.row}:${point.column}`))
          .size !== input.points.length
      ) {
        send(400, {
          error:
            "Puntos repetidos, fuera de la cuadrícula o posiciones mayores que la profundidad de búsqueda.",
        });
        return true;
      }
      run = { ...input, id: randomUUID(), createdAt: now };
      action = "measurement";
      detail = `${campaign.keyword}: ${input.points.length} puntos registrados, fuente ${input.source.label}, fecha ${input.observedAt}`;
    } else if (path === "/api/local-seo/plan") {
      const input = z
        .object({
          id: id.optional(),
          title: text.min(2),
          content: z.string().trim().min(1).max(5000),
          scheduledAt: z.string().datetime({ offset: true }),
          status: z.enum(["draft", "planned", "completed"]),
        })
        .parse(body);
      const record = { ...input, id: input.id || randomUUID() },
        index = project.plans.findIndex((plan) => plan.id === record.id);
      if (input.id && index < 0) {
        send(404, { error: "Contenido no disponible." });
        return true;
      }
      if (index >= 0) project.plans[index] = record;
      else project.plans.push(record);
      action = "content";
      detail = `${input.title}: ${input.status}; no se publicó en una plataforma externa`;
    } else if (path === "/api/local-seo/remove") {
      const input = z
        .object({ kind: z.enum(["citations", "competitors", "plans"]), id })
        .parse(body);
      if (
        input.kind === "competitors" &&
        serpRequests.has(JSON.stringify(params))
      ) {
        send(409, {
          error:
            "Espera a que termine la consulta de SerpApi antes de eliminar competidores.",
        });
        return true;
      }
      if (
        input.kind === "competitors" &&
        (await rows<SeoRun>("local_seo_rank_run")).some(
          (run) => run.targetId === input.id,
        )
      ) {
        send(409, {
          error:
            "El competidor tiene mediciones guardadas. Se conserva para mantener la trazabilidad del historial.",
        });
        return true;
      }
      if (!project[input.kind].some((record) => record.id === input.id)) {
        send(404, { error: "Registro no disponible." });
        return true;
      }
      project[input.kind] = project[input.kind].filter(
        (record) => record.id !== input.id,
      ) as any;
      action = "remove";
      detail = `Registro eliminado: ${input.kind}`;
    } else {
      send(404, { error: "Operación no disponible." });
      return true;
    }
    if (
      project.citations.length > 200 ||
      project.keywords!.length > 500 ||
      project.contents!.length > 500 ||
      project.listings!.length > 200 ||
      project.competitors.length > 100 ||
      project.campaigns.length > 50 ||
      project.plans.length > 200
    ) {
      send(400, {
        error: "Se alcanzó el límite de registros de este negocio.",
      });
      return true;
    }
    await db.sql.transaction(async (tx) => {
      project.createdAt ||= now;
      project.createdBy ||= user.id;
      project.updatedAt = now;
      project.updatedBy = user.id;
      project.status ||= "configured";
      if (managed?.master) {
        await tx.query(
          "UPDATE res_partner SET data=data || $3::jsonb WHERE namespace=$1 AND id=$2 AND kind='contractor'",
          [
            namespace,
            person.id,
            JSON.stringify({
              name: managed.master.name,
              address: managed.master.address,
              phone: managed.master.phone,
              postalCode: managed.master.postalCode,
              serviceAreaBusiness: managed.master.serviceAreaBusiness,
              socialLinks: managed.master.socialLinks,
            }),
          ],
        );
        project.nap = {
          name: managed.master.name,
          address: managed.master.address || "",
          phone: managed.master.phone || "",
          website: managed.master.socialLinks?.website || "",
        };
        project.serviceAreaBusiness =
          managed.master.serviceAreaBusiness ?? true;
      }
      const { keywords, contents, listings, ...storedProject } = project;
      await tx.query(
        "INSERT INTO local_seo_project(namespace,id,data) VALUES($1,$2,$3) ON CONFLICT(namespace,id) DO UPDATE SET data=excluded.data",
        [namespace, person.id, JSON.stringify(storedProject)],
      );
      for (const [table, records] of [
        ["local_seo_keyword", keywords],
        ["local_seo_content", contents],
        ["local_seo_listing", listings],
      ] as const) {
        await tx.query(
          `DELETE FROM ${table} WHERE namespace=$1 AND professional_id=$2`,
          params,
        );
        for (const record of records!) {
          if (table === "local_seo_keyword") {
            const keyword = record as SeoKeyword;
            await tx.query(
              `INSERT INTO ${table}(namespace,id,professional_id,normalized,active,data) VALUES($1,$2,$3,$4,$5,$6)`,
              [
                namespace,
                record.id,
                person.id,
                keyword.normalized,
                keyword.active,
                JSON.stringify(record),
              ],
            );
          } else if (table === "local_seo_listing")
            await tx.query(
              `INSERT INTO ${table}(namespace,id,professional_id,directory_id,data) VALUES($1,$2,$3,$4,$5)`,
              [
                namespace,
                record.id,
                person.id,
                (record as SeoListing).directoryId,
                JSON.stringify(record),
              ],
            );
          else
            await tx.query(
              `INSERT INTO ${table}(namespace,id,professional_id,data) VALUES($1,$2,$3,$4)`,
              [namespace, record.id, person.id, JSON.stringify(record)],
            );
        }
      }
      if (audit)
        await tx.query(
          "INSERT INTO local_seo_audit(namespace,id,professional_id,data) VALUES($1,$2,$3,$4)",
          [namespace, audit.id, person.id, JSON.stringify(audit)],
        );
      if (run)
        await tx.query(
          "INSERT INTO local_seo_rank_run(namespace,id,professional_id,data) VALUES($1,$2,$3,$4)",
          [namespace, run.id, person.id, JSON.stringify(run)],
        );
      const activity: SeoActivity = {
        id: randomUUID(),
        at: now,
        actorId: user.id,
        action,
        detail,
        before: managed?.master
          ? {
              name: person.name,
              address: person.address,
              phone: person.phone,
              postalCode: person.postalCode,
              socialLinks: person.socialLinks,
            }
          : existingBefore,
        after: managed?.master ? project.nap : structuredClone(project),
      };
      await tx.query(
        "INSERT INTO local_seo_activity(namespace,id,professional_id,data) VALUES($1,$2,$3,$4)",
        [namespace, activity.id, person.id, JSON.stringify(activity)],
      );
    });
    if (managed?.master) Object.assign(person, managed.master);
    send(200, { ok: true, audit, run });
  } catch (error) {
    if (error instanceof z.ZodError)
      send(400, {
        error: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      });
    else if (error instanceof Error && !(error as any).code)
      send(400, { error: error.message });
    else throw error;
  }
  return true;
}
