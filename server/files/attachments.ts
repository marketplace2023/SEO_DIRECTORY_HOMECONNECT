import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import type { Database } from "../database/database";
import type { AuthUser } from "../../src/auth/types";
import type { DemoState } from "../../src/domain/types";
import type { ServerResponse } from "node:http";
import { allowedRequests } from "../../src/domain/store";
export function fileMime(bytes: Buffer) {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  if (bytes.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return "";
}
export class Attachments {
  constructor(
    private db: Database,
    private directory: string,
  ) {}
  private canRead(file: any, user: AuthUser | null, state: DemoState) {
    if (!user) return false;
    if (user.role === "admin" || user.id === file.ownerId) return true;
    return (
      (file.purpose === "request" || file.purpose === "reference") &&
      user.role === "contractor" &&
      (allowedRequests(state, user.professionalId || "").some(
        (r) => r.id === file.targetId,
      ) ||
        state.proposals.some(
          (p) =>
            p.requestId === file.targetId &&
            p.professionalId === user.professionalId,
        ))
    );
  }
  async route(
    path: string,
    method: string,
    query: URLSearchParams,
    body: any,
    res: ServerResponse,
    user: AuthUser | null,
    namespace: string,
    state: DemoState,
    send: (code: number, data: any) => void,
    persist: (state: DemoState) => Promise<void>,
  ) {
    if (!path.startsWith("/api/files") && !path.startsWith("/media/"))
      return false;
    if (method === "GET" && path.startsWith("/media/")) {
      const id = path.slice("/media/".length);
      if (!/^[\da-f-]{36}$/.test(id)) {
        send(404, { error: "Archivo no disponible." });
        return true;
      }
      const row = (
        await this.db.sql.query<{ data: any }>(
          "SELECT data FROM ir_attachment WHERE namespace=$1 AND id=$2",
          [namespace, id],
        )
      ).rows[0]?.data;
      const publicImage =
        row?.purpose === "portfolio" &&
        row.mime.startsWith("image/") &&
        state.professionals.some(
          (p) => p.id === row.targetId && p.publication === "published",
        );
      if (!row || (!publicImage && !this.canRead(row, user, state))) {
        send(404, { error: "Archivo no disponible." });
        return true;
      }
      const bytes = readFileSync(resolve(this.directory, id + ".bin"));
      res.writeHead(200, {
        "Content-Type": row.mime,
        "Content-Length": bytes.length,
        "Content-Disposition": `${publicImage ? "inline" : "attachment"}; filename="download.${row.mime === "application/pdf" ? "pdf" : row.mime.split("/")[1]}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Cache-Control": publicImage
          ? "public, max-age=300"
          : "private, no-store",
      });
      res.end(bytes);
      return true;
    }
    if (!user) {
      send(401, { error: "Inicia sesión." });
      return true;
    }
    if (method === "GET" && path === "/api/files") {
      const target = query.get("target") || "";
      const files = (
        await this.db.sql.query<{ data: any }>(
          "SELECT data FROM ir_attachment WHERE namespace=$1 AND data->>'targetId'=$2",
          [namespace, target],
        )
      ).rows
        .map((r) => r.data)
        .filter((file) => this.canRead(file, user, state));
      send(200, { files: files.map(({ ownerId, ...file }) => file) });
      return true;
    }
    if (method === "POST" && path === "/api/files") {
      if (!user.emailVerified) {
        send(403, { error: "Confirma tu correo antes de cargar archivos." });
        return true;
      }
      const input = z
        .object({
          name: z.string().trim().min(1).max(120),
          data: z.string().min(8).max(7000000),
          purpose: z.enum(["credential", "portfolio", "request", "reference"]),
          targetId: z.string().max(100),
          publicConsent: z.boolean().optional(),
        })
        .parse(body);
      if (
        input.purpose === "request" || input.purpose === "reference"
          ? user.role !== "owner" ||
            !state.requests.some(
              (r) => r.id === input.targetId && r.ownerId === user.id,
            )
          : user.role !== "contractor" || user.professionalId !== input.targetId
      ) {
        send(403, {
          error: "Solo puedes subir archivos a tus propios recursos.",
        });
        return true;
      }
      const bytes = Buffer.from(input.data, "base64"),
        mime = fileMime(bytes);
      if (
        bytes.length > 5 * 1024 * 1024 ||
        !mime ||
        bytes.toString("base64") !== input.data
      ) {
        send(400, {
          error: "Solo se admiten JPEG, PNG, WebP y PDF válidos de hasta 5 MB.",
        });
        return true;
      }
      if (
        input.purpose === "portfolio" &&
        (mime === "application/pdf" || !input.publicConsent)
      ) {
        send(400, {
          error:
            "El portafolio requiere una imagen y autorización expresa de publicación.",
        });
        return true;
      }
      if (input.purpose === "reference") {
        if (!mime.startsWith("image/")) {
          send(400, { error: "Selecciona una imagen JPEG, PNG o WebP." });
          return true;
        }
        const result = await this.db.sql.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM ir_attachment WHERE namespace=$1 AND data->>'targetId'=$2 AND data->>'purpose'='reference'",
          [namespace, input.targetId],
        );
        if (result.rows[0].count >= 2) {
          send(409, {
            error: "Esta solicitud ya tiene dos imágenes de referencia.",
          });
          return true;
        }
      }
      const id = randomUUID(),
        file = {
          id,
          ownerId: user.id,
          targetId: input.targetId,
          purpose: input.purpose,
          name: input.name,
          mime,
          size: bytes.length,
          createdAt: new Date().toISOString(),
        };
      const count = (
        await this.db.sql.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM ir_attachment WHERE namespace=$1 AND data->>'ownerId'=$2",
          [namespace, user.id],
        )
      ).rows[0].count;
      if (count >= 30) {
        send(429, {
          error:
            "Se alcanzó el límite del piloto de 30 archivos por cuenta. Contacta con soporte.",
        });
        return true;
      }
      mkdirSync(this.directory, { recursive: true });
      const target = resolve(this.directory, id + ".bin");
      writeFileSync(target + ".tmp", bytes);
      renameSync(target + ".tmp", target);
      await this.db.sql.query(
        "INSERT INTO ir_attachment(namespace,id,data) VALUES($1,$2,$3)",
        [namespace, id, JSON.stringify(file)],
      );
      if (input.purpose === "portfolio") {
        const next = structuredClone(state),
          person = next.professionals.find((p) => p.id === input.targetId)!;
        const api = process.env.SERVINEXO_API_ORIGIN || "http://127.0.0.1:5190";
        person.portfolio.push({
          id,
          title: { es: input.name, en: input.name },
          image: `${api}/media/${id}?session=${encodeURIComponent(namespace)}`,
        });
        await persist(next);
      }
      send(201, { ok: true, id });
      return true;
    }
    send(404, { error: "Operación de archivos no disponible." });
    return true;
  }
}
