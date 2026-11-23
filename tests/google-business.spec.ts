import { test, expect } from "@playwright/test";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Database } from "../server/database/database";
import {
  GoogleBusiness,
  decryptToken,
} from "../server/google/business-profile";
import { randomBytes, createHash } from "node:crypto";
test("Google: OAuth con PKCE, control de cuenta, renovación, selección y desconexión sin exponer tokens", async () => {
  test.setTimeout(60000);
  const settings = {
    GOOGLE_CLIENT_ID: "test-client",
    GOOGLE_CLIENT_SECRET: "test-secret",
    GOOGLE_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    GOOGLE_REDIRECT_URI: "http://127.0.0.1:5197/api/google/callback",
    GOOGLE_API_ACCESS_APPROVED: "true",
  };
  const previous = Object.fromEntries(
      Object.keys(settings).map((key) => [key, process.env[key]]),
    ),
    originalFetch = globalThis.fetch;
  Object.assign(process.env, settings);
  const db = new Database();
  try {
    await db.initialize();
    const service = new GoogleBusiness(db);
    const user = {
      id: "contractor-qa",
      name: "Test",
      email: "qa@example.test",
      role: "contractor" as const,
      demo: false,
      emailVerified: true,
      professionalId: "profile-qa",
    };
    async function invoke(
      path: string,
      method: string,
      body?: any,
      cookie = "",
      identity: typeof user | null = user,
    ) {
      let code = 0,
        data: any,
        headers: Record<string, any> = {};
      const res = {
        setHeader: (key: string, value: any) => {
          headers[key] = value;
        },
        writeHead: (status: number, value: any) => {
          code = status;
          Object.assign(headers, value);
        },
        end: () => {},
      } as unknown as ServerResponse;
      await service.route(
        { method, headers: { cookie } } as IncomingMessage,
        res,
        new URL("http://127.0.0.1:5197" + path),
        identity,
        "qa",
        (status, value) => {
          code = status;
          data = value;
        },
        body,
      );
      return { code, data, headers };
    }
    const start = await invoke("/api/google/connect", "POST", {});
    expect(start.code).toBe(200);
    const authorization = new URL(start.data.authorizationUrl),
      state = authorization.searchParams.get("state")!,
      cookie = start.headers["Set-Cookie"].split(";")[0];
    expect(authorization.searchParams.get("code_challenge_method")).toBe(
      "S256",
    );
    const grant = (
      await db.sql.query<{ data: any }>(
        "SELECT data FROM google_oauth_state WHERE id=$1",
        [state],
      )
    ).rows[0].data;
    expect(authorization.searchParams.get("code_challenge")).toBe(
      createHash("sha256").update(grant.verifier).digest("base64url"),
    );
    expect(
      (
        await invoke(
          "/api/google/callback?state=" + state + "&code=fake",
          "GET",
          undefined,
          "hc_google_state=wrong",
          null,
        )
      ).code,
    ).toBe(400);
    const calls: string[] = [];
    let publicStatus = 404;
    let profileStatus = 200;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith("https://maps.google.com/"))
        return new Response("", { status: publicStatus });
      if (url.includes("/v1/locations/456?"))
        return new Response(
          JSON.stringify({
            metadata: { mapsUri: "https://maps.google.com/?cid=456" },
          }),
          { status: profileStatus },
        );
      if (url.includes("/token"))
        return new Response(
          JSON.stringify({
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
            expires_in: 3600,
            scope: "https://www.googleapis.com/auth/business.manage",
          }),
        );
      if (url.includes("accountmanagement"))
        return new Response(
          JSON.stringify({ accounts: [{ name: "accounts/123" }] }),
        );
      if (url.includes("businessinformation"))
        return new Response(
          JSON.stringify({
            locations: [
              {
                name: "locations/456",
                title: "Authorized Georgia Business",
                phoneNumbers: { primaryPhone: "+1 555 0100" },
              },
            ],
          }),
        );
      if (url.includes("/revoke")) return new Response("{}");
      throw Error("Unexpected URL " + url);
    };
    const callback = await invoke(
      "/api/google/callback?state=" + state + "&code=test-code",
      "GET",
      undefined,
      cookie,
      null,
    );
    expect(callback.code).toBe(303);
    expect(
      (
        await invoke(
          "/api/google/callback?state=" + state + "&code=reused",
          "GET",
          undefined,
          cookie,
          null,
        )
      ).code,
    ).toBe(400);
    let row = (
      await db.sql.query<{ data: any }>(
        "SELECT data FROM google_business_connection WHERE namespace=$1 AND id=$2",
        ["qa", user.id],
      )
    ).rows[0].data;
    expect(row.encrypted).not.toContain("test-access-token");
    expect(decryptToken(row.encrypted).refresh_token).toBe(
      "test-refresh-token",
    );
    row.expires = 0;
    await db.sql.query(
      "UPDATE google_business_connection SET data=$1 WHERE namespace=$2 AND id=$3",
      [JSON.stringify(row), "qa", user.id],
    );
    expect((await invoke("/api/google/sync", "POST", {})).data.count).toBe(1);
    const status = (await invoke("/api/google/status", "GET")).data;
    expect(status.locations[0].title).toBe("Authorized Georgia Business");
    expect(JSON.stringify(status)).not.toContain("test-access-token");
    expect(
      (
        await invoke("/api/google/status", "GET", undefined, "", {
          ...user,
          id: "another-account",
        })
      ).data.connected,
    ).toBe(false);
    expect(
      (await invoke("/api/google/location", "POST", { name: "locations/999" }))
        .code,
    ).toBe(400);
    expect(
      (await invoke("/api/google/location", "POST", { name: "locations/456" }))
        .code,
    ).toBe(200);
    const issue = async () =>
      (await invoke("/api/google/notice", "GET")).data.issue;
    expect(await issue()).toBe("maps");
    publicStatus = 503;
    expect((await invoke("/api/google/check", "POST", {})).data.verified).toBe(
      false,
    );
    expect(await issue()).toBe("maps");
    publicStatus = 200;
    await invoke("/api/google/check", "POST", {});
    expect(await issue()).toBeNull();
    profileStatus = 403;
    await db.sql.query(
      "UPDATE google_business_connection SET data=data-'checkedAt'",
    );
    await service.monitor();
    expect(await issue()).toBe("authorization");
    profileStatus = 404;
    await invoke("/api/google/check", "POST", {});
    expect(await issue()).toBe("location");
    expect((await invoke("/api/google/disconnect", "POST", {})).code).toBe(200);
    expect(await issue()).toBeNull();
    expect((await invoke("/api/google/status", "GET")).data.connected).toBe(
      false,
    );
    expect(calls.some((url) => url.includes("/revoke"))).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await db.close();
  }
});
