// Google Cloud (Firestore) backend for MASTER TASKS and habits, so the same
// data appears in every browser/device instead of being stuck in one
// browser's local storage. Configuration is a Firebase Web SDK config
// object (public identifiers, safe to store client-side - see README's
// Privacy section for the same policy already applied to the Google
// Calendar OAuth Client ID) pasted into Settings and kept in this browser's
// local storage; the person then signs in with Google so every browser they
// sign into reads/writes the same Firestore documents under their uid.
import type { FirebaseApp } from "firebase/app";
import type { Firestore } from "firebase/firestore";
import type { Auth, User } from "firebase/auth";

const CONFIG_KEY = "jarvis_firebase_config";

export type CloudConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

function readConfig(): CloudConfig | null {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CloudConfig>;
    if (!parsed.apiKey || !parsed.projectId || !parsed.appId || !parsed.authDomain) return null;
    return parsed as CloudConfig;
  } catch { return null }
}

export function getStoredCloudConfig(): CloudConfig | null { return readConfig() }
export function saveCloudConfig(config: CloudConfig) { window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config)) }
export function clearCloudConfig() { window.localStorage.removeItem(CONFIG_KEY) }
export function isCloudConfigured(): boolean { return readConfig() !== null }

let appPromise: Promise<{ app: FirebaseApp; db: Firestore; auth: Auth }> | null = null;

async function getServices() {
  const config = readConfig();
  if (!config) throw new Error("Add your Firebase project config in Settings first.");
  if (!appPromise) {
    appPromise = (async () => {
      const [{ initializeApp, getApps }, { getFirestore }, { getAuth }] = await Promise.all([
        import("firebase/app"),
        import("firebase/firestore"),
        import("firebase/auth"),
      ]);
      const app = getApps().length ? getApps()[0] : initializeApp(config);
      return { app, db: getFirestore(app), auth: getAuth(app) };
    })();
  }
  return appPromise;
}

export async function onCloudUser(cb: (user: User | null) => void): Promise<() => void> {
  if (!isCloudConfigured()) { cb(null); return () => {} }
  try {
    const { auth } = await getServices();
    const { onAuthStateChanged } = await import("firebase/auth");
    return onAuthStateChanged(auth, cb);
  } catch { cb(null); return () => {} }
}

export async function signInWithGoogle(): Promise<void> {
  const { auth } = await getServices();
  const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutCloud(): Promise<void> {
  const { auth } = await getServices();
  const { signOut } = await import("firebase/auth");
  await signOut(auth);
}

export function getCloudUserSync(): User | null {
  if (!appPromise) return null;
  // Best-effort synchronous read for the already-initialized auth instance;
  // callers that need certainty should use onCloudUser instead.
  return currentUserCache;
}

let currentUserCache: User | null = null;
export async function primeCloudUser(): Promise<User | null> {
  if (!isCloudConfigured()) return null;
  return new Promise(resolve => {
    void onCloudUser(user => { currentUserCache = user; resolve(user) });
  });
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

async function requireUid(): Promise<string> {
  const user = currentUserCache ?? await primeCloudUser();
  if (!user) throw new Error("Sign in with Google in Settings to sync your data.");
  return user.uid;
}

async function listTasks(uid: string): Promise<StoredTask[]> {
  const { db } = await getServices();
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "users", uid, "tasks"));
  return snap.docs.map(d => d.data() as StoredTask).sort((a, b) => a.task_id.localeCompare(b.task_id));
}

export async function cloudTasks(init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const uid = await requireUid();
  const { db } = await getServices();
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  if (method === "GET") return json({ tasks: await listTasks(uid) });
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
  if (method === "POST") {
    if (!String(body.task ?? "").trim()) return json({ error: "Task is required" }, 400);
    const tasks = await listTasks(uid);
    const next = Math.max(0, ...tasks.map(task => Number(String(task.task_id).split("-")[1]) || 0)) + 1;
    const now = new Date().toISOString();
    const task = { id: Math.max(0, ...tasks.map(item => item.id)) + 1, ...body, task_id: `TASK-${String(next).padStart(4, "0")}`, created_at: now, updated_at: now } as StoredTask;
    await setDoc(doc(db, "users", uid, "tasks", task.task_id), task);
    return json({ task }, 201);
  }
  if (method === "PATCH") {
    const taskId = String(body.task_id ?? "");
    const ref = doc(db, "users", uid, "tasks", taskId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return json({ error: "Task not found" }, 404);
    const task = { ...snap.data(), ...body, updated_at: new Date().toISOString() };
    await setDoc(ref, task);
    return json({ task });
  }
  return json({ error: "Unsupported method" }, 405);
}

async function listDefinitions(uid: string): Promise<RoutineDefinition[]> {
  const { db } = await getServices();
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "users", uid, "routineDefinitions"));
  if (snap.empty) {
    const { doc, setDoc } = await import("firebase/firestore");
    await Promise.all(defaultRoutines.map(item => setDoc(doc(db, "users", uid, "routineDefinitions", String(item.id)), item)));
    return defaultRoutines;
  }
  return snap.docs.map(d => d.data() as RoutineDefinition).sort((a, b) => a.sort_order - b.sort_order);
}

function historyDocId(routine: string, date: string) { return `${date}__${routine}`.replace(/[^\w-]/g, "_") }

export async function cloudRoutines(url: URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const uid = await requireUid();
  const { db } = await getServices();
  const { collection, doc, getDocs, setDoc, deleteDoc, query, where } = await import("firebase/firestore");
  if (method === "GET") {
    const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const definitions = await listDefinitions(uid);
    const historyRef = collection(db, "users", uid, "routineHistory");
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
    const definitions = await listDefinitions(uid);
    if (definitions.some(item => item.name.toLowerCase() === name.toLowerCase())) return json({ error: "That habit already exists" }, 409);
    const item = { id: Math.max(0, ...definitions.map(value => value.id)) + 1, name, time, sort_order: definitions.length };
    await setDoc(doc(db, "users", uid, "routineDefinitions", String(item.id)), item);
    return json(item, 201);
  }
  if (method === "POST") {
    const routine = String(body.routine ?? ""), date = String(body.date ?? "");
    if (!routine || !date) return json({ error: "Routine and date are required" }, 400);
    const complete = body.complete ? 1 : 0;
    await setDoc(doc(db, "users", uid, "routineHistory", historyDocId(routine, date)), { routine, completion_date: date, complete });
    return json({ routine, date, complete: Boolean(complete) });
  }
  if (method === "PATCH") {
    const id = Number(body.id), name = String(body.name ?? "").trim(), time = String(body.time ?? "").trim();
    const definitions = await listDefinitions(uid);
    const current = definitions.find(item => item.id === id);
    if (!current || !name) return json({ error: "Habit not found" }, 404);
    if (definitions.some(item => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) return json({ error: "That habit already exists" }, 409);
    await setDoc(doc(db, "users", uid, "routineDefinitions", String(id)), { ...current, name, time });
    const historySnap = await getDocs(query(collection(db, "users", uid, "routineHistory"), where("routine", "==", current.name)));
    await Promise.all(historySnap.docs.map(d => setDoc(doc(db, "users", uid, "routineHistory", historyDocId(name, (d.data() as RoutineHistory).completion_date)), { ...d.data(), routine: name })));
    return json({ id, name, time, sort_order: current.sort_order });
  }
  if (method === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    await deleteDoc(doc(db, "users", uid, "routineDefinitions", String(id)));
    return json({ deleted: true, id });
  }
  return json({ error: "Unsupported method" }, 405);
}
