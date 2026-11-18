import { createServer, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { z } from "zod";
import { createSeed } from "../src/data/seed";
import { reducer } from "../src/domain/store";
import { stateSchema, hasValidRelations } from "../src/domain/schema";
import type { DemoState } from "../src/domain/types";
import { Database } from "../server/database/database";
import { Accounts } from "../server/auth/accounts";
import { categories, services } from "../src/data/catalog";
import { randomUUID } from "node:crypto";

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
const streams = new Map<string, Set<ServerResponse>>();
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
    name: text,
    city: text,
    coverage: z.array(text),
    bio: text,
    language: z.enum(["es", "en"]),
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
    stream.write(`data: ${JSON.stringify(state)}\n\n`);
}
const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !origins.has(origin)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
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
  const send = (status: number, data: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(session)) {
    send(400, { error: "Invalid demo session" });
    return;
  }
  if (req.method === "GET" && url.pathname === "/health") {
    send(200, {
      status: "ok",
      service: "servinexo-demo-api",
      database: "postgresql-pglite",
    });
    return;
  }
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
  if (req.method === "GET" && url.pathname === "/api/demo/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    const clients = streams.get(session) || new Set<ServerResponse>();
    clients.add(res);
    streams.set(session, clients);
    if (states.has(session))
      res.write(`data: ${JSON.stringify(states.get(session))}\n\n`);
    const keepAlive = setInterval(() => res.write(": keepalive\n\n"), 15000);
    req.on("close", () => {
      clearInterval(keepAlive);
      clients.delete(res);
    });
    return;
  }
  if (req.method !== "POST") {
    send(404, { error: "Not found" });
    return;
  }
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 2_000_000) {
        send(413, { error: "Payload too large" });
        return;
      }
    }
    const data = JSON.parse(body);
    if (url.pathname === "/api/auth/login") {
      const input = z
        .object({
          email: z.string().email().max(160),
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
            region: input.city!,
            country: "Por completar",
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
        const parsed = stateSchema.parse(data);
        if (!hasValidRelations(parsed)) throw Error("Invalid references");
        states.set(session, parsed);
        await persist(session);
      }
      send(200, states.get(session));
      return;
    }
    if (url.pathname === "/api/demo/commands") {
      const action = value.parse(data);
      fields[action.type].parse(data);
      if (!user) {
        send(401, { error: "Inicia sesión para realizar esta acción." });
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
      send(200, next);
      return;
    }
    send(404, { error: "Not found" });
  } catch {
    send(400, {
      error:
        "Revisa los datos enviados. La contraseña debe incluir al menos 8 caracteres, una letra y un número.",
    });
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Servinexo demo API: http://127.0.0.1:${port}`),
);
function stop() {
  for (const set of streams.values()) for (const stream of set) stream.end();
  server.close(async () => {
    await database.close();
    process.exit();
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
