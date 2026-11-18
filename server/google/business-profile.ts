import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Database } from "../database/database";
import type { AuthUser } from "../../src/auth/types";
import { z } from "zod";
const scope = "https://www.googleapis.com/auth/business.manage";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function encryptionKey() {
  const key = Buffer.from(
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || "",
    "base64",
  );
  if (key.length !== 32)
    throw Error("Configura una clave de cifrado de 32 bytes.");
  return key;
}
export function encryptToken(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
export function decryptToken(value: string) {
  const payload = Buffer.from(value, "base64"),
    decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      payload.subarray(0, 12),
    );
  decipher.setAuthTag(payload.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(payload.subarray(28)),
      decipher.final(),
    ]).toString("utf8"),
  );
}
export function googleConfiguration() {
  const missing = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_TOKEN_ENCRYPTION_KEY",
    "GOOGLE_REDIRECT_URI",
  ].filter((key) => !process.env[key]);
  if (process.env.GOOGLE_API_ACCESS_APPROVED !== "true")
    missing.push("GOOGLE_API_ACCESS_APPROVED");
  if (process.env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
    try {
      encryptionKey();
    } catch {
      missing.push("GOOGLE_TOKEN_ENCRYPTION_KEY válida");
    }
  }
  return { configured: missing.length === 0, missing };
}
type Connection = {
  encrypted: string;
  expires: number;
  locations?: any[];
  syncedAt?: string;
  selected?: string;
};
async function googleFetch(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(
      response.status === 403
        ? "Google rechazó el acceso. Revisa la aprobación de las APIs y los permisos sobre las fichas."
        : response.status === 401
          ? "La autorización de Google venció o fue revocada. Vuelve a conectar."
          : "No fue posible completar la solicitud a Google.",
    );
  return data;
}
export class GoogleBusiness {
  constructor(private db: Database) {}
  async purgeCachedProfiles() {
    await this.db.sql.query(
      "UPDATE google_business_connection SET data=data-'locations'-'syncedAt' WHERE data ? 'syncedAt' AND (data->>'syncedAt')::timestamptz < now()-interval '24 hours'",
    );
  }
  private async connection(
    namespace: string,
    id: string,
  ): Promise<Connection | undefined> {
    await this.purgeCachedProfiles();
    return (
      await this.db.sql.query<{ data: Connection }>(
        "SELECT data FROM google_business_connection WHERE namespace=$1 AND id=$2",
        [namespace, id],
      )
    ).rows[0]?.data;
  }
  private async save(namespace: string, id: string, value: Connection) {
    await this.db.sql.query(
      "INSERT INTO google_business_connection(namespace,id,data) VALUES($1,$2,$3) ON CONFLICT(namespace,id) DO UPDATE SET data=excluded.data",
      [namespace, id, JSON.stringify(value)],
    );
  }
  private async access(namespace: string, id: string, connection: Connection) {
    const tokens = decryptToken(connection.encrypted);
    if (connection.expires > Date.now() + 30000)
      return tokens.access_token as string;
    if (!tokens.refresh_token)
      throw Error("Vuelve a conectar tu cuenta de Google.");
    const fresh = await googleFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      }),
    });
    connection.encrypted = encryptToken({ ...tokens, ...fresh });
    connection.expires = Date.now() + fresh.expires_in * 1000;
    await this.save(namespace, id, connection);
    return fresh.access_token as string;
  }
  async route(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    user: AuthUser | null,
    namespace: string,
    send: (code: number, data: any) => void,
    body?: any,
  ) {
    if (!url.pathname.startsWith("/api/google/")) return false;
    const config = googleConfiguration();
    if (req.method === "GET" && url.pathname === "/api/google/callback") {
      const state = url.searchParams.get("state") || "",
        cookie = req.headers.cookie
          ?.split(";")
          .map((x) => x.trim())
          .find((x) => x.startsWith("hc_google_state="))
          ?.slice("hc_google_state=".length);
      if (!config.configured || !state || !cookie || hash(cookie) !== state) {
        send(400, {
          error:
            "La autorización de Google no es válida. Iníciala desde tu cuenta.",
        });
        return true;
      }
      const grant = (
        await this.db.sql.query<{ data: any }>(
          "DELETE FROM google_oauth_state WHERE id=$1 AND expires_at>now() RETURNING data",
          [state],
        )
      ).rows[0]?.data;
      res.setHeader(
        "Set-Cookie",
        "hc_google_state=; Path=/api/google; HttpOnly; SameSite=Lax; Max-Age=0",
      );
      if (!grant) {
        send(400, { error: "La autorización venció o ya fue utilizada." });
        return true;
      }
      const origin =
        process.env.SERVINEXO_CONTRACTOR_ORIGIN || "http://127.0.0.1:5180";
      try {
        if (url.searchParams.has("error") || !url.searchParams.get("code"))
          throw Error("Cancelado");
        const tokens = await googleFetch(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
              grant_type: "authorization_code",
              code: url.searchParams.get("code")!,
              code_verifier: grant.verifier,
            }),
          },
        );
        if (
          !tokens.access_token ||
          !String(tokens.scope || scope)
            .split(" ")
            .includes(scope)
        )
          throw Error("Permiso no concedido");
        await this.save(grant.namespace, grant.userId, {
          encrypted: encryptToken(tokens),
          expires: Date.now() + Number(tokens.expires_in || 3600) * 1000,
        });
        res.writeHead(303, {
          Location: origin + "/#/workspace/contractor/google?connected=1",
        });
        res.end();
      } catch {
        res.writeHead(303, {
          Location:
            origin + "/#/workspace/contractor/google?error=authorization",
        });
        res.end();
      }
      return true;
    }
    if (!user || user.role !== "contractor") {
      send(403, {
        error: "Esta conexión pertenece a una cuenta de contratista.",
      });
      return true;
    }
    const connection = await this.connection(namespace, user.id);
    if (req.method === "GET" && url.pathname === "/api/google/status") {
      const fresh =
        connection?.syncedAt &&
        Date.now() - Date.parse(connection.syncedAt) < 24 * 3600000;
      send(200, {
        ...config,
        connected: !!connection,
        selected: connection?.selected || "",
        syncedAt: fresh ? connection?.syncedAt : null,
        locations: fresh ? connection?.locations || [] : [],
        requiresEmail: !user.emailVerified,
      });
      return true;
    }
    if (!user.emailVerified) {
      send(403, { error: "Confirma tu email antes de conectar Google." });
      return true;
    }
    if (req.method === "POST" && url.pathname === "/api/google/connect") {
      if (!config.configured) {
        send(503, {
          error: "Google Business Profile está pendiente de configuración.",
          missing: config.missing,
        });
        return true;
      }
      const nonce = randomBytes(32).toString("base64url"),
        state = hash(nonce),
        verifier = randomBytes(48).toString("base64url");
      await this.db.sql.query(
        "DELETE FROM google_oauth_state WHERE expires_at<now()",
      );
      await this.db.sql.query(
        "INSERT INTO google_oauth_state(id,data,expires_at) VALUES($1,$2,$3)",
        [
          state,
          JSON.stringify({ namespace, userId: user.id, verifier }),
          new Date(Date.now() + 600000).toISOString(),
        ],
      );
      const authorization = new URL(
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      authorization.search = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        response_type: "code",
        scope,
        state,
        access_type: "offline",
        prompt: "consent",
        code_challenge: hashBase64(verifier),
        code_challenge_method: "S256",
      }).toString();
      res.setHeader(
        "Set-Cookie",
        `hc_google_state=${nonce}; Path=/api/google; HttpOnly; SameSite=Lax; Max-Age=600${process.env.GOOGLE_REDIRECT_URI?.startsWith("https:") ? "; Secure" : ""}`,
      );
      send(200, { authorizationUrl: authorization.toString() });
      return true;
    }
    if (!connection) {
      send(409, { error: "Conecta primero tu cuenta de Google." });
      return true;
    }
    if (req.method === "POST" && url.pathname === "/api/google/disconnect") {
      try {
        const tokens = decryptToken(connection.encrypted);
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: tokens.refresh_token || tokens.access_token,
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        /* Always remove local credentials. */
      }
      await this.db.sql.query(
        "DELETE FROM google_business_connection WHERE namespace=$1 AND id=$2",
        [namespace, user.id],
      );
      send(200, { ok: true });
      return true;
    }
    if (!config.configured) {
      send(503, { error: "La conexión de Google requiere configuración." });
      return true;
    }
    if (req.method === "POST" && url.pathname === "/api/google/sync") {
      const access = await this.access(namespace, user.id, connection),
        headers = { Authorization: `Bearer ${access}` };
      const accounts: any[] = [];
      let pageToken = "";
      for (let page = 0; page < 20; page++) {
        const query = new URLSearchParams({
          pageSize: "20",
          ...(pageToken ? { pageToken } : {}),
        });
        const data = await googleFetch(
          "https://mybusinessaccountmanagement.googleapis.com/v1/accounts?" +
            query,
          { headers },
        );
        accounts.push(...(data.accounts || []));
        pageToken = data.nextPageToken || "";
        if (!pageToken) break;
      }
      const locations: any[] = [];
      for (const account of accounts) {
        if (!/^accounts\/\d+$/.test(account.name)) continue;
        pageToken = "";
        for (let page = 0; page < 20; page++) {
          const query = new URLSearchParams({
            readMask:
              "name,title,phoneNumbers,websiteUri,storefrontAddress,serviceArea,regularHours,metadata",
            pageSize: "100",
            ...(pageToken ? { pageToken } : {}),
          });
          const data = await googleFetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?${query}`,
            { headers },
          );
          locations.push(
            ...(data.locations || []).map((location: any) => ({
              ...location,
              account: account.name,
            })),
          );
          pageToken = data.nextPageToken || "";
          if (!pageToken) break;
        }
      }
      connection.locations = locations;
      connection.syncedAt = new Date().toISOString();
      await this.save(namespace, user.id, connection);
      send(200, { ok: true, count: locations.length });
      return true;
    }
    if (req.method === "POST" && url.pathname === "/api/google/location") {
      const name = z
        .string()
        .regex(/^locations\/\d+$/)
        .parse(body?.name);
      if (
        !connection.syncedAt ||
        Date.now() - Date.parse(connection.syncedAt) > 86400000 ||
        !connection.locations?.some((l) => l.name === name)
      ) {
        send(400, {
          error: "Sincroniza y selecciona una ficha autorizada de tu cuenta.",
        });
        return true;
      }
      connection.selected = name;
      await this.save(namespace, user.id, connection);
      send(200, { ok: true });
      return true;
    }
    send(404, { error: "Operación de Google no disponible." });
    return true;
  }
}
function hashBase64(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}
