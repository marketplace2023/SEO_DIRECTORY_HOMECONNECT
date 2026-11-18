import { test as base, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
export const origins = {
  web: "http://127.0.0.1:5194",
  contractor: "http://127.0.0.1:5195",
  admin: "http://127.0.0.1:5196",
};
export const test = base.extend<{ demoSession: string; autoLogin: boolean }>({
  autoLogin: [true, { option: true }],
  demoSession: [
    async ({}, use) => {
      await use(randomUUID());
    },
    { auto: true },
  ],
  context: async ({ context, demoSession, autoLogin }, use) => {
    const tokens: Record<string, string> = {};
    if (autoLogin) {
      for (const [application, email] of [
        ["web", "carolina@example.test"],
        ["contractor", "ruiz@example.test"],
        ["admin", "admin@example.test"],
      ] as const) {
        const response = await context.request.post(
          "http://127.0.0.1:5197/api/auth/login?session=" + demoSession,
          { data: { application, email, password: "Servinexo2026!" } },
        );
        if (!response.ok()) throw Error(await response.text());
        tokens[origins[application]] = (await response.json()).token;
      }
    }
    await context.addInitScript(
      ({ session, tokens }) => {
        localStorage.setItem("servinexo.demo-session", session);
        if (tokens[location.origin])
          localStorage.setItem(
            "servinexo.auth." + session,
            tokens[location.origin],
          );
      },
      { session: demoSession, tokens },
    );
    await use(context);
  },
});
export { expect };
