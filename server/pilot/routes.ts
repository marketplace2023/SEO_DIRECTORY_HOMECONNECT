import {
  currentSupportTopic,
  supportGreeting,
  supportTopics,
} from "../../src/data/support-topics";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../database/database";
import type { AuthUser } from "../../src/auth/types";
import type { DemoState } from "../../src/domain/types";
import { readSetting, writeSetting } from "../seo/routes";
export async function pilotRoutes(
  path: string,
  method: string,
  query: URLSearchParams,
  body: any,
  db: Database,
  user: AuthUser | null,
  namespace: string,
  state: DemoState,
  send: (code: number, data: any) => void,
) {
  if (
    ![
      "/api/reviews",
      "/api/reviews/moderate",
      "/api/reviews/reply",
      "/api/projects/confirm",
      "/api/support",
      "/api/support/update",
      "/api/support/feedback",
    ].includes(path)
  )
    return false;
  if (method === "GET" && path === "/api/reviews") {
    const admin = user?.role === "admin" && query.get("moderation") === "1";
    const rows = (
      await db.sql.query<{ data: any }>(
        `SELECT data FROM rating_rating WHERE namespace=$1 ${admin ? "" : "AND data->>'status'='published'"} ORDER BY data->>'createdAt' DESC`,
        [namespace],
      )
    ).rows
      .map((r) => r.data)
      .filter((r) => admin || r.professionalId === query.get("professional"));
    send(200, {
      reviews: rows.map((r) =>
        admin
          ? r
          : {
              id: r.id,
              professionalId: r.professionalId,
              rating: r.rating,
              text: r.text,
              reply: r.reply,
              createdAt: r.createdAt,
              verifiedInteraction: true,
            },
      ),
    });
    return true;
  }
  if (!user) {
    send(401, { error: "Inicia sesión para continuar." });
    return true;
  }
  if (method === "GET" && path === "/api/support") {
    const rows = (
      await db.sql.query<{ data: any }>(
        "SELECT data || jsonb_build_object('number', 'HC-' || ticket_number::text) AS data FROM support_ticket WHERE namespace=$1 ORDER BY data->>'createdAt' DESC",
        [namespace],
      )
    ).rows
      .map((r) => r.data)
      .filter((r) =>
        user.role === "admin"
          ? r.number && ["open", "reviewing", "resolved"].includes(r.status)
          : r.userId === user.id,
      );
    send(200, { tickets: rows });
    return true;
  }
  if (method !== "POST") {
    send(404, { error: "Operación no disponible." });
    return true;
  }
  if (path === "/api/projects/confirm") {
    const { projectId } = z.object({ projectId: z.string() }).parse(body),
      project = state.projects.find((p) => p.id === projectId);
    if (
      user.role !== "owner" ||
      !project ||
      project.status !== "completed" ||
      !state.requests.some(
        (r) => r.id === project.requestId && r.ownerId === user.id,
      )
    ) {
      send(403, {
        error:
          "Solo el cliente puede confirmar la entrega de su proyecto completado.",
      });
      return true;
    }
    await writeSetting(db, namespace, "project:confirmation:" + projectId, {
      ownerId: user.id,
      at: new Date().toISOString(),
    });
    send(200, { ok: true });
    return true;
  }
  if (path === "/api/reviews") {
    const input = z
        .object({
          projectId: z.string(),
          rating: z.number().int().min(1).max(5),
          text: z.string().trim().min(20).max(2000),
        })
        .parse(body),
      project = state.projects.find((p) => p.id === input.projectId),
      confirmation = await readSetting<any>(
        db,
        namespace,
        "project:confirmation:" + input.projectId,
        null,
      );
    if (
      user.role !== "owner" ||
      !user.emailVerified ||
      !project ||
      project.status !== "completed" ||
      confirmation?.ownerId !== user.id ||
      !state.requests.some(
        (r) => r.id === project.requestId && r.ownerId === user.id,
      )
    ) {
      send(403, {
        error:
          "Confirma tu email y la entrega de tu proyecto antes de reseñar.",
      });
      return true;
    }
    const existing = await db.sql.query(
      "SELECT id FROM rating_rating WHERE namespace=$1 AND data->>'projectId'=$2",
      [namespace, input.projectId],
    );
    if (existing.rows.length) {
      send(409, { error: "Este proyecto ya tiene una reseña." });
      return true;
    }
    const id = randomUUID();
    await db.sql.query(
      "INSERT INTO rating_rating(namespace,id,data) VALUES($1,$2,$3)",
      [
        namespace,
        id,
        JSON.stringify({
          ...input,
          id,
          ownerId: user.id,
          professionalId: project.professionalId,
          status: "pending",
          createdAt: new Date().toISOString(),
        }),
      ],
    );
    send(201, { ok: true });
    return true;
  }
  if (path === "/api/reviews/moderate" || path === "/api/reviews/reply") {
    const id = z.string().parse(body?.id),
      row = (
        await db.sql.query<{ data: any }>(
          "SELECT data FROM rating_rating WHERE namespace=$1 AND id=$2",
          [namespace, id],
        )
      ).rows[0]?.data;
    if (!row) {
      send(404, { error: "Reseña no disponible." });
      return true;
    }
    if (path.endsWith("moderate")) {
      if (user.role !== "admin") {
        send(403, { error: "Solo administración puede moderar." });
        return true;
      }
      row.status = z.enum(["published", "rejected"]).parse(body.status);
      row.moderationNote = z.string().trim().min(5).max(1000).parse(body.note);
      row.moderatedAt = new Date().toISOString();
    } else {
      if (
        user.role !== "contractor" ||
        user.professionalId !== row.professionalId ||
        row.status !== "published"
      ) {
        send(403, { error: "Solo el negocio reseñado puede responder." });
        return true;
      }
      row.reply = z.string().trim().min(5).max(1500).parse(body.reply);
    }
    await db.sql.query(
      "UPDATE rating_rating SET data=$3 WHERE namespace=$1 AND id=$2",
      [namespace, id, JSON.stringify(row)],
    );
    send(200, { ok: true });
    return true;
  }
  if (path === "/api/support") {
    const input = z
        .object({
          subject: z.string().trim().min(1).max(150),
          message: z.string().trim().min(1).max(3000),
        })
        .parse(body),
      id = randomUUID();
    const createdAt = new Date().toISOString();
    const ticket = {
      ...input,
      id,
      userId: user.id,
      status: "choosing",
      createdAt,
      history: [
        {
          author: "automatic",
          text: supportGreeting,
          at: createdAt,
        },
      ],
    };
    await db.sql.query(
      "INSERT INTO support_ticket(namespace,id,data) VALUES($1,$2,$3)",
      [namespace, id, JSON.stringify(ticket)],
    );
    send(201, { ok: true, id });
    return true;
  }
  if (path === "/api/support/feedback") {
    const input = z
      .object({
        id: z.string(),
        choice: z.enum([
          "resolved",
          "agent",
          "topic",
          "question",
          "menu",
          "message",
        ]),
        topic: z.string().optional(),
        question: z.string().optional(),
        detail: z.string().trim().max(2000).optional(),
      })
      .parse(body);
    if (input.choice === "agent") {
      const result = await db.sql.transaction(async (tx) => {
        const params = [namespace, input.id, user.id];
        const ticket = (
          await tx.query<{ data: any; number: string | null }>(
            "SELECT data, 'HC-' || ticket_number AS number FROM support_ticket WHERE namespace=$1 AND id=$2 AND data->>'userId'=$3 FOR UPDATE",
            params,
          )
        ).rows[0];
        if (!ticket)
          return { status: 404, body: { error: "Consulta no disponible." } };
        if (ticket.data.status !== "suggested") {
          if (
            ticket.number &&
            ["open", "reviewing", "resolved"].includes(ticket.data.status)
          )
            return { status: 200, body: { ok: true, number: ticket.number } };
          return {
            status: 409,
            body: { error: "Esta opción ya no está disponible." },
          };
        }
        const assigned = await tx.query<{ number: string }>(
          "UPDATE support_ticket SET ticket_number=COALESCE(ticket_number,nextval(pg_get_serial_sequence('support_ticket','ticket_number'))) WHERE namespace=$1 AND id=$2 RETURNING 'HC-' || ticket_number AS number",
          params.slice(0, 2),
        );
        const number = assigned.rows[0].number;
        const at = new Date().toISOString();
        const row = ticket.data;
        row.history ??= [];
        row.history.push(
          {
            author: "customer",
            text:
              "Solicité atención de un agente." +
              (input.detail ? " " + input.detail : ""),
            at,
          },
          {
            author: "automatic",
            text: `Tu número de ticket es ${number}. Tu consulta está en espera de un agente de HOME CONNECT. Recibirás su respuesta en este chat.`,
            at,
          },
        );
        row.status = "open";
        row.updatedAt = at;
        await tx.query(
          "UPDATE support_ticket SET data=$3 WHERE namespace=$1 AND id=$2",
          [namespace, input.id, JSON.stringify(row)],
        );
        return { status: 200, body: { ok: true, number } };
      });
      send(result.status, result.body);
      return true;
    }
    const row = (
      await db.sql.query<{ data: any }>(
        "SELECT data FROM support_ticket WHERE namespace=$1 AND id=$2 AND data->>'userId'=$3",
        [namespace, input.id, user.id],
      )
    ).rows[0]?.data;
    if (!row) {
      send(404, { error: "Ticket no disponible." });
      return true;
    }
    const at = new Date().toISOString();
    if (input.choice === "topic" && row.status === "choosing") {
      const topic = supportTopics.find((t) => t.id === input.topic);
      if (!topic) {
        send(400, { error: "Selecciona un motivo válido." });
        return true;
      }
      row.history.push(
        { author: "customer", text: topic.label, at },
        { author: "automatic", text: topic.answer, at },
      );
      row.status = "suggested";
      row.topicId = topic.id;
      delete row.lastQuestion;
    } else if (input.choice === "question" && row.status === "suggested") {
      const topic = currentSupportTopic(row);
      const question = topic?.questions.find(
        (item) => item.id === input.question,
      );
      if (!topic || topic.id !== input.topic || !question) {
        send(400, { error: "Selecciona una pregunta del tema actual." });
        return true;
      }
      row.history.push(
        { author: "customer", text: question.label, at },
        { author: "automatic", text: question.answer, at },
      );
      row.lastQuestion = question.id;
    } else if (input.choice === "menu" && row.status === "suggested") {
      row.history ??= [];
      row.history.push(
        { author: "customer", text: "Consultar otro tema", at },
        { author: "automatic", text: supportGreeting, at },
      );
      row.status = "choosing";
      delete row.topicId;
      delete row.lastQuestion;
    } else if (
      input.choice === "message" &&
      ["open", "reviewing"].includes(row.status) &&
      input.detail
    ) {
      row.history ??= row.response
        ? [
            {
              author: "agent",
              text: row.response,
              at: row.updatedAt || row.createdAt,
            },
          ]
        : [];
      row.history.push({ author: "customer", text: input.detail, at });
    } else if (row.status === "suggested" && input.choice === "resolved") {
      row.status = "resolved";
      row.history.push({
        author: "customer",
        text: "La respuesta resolvió mi consulta.",
        at,
      });
    } else {
      send(409, { error: "Esta opción ya no está disponible." });
      return true;
    }
    row.updatedAt = at;
    await db.sql.query(
      "UPDATE support_ticket SET data=$3 WHERE namespace=$1 AND id=$2",
      [namespace, input.id, JSON.stringify(row)],
    );
    send(200, { ok: true });
    return true;
  }
  if (path === "/api/support/update") {
    if (user.role !== "admin") {
      send(403, { error: "Solo administración puede gestionar incidencias." });
      return true;
    }
    const input = z
        .object({
          id: z.string(),
          status: z.enum(["open", "reviewing", "resolved"]),
          response: z.string().trim().min(5).max(2000),
        })
        .parse(body),
      row = (
        await db.sql.query<{ data: any }>(
          "SELECT data FROM support_ticket WHERE namespace=$1 AND id=$2 AND ticket_number IS NOT NULL AND data->>'status' IN ('open','reviewing','resolved')",
          [namespace, input.id],
        )
      ).rows[0]?.data;
    if (!row) {
      send(404, { error: "Incidencia no disponible." });
      return true;
    }
    await db.sql.query(
      "UPDATE support_ticket SET data=$3 WHERE namespace=$1 AND id=$2",
      [
        namespace,
        input.id,
        JSON.stringify({
          ...row,
          status: input.status,
          history: [
            ...(row.history ??
              (row.response
                ? [
                    {
                      author: "agent",
                      text: row.response,
                      at: row.updatedAt || row.createdAt,
                    },
                  ]
                : [])),
            {
              author: "agent",
              text: input.response,
              at: new Date().toISOString(),
            },
          ],
          response: input.response,
          updatedAt: new Date().toISOString(),
          assignee: user.id,
        }),
      ],
    );
    send(200, { ok: true });
    return true;
  }
  return false;
}
