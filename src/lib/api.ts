export function apiEndpoint(path: string): string {
  let session = "default";
  try {
    session = localStorage.getItem("servinexo.demo-session") || session;
  } catch {
    /* Storage is optional. */
  }
  const origin =
    import.meta.env?.VITE_DEMO_API_ORIGIN || "http://127.0.0.1:5190";
  // A relative origin keeps CloudFront requests on each portal's own domain.
  const endpoint = new URL(path, new URL(origin, window.location.origin));
  endpoint.searchParams.set("session", session);
  return endpoint.toString();
}
