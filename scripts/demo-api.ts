import { Attachments } from "../server/files/attachments";
import "../server/config/env";
import { pilotRoutes } from "../server/pilot/routes";
import {
  createServer,
  type ServerResponse,
  type IncomingMessage,
} from "node:http";
import { resolve, dirname } from "node:path";
import { z } from "zod";
import { createSeed } from "../src/data/seed";
import { reducer } from "../src/domain/store";
import { stateSchema, hasValidRelations } from "../src/domain/schema";
import type { DemoState } from "../src/domain/types";
import { Database } from "../server/database/database";
import { Accounts } from "../server/auth/accounts";
import { categories, services } from "../src/data/catalog";
import { cityLocation } from "../src/domain/geography";
import { randomUUID } from "node:crypto";
import { socialLinksSchema } from "../src/domain/social-links";
import {
  guestContactSchema,
  quoteInputSchema,
} from "../src/domain/quote-input";
import { visibleState } from "../server/security/visibility";
import { RateLimit } from "../server/security/rate-limit";
import type { AuthUser } from "../src/auth/types";
import {
  GoogleBusiness,
  googleConfiguration,
} from "../server/google/business-profile";
import { seoRoutes } from "../server/seo/routes";
import { localSeoRoutes } from "../server/local-seo/routes";

const port = Number(process.env.SERVINEXO_API_PORT || 5190);
const file = resolve(
  process.env.SERVINEXO_STATE_FILE || ".local/demo-state.json",
);
const database = new Database(
  resolve(process.env.DATABASE_DIR || file.replace(/\.json$/, ".pgdata")),
);
await database.initialize();
await database.importLegacy(file);
const accounts = new Accounts(database, await database.loadAccounts());
const origins = new Set([
  process.env.SERVINEXO_WEB_ORIGIN || "http://127.0.0.1:5175",
  process.env.SERVINEXO_CONTRACTOR_ORIGIN || "http://127.0.0.1:5180",
  process.env.SERVINEXO_ADMIN_ORIGIN || "http://127.0.0.1:5181",
]);
const states = await database.loadStates();
async function seoState(namespace: string) {
  if (!states.has(namespace)) {
    const state = createSeed();
    states.set(namespace, state);
    await database.saveState(namespace, state);
  }
  return states.get(namespace)!;
}
const attachments = new Attachments(
  database,
  resolve(process.env.UPLOAD_DIR || resolve(dirname(file), "uploads")),
);
const google = new GoogleBusiness(database);
await google.purgeCachedProfiles();
const googleCacheCleanup = setInterval(() => {
  void google.purgeCachedProfiles().catch(() => {});
}, 3600000);
googleCacheCleanup.unref();
const streams = new Map<
  string,
  Set<{ res: ServerResponse; token: string; professional?: string }>
>();
const streamTickets = new Map<
  string,
  { token: string; session: string; expires: number; professional?: string }
>();
const rateLimit = new RateLimit();
function viewUser(user: AuthUser | null, professional?: string) {
  if (
    user?.demo &&
    user.role === "contractor" &&
    professional &&
    !professional.startsWith("pro-") &&
    process.env.NODE_ENV !== "production"
  )
    return { ...user, professionalId: professional };
  return user;
}
const text = z.string().max(5000);
const value = z
  .object({
    type: z.enum([
      "request",
      "proposal",
      "accept",
      "cancel",
      "milestone",
      "favorite",
      "message",
      "credential",
      "review",
      "publication",
      "profile",
      "material",
      "member",
      "reset",
    ]),
    actor: z.enum([
      "visitor",
      "owner",
      "contractor",
      "supplier",
      "business",
      "ally",
      "admin",
    ]),
    actingProfessional: text,
    id: text,
    at: z.string().datetime(),
  })
  .passthrough();
const fields: Record<string, z.ZodType> = {
  request: z.object({
    value: z.object({
      title: text,
      categoryId: text,
      serviceId: text,
      professionalId: text.optional(),
      location: text,
      description: text,
      budget: z.number().nonnegative().nullable(),
      date: text,
    }),
  }),
  proposal: z.object({
    value: z.object({
      requestId: text,
      amount: z.number().positive(),
      days: z.number().int().positive(),
      description: text,
    }),
  }),
  accept: z.object({ proposalId: text }),
  cancel: z.object({ requestId: text }),
  milestone: z.object({ projectId: text, milestoneId: text }),
  favorite: z.object({ professionalId: text }),
  message: z.object({ professionalId: text, text }),
  credential: z.object({ credentialId: text, reference: text }),
  review: z.object({
    professionalId: text,
    credentialId: text,
    status: z.enum(["verified", "rejected"]),
    note: text,
  }),
  publication: z.object({ professionalId: text }),
  profile: z.object({
    socialLinks: socialLinksSchema.optional(),
    name: text,
    city: text,
    coverage: z.array(text),
    bio: text,
    language: z.enum(["es", "en"]),
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        precision: z.enum(["city", "public"]),
      })
      .nullable()
      .optional(),
  }),
  material: z.object({
    value: z.object({
      name: text,
      unit: text,
      stock: z.number().int().nonnegative(),
      price: z.number().nonnegative(),
    }),
    materialId: text.optional(),
  }),
  member: z.object({ value: z.object({ name: text, specialty: text }) }),
  reset: z.object({}),
};
async function persist(session: string) {
  const state = states.get(session);
  if (state) await database.saveState(session, state);
}
function publish(session: string, state: DemoState) {
  for (const stream of streams.get(session) || [])
    stream.res.write(
      `data: ${JSON.stringify(visibleState(state, viewUser(accounts.user(session, stream.token), stream.professional)))}\n\n`,
    );
}
let mutationTail = Promise.resolve();
async function handle(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin && !origins.has(origin)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const session = url.searchParams.get("session") || "default";
  const token = req.headers.authorization?.replace(/^Bearer /, "") || "";
  const user = accounts.user(session, token);
  const selectedUser = viewUser(
    user,
    url.searchParams.get("professional") || undefined,
  );
  const send = (status: number, data: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (
    !/^[a-zA-Z0-9_-]{1,80}$/.test(session) ||
    session.startsWith("__") ||
    (process.env.NODE_ENV === "production" && session !== "default")
  ) {
    send(400, { error: "Invalid demo session" });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/local-seo/users") {
    if (user?.role !== "admin") {
      send(403, { error: "Acceso administrativo requerido." });
      return;
    }
    send(200, accounts.seoUsers(session));
    return;
  }
  if (
    req.method === "GET" &&
    url.pathname.startsWith("/api/local-seo/") &&
    (await localSeoRoutes(
      url.pathname,
      "GET",
      url.searchParams,
      undefined,
      database,
      user,
      session,
      await seoState(session),
      send,
    ))
  )
    return;
  if (
    req.method === "GET" &&
    (await pilotRoutes(
      url.pathname,
      req.method,
      url.searchParams,
      undefined,
      database,
      user,
      session,
      states.get(session) || createSeed(),
      send,
    ))
  )
    return;
  if (
    req.method === "GET" &&
    (await attachments.route(
      url.pathname,
      req.method || "GET",
      url.searchParams,
      undefined,
      res,
      user,
      session,
      states.get(session) || createSeed(),
      send,
      async (next) => {
        states.set(session, next);
        await persist(session);
        publish(session, next);
      },
    ))
  )
    return;
  if (req.method === "GET" && url.pathname === "/health") {
    send(200, {
      status: "ok",
      service: "servinexo-demo-api",
      database: "postgresql-pglite",
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/integrations/status") {
    if (user?.role !== "admin") {
      send(403, { error: "Acceso administrativo requerido." });
      return;
    }
    send(200, {
      google: googleConfiguration(),
      email: {
        mode: accounts.email.local ? "local" : "smtp",
        configured: !!process.env.SMTP_HOST && !!process.env.SMTP_FROM,
      },
      seo: {
        origin:
          process.env.PUBLIC_SITE_URL ||
          process.env.SERVINEXO_WEB_ORIGIN ||
          "http://127.0.0.1:5175",
        indexingEnabled:
          process.env.SEO_INDEXING_ENABLED === "true" &&
          !!process.env.PUBLIC_SITE_URL?.startsWith("https://"),
      },
    });
    return;
  }
  if (
    req.method === "GET" &&
    (await seoRoutes(
      req,
      res,
      url,
      database,
      states.get(url.pathname.startsWith("/api/") ? session : "default") ||
        createSeed(),
      user,
      url.pathname.startsWith("/api/") ? session : "default",
      send,
    ))
  )
    return;
  if (
    req.method === "GET" &&
    (await google.route(req, res, url, user, session, send))
  )
    return;
  if (req.method === "GET" && url.pathname === "/api/meta/tables") {
    const result = await database.sql.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name",
    );
    send(200, { tables: result.rows.map((row) => row.table_name) });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    send(
      user ? 200 : 401,
      user ? { user } : { error: "La sesión ha caducado. Inicia sesión." },
    );
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/auth/local-inbox") {
    if (!user || !accounts.email.local) {
      send(404, { error: "Buzón local no disponible." });
      return;
    }
    const invited = url.searchParams.get("user");
    if (
      invited &&
      (user.role !== "admin" ||
        !accounts.seoUsers(session).some((account) => account.id === invited))
    ) {
      send(403, { error: "Invitación no disponible." });
      return;
    }
    send(200, {
      messages: await accounts.email.localInbox(session, invited || user.id),
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/demo/events") {
    const ticket = url.searchParams.get("ticket");
    const grant = ticket ? streamTickets.get(ticket) : undefined;
    if (
      ticket &&
      (!grant || grant.session !== session || grant.expires < Date.now())
    ) {
      send(401, { error: "La autorización del canal venció." });
      return;
    }
    if (ticket) streamTickets.delete(ticket);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    const clients = streams.get(session) || new Set();
    const channel = {
      res,
      token: grant?.token || "",
      professional: grant?.professional,
    };
    clients.add(channel);
    streams.set(session, clients);
    if (states.has(session))
      res.write(
        `data: ${JSON.stringify(visibleState(states.get(session)!, viewUser(accounts.user(session, channel.token), channel.professional)))}\n\n`,
      );
    const keepAlive = setInterval(() => res.write(": keepalive\n\n"), 15000);
    req.on("close", () => {
      clearInterval(keepAlive);
      clients.delete(channel);
    });
    return;
  }
  if (req.method !== "POST") {
    send(404, { error: "Not found" });
    return;
  }
  const previousMutation = mutationTail;
  let releaseMutation!: () => void;
  mutationTail = new Promise<void>((resolve) => {
    releaseMutation = resolve;
  });
  await previousMutation;
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (
        body.length > (url.pathname === "/api/files" ? 8_000_000 : 2_000_000)
      ) {
        send(413, { error: "Payload too large" });
        return;
      }
    }
    const data = body ? JSON.parse(body) : {};
    if (url.pathname === "/api/local-seo/event") {
      const input = z
        .object({
          id: z.string().uuid(),
          professionalId: z.string().max(100),
          kind: z.enum(["profile_view", "website_click"]),
        })
        .parse(data);
      const person = (states.get(session) || createSeed()).professionals.find(
        (person) =>
          person.id === input.professionalId &&
          person.publication === "published",
      );
      if (!person) {
        send(404, { error: "Perfil no disponible." });
        return;
      }
      if (
        !rateLimit.allow(
          `seo-events:${session}:${req.socket.remoteAddress}:${person.id}:${input.kind}`,
          120,
        )
      ) {
        send(429, { error: "Demasiados eventos." });
        return;
      }
      await database.sql.query(
        "INSERT INTO local_seo_event(namespace,id,professional_id,kind,created_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT DO NOTHING",
        [session, input.id, person.id, input.kind],
      );
      send(200, { ok: true });
      return;
    }
    if (url.pathname === "/api/local-seo/users") {
      if (user?.role !== "admin") {
        send(403, { error: "Acceso administrativo requerido." });
        return;
      }
      const input = z
        .object({
          id: z.string().uuid().optional(),
          name: z.string().trim().min(2).max(200),
          email: z.email(),
          seoAccess: z.object({
            professionalIds: z.array(z.string()).max(2000),
            manageDirectories: z.boolean(),
            exportReports: z.boolean(),
          }),
        })
        .parse(data);
      const current = states.get(session) || createSeed();
      if (
        !input.id &&
        process.env.NODE_ENV === "production" &&
        (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
      ) {
        send(503, {
          error: "Configura el correo SMTP antes de invitar al equipo SEO.",
        });
        return;
      }
      if (
        input.seoAccess.professionalIds.some(
          (id) => !current.professionals.some((p) => p.id === id),
        )
      ) {
        send(400, { error: "Hay contratistas inexistentes en la asignación." });
        return;
      }
      try {
        send(200, await accounts.saveSeoUser(session, input, user.id));
      } catch (error) {
        send(400, { error: (error as Error).message });
      }
      return;
    }
    if (
      await localSeoRoutes(
        url.pathname,
        "POST",
        url.searchParams,
        data,
        database,
        user,
        session,
        await seoState(session),
        send,
      )
    )
      return;
    if (url.pathname === "/api/demo/guest-requests") {
      const input = z
        .object({
          id: z.string().uuid(),
          value: quoteInputSchema,
          contact: guestContactSchema,
        })
        .parse(data);
      const state = states.get(session) || createSeed();
      const existing = state.requests.find(
        (request) => request.id === input.id,
      );
      if (existing) {
        if (existing.ownerId !== "guest-" + input.id) {
          send(409, { error: "Request identifier already used" });
          return;
        }
        send(200, { ...visibleState(state, null), requests: [existing] });
        return;
      }
      const next = reducer(state, {
        type: "request",
        actor: "owner",
        actorId: "guest-" + input.id,
        actingProfessional: "",
        id: input.id,
        at: new Date().toISOString(),
        value: { ...input.value, guestContact: input.contact },
      });
      if (next === state || !hasValidRelations(next)) {
        send(400, { error: "Invalid request" });
        return;
      }
      // Persist before acknowledging a submission so a failed write can be retried.
      await database.saveState(session, next);
      states.set(session, next);
      publish(session, next);
      send(201, {
        ...visibleState(next, null),
        requests: next.requests.filter((request) => request.id === input.id),
      });
      return;
    }

    if (
      await attachments.route(
        url.pathname,
        req.method || "POST",
        url.searchParams,
        data,
        res,
        user,
        session,
        states.get(session) || createSeed(),
        send,
        async (next) => {
          states.set(session, next);
          await persist(session);
          publish(session, next);
        },
      )
    )
      return;
    if (
      await pilotRoutes(
        url.pathname,
        req.method || "POST",
        url.searchParams,
        data,
        database,
        user,
        session,
        states.get(session) || createSeed(),
        send,
      )
    )
      return;
    if (await google.route(req, res, url, user, session, send, data)) return;
    if (
      await seoRoutes(
        req,
        res,
        url,
        database,
        states.get(session) || createSeed(),
        user,
        session,
        send,
        data,
      )
    )
      return;
    if (
      url.pathname.startsWith("/api/auth/") &&
      url.pathname !== "/api/auth/logout" &&
      !rateLimit.allow(
        `${session}:${req.socket.remoteAddress}:${url.pathname}:${String(data.email || user?.id || "")}`,
      )
    ) {
      send(429, { error: "Demasiados intentos. Espera unos minutos." });
      return;
    }
    if (url.pathname === "/api/demo/stream-ticket") {
      if (!user) {
        send(401, { error: "Inicia sesión." });
        return;
      }
      for (const [key, value] of streamTickets)
        if (value.expires < Date.now()) streamTickets.delete(key);
      const ticket = randomUUID();
      streamTickets.set(ticket, {
        token,
        session,
        expires: Date.now() + 60000,
        professional: selectedUser?.professionalId,
      });
      send(200, { ticket });
      return;
    }
    if (url.pathname === "/api/auth/resend-verification") {
      if (!user) {
        send(401, { error: "Inicia sesión." });
        return;
      }
      await accounts.resend(user, user.role === "owner" ? "web" : user.role);
      send(200, { ok: true });
      return;
    }
    if (url.pathname === "/api/auth/verify-email") {
      await accounts.verify(z.string().min(32).max(128).parse(data.token));
      send(200, { ok: true });
      return;
    }
    if (url.pathname === "/api/auth/forgot-password") {
      const input = z
        .object({
          email: z.string().trim().email().max(160),
          application: z.enum(["web", "contractor", "admin"]),
        })
        .parse(data);
      await accounts.forgot(session, input.email, input.application);
      send(200, { ok: true });
      return;
    }
    if (url.pathname === "/api/auth/reset-password") {
      const input = z
        .object({
          token: z.string().min(32).max(128),
          password: z
            .string()
            .min(8)
            .max(128)
            .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/),
        })
        .parse(data);
      await accounts.reset(input.token, input.password);
      send(200, { ok: true });
      return;
    }
    if (url.pathname === "/api/auth/login") {
      const input = z
        .object({
          email: z.string().trim().email().max(160),
          password: z.string().min(1).max(128),
          application: z.enum(["web", "contractor", "admin"]),
        })
        .parse(data);
      try {
        send(
          200,
          await accounts.login(
            session,
            input.email,
            input.password,
            input.application,
          ),
        );
      } catch (error) {
        send(401, { error: (error as Error).message });
      }
      return;
    }
    if (url.pathname === "/api/auth/register") {
      if (
        process.env.HOME_CONNECT_REGISTRATION_ENABLED === "false" ||
        (process.env.NODE_ENV === "production" &&
          (!process.env.SMTP_HOST || !process.env.SMTP_FROM))
      ) {
        send(503, {
          error:
            "El registro estará disponible cuando se configure el envío de correo. Las cuentas existentes pueden iniciar sesión.",
        });
        return;
      }
      const input = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: z.string().email().max(160),
          password: z
            .string()
            .min(8)
            .max(128)
            .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/),
          role: z.enum(["owner", "contractor"]),
          categoryId: z.string().optional(),
          city: z.string().trim().max(100).optional(),
        })
        .parse(data);
      if (
        input.role === "contractor" &&
        (!input.city || !categories.some((c) => c.id === input.categoryId))
      ) {
        send(400, { error: "Selecciona una especialidad y una ciudad." });
        return;
      }
      const professionalId =
        input.role === "contractor" ? "pro-" + randomUUID() : undefined;
      try {
        const result = await accounts.register(session, input, professionalId);
        if (professionalId) {
          const state = states.get(session) || createSeed();
          state.professionals.push({
            id: professionalId,
            fur: "SN-" + professionalId.slice(4, 12).toUpperCase(),
            name: input.name,
            categoryId: input.categoryId!,
            serviceIds: services
              .filter((s) => s.categoryId === input.categoryId)
              .map((s) => s.id),
            city: input.city!,
            region: "Georgia",
            country: "United States",
            location: cityLocation(input.city!, "Georgia", "United States"),
            coverage: [input.city!],
            years: 0,
            rating: 0,
            img: "/images/professional-1.jpg",
            bio: {
              es: "Completa tu presentación profesional.",
              en: "Complete your professional introduction.",
            },
            publication: "draft",
            credentials: [
              {
                id: "identity",
                name: { es: "Identidad comercial", en: "Business identity" },
                status: "declared",
                reference: "",
                note: "",
              },
            ],
            portfolio: [],
          });
          states.set(session, state);
          await persist(session);
          publish(session, state);
        }
        send(201, result);
      } catch (error) {
        send(409, { error: (error as Error).message });
      }
      return;
    }
    if (url.pathname === "/api/auth/logout") {
      accounts.logout(token);
      send(200, { ok: true });
      return;
    }
    if (url.pathname === "/api/demo/bootstrap") {
      if (!states.has(session)) {
        states.set(session, createSeed());
        await persist(session);
      }
      send(200, visibleState(states.get(session)!, selectedUser));
      return;
    }
    if (url.pathname === "/api/demo/commands") {
      const action = value.parse(data);
      fields[action.type].parse(data);
      if (!user) {
        send(401, { error: "Inicia sesión para realizar esta acción." });
        return;
      }
      if (
        !user.emailVerified &&
        ["request", "proposal", "message"].includes(action.type)
      ) {
        send(403, {
          error: "Confirma tu correo antes de realizar esta acción.",
        });
        return;
      }
      const management = ["admin", "supplier", "business", "ally"];
      if (
        user.role === "admin"
          ? !management.includes(action.actor)
          : action.actor !== user.role
      ) {
        send(403, { error: "Esta cuenta no tiene acceso a esa operación." });
        return;
      }
      if (
        user.role === "contractor" &&
        !user.demo &&
        action.actingProfessional !== user.professionalId
      ) {
        send(403, { error: "Solo puedes gestionar tu perfil profesional." });
        return;
      }
      const state = states.get(session) || createSeed();
      if (action.type === "accept" || action.type === "cancel") {
        const target =
          action.type === "accept"
            ? state.proposals.find((p) => p.id === action.proposalId)?.requestId
            : action.requestId;
        if (
          !state.requests.some((r) => r.id === target && r.ownerId === user.id)
        ) {
          send(403, { error: "Esta solicitud pertenece a otra cuenta." });
          return;
        }
      }
      const next = reducer(state, { ...action, actorId: user.id } as Parameters<
        typeof reducer
      >[1]);
      if (action.type === "reset")
        next.professionals.push(
          ...state.professionals.filter((person) =>
            person.id.startsWith("pro-"),
          ),
        );
      if (!hasValidRelations(next)) throw Error("Invalid state transition");
      states.set(session, next);
      await persist(session);
      publish(session, next);
      send(200, visibleState(next, viewUser(user, action.actingProfessional)));
      return;
    }
    send(404, { error: "Not found" });
  } catch (error) {
    const databaseError =
      typeof error === "object" && error !== null && "code" in error;
    send(databaseError ? 500 : 400, {
      error:
        error instanceof z.ZodError
          ? "Revisa los datos enviados. La contraseña debe incluir al menos 8 caracteres, una letra y un número."
          : databaseError
            ? "No fue posible guardar los cambios. Inténtalo nuevamente."
            : error instanceof Error
              ? error.message
              : "No se pudo completar la operación.",
    });
  } finally {
    releaseMutation();
  }
}
const server = createServer((req, res) => {
  void handle(req, res).catch(() => {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Servicio temporalmente no disponible." }),
      );
    } else res.end();
  });
});
server.listen(port, process.env.SERVINEXO_API_HOST || "127.0.0.1", () =>
  console.log(`Servinexo demo API: http://127.0.0.1:${port}`),
);
function stop() {
  clearInterval(googleCacheCleanup);
  for (const set of streams.values())
    for (const stream of set) stream.res.end();
  server.close(async () => {
    await database.close();
    process.exit();
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
