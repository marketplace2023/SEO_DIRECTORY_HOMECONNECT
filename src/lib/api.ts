export function apiEndpoint(path: string): string {
  let session = "default";
  try {
    session = localStorage.getItem("servinexo.demo-session") || session;
  } catch {
    /* Storage is optional. */
  }
  const origin =
    import.meta.env?.VITE_DEMO_API_ORIGIN || "http://127.0.0.1:5190";
  return `${origin}${path}?session=${encodeURIComponent(session)}`;
}
