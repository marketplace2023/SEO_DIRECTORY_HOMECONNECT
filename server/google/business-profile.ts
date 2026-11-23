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
  checkedAt?: string;
  issue?: "authorization" | "location" | "maps";
};
class GoogleFailure extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
async function publicMapsStatus(uri: string): Promise<boolean | undefined> {
  let url = new URL(uri);
  for (let redirects = 0; redirects < 5; redirects++) {
    if (
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password ||
      ![
        "maps.google.com",
        "www.google.com",
        "google.com",
        "maps.app.goo.gl",
        "g.page",
      ].includes(url.hostname)
    )
      return undefined;
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    await response.body?.cancel();
    if (response.status === 404 || response.status === 410) return false;
    if (response.ok) return true;
    const target = response.headers.get("location");
    if (!target || response.status < 300 || response.status >= 400)
      return undefined;
    url = new URL(target, url);
  }
}
async function googleFetch(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}));
    throw new GoogleFailure(
      failure?.error === "invalid_grant" ? 401 : response.status,
      response.status === 403
        ? "Google rechazó el acceso. Revisa la aprobación de las APIs y los permisos sobre las fichas."
        : response.status === 401
          ? "La autorización de Google venció o fue revocada. Vuelve a conectar."
          : "No fue posible completar la solicitud a Google.",
    );
  }
  return response.json();
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
      throw new GoogleFailure(401, "Vuelve a conectar tu cuenta de Google.");
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
    const previous = connection.encrypted;
    connection.encrypted = encryptToken({ ...tokens, ...fresh });
    connection.expires = Date.now() + fresh.expires_in * 1000;
    await this.db.sql.query(
      "UPDATE google_business_connection SET data=data || $3::jsonb WHERE namespace=$1 AND id=$2 AND data->>'encrypted'=$4",
      [
        namespace,
        id,
        JSON.stringify({
          encrypted: connection.encrypted,
          expires: connection.expires,
        }),
        previous,
      ],
    );
    return fresh.access_token as string;
  }
  private async check(namespace: string, id: string, connection: Connection) {
    if (!connection.selected || !/^locations\/\d+$/.test(connection.selected))
      return;
    let issue = connection.issue;
    let verified = false;
    try {
      const token = await this.access(namespace, id, connection);
      const location = await googleFetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${connection.selected}?readMask=name,metadata`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const uri = location.metadata?.mapsUri;
      const reachable = uri ? await publicMapsStatus(uri) : false;
      if (reachable !== undefined) {
        issue = reachable ? undefined : "maps";
        verified = true;
      }
    } catch (error) {
      if (error instanceof GoogleFailure) {
        if ([401, 403].includes(error.status)) {
          issue = "authorization";
          verified = true;
        }
        if (error.status === 404 || error.status === 410) {
          issue = "location";
          verified = true;
        }
      }
    }
    await this.db.sql.query(
      "UPDATE google_business_connection SET data=(data-'issue') || $3::jsonb WHERE namespace=$1 AND id=$2 AND data->>'selected'=$4 AND data->>'encrypted'=$5",
      [
        namespace,
        id,
        JSON.stringify({ issue, checkedAt: new Date().toISOString() }),
        connection.selected,
        connection.encrypted,
      ],
    );
    return verified;
  }
  private monitoring = false;
  async monitor() {
    if (this.monitoring || !googleConfiguration().configured) return;
    this.monitoring = true;
    try {
      const rows = await this.db.sql.query<{
        namespace: string;
        id: string;
        data: Connection;
      }>(
        "SELECT namespace,id,data FROM google_business_connection WHERE data ? 'selected' AND (NOT data ? 'checkedAt' OR (data->>'checkedAt')::timestamptz < now()-interval '1 hour') ORDER BY data->>'checkedAt' NULLS FIRST LIMIT 50",
      );
      for (const row of rows.rows)
        await this.check(row.namespace, row.id, row.data);
    } finally {
      this.monitoring = false;
    }
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
        const old = await this.connection(grant.namespace, grant.userId);
        await this.save(grant.namespace, grant.userId, {
          selected: old?.selected,
          issue: old?.issue,
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
    if (req.method === "GET" && url.pathname === "/api/google/notice") {
      send(200, { issue: connection?.issue || null });
      return true;
    }
    if (req.method === "GET" && url.pathname === "/api/google/status") {
      const fresh =
        connection?.syncedAt &&
        Date.now() - Date.parse(connection.syncedAt) < 24 * 3600000;
      send(200, {
        ...config,
        connected: !!connection,
        selected: connection?.selected || "",
        issue: connection?.issue || null,
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
    if (
      req.method === "POST" &&
      url.pathname === "/api/google/check" &&
      connection.selected
    ) {
      const verified = await this.check(namespace, user.id, connection);
      send(200, { verified });
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
      await this.db.sql.query(
        "UPDATE google_business_connection SET data=data || $3::jsonb WHERE namespace=$1 AND id=$2",
        [
          namespace,
          user.id,
          JSON.stringify({ locations, syncedAt: connection.syncedAt }),
        ],
      );
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
      delete connection.checkedAt;
      await this.save(namespace, user.id, connection);
      await this.check(namespace, user.id, connection);
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
