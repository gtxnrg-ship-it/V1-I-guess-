import type { ProviderDef } from "./providers";
import type { Img } from "./types";
export type { Img };

// ───────────── Normalised conversation format (provider-agnostic) ─────────────
export interface ToolCall { id: string; name: string; args: any }

export type HMsg =
  | { role: "user"; text: string; images?: Img[] }
  | { role: "assistant"; text: string; toolCalls?: ToolCall[]; native?: { dialect: string; data: any } }
  | { role: "tool"; results: { id: string; name: string; result: string; images?: Img[] }[] };

export interface ToolDef { name: string; description: string; parameters: any }

export interface StreamOpts {
  provider: ProviderDef;
  key: string;
  model: string;
  system: string;
  messages: HMsg[];
  tools: ToolDef[];
  onThinking: (d: string) => void;
  onText: (d: string) => void;
  signal?: AbortSignal;
  vision?: boolean;
}
export interface Usage { input: number; output: number }
export interface StreamResult { text: string; toolCalls: ToolCall[]; native?: { dialect: string; data: any }; usage?: Usage }

/** Models without vision get a text note instead of pixels. */
function visionSafe(o: StreamOpts): HMsg[] {
  if (o.vision !== false) return o.messages;
  return o.messages.map((m) => {
    if (m.role === "user" && m.images?.length) return { ...m, images: undefined, text: `${m.text}\n[${m.images.length} image(s) attached, but this model can't see images]` };
    if (m.role === "tool" && m.results.some((r) => r.images?.length)) return { ...m, results: m.results.map((r) => ({ ...r, images: undefined, result: r.images?.length ? `${r.result}\n[screenshot omitted: this model can't see images]` : r.result })) };
    return m;
  });
}

export class LLMError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
  get kind(): "rate" | "auth" | "context" | "bad" | "server" {
    const m = this.message.toLowerCase();
    if (this.status === 429 || /quota|rate.?limit|resource.?exhausted|exceeded|too many requests|credit|insufficient|billing/.test(m)) return "rate";
    if (this.status === 401 || this.status === 403 || /api key|unauthori[sz]ed|permission|invalid.*key/.test(m)) return "auth";
    if (/context|too long|maximum.*tokens|token limit|prompt is too long/.test(m)) return "context";
    if (this.status >= 500 || this.status === 0) return "server";
    return "bad";
  }
}

let idc = 0;
const newId = () => `call_${Date.now().toString(36)}_${(idc++).toString(36)}`;

async function* sse(res: Response): AsyncGenerator<{ event?: string; data: string }> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let event: string | undefined;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, "");
      buf = buf.slice(i + 1);
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) { yield { event, data: line.slice(5).trim() }; }
      else if (line === "") event = undefined;
    }
  }
}

async function fail(res: Response): Promise<never> {
  const t = await res.text();
  let msg = t.slice(0, 600);
  try { const j = JSON.parse(t); msg = j.error?.message || j.message || j.error || msg; if (typeof msg !== "string") msg = JSON.stringify(msg); } catch { /* */ }
  const ra = Number(res.headers.get("retry-after")) || undefined;
  throw new LLMError(res.status, msg, ra);
}

export async function streamChat(o: StreamOpts): Promise<StreamResult> {
  if (o.provider.dialect === "gemini") return gemini(o);
  if (o.provider.dialect === "anthropic") return anthropic(o);
  return openai(o);
}

// ───────────────────────────── Gemini (native) ─────────────────────────────
function upperTypes(s: any): any {
  if (Array.isArray(s)) return s.map(upperTypes);
  if (s && typeof s === "object") {
    const o: any = {};
    for (const [k, v] of Object.entries(s)) {
      if (k === "additionalProperties") continue;
      o[k] = k === "type" && typeof v === "string" ? v.toUpperCase() : upperTypes(v);
    }
    return o;
  }
  return s;
}

async function gemini(o: StreamOpts, thinking = true): Promise<StreamResult> {
  const contents: any[] = [];
  const gimg = (im: Img) => ({ inlineData: { mimeType: im.mime, data: im.data } });
  for (const m of visionSafe(o)) {
    if (m.role === "user") contents.push({ role: "user", parts: [{ text: m.text || " " }, ...(m.images || []).map(gimg)] });
    else if (m.role === "assistant") {
      if (m.native?.dialect === "gemini") contents.push({ role: "model", parts: m.native.data });
      else {
        const parts: any[] = [];
        if (m.text) parts.push({ text: m.text });
        (m.toolCalls || []).forEach((c, i) => parts.push({ functionCall: { name: c.name, args: c.args }, ...(i === 0 ? { thoughtSignature: "skip_thought_signature_validator" } : {}) }));
        if (parts.length) contents.push({ role: "model", parts });
      }
    } else contents.push({ role: "user", parts: [
      ...m.results.map((r) => ({ functionResponse: { name: r.name, response: { result: r.result } } })),
      ...m.results.flatMap((r) => (r.images || []).map(gimg)),
    ] });
  }
  const body: any = {
    contents,
    systemInstruction: { parts: [{ text: o.system }] },
    generationConfig: thinking ? { thinkingConfig: { includeThoughts: true } } : {},
  };
  if (o.tools.length) body.tools = [{ functionDeclarations: o.tools.map((t) => {
    const hasProps = t.parameters?.properties && Object.keys(t.parameters.properties).length > 0;
    return { name: t.name, description: t.description, ...(hasProps ? { parameters: upperTypes(t.parameters) } : {}) };
  }) }];
  const res = await fetch(`${o.provider.base}/models/${o.model}:streamGenerateContent?alt=sse`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": o.key }, body: JSON.stringify(body), signal: o.signal,
  });
  if (!res.ok) {
    const err = await fail(res).catch((e) => e as LLMError);
    if (thinking && /thinking|thought/i.test(err.message) && err.status === 400) return gemini(o, false);
    throw err;
  }
  let text = "";
  const toolCalls: ToolCall[] = [];
  const parts: any[] = [];
  let pendingSig: string | undefined;
  let usage: Usage | undefined;
  for await (const ev of sse(res)) {
    let j: any; try { j = JSON.parse(ev.data); } catch { continue; }
    if (j.error) throw new LLMError(j.error.code || 500, j.error.message);
    if (j.usageMetadata) usage = { input: j.usageMetadata.promptTokenCount || 0, output: (j.usageMetadata.candidatesTokenCount || 0) + (j.usageMetadata.thoughtsTokenCount || 0) };
    for (const p of j.candidates?.[0]?.content?.parts || []) {
      if (p.functionCall) {
        toolCalls.push({ id: newId(), name: p.functionCall.name, args: p.functionCall.args || {} });
        const fc: any = { functionCall: p.functionCall };
        const sig = p.thoughtSignature || pendingSig;
        if (sig) { fc.thoughtSignature = sig; pendingSig = undefined; }
        parts.push(fc);
      } else if (typeof p.text === "string") {
        if (p.thought) { if (p.text) o.onThinking(p.text); if (p.thoughtSignature) pendingSig = p.thoughtSignature; continue; }
        if (p.text) { text += p.text; o.onText(p.text); }
        const last = parts[parts.length - 1];
        if (last && typeof last.text === "string" && !last.functionCall) {
          last.text += p.text;
          if (p.thoughtSignature) last.thoughtSignature = p.thoughtSignature;
        } else {
          const np: any = { text: p.text };
          const sig = p.thoughtSignature || pendingSig;
          if (sig) { np.thoughtSignature = sig; pendingSig = undefined; }
          parts.push(np);
        }
      } else if (p.thoughtSignature) pendingSig = p.thoughtSignature;
    }
  }
  if (pendingSig) {
    const last = [...parts].reverse().find((p) => typeof p.text === "string");
    if (last) last.thoughtSignature = last.thoughtSignature || pendingSig;
    else if (!parts.length) parts.push({ text: " ", thoughtSignature: pendingSig });
  }
  const clean = parts.filter((p) => p.functionCall || (typeof p.text === "string" && (p.text !== "" || p.thoughtSignature))).map((p) => (p.text === "" ? { ...p, text: " " } : p));
  return { text, toolCalls, usage, native: { dialect: "gemini", data: clean.length ? clean : [{ text: text || " " }] } };
}

// ───────────────────────────── Anthropic (Messages API) ─────────────────────────────
async function anthropic(o: StreamOpts, thinkMode: "adaptive" | "enabled" | "off" = "adaptive"): Promise<StreamResult> {
  const messages: any[] = [];
  const aimg = (im: Img) => ({ type: "image", source: { type: "base64", media_type: im.mime, data: im.data } });
  for (const m of visionSafe(o)) {
    if (m.role === "user") messages.push({ role: "user", content: m.images?.length ? [...m.images.map(aimg), { type: "text", text: m.text || " " }] : m.text || " " });
    else if (m.role === "assistant") {
      if (m.native?.dialect === "anthropic" && thinkMode !== "off") messages.push({ role: "assistant", content: m.native.data });
      else {
        const c: any[] = [];
        if (m.text) c.push({ type: "text", text: m.text });
        (m.toolCalls || []).forEach((t) => c.push({ type: "tool_use", id: t.id.replace(/[^a-zA-Z0-9_-]/g, "_"), name: t.name, input: t.args || {} }));
        if (c.length) messages.push({ role: "assistant", content: c });
      }
    } else messages.push({ role: "user", content: m.results.map((r) => ({ type: "tool_result", tool_use_id: r.id.replace(/[^a-zA-Z0-9_-]/g, "_"), content: r.images?.length ? [{ type: "text", text: r.result }, ...r.images.map(aimg)] : r.result })) });
  }
  const body: any = { model: o.model, max_tokens: 16000, system: o.system, messages, stream: true };
  if (o.tools.length) body.tools = o.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
  if (thinkMode === "adaptive") body.thinking = { type: "adaptive" };
  if (thinkMode === "enabled") body.thinking = { type: "enabled", budget_tokens: 4000 };
  const headers: Record<string, string> = { "Content-Type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": o.key };
  headers["anthropic-dangerous-direct-browser-access"] = "true";
  const res = await fetch(`${o.provider.base.replace(/\/$/, "")}/v1/messages`, { method: "POST", headers, body: JSON.stringify(body), signal: o.signal });
  if (!res.ok) {
    const err = await fail(res).catch((e) => e as LLMError);
    if (err.status === 400 && /thinking|adaptive|budget/i.test(err.message)) {
      if (thinkMode === "adaptive") return anthropic(o, "enabled");
      if (thinkMode === "enabled") return anthropic(o, "off");
    }
    throw err;
  }
  const blocks: any[] = [];
  let text = "";
  const usage: Usage = { input: 0, output: 0 };
  for await (const ev of sse(res)) {
    let j: any; try { j = JSON.parse(ev.data); } catch { continue; }
    if (j.type === "error") throw new LLMError(529, j.error?.message || "stream error");
    if (j.type === "message_start" && j.message?.usage) usage.input = (j.message.usage.input_tokens || 0) + (j.message.usage.cache_read_input_tokens || 0);
    if (j.type === "message_delta" && j.usage) usage.output = j.usage.output_tokens || usage.output;
    if (j.type === "content_block_start") {
      const b = { ...j.content_block };
      if (b.type === "tool_use") b._json = "";
      if (b.type === "thinking") b.thinking = b.thinking || "";
      if (b.type === "text") b.text = b.text || "";
      blocks[j.index] = b;
    } else if (j.type === "content_block_delta") {
      const b = blocks[j.index]; const d = j.delta;
      if (!b) continue;
      if (d.type === "thinking_delta") { b.thinking += d.thinking; o.onThinking(d.thinking); }
      else if (d.type === "signature_delta") b.signature = (b.signature || "") + d.signature;
      else if (d.type === "text_delta") { b.text += d.text; text += d.text; o.onText(d.text); }
      else if (d.type === "input_json_delta") b._json += d.partial_json;
    }
  }
  const toolCalls: ToolCall[] = [];
  const native = blocks.filter(Boolean).map((b) => {
    if (b.type === "tool_use") {
      let input = {}; input = b._json ? parseArgs(b._json) : b.input || {};
      toolCalls.push({ id: b.id, name: b.name, args: input });
      return { type: "tool_use", id: b.id, name: b.name, input };
    }
    if (b.type === "thinking") return { type: "thinking", thinking: b.thinking, signature: b.signature };
    if (b.type === "redacted_thinking") return b;
    return { type: "text", text: b.text || "" };
  }).filter((b) => !(b.type === "text" && !b.text));
  return { text, toolCalls, usage, native: thinkMode === "off" ? undefined : { dialect: "anthropic", data: native } };
}

// ───────────────────────────── OpenAI-compatible (most providers) ─────────────────────────────
async function openai(o: StreamOpts): Promise<StreamResult> {
  const messages: any[] = [{ role: "system", content: o.system }];
  const keepReasoning = ["deepseek", "moonshot", "zai"].includes(o.provider.id);
  const oimg = (im: Img) => ({ type: "image_url", image_url: { url: `data:${im.mime};base64,${im.data}` } });
  for (const m of visionSafe(o)) {
    if (m.role === "user") messages.push({ role: "user", content: m.images?.length ? [{ type: "text", text: m.text || " " }, ...m.images.map(oimg)] : m.text || " " });
    else if (m.role === "assistant") {
      const msg: any = { role: "assistant", content: m.text || (m.toolCalls?.length ? null : " ") };
      if (m.toolCalls?.length) msg.tool_calls = m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args || {}) } }));
      if (keepReasoning && m.native?.dialect === "openai" && m.native.data?.reasoning) msg.reasoning_content = m.native.data.reasoning;
      messages.push(msg);
    } else {
      for (const r of m.results) messages.push({ role: "tool", tool_call_id: r.id, content: r.result });
      const imgs = m.results.flatMap((r) => r.images || []);
      if (imgs.length) messages.push({ role: "user", content: [{ type: "text", text: "Screenshots returned by the tool above:" }, ...imgs.map(oimg)] });
    }
  }
  const body: any = { model: o.model, messages, stream: true };
  if (o.tools.length) body.tools = o.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
  if (o.provider.id === "openrouter") body.reasoning = { enabled: true };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (o.key) headers.Authorization = `Bearer ${o.key}`;
  if (o.provider.id === "openrouter") { headers["HTTP-Referer"] = location.origin; headers["X-Title"] = "Kuro-chan"; }
  const res = await fetch(`${o.provider.base.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers, body: JSON.stringify(body), signal: o.signal });
  if (!res.ok) await fail(res);
  let text = "", reasoning = "";
  let usage: Usage | undefined;
  const calls: { id: string; name: string; args: string }[] = [];
  for await (const ev of sse(res)) {
    if (ev.data === "[DONE]") break;
    let j: any; try { j = JSON.parse(ev.data); } catch { continue; }
    if (j.error) throw new LLMError(j.error.code || 500, j.error.message || JSON.stringify(j.error));
    const u = j.usage || j.x_groq?.usage;
    if (u) usage = { input: u.prompt_tokens || 0, output: u.completion_tokens || 0 };
    const d = j.choices?.[0]?.delta;
    if (!d) continue;
    const r = d.reasoning_content ?? d.reasoning;
    if (typeof r === "string" && r) { reasoning += r; o.onThinking(r); }
    if (typeof d.content === "string" && d.content) { text += d.content; o.onText(d.content); }
    for (const tc of d.tool_calls || []) {
      const i = tc.index ?? calls.length;
      calls[i] = calls[i] || { id: tc.id || newId(), name: "", args: "" };
      if (tc.id) calls[i].id = tc.id;
      if (tc.function?.name) calls[i].name += tc.function.name;
      if (tc.function?.arguments) calls[i].args += tc.function.arguments;
    }
  }
  const toolCalls = calls.filter(Boolean).map((c) => { let a = {}; a = parseArgs(c.args); return { id: c.id, name: c.name, args: a }; });
  return { text, toolCalls, usage, native: { dialect: "openai", data: { reasoning } } };
}

/** Weak models often emit almost-JSON for tool arguments. Repair the common mistakes instead of failing. */
export function parseArgs(raw: string): any {
  if (!raw || !raw.trim()) return {};
  try { return JSON.parse(raw); } catch { /* repair below */ }
  let s = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = s.search(/[{[]/);
  if (start > 0) s = s.slice(start);
  let out = "", inStr = false, esc = false;
  const stack: string[] = [];
  for (const ch of s) {
    if (inStr) {
      if (esc) { esc = false; out += ch; continue; }
      if (ch === "\\") { esc = true; out += ch; continue; }
      if (ch === '"') inStr = false;
      if (ch === "\n") { out += "\\n"; continue; }
      out += ch; continue;
    }
    if (ch === '"') { inStr = true; out += ch; continue; }
    if (ch === "{" || ch === "[") { stack.push(ch === "{" ? "}" : "]"); out += ch; continue; }
    if (ch === "}" || ch === "]") {
      if (!stack.length) continue;
      // close anything still open until we reach a matching opener; wrong closer gets corrected
      if (stack[stack.length - 1] !== ch) {
        const idx = stack.lastIndexOf(ch);
        if (idx === -1) { out = out.replace(/,\s*$/, "") + stack.pop(); continue; }
        while (stack.length - 1 > idx) out = out.replace(/,\s*$/, "") + stack.pop();
      }
      out = out.replace(/,\s*$/, "") + stack.pop();
      continue;
    }
    out += ch;
  }
  if (inStr) out += '"';
  while (stack.length) out = out.replace(/,\s*$/, "") + stack.pop();
  try { return JSON.parse(out); } catch { /* */ }
  try { return JSON.parse(out.replace(/'/g, '"').replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":')); } catch { return { _raw: raw }; }
}
