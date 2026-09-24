// Google Cloud (Firestore) backend for MASTER TASKS and habits, so the same
// data appears in every browser/device instead of being stuck in one
// browser's local storage. This config is a Firebase Web SDK config object -
// a public identifier, safe to ship in client code (Google's own docs treat
// it the same way as the Google Calendar OAuth Client ID already used in
// this app). There is one single shared task list, with no per-account
// sign-in step, so every visitor to this app sees and edits the same data.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCgsU_8aEFEJR7id8rWceJe5gPYZEwrFT0",
  authDomain: "mba-tracker-708b8.firebaseapp.com",
  projectId: "mba-tracker-708b8",
  storageBucket: "mba-tracker-708b8.firebasestorage.app",
  messagingSenderId: "833521665799",
  appId: "1:833521665799:web:dde180c6d6775dac9567a2",
};

import type { FirebaseApp } from "firebase/app";
import type { Firestore } from "firebase/firestore";

let appPromise: Promise<{ app: FirebaseApp; db: Firestore }> | null = null;

async function getServices() {
  if (!appPromise) {
    const promise = (async () => {
      const [{ initializeApp, getApps }, { getFirestore }] = await Promise.all([
        import("firebase/app"),
        import("firebase/firestore"),
      ]);
      const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
      return { app, db: getFirestore(app) };
    })();
    promise.catch(() => { appPromise = null; });
    appPromise = promise;
  }
  return appPromise;
}

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }) }
function addDays(date: string, count: number) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + count); return value.toISOString().slice(0, 10) }

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

async function listTasks(): Promise<StoredTask[]> {
  const { db } = await getServices();
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "tasks"));
  return snap.docs.map(d => d.data() as StoredTask).sort((a, b) => a.task_id.localeCompare(b.task_id));
}

export async function cloudTasks(init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const { db } = await getServices();
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  if (method === "GET") return json({ tasks: await listTasks() });
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
  if (method === "POST") {
    if (!String(body.task ?? "").trim()) return json({ error: "Task is required" }, 400);
    const tasks = await listTasks();
    const next = Math.max(0, ...tasks.map(task => Number(String(task.task_id).split("-")[1]) || 0)) + 1;
    const now = new Date().toISOString();
    const task = { id: Math.max(0, ...tasks.map(item => item.id)) + 1, ...body, task_id: `TASK-${String(next).padStart(4, "0")}`, created_at: now, updated_at: now } as StoredTask;
    await setDoc(doc(db, "tasks", task.task_id), task);
    return json({ task }, 201);
  }
  if (method === "PATCH") {
    const taskId = String(body.task_id ?? "");
    const ref = doc(db, "tasks", taskId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return json({ error: "Task not found" }, 404);
    const task = { ...snap.data(), ...body, updated_at: new Date().toISOString() };
    await setDoc(ref, task);
    return json({ task });
  }
  return json({ error: "Unsupported method" }, 405);
}

async function listDefinitions(): Promise<RoutineDefinition[]> {
  const { db } = await getServices();
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "routineDefinitions"));
  if (snap.empty) {
    const { doc, setDoc } = await import("firebase/firestore");
    await Promise.all(defaultRoutines.map(item => setDoc(doc(db, "routineDefinitions", String(item.id)), item)));
    return defaultRoutines;
  }
  return snap.docs.map(d => d.data() as RoutineDefinition).sort((a, b) => a.sort_order - b.sort_order);
}

function historyDocId(routine: string, date: string) { return `${date}__${routine}`.replace(/[^\w-]/g, "_") }

export async function cloudRoutines(url: URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const { db } = await getServices();
  const { collection, doc, getDocs, setDoc, deleteDoc, query, where } = await import("firebase/firestore");
  if (method === "GET") {
    const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const definitions = await listDefinitions();
    const historyRef = collection(db, "routineHistory");
    const historySnap = await getDocs(query(historyRef, where("completion_date", ">=", addDays(date, -29)), where("completion_date", "<=", date)));
    const history = historySnap.docs.map(d => d.data() as RoutineHistory);
    return json({
      definitions,
      routines: history.filter(item => item.completion_date === date),
      history,
      windowDays: 30,
    });
  }
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
  if (method === "POST" && body.action === "create") {
    const name = String(body.name ?? "").trim(), time = String(body.time ?? "").trim();
    if (!name) return json({ error: "Habit name is required" }, 400);
    const definitions = await listDefinitions();
    if (definitions.some(item => item.name.toLowerCase() === name.toLowerCase())) return json({ error: "That habit already exists" }, 409);
    const item = { id: Math.max(0, ...definitions.map(value => value.id)) + 1, name, time, sort_order: definitions.length };
    await setDoc(doc(db, "routineDefinitions", String(item.id)), item);
    return json(item, 201);
  }
  if (method === "POST") {
    const routine = String(body.routine ?? ""), date = String(body.date ?? "");
    if (!routine || !date) return json({ error: "Routine and date are required" }, 400);
    const complete = body.complete ? 1 : 0;
    await setDoc(doc(db, "routineHistory", historyDocId(routine, date)), { routine, completion_date: date, complete });
    return json({ routine, date, complete: Boolean(complete) });
  }
  if (method === "PATCH") {
    const id = Number(body.id), name = String(body.name ?? "").trim(), time = String(body.time ?? "").trim();
    const definitions = await listDefinitions();
    const current = definitions.find(item => item.id === id);
    if (!current || !name) return json({ error: "Habit not found" }, 404);
    if (definitions.some(item => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) return json({ error: "That habit already exists" }, 409);
    await setDoc(doc(db, "routineDefinitions", String(id)), { ...current, name, time });
    const historySnap = await getDocs(query(collection(db, "routineHistory"), where("routine", "==", current.name)));
    await Promise.all(historySnap.docs.map(d => setDoc(doc(db, "routineHistory", historyDocId(name, (d.data() as RoutineHistory).completion_date)), { ...d.data(), routine: name })));
    return json({ id, name, time, sort_order: current.sort_order });
  }
  if (method === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    await deleteDoc(doc(db, "routineDefinitions", String(id)));
    return json({ deleted: true, id });
  }
  return json({ error: "Unsupported method" }, 405);
}
