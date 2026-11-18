import { apiEndpoint } from "./api";
import { readToken } from "@/auth/auth-client";
export async function apiRequest<T = any>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(apiEndpoint(path), {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${readToken()}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error || "No se pudo completar la operación.");
  return data;
}
