import type { ModelInfo } from "./types";

export type Dialect = "gemini" | "anthropic" | "openai";
export interface ProviderDef {
  id: string;
  name: string;
  dialect: Dialect;
  base: string;
  modelsDev?: string;
  prefixes?: string[];
  /** The provider blocks calls straight from a browser (no CORS). */
  noBrowser?: boolean;
  signup?: string;
}

export const LOCAL_PROVIDERS: ProviderDef[] = [
  { id: "ollama", name: "Ollama (local)", dialect: "openai", base: "http://localhost:11434/v1", signup: "https://ollama.com/download" },
  { id: "lmstudio", name: "LM Studio (local)", dialect: "openai", base: "http://localhost:1234/v1", signup: "https://lmstudio.ai" },
  { id: "localai", name: "LocalAI / Jan / vLLM", dialect: "openai", base: "http://localhost:8080/v1" },
];

export const PROVIDERS: ProviderDef[] = [
  ...LOCAL_PROVIDERS,
  { id: "google", name: "Google Gemini", dialect: "gemini", base: "https://generativelanguage.googleapis.com/v1beta", modelsDev: "google", prefixes: ["AIza"], signup: "https://aistudio.google.com/apikey" },
  { id: "anthropic", name: "Anthropic", dialect: "anthropic", base: "https://api.anthropic.com", modelsDev: "anthropic", prefixes: ["sk-ant-"], signup: "https://console.anthropic.com" },
  { id: "openrouter", name: "OpenRouter", dialect: "openai", base: "https://openrouter.ai/api/v1", modelsDev: "openrouter", prefixes: ["sk-or-"], signup: "https://openrouter.ai/keys" },
  { id: "groq", name: "Groq", dialect: "openai", base: "https://api.groq.com/openai/v1", modelsDev: "groq", prefixes: ["gsk_"] , signup: "https://console.groq.com/keys" },
  { id: "xai", name: "xAI Grok", dialect: "openai", base: "https://api.x.ai/v1", modelsDev: "xai", prefixes: ["xai-"] },
  { id: "cerebras", name: "Cerebras", dialect: "openai", base: "https://api.cerebras.ai/v1", modelsDev: "cerebras", prefixes: ["csk-"], signup: "https://cloud.cerebras.ai" },
  { id: "nvidia", name: "NVIDIA NIM", dialect: "openai", base: "https://integrate.api.nvidia.com/v1", modelsDev: "nvidia", prefixes: ["nvapi-"], noBrowser: true },
  { id: "huggingface", name: "Hugging Face", dialect: "openai", base: "https://router.huggingface.co/v1", modelsDev: "huggingface", prefixes: ["hf_"] },
  { id: "fireworks", name: "Fireworks", dialect: "openai", base: "https://api.fireworks.ai/inference/v1", modelsDev: "fireworks-ai", prefixes: ["fw_"] },
  { id: "perplexity", name: "Perplexity", dialect: "openai", base: "https://api.perplexity.ai", modelsDev: "perplexity", prefixes: ["pplx-"] },
  { id: "openai", name: "OpenAI", dialect: "openai", base: "https://api.openai.com/v1", modelsDev: "openai", prefixes: ["sk-proj-", "sk-svcacct-", "sk-admin-"] },
  { id: "deepseek", name: "DeepSeek", dialect: "openai", base: "https://api.deepseek.com/v1", modelsDev: "deepseek" },
  { id: "mistral", name: "Mistral", dialect: "openai", base: "https://api.mistral.ai/v1", modelsDev: "mistral", signup: "https://console.mistral.ai" },
  { id: "together", name: "Together AI", dialect: "openai", base: "https://api.together.xyz/v1", modelsDev: "togetherai" },
  { id: "moonshot", name: "Moonshot Kimi", dialect: "openai", base: "https://api.moonshot.ai/v1", modelsDev: "moonshotai" },
  { id: "zai", name: "Z.ai GLM", dialect: "openai", base: "https://api.z.ai/api/paas/v4", modelsDev: "zai" },
  { id: "cohere", name: "Cohere", dialect: "openai", base: "https://api.cohere.ai/compatibility/v1", modelsDev: "cohere" },
];

export const FREE: ProviderDef = { id: "pollinations", name: "Free starter", dialect: "openai", base: "https://text.pollinations.ai/openai" };
export const FREE_MODELS: ModelInfo[] = [{ id: "openai", name: "GPT-OSS 20B (free)", tools: true, reasoning: true, vision: false, free: true, power: 50, speed: 60 }];

export const NON_AI_PREFIXES: { prefix: string; provider: string; name: string; kind: "github" | "tool" }[] = [
  { prefix: "github_pat_", provider: "github", name: "GitHub", kind: "github" },
  { prefix: "ghp_", provider: "github", name: "GitHub", kind: "github" },
  { prefix: "gho_", provider: "github", name: "GitHub", kind: "github" },
  { prefix: "tvly-", provider: "tavily", name: "Tavily Search", kind: "tool" },
  { prefix: "jina_", provider: "jina", name: "Jina AI Search", kind: "tool" },
];

export const providerById = (id: string) => (id === FREE.id ? FREE : PROVIDERS.find((p) => p.id === id));

let catalog: any = null;
async function modelsDev(): Promise<any> {
  if (catalog) return catalog;
  try {
    const r = await fetch("https://models.dev/api.json", { signal: AbortSignal.timeout(15000) });
    if (r.ok) catalog = await r.json();
  } catch { /* offline is fine */ }
  return catalog || {};
}

function versionBoost(id: string) {
  const m = id.match(/(\d+(?:\.\d+)?)/g);
  if (!m) return 0;
  const v = Math.max(...m.map(Number).filter((n) => n < 20));
  return Number.isFinite(v) ? Math.min(v * 3, 18) : 0;
}
export function score(id: string): { power: number; speed: number } {
  const s = id.toLowerCase();
  let power = 45, speed = 50;
  if (/opus|argon|ultra|-pro\b|-pro-|pro-preview|gpt-5(\.\d+)?$|gpt-5(\.\d+)?-(?!mini|nano)|o3\b|o4\b|grok-4|deepseek-(reasoner|r1|v3|v4)|kimi-k2|glm-[45]|qwen3.*(coder|max|235b|480b)|gpt-oss-120b|mistral-large|devstral|codestral|magistral-medium|sonnet|command-a/.test(s)) power = 80;
  if (/opus|argon|ultra|gpt-5(\.\d+)?-pro|pro-preview|mythos/.test(s)) power = 92;
  if (/flash(?!-lite)/.test(s)) { power = Math.max(power, 72); speed = 82; }
  if (/flash-lite|haiku|mini|nano|instant|small|lite|tiny|8b|7b|3b|1b|20b|gemma/.test(s)) { power = Math.min(power, 55); speed = 92; }
  if (/coder|codestral|devstral|code/.test(s)) power += 4;
  if (/opus|pro|ultra|argon|reasoner|r1/.test(s)) speed = 35;
  power += versionBoost(s) * 0.6;
  return { power: Math.min(100, Math.round(power)), speed: Math.min(100, Math.round(speed)) };
}

const SKIP = /embed|embedding|tts|whisper|transcri|audio|speech|image|imagen|veo|dall|moderation|rerank|guard|aqa|vision-only|realtime|search-preview|computer-use|live|robotics|native-audio|lyria|nano-banana|gpt-image|sora|clip|ocr|safeguard|prompt-guard|orpheus|playai/;

async function getJSON(url: string, headers: Record<string, string>) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const t = await r.text();
  let j: any = null;
  try { j = JSON.parse(t); } catch { /* */ }
  return { ok: r.ok, status: r.status, json: j, text: t };
}

export async function listModels(p: ProviderDef, key: string): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    if (p.dialect === "gemini") {
      const r = await getJSON(`${p.base}/models?pageSize=1000`, { "x-goog-api-key": key });
      if (!r.ok) return { ok: false, models: [], error: r.json?.error?.message || `HTTP ${r.status}` };
      const ids = (r.json.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => String(m.name).replace(/^models\//, ""));
      return { ok: true, models: ids };
    }
    if (p.dialect === "anthropic") {
      const r = await getJSON(`${p.base}/v1/models?limit=100`, { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" });
      if (!r.ok) return { ok: false, models: [], error: r.json?.error?.message || `HTTP ${r.status}` };
      return { ok: true, models: (r.json.data || []).map((m: any) => m.id) };
    }
    const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};
    const r = await getJSON(`${p.base}/models`, headers);
    if (!r.ok) return { ok: false, models: [], error: r.json?.error?.message || r.json?.message || `HTTP ${r.status}` };
    const arr = Array.isArray(r.json) ? r.json : r.json?.data || r.json?.models || [];
    return { ok: true, models: arr.map((m: any) => m.id || m.name).filter(Boolean) };
  } catch (e: any) {
    const blocked = p.noBrowser || /failed to fetch|networkerror|load failed/i.test(e?.message || "");
    return { ok: false, models: [], error: blocked ? `${p.name} doesn't allow calls from a browser.` : e?.message || "network error" };
  }
}

export async function enrich(p: ProviderDef, ids: string[]): Promise<ModelInfo[]> {
  const cat = await modelsDev();
  const prov = (p.modelsDev && cat[p.modelsDev]?.models) || {};
  const out: ModelInfo[] = [];
  for (const id of ids) {
    if (SKIP.test(id.toLowerCase())) continue;
    const meta = prov[id] || prov[id.replace(/^models\//, "")] || null;
    const sc = score(id);
    const free = /:free$/.test(id) || (meta?.cost && meta.cost.input === 0 && meta.cost.output === 0) || undefined;
    out.push({
      id,
      name: meta?.name || id,
      context: meta?.limit?.context,
      tools: meta ? !!meta.tool_call : /gemma/i.test(id) ? false : p.dialect !== "openai" || undefined,
      reasoning: meta ? !!meta.reasoning : undefined,
      vision: meta?.modalities?.input ? meta.modalities.input.includes("image") : p.dialect !== "openai" ? !/gemma-[12]\b/i.test(id) : undefined,
      free,
      power: sc.power,
      speed: sc.speed,
    });
  }
  return out.sort((a, b) => b.power - a.power || b.speed - a.speed).slice(0, 120);
}

export interface Detection { kind: "ai" | "github" | "tool" | "secret"; provider: string; name: string; base?: string; models: ModelInfo[]; note?: string; login?: string }

export async function detect(rawKey: string, opts: { baseUrl?: string } = {}): Promise<Detection> {
  const key = rawKey.trim();
  if (opts.baseUrl) {
    const p: ProviderDef = { id: "custom", name: new URL(opts.baseUrl).hostname, dialect: "openai", base: opts.baseUrl.replace(/\/$/, "") };
    const r = await listModels(p, key);
    if (!r.ok) throw new Error(`That endpoint rejected the key: ${r.error}`);
    return { kind: "ai", provider: "custom", name: p.name, base: p.base, models: await enrich(p, r.models) };
  }
  for (const n of NON_AI_PREFIXES) {
    if (key.startsWith(n.prefix)) {
      if (n.kind === "github") {
        const r = await getJSON("https://api.github.com/user", { Authorization: `Bearer ${key}` });
        if (!r.ok) throw new Error(`GitHub rejected this token (${r.status}).`);
        return { kind: "github", provider: "github", name: "GitHub", models: [], login: r.json.login, note: `Signed in as @${r.json.login}` };
      }
      return { kind: "tool", provider: n.provider, name: n.name, models: [], note: "Saved for research" };
    }
  }
  const byPrefix = PROVIDERS.find((p) => p.prefixes?.some((x) => key.startsWith(x)));
  if (byPrefix) {
    const r = await listModels(byPrefix, key);
    if (r.ok && r.models.length) return { kind: "ai", provider: byPrefix.id, name: byPrefix.name, base: byPrefix.base, models: await enrich(byPrefix, r.models) };
    throw new Error(`${byPrefix.name} rejected this key: ${r.error || "rejected"}`);
  }

  const errors: string[] = [];
  const results = await Promise.allSettled(
    PROVIDERS.map(async (p) => {
      const r = await listModels(p, key);
      if (r.ok && r.models.length) return { provider: p, models: r.models };
      throw new Error(`${p.name}: ${r.error || "rejected"}`);
    })
  );

  for (const res of results) {
    if (res.status === "fulfilled") {
      const { provider, models } = res.value;
      return { kind: "ai", provider: provider.id, name: provider.name, base: provider.base, models: await enrich(provider, models) };
    }
    errors.push(res.reason?.message || String(res.reason));
  }

  return { kind: "secret", provider: "secret", name: "Unknown key", models: [], note: errors.join("; ") || "I couldn't match it to an AI provider, so I saved it as a named secret." };
}
