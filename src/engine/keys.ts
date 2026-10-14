import { detect, enrich, listModels, providerById } from "./providers";
import * as db from "./db";
import type { KeyRec } from "./types";

export const hintOf = (k: string) => (k.length > 12 ? `${k.slice(0, 6)}…${k.slice(-4)}` : "••••");

/** Plugins with no recognisable key prefix: the person picks the plugin, we save the key for it. */
export const PLUGINS = {
  pexels: { name: "Pexels", what: "Real photos in your apps", url: "https://www.pexels.com/api/new/", test: (k: string) => fetch("https://api.pexels.com/v1/search?per_page=1&query=cat", { headers: { Authorization: k } }) },
  unsplash: { name: "Unsplash", what: "Real photos in your apps (Access Key)", url: "https://unsplash.com/oauth/applications", test: (k: string) => fetch("https://api.unsplash.com/search/photos?per_page=1&query=cat", { headers: { Authorization: `Client-ID ${k}` } }) },
} as const;
export type PluginId = keyof typeof PLUGINS;

export async function addPluginKey(id: PluginId, raw: string) {
  const secret = raw.trim();
  if (!secret) throw new Error("Paste a key first.");
  const pl = PLUGINS[id];
  const r = await pl.test(secret).catch(() => null);
  if (!r || !r.ok) throw new Error(`${pl.name} rejected that key${r ? ` (${r.status})` : ""}.`);
  db.getState().keys.filter((k) => k.provider === id).forEach((k) => db.removeKey(k.id));
  const rec: KeyRec = { id: db.uid(), label: pl.name, kind: "tool", provider: id, secret, hint: hintOf(secret), models: [], status: "active", requests: 0, errors: 0, createdAt: Date.now() };
  db.addKey(rec);
  return rec;
}

export async function addKey(raw: string, opts: { label?: string; baseUrl?: string } = {}) {
  const secret = raw.trim();
  if (!secret) throw new Error("Paste a key first.");
  if (db.getState().keys.some((k) => k.secret === secret)) throw new Error("That key is already saved.");
  const d = await detect(secret, { baseUrl: opts.baseUrl });
  const count = db.getState().keys.filter((k) => k.provider === d.provider).length;
  const rec: KeyRec = {
    id: db.uid(), label: opts.label || (count ? `${d.name} ${count + 1}` : d.name), kind: d.kind, provider: d.provider, baseUrl: d.provider === "custom" ? d.base : undefined,
    secret, hint: hintOf(secret), models: d.models, status: "active", requests: 0, errors: 0, login: d.login, createdAt: Date.now(),
  };
  db.addKey(rec);
  return { rec, note: d.note };
}

export async function refreshKey(id: string) {
  const k = db.getState().keys.find((x) => x.id === id);
  if (!k || k.kind !== "ai") return 0;
  const p = k.provider === "custom" ? { id: "custom", name: k.label, dialect: "openai" as const, base: k.baseUrl || "" } : providerById(k.provider);
  if (!p) return 0;
  const r = await listModels(p, k.secret);
  if (!r.ok) { db.updateKey(id, { status: "error", statusMsg: r.error }); throw new Error(r.error); }
  const models = await enrich(p, r.models);
  db.updateKey(id, { models, status: "active", statusMsg: undefined });
  return models.length;
}
