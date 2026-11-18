import type { DemoState } from "./types";
import { stateSchema, hasValidRelations } from "./schema";
import { apiEndpoint } from "@/lib/api";
import { readToken } from "@/auth/auth-client";

export const demoEndpoint = apiEndpoint;
export async function demoPost(
  path: string,
  data: unknown,
): Promise<DemoState> {
  const response = await fetch(demoEndpoint(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${readToken()}`,
    },
    body: JSON.stringify(data),
    keepalive: path.endsWith("/commands"),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error("Demo service unavailable");
  const parsed = stateSchema.parse(await response.json());
  if (!hasValidRelations(parsed)) throw Error("Invalid shared demo state");
  return parsed;
}
