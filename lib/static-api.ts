import { cloudRoutines, cloudTasks } from "./cloud-sync";

declare global { interface Window { __JARVIS_STATIC__?: boolean } }

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }) }

// Callers destructure arbitrary API response shapes (`d.tasks`, `d.error`, ...),
// matching native fetch's untyped Response#json(); keep that contract explicit.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<any> {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (typeof window === "undefined" || !window.__JARVIS_STATIC__ || !raw.startsWith("/api/")) return fetch(input, init);
  const url = new URL(raw, window.location.origin);
  if (url.pathname === "/api/tasks") return cloudTasks(init);
  if (url.pathname === "/api/routines") return cloudRoutines(url, init);
  return json({ error: "Not found" }, 404);
}
