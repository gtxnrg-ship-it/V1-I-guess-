import { getState, recordUsage, updateKey } from "./db";
import { FREE, FREE_MODELS, providerById, type ProviderDef } from "./providers";
import { streamChat, LLMError, type StreamOpts, type StreamResult } from "./llm";
import type { ModelInfo, ModelUsed, Role } from "./types";

export interface Candidate { keyId: string; keyLabel: string; provider: ProviderDef; secret: string; model: ModelInfo }

const cooldown = new Map<string, number>();

export function candidates(): Candidate[] {
  const s = getState();
  const out: Candidate[] = [];
  for (const k of s.keys) {
    if (k.kind !== "ai" || k.status === "disabled") continue;
    const p: ProviderDef | undefined = k.provider === "custom" ? { id: "custom", name: k.label, dialect: "openai", base: k.baseUrl || "" } : providerById(k.provider);
    if (!p || p.noBrowser) continue;
    for (const m of k.models) out.push({ keyId: k.id, keyLabel: k.label, provider: p, secret: k.secret, model: m });
  }
  if (s.settings.freeStarter) for (const m of FREE_MODELS) out.push({ keyId: "free", keyLabel: "Free starter", provider: FREE, secret: "", model: m });
  return out;
}
export const hasAnyModel = () => candidates().length > 0;
export const onlyFree = () => candidates().every((c) => c.keyId === "free");

export function roleScore(m: ModelInfo, role: Role): number {
  const tp = m.tools === false ? -60 : 0;
  const free = m.free ? 2 : 0;
  switch (role) {
    case "talk": return m.speed * 0.7 + m.power * 0.45 + tp * 0.4 + free;
    case "research": return m.speed * 0.5 + m.power * 0.6 + ((m.context || 0) >= 500_000 ? 6 : 0) + tp + free;
    case "plan": return m.power * 1.0 + (m.reasoning ? 6 : 0) + tp * 0.6;
    case "code": return m.power * 1.0 + m.speed * 0.15 + (/coder|code/.test(m.id) ? 3 : 0) + tp;
    case "check": return (m.vision ? 40 : -40) + m.power * 0.8 + m.speed * 0.3 + tp;
  }
}

/** Ordered fallback chain for a role: user override first, then the best models, spreading across keys. */
export function chain(role: Role): Candidate[] {
  const all = candidates();
  const ov = getState().settings.roleOverrides[role];
  const sorted = [...all].sort((a, b) => roleScore(b.model, role) - roleScore(a.model, role));
  const perKey = new Map<string, number>();
  const picked: Candidate[] = [];
  for (const c of sorted) {
    const n = perKey.get(c.keyId) || 0;
    if (n >= 3) continue;
    perKey.set(c.keyId, n + 1);
    picked.push(c);
  }
  const out: Candidate[] = [];
  const same = (a: Candidate, b: Candidate) => a.keyId === b.keyId && a.model.id === b.model.id;
  if (ov) {
    const [kid, mid] = ov.split("::");
    const o = all.find((c) => c.keyId === kid && c.model.id === mid);
    if (o) out.push(o, ...all.filter((c) => c.model.id === o.model.id && c.keyId !== o.keyId));
  }
  for (const c of picked) {
    if (out.some((x) => same(x, c))) continue;
    out.push(c);
    for (const twin of all.filter((x) => x.model.id === c.model.id && x.keyId !== c.keyId)) if (!out.some((x) => same(x, twin))) out.push(twin);
  }
  return out.slice(0, 12);
}

export const bestFor = (role: Role) => chain(role)[0];
const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); rej(new DOMException("Aborted", "AbortError")); }, { once: true });
});

export async function routedStream(
  role: Role,
  opts: Omit<StreamOpts, "provider" | "key" | "model">,
  onRoute: (text: string) => void,
  onUse: (m: ModelUsed) => void,
): Promise<StreamResult> {
  const c = chain(role);
  if (!c.length) throw new LLMError(0, "NO_KEYS");
  let lastErr: LLMError | null = null;
  // Free keys hit per-minute limits all the time: when every model is cooling, wait and try again instead of failing.
  for (let round = 0; round < 3; round++) {
    let tried = 0;
    for (const cand of c) {
      const ck = `${cand.keyId}:${cand.model.id}`;
      if ((cooldown.get(ck) || 0) > Date.now() || (cooldown.get(`${cand.keyId}:*`) || 0) > Date.now()) continue;
      tried++;
      onUse({ provider: cand.provider.id, providerName: cand.provider.name, keyLabel: cand.keyLabel, keyId: cand.keyId, model: cand.model.name || cand.model.id, role });
      let produced = false;
      try {
        const r = await streamChat({
          ...opts, provider: cand.provider, key: cand.secret, model: cand.model.id,
          vision: cand.model.vision === true || (cand.model.vision !== false && cand.provider.dialect !== "openai"),
          onThinking: (d) => { produced = true; opts.onThinking(d); },
          onText: (d) => { produced = true; opts.onText(d); },
        });
        if (cand.keyId !== "free") updateKey(cand.keyId, { status: "active", statusMsg: undefined, requests: (getState().keys.find((k) => k.id === cand.keyId)?.requests || 0) + 1 });
        recordUsage(cand.keyId, { input: r.usage?.input, output: r.usage?.output });
        return r;
      } catch (e: any) {
        if (opts.signal?.aborted) throw e;
        const err = e instanceof LLMError ? e : new LLMError(0, e?.message || String(e));
        lastErr = err;
        recordUsage(cand.keyId, { error: true });
        const k = err.kind;
        const keyWide = k === "auth" && (err.status === 401 || /api key|invalid.*key|unauthori[sz]ed/i.test(err.message));
        if (k === "rate") cooldown.set(ck, Date.now() + Math.min(err.retryAfter ? err.retryAfter * 1000 : 30_000, 90_000));
        if (keyWide) { cooldown.set(`${cand.keyId}:*`, Date.now() + 10 * 60_000); if (cand.keyId !== "free") updateKey(cand.keyId, { status: "error", statusMsg: err.message.slice(0, 200) }); }
        else if (k === "auth") cooldown.set(ck, Date.now() + 30 * 60_000);
        if (k === "server") cooldown.set(ck, Date.now() + 15_000);
        if (k === "bad") cooldown.set(ck, Date.now() + 10 * 60_000);
        if (k === "context") cooldown.set(ck, Date.now() + 60_000);
        const why = { rate: "hit its limit", auth: "was rejected", context: "ran out of room", server: "is having trouble", bad: "returned an error" }[k];
        onRoute(`${cand.model.name || cand.model.id} (${cand.keyLabel}) ${why}. Switching…`);
        if (produced) throw err; // don't silently restart a half-streamed answer
      }
    }
    // everything is cooling: wait for the soonest one (only rate limits / server hiccups are worth waiting for)
    const soonest = Math.min(...c.map((x) => Math.max(cooldown.get(`${x.keyId}:${x.model.id}`) || 0, cooldown.get(`${x.keyId}:*`) || 0)));
    const wait = soonest - Date.now();
    if (!(lastErr && (lastErr.kind === "rate" || lastErr.kind === "server")) || wait > 75_000) break;
    if (tried === 0 || wait > 0) {
      onRoute(`All models are catching their breath. Waiting ${Math.ceil(Math.max(wait, 1000) / 1000)}s…`);
      await sleep(Math.max(wait, 1000) + 250, opts.signal);
    }
  }
  throw lastErr || new LLMError(0, "All models are cooling down. Add another key or wait a minute.");
}
