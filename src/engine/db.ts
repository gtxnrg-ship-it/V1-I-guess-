// Everything Kuro-chan knows lives in this browser (IndexedDB). Nothing is sent to any server of ours.
import { useSyncExternalStore } from "react";
import type { KeyRec, Message, Project, Settings, Snapshot, UsageDay } from "./types";
import { containsSensitiveMemoryText, sanitizeProjectMemoryFacts } from "./project-memory";
import { filterPersistableCredentials, getGitHubSession, getGitHubSessionToken } from "./github-session";

export interface State {
  ready: boolean;
  persistent: boolean;
  keys: KeyRec[];
  projects: Project[];
  messages: Record<string, Message[]>;
  snapshots: Record<string, Snapshot[]>;
  settings: Settings;
  busy: boolean;
  runtimeErrors: string[];
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const today = () => new Date().toISOString().slice(0, 10);

let state: State = {
  ready: false,
  persistent: false,
  keys: [],
  projects: [],
  messages: {},
  snapshots: {},
  settings: { activeProject: "", freeStarter: true, roleOverrides: {}, usage: {} },
  busy: false,
  runtimeErrors: [],
};

// ───────────── tiny IndexedDB key/value layer with in-memory fallback ─────────────
let dbp: Promise<IDBDatabase | null> | null = null;
function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const req = indexedDB.open("kuro-chan", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
      req.onblocked = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
async function idbAll(): Promise<Record<string, any> | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((res) => {
    try {
      const out: Record<string, any> = {};
      const tx = db.transaction("kv", "readonly");
      const st = tx.objectStore("kv");
      const cur = st.openCursor();
      cur.onsuccess = () => { const c = cur.result; if (c) { out[String(c.key)] = c.value; c.continue(); } else res(out); };
      cur.onerror = () => res(null);
    } catch { res(null); }
  });
}
async function idbWrite(key: string, value: any, remove = false): Promise<boolean> {
  const db = await open();
  if (!db) return false;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    try {
      const tx = db.transaction("kv", "readwrite");
      const store = tx.objectStore("kv");
      if (remove) store.delete(key);
      else store.put(value, key);
      tx.oncomplete = () => finish(true);
      tx.onerror = () => finish(false);
      tx.onabort = () => finish(false);
    } catch {
      finish(false);
    }
  });
}
async function idbPut(key: string, value: any): Promise<boolean> {
  return idbWrite(key, value);
}
async function idbDel(key: string): Promise<boolean> {
  return idbWrite(key, undefined, true);
}

// ───────────── reactive store ─────────────
const listeners = new Set<() => void>();
let emitQueued = false;
function emit() {
  if (emitQueued) return;
  emitQueued = true;
  queueMicrotask(() => { emitQueued = false; state = { ...state }; listeners.forEach((l) => l()); });
}
export const getState = () => state;
export function useKuro(): State {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}

// The version lets a write remove a dirty key only if no newer edit arrived
// while IndexedDB was committing the earlier snapshot.
const dirty = new Map<string, number>();
let dirtyVersion = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight: Promise<void> | null = null;

function persist(...keys: string[]) {
  keys.forEach((k) => dirty.set(k, ++dirtyVersion));
  emit();
  if (saveTimer) return;
  saveTimer = setTimeout(() => { void flush(); }, 350);
}

function persistedValue(key: string): any {
  if (key === "keys") return filterPersistableCredentials(state.keys);
  if (key === "projects") return state.projects;
  if (key === "settings") return state.settings;
  if (key.startsWith("messages:")) return state.messages[key.slice(9)] || [];
  if (key.startsWith("snapshots:")) return state.snapshots[key.slice(10)] || [];
  return undefined;
}

/**
 * Wait for IndexedDB transaction completion. Dirty keys remain queued if storage
 * is unavailable or a transaction fails, so a later explicit flush/edit can retry.
 * Concurrent flushes share one promise; edits made during a write keep a newer
 * version and cannot be accidentally cleared by the older transaction.
 */
export function flush(): Promise<void> {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (flushInFlight) return flushInFlight;

  const pending = [...dirty.entries()];
  const work = async () => {
    for (const [key, version] of pending) {
      const ok = await idbPut(key, persistedValue(key));
      if (ok && dirty.get(key) === version) dirty.delete(key);
    }
  };
  flushInFlight = work().finally(() => {
    flushInFlight = null;
    // If edits arrived while the transaction was in flight, drain those newer
    // versions once the current batch settles. Failed unchanged keys stay dirty
    // for a later retry rather than creating a tight retry loop.
    const newerEditsRemain = [...dirty.entries()].some(([key, version]) =>
      !pending.some(([pendingKey, pendingVersion]) => pendingKey === key && pendingVersion === version)
    );
    if (newerEditsRemain && !saveTimer) {
      saveTimer = setTimeout(() => { void flush(); }, 0);
    }
  });
  return flushInFlight;
}
if (typeof window !== "undefined") {
  // Lifecycle events are best-effort; ordinary debounced writes still do the
  // durable work, and failed writes remain dirty rather than being discarded.
  const flushOnHide = () => { void flush(); };
  window.addEventListener("pagehide", flushOnHide);
  window.addEventListener("beforeunload", flushOnHide);
}

export function set(patch: Partial<State>) { state = { ...state, ...patch }; emit(); }

export async function init(seed: () => Record<string, string>) {
  const all = await idbAll();
  if (all) {
    state.persistent = true;
    state.keys = filterPersistableCredentials(all.keys || []);
    // Remove legacy GitHub tokens previously saved in the ordinary IndexedDB store.
    if ((all.keys || []).length !== state.keys.length) idbPut("keys", state.keys);
    state.projects = all.projects || [];
    if (all.settings) state.settings = { ...state.settings, ...all.settings };
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith("messages:")) state.messages[k.slice(9)] = v;
      if (k.startsWith("snapshots:")) state.snapshots[k.slice(10)] = v;
    }
  }
  if (!state.projects.length) createProject("New chat", seed());
  // Older installs started with a misleading placeholder name. Rename only an untouched default project.
  const initial = state.projects.find((p) => p.id === state.settings.activeProject);
  if (initial?.name === "My App" && !initial.repo && Object.keys(initial.files || {}).length === 0) {
    state.projects = state.projects.map((p) => p.id === initial.id ? { ...p, name: "New chat" } : p);
    persist("projects");
  }
  if (!state.projects.some((p) => p.id === state.settings.activeProject)) state.settings.activeProject = state.projects[0].id;
  state.ready = true;
  emit();
}

// ───────────── projects & files ─────────────
export const project = (): Project => state.projects.find((p) => p.id === state.settings.activeProject) || state.projects[0];
export const files = () => project().files;

export function createProject(name: string, f: Record<string, string>) {
  const p: Project = { id: uid(), name, repo: null, env: {}, files: f, createdAt: Date.now(), updatedAt: Date.now() };
  state.projects = [...state.projects, p];
  state.settings = { ...state.settings, activeProject: p.id };
  persist("projects", "settings");
  return p;
}
export function updateProject(id: string, patch: Partial<Project>) {
  state.projects = state.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p));
  persist("projects");
}

/** Persist bounded project-memory entries inside the project record (no new storage database). */
export function saveProjectMemory(
  patch: Partial<NonNullable<Project["memory"]>>,
  id = project().id,
) {
  const target = state.projects.find((p) => p.id === id);
  if (!target) return false;
  const previous = target.memory || { facts: [], decisions: [], openQuestions: [] };
  const facts = patch.facts ?? previous.facts;
  const decisions = patch.decisions ?? previous.decisions;
  const openQuestions = patch.openQuestions ?? previous.openQuestions;
  const summary = patch.recentSummary === undefined ? previous.recentSummary : patch.recentSummary;
  updateProject(id, {
    memory: {
      ...previous,
      ...patch,
      facts: sanitizeProjectMemoryFacts(facts).slice(-40),
      decisions: sanitizeProjectMemoryFacts(decisions).slice(-40),
      openQuestions: [...new Set(openQuestions
        .filter((q) => typeof q === "string" && !containsSensitiveMemoryText(q))
        .map((q) => q.replace(/[\u0000-\u001f\u007f]/g, " ").trim())
        .filter(Boolean))].slice(-20),
      recentSummary: summary === undefined ? previous.recentSummary
        : containsSensitiveMemoryText(summary) ? "" : summary.slice(0, 1800),
      observedAt: patch.observedAt ?? Date.now(),
    },
  });
  return true;
}
export function deleteProject(id: string) {
  const exists = state.projects.some((p) => p.id === id);
  if (!exists) return;

  state.projects = state.projects.filter((p) => p.id !== id);
  delete state.messages[id];
  delete state.snapshots[id];
  idbDel(`messages:${id}`);
  idbDel(`snapshots:${id}`);

  // The studio assumes an active project always exists. Deleting the final
  // project must therefore create a clean workspace rather than leave every
  // project-scoped accessor pointing at undefined.
  if (state.projects.length === 0) {
    const replacement: Project = {
      id: uid(),
      name: "New chat",
      repo: null,
      env: {},
      files: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state.projects = [replacement];
    state.settings = { ...state.settings, activeProject: replacement.id };
  } else if (state.settings.activeProject === id
    || !state.projects.some((p) => p.id === state.settings.activeProject)) {
    state.settings = { ...state.settings, activeProject: state.projects[0].id };
  }
  state.runtimeErrors = [];
  persist("projects", "settings");
}

/** Switch only to an existing workspace; stale UI IDs must not corrupt active state. */
export function switchProject(id: string): boolean {
  if (!state.projects.some((p) => p.id === id)) return false;
  state.settings = { ...state.settings, activeProject: id };
  state.runtimeErrors = [];
  persist("settings");
  return true;
}

export function writeFile(path: string, content: string, projectId = project().id) {
  const target = state.projects.find((p) => p.id === projectId);
  if (!target) throw new Error("Cannot write to a project that no longer exists.");
  updateProject(target.id, { files: { ...target.files, [path]: content } });
}
export function deleteFile(path: string, projectId = project().id) {
  const target = state.projects.find((p) => p.id === projectId);
  if (!target) throw new Error("Cannot delete a file from a project that no longer exists.");
  const nextFiles = { ...target.files }; delete nextFiles[path];
  updateProject(target.id, { files: nextFiles });
}
export function replaceFiles(f: Record<string, string>) { updateProject(project().id, { files: { ...f } }); }

// ───────────── messages ─────────────
export const messages = (pid = project().id) => state.messages[pid] || [];
export function addMessage(m: Omit<Message, "id" | "createdAt" | "projectId">, pid = project().id): Message {
  const msg: Message = { ...m, id: uid(), projectId: pid, createdAt: Date.now() };
  state.messages = { ...state.messages, [pid]: [...messages(pid), msg] };
  persist(`messages:${pid}`);
  return msg;
}
export function updateMessage(pid: string, id: string, fn: (m: Message) => Message) {
  state.messages = { ...state.messages, [pid]: messages(pid).map((m) => (m.id === id ? fn(m) : m)) };
  persist(`messages:${pid}`);
}
export function clearMessages(pid = project().id) { state.messages = { ...state.messages, [pid]: [] }; persist(`messages:${pid}`); }

// ───────────── restore points ─────────────
export const snapshots = (pid = project().id) => state.snapshots[pid] || [];

function snapshotProject(target: Project, label: string): Snapshot {
  const s: Snapshot = {
    id: uid(),
    projectId: target.id,
    label,
    files: { ...target.files },
    createdAt: Date.now(),
  };
  state.snapshots = {
    ...state.snapshots,
    [target.id]: [...snapshots(target.id), s].slice(-40),
  };
  persist(`snapshots:${target.id}`);
  return s;
}

export function takeSnapshot(label: string, projectId = project().id): Snapshot {
  const target = state.projects.find((p) => p.id === projectId);
  if (!target) throw new Error("Cannot create a checkpoint for a project that no longer exists.");
  return snapshotProject(target, label);
}

export type SnapshotRestoreResult =
  | { ok: true; safetySnapshotId: string }
  | { ok: false; reason: "project-not-found" | "snapshot-not-found" | "invalid-snapshot" };

/**
 * Restore a checkpoint only within its owning project. A safety checkpoint is
 * recorded before replacing files so the operation itself can be undone.
 */
export function restoreSnapshot(snapshotId: string, projectId = project().id): SnapshotRestoreResult {
  const target = state.projects.find((p) => p.id === projectId);
  if (!target) return { ok: false, reason: "project-not-found" };

  const saved = snapshots(projectId).find((s) => s.id === snapshotId && s.projectId === projectId);
  if (!saved) return { ok: false, reason: "snapshot-not-found" };
  if (!saved.files || typeof saved.files !== "object" || Array.isArray(saved.files)
    || Object.entries(saved.files).some(([path, content]) => !path || typeof content !== "string")) {
    return { ok: false, reason: "invalid-snapshot" };
  }

  const safety = snapshotProject(target, "Before restore");
  updateProject(projectId, { files: { ...saved.files } });
  return { ok: true, safetySnapshotId: safety.id };
}

// ───────────── keys ─────────────
export function addKey(k: KeyRec) { state.keys = [...state.keys, k]; persist("keys"); }
export function updateKey(id: string, patch: Partial<KeyRec>) { state.keys = state.keys.map((k) => (k.id === id ? { ...k, ...patch } : k)); persist("keys"); }
export function removeKey(id: string) { state.keys = state.keys.filter((k) => k.id !== id); persist("keys"); }
export const keyOf = (provider: string): KeyRec | undefined => {
  const saved = state.keys.find((key) => key.provider === provider && key.status !== "disabled");
  if (provider !== "github") return saved;
  const token = getGitHubSessionToken();
  const session = getGitHubSession();
  if (!token || !session) return saved;
  return {
    id: "github-runtime-session", label: `GitHub · ${session.login}`, kind: "github", provider: "github",
    secret: token, hint: "Runtime-only sign-in session", models: [], status: "active",
    requests: 0, errors: 0, login: session.login, createdAt: session.connectedAt,
  };
};

// ───────────── settings & usage ─────────────
export function setSettings(patch: Partial<Settings>) { state.settings = { ...state.settings, ...patch }; persist("settings"); }
export function recordUsage(keyId: string, u: { input?: number; output?: number; error?: boolean }) {
  const d = today();
  const usage = { ...state.settings.usage };
  const day = { ...(usage[d] || {}) };
  const cur: UsageDay = { ...(day[keyId] || { calls: 0, input: 0, output: 0, errors: 0 }) };
  if (u.error) cur.errors++; else cur.calls++;
  cur.input += u.input || 0; cur.output += u.output || 0;
  day[keyId] = cur; usage[d] = day;
  for (const k of Object.keys(usage).sort().slice(0, -14)) delete usage[k];
  state.settings = { ...state.settings, usage };
  persist("settings");
}