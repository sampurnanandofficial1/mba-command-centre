const TASKS_KEY = "jarvis_master_tasks_v1";
const ROUTINES_KEY = "jarvis_routine_definitions_v1";
const HISTORY_KEY = "jarvis_routine_history_v1";

type StoredTask = Record<string, unknown> & { id: number; task_id: string };
type RoutineDefinition = { id: number; name: string; time: string; sort_order: number };
type RoutineHistory = { routine: string; completion_date: string; complete: number };

const defaultRoutines: RoutineDefinition[] = [
  { id: 1, name: "Meditation", time: "07:00", sort_order: 0 },
  { id: 2, name: "Walking", time: "07:30", sort_order: 1 },
  { id: 3, name: "Breakfast", time: "09:00", sort_order: 2 },
  { id: 4, name: "Lunch", time: "13:30", sort_order: 3 },
  { id: 5, name: "Snacks", time: "17:30", sort_order: 4 },
  { id: 6, name: "Dinner", time: "21:00", sort_order: 5 },
];

import { cloudRoutines, cloudTasks, getCloudUserSync, isCloudConfigured, primeCloudUser } from "./cloud-sync";

declare global { interface Window { __JARVIS_STATIC__?: boolean } }

function read<T>(key: string, fallback: T): T {
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback }
  catch { return fallback }
}
function write<T>(key: string, value: T) { window.localStorage.setItem(key, JSON.stringify(value)) }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }) }
function addDays(date: string, count: number) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + count); return value.toISOString().slice(0, 10) }

async function staticTasks(init?: RequestInit) {
  const method = (init?.method ?? "GET").toUpperCase();
  const tasks = read<StoredTask[]>(TASKS_KEY, []);
  if (method === "GET") return json({ tasks });
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
  if (method === "POST") {
    if (!String(body.task ?? "").trim()) return json({ error: "Task is required" }, 400);
    const next = Math.max(0, ...tasks.map(task => Number(task.task_id.split("-")[1]) || 0)) + 1;
    const now = new Date().toISOString();
    const task = { id: Math.max(0, ...tasks.map(item => item.id)) + 1, ...body, task_id: `TASK-${String(next).padStart(4, "0")}`, created_at: now, updated_at: now } as StoredTask;
    write(TASKS_KEY, [...tasks, task]);
    return json({ task }, 201);
  }
  if (method === "PATCH") {
    const taskId = String(body.task_id ?? ""), index = tasks.findIndex(task => task.task_id === taskId);
    if (index < 0) return json({ error: "Task not found" }, 404);
    const task = { ...tasks[index], ...body, updated_at: new Date().toISOString() };
    const updated = [...tasks]; updated[index] = task; write(TASKS_KEY, updated);
    return json({ task });
  }
  return json({ error: "Unsupported method" }, 405);
}

async function staticRoutines(url: URL, init?: RequestInit) {
  const method = (init?.method ?? "GET").toUpperCase();
  const definitions = read<RoutineDefinition[]>(ROUTINES_KEY, defaultRoutines);
  const history = read<RoutineHistory[]>(HISTORY_KEY, []);
  if (!window.localStorage.getItem(ROUTINES_KEY)) write(ROUTINES_KEY, definitions);
  if (method === "GET") {
    const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    return json({ definitions, routines: history.filter(item => item.completion_date === date), history: history.filter(item => item.completion_date >= addDays(date, -29) && item.completion_date <= date), windowDays: 30 });
  }
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
  if (method === "POST" && body.action === "create") {
    const name = String(body.name ?? "").trim(), time = String(body.time ?? "").trim();
    if (!name) return json({ error: "Habit name is required" }, 400);
    if (definitions.some(item => item.name.toLowerCase() === name.toLowerCase())) return json({ error: "That habit already exists" }, 409);
    const item = { id: Math.max(0, ...definitions.map(value => value.id)) + 1, name, time, sort_order: definitions.length };
    write(ROUTINES_KEY, [...definitions, item]); return json(item, 201);
  }
  if (method === "POST") {
    const routine = String(body.routine ?? ""), date = String(body.date ?? "");
    if (!routine || !date) return json({ error: "Routine and date are required" }, 400);
    const next = history.filter(item => !(item.routine === routine && item.completion_date === date));
    next.push({ routine, completion_date: date, complete: body.complete ? 1 : 0 }); write(HISTORY_KEY, next);
    return json({ routine, date, complete: Boolean(body.complete) });
  }
  if (method === "PATCH") {
    const id = Number(body.id), name = String(body.name ?? "").trim(), time = String(body.time ?? "").trim();
    const current = definitions.find(item => item.id === id);
    if (!current || !name) return json({ error: "Habit not found" }, 404);
    write(ROUTINES_KEY, definitions.map(item => item.id === id ? { ...item, name, time } : item));
    write(HISTORY_KEY, history.map(item => item.routine === current.name ? { ...item, routine: name } : item));
    return json({ ...current, name, time });
  }
  if (method === "DELETE") { const id = Number(url.searchParams.get("id")); write(ROUTINES_KEY, definitions.filter(item => item.id !== id)); return json({ deleted: true, id }) }
  return json({ error: "Unsupported method" }, 405);
}

// Callers destructure arbitrary API response shapes (`d.tasks`, `d.error`, ...),
// matching native fetch's untyped Response#json(); keep that contract explicit.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<any> {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (typeof window === "undefined" || !window.__JARVIS_STATIC__ || !raw.startsWith("/api/")) return fetch(input, init);
  const url = new URL(raw, window.location.origin);
  if (isCloudConfigured()) {
    const user = getCloudUserSync() ?? await primeCloudUser();
    if (user) {
      if (url.pathname === "/api/tasks") return cloudTasks(init);
      if (url.pathname === "/api/routines") return cloudRoutines(url, init);
    }
  }
  if (url.pathname === "/api/tasks") return staticTasks(init);
  if (url.pathname === "/api/routines") return staticRoutines(url, init);
  return json({ error: "Not found" }, 404);
}
