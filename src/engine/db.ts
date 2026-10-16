// Everything Kuro-chan knows lives in this browser (IndexedDB). Nothing is sent to any server of ours.
import { useSyncExternalStore } from "react";
import type { KeyRec, Message, Project, Settings, Snapshot, UsageDay } from "./types";
import { containsSensitiveMemoryText, sanitizeProjectMemoryFacts } from "./project-memory";

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
async function idbPut(key: string, value: any) {
  const db = await open();
  if (!db) return;
  try { db.transaction("kv", "readwrite").objectStore("kv").put(value, key); } catch { /* quota etc */ }
}
async function idbDel(key: string) {
  const db = await open();
  if (!db) return;
  try { db.transaction("kv", "readwrite").objectStore("kv").delete(key); } catch { /* */ }
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

const dirty = new Set<string>();
let saveTimer: any = null;
function persist(...keys: string[]) {
  keys.forEach((k) => dirty.add(k));
  emit();
  if (saveTimer) return;
  saveTimer = setTimeout(flush, 350);
}
export function flush() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const ks = [...dirty]; dirty.clear();
  for (const k of ks) {
    if (k === "keys") idbPut(k, state.keys);
    else if (k === "projects") idbPut(k, state.projects);
    else if (k === "settings") idbPut(k, state.settings);
    else if (k.startsWith("messages:")) idbPut(k, state.messages[k.slice(9)] || []);
    else if (k.startsWith("snapshots:")) idbPut(k, state.snapshots[k.slice(10)] || []);
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
}

export function set(patch: Partial<State>) { state = { ...state, ...patch }; emit(); }

export async function init(seed: () => Record<string, string>) {
  const all = await idbAll();
  if (all) {
    state.persistent = true;
    state.keys = all.keys || [];
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
  if (initial?.name === "My App" && !initial.repo && !state.messages[initial.id]?.length) {
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
  state.projects = state.projects.filter((p) => p.id !== id);
  delete state.messages[id]; delete state.snapshots[id];
  idbDel(`messages:${id}`); idbDel(`snapshots:${id}`);
  if (state.settings.activeProject === id && state.projects[0]) state.settings = { ...state.settings, activeProject: state.projects[0].id };
  persist("projects", "settings");
}
export function switchProject(id: string) { state.settings = { ...state.settings, activeProject: id }; state.runtimeErrors = []; persist("settings"); }

export function writeFile(path: string, content: string) {
  const p = project();
  updateProject(p.id, { files: { ...p.files, [path]: content } });
}
export function deleteFile(path: string) {
  const p = project();
  const f = { ...p.files }; delete f[path];
  updateProject(p.id, { files: f });
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
export function takeSnapshot(label: string): Snapshot {
  const p = project();
  const s: Snapshot = { id: uid(), projectId: p.id, label, files: { ...p.files }, createdAt: Date.now() };
  state.snapshots = { ...state.snapshots, [p.id]: [...snapshots(p.id), s].slice(-40) };
  persist(`snapshots:${p.id}`);
  return s;
}

// ───────────── keys ─────────────
export function addKey(k: KeyRec) { state.keys = [...state.keys, k]; persist("keys"); }
export function updateKey(id: string, patch: Partial<KeyRec>) { state.keys = state.keys.map((k) => (k.id === id ? { ...k, ...patch } : k)); persist("keys"); }
export function removeKey(id: string) { state.keys = state.keys.filter((k) => k.id !== id); persist("keys"); }
export const keyOf = (provider: string) => state.keys.find((k) => k.provider === provider && k.status !== "disabled");

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
