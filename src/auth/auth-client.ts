import { apiEndpoint } from "@/lib/api";
import type { AuthSession, AuthUser, RegisterInput } from "./types";
export function authKey(): string {
  return `servinexo.auth.${localStorage.getItem("servinexo.demo-session") || "default"}`;
}
export function readToken(): string {
  try {
    return localStorage.getItem(authKey()) || "";
  } catch {
    return "";
  }
}
export function saveToken(token: string) {
  try {
    if (token) localStorage.setItem(authKey(), token);
    else localStorage.removeItem(authKey());
  } catch {
    /* The current session remains in memory. */
  }
}
export async function authRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(apiEndpoint("/api/auth/" + path), {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${readToken()}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "No se pudo conectar con el servicio de cuentas.",
    );
  return data;
}
export const loginAccount = (
  email: string,
  password: string,
  application: string,
) => authRequest<AuthSession>("login", { email, password, application });
export const registerAccount = (input: RegisterInput) =>
  authRequest<AuthSession>("register", input);
export const loadAccount = () => authRequest<{ user: AuthUser }>("me");
