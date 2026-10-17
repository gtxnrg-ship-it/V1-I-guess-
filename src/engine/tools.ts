import * as esbuild from "esbuild-wasm";
import type { ToolDef, Img } from "./llm";
import type { Brief, PlanStep, Question } from "./types";
import { buildQaHarness } from "./qa-harness";
import { runtimeCheck, look } from "./eyes";
import * as R from "./research";
import { getState, project, writeFile, deleteFile, set } from "./db";
import { credentialGuardMessage } from "./secrets";

/** Files an agent can work on: the user's app, or (admin only) Kuro-chan's own source. */
export interface Workspace {
  kind: "app" | "self";
  name: string;
  all(): Record<string, string>;
  write(p: string, c: string): void;
  remove(p: string): void;
  env(): Record<string, string>;
}
export const appWorkspace = (projectId = project().id): Workspace => {
  const target = () => {
    const current = getState().projects.find((candidate) => candidate.id === projectId);
    if (!current) throw new Error("The project for this task no longer exists; refusing to write into another workspace.");
    return current;
  };
  return {
    kind: "app",
    get name() { return target().name; },
    all: () => target().files,
    write: (p, c) => writeFile(p, c, projectId),
    remove: (p) => deleteFile(p, projectId),
    env: () => target().env,
  };
};
export function memoryWorkspace(name: string, files: Record<string, string>): Workspace & { changed: Set<string>; base: Record<string, string> } {
  const base = { ...files };
  const cur = { ...files };
  const changed = new Set<string>();
  return {
    kind: "self", name, base, changed,
    all: () => cur,
    write: (p, c) => { cur[p] = c; changed.add(p); },
    remove: (p) => { delete cur[p]; changed.add(p); },
    env: () => ({}),
  };
}

export interface ToolOut {
  result: string;
  stat?: string;
  detail?: string;
  images?: Img[];
  sources?: { title: string; url: string }[];
  questions?: Question[];
  brief?: Brief;
  plan?: { title: string; steps: PlanStep[] };
  research?: string;
  issues?: string[];
  sql?: { title: string; sql: string };
}

const obj = (properties: Record<string, any>, required: string[] = []) => ({ type: "object", properties, required });
const str = (description: string) => ({ type: "string", description });
const arr = (items: any, description: string) => ({ type: "array", items, description });

type Def = ToolDef & { title: (a: any) => string };
export const TOOLS: Record<string, Def> = {
  list_files: { name: "list_files", description: "List every file in the project with sizes.", parameters: obj({}), title: () => "Listed files" },
  read_file: { name: "read_file", description: "Read a file.", parameters: obj({ path: str("File path, e.g. src/App.tsx") }, ["path"]), title: (a) => `Read ${a.path}` },
  search_code: { name: "search_code", description: "Find which files contain some text (case-insensitive). Returns file:line matches.", parameters: obj({ text: str("Text to look for") }, ["text"]), title: (a) => `Searched the code for “${String(a.text).slice(0, 40)}”` },
  write_file: { name: "write_file", description: "Create or fully overwrite a file. Always write the complete content.", parameters: obj({ path: str("File path"), content: str("Full file content") }, ["path", "content"]), title: (a) => `Wrote ${a.path}` },
  edit_file: { name: "edit_file", description: "Replace an exact snippet in a file (find must match exactly once). Best for small changes.", parameters: obj({ path: str("File path"), find: str("Exact existing text"), replace: str("Replacement text") }, ["path", "find", "replace"]), title: (a) => `Edited ${a.path}` },
  delete_file: { name: "delete_file", description: "Delete a file.", parameters: obj({ path: str("File path") }, ["path"]), title: (a) => `Deleted ${a.path}` },
  verify_project: { name: "verify_project", description: "Run isolated QA checks on the generated project and return compile/build errors plus runtime exceptions. Call after edits and repair every reported issue.", parameters: obj({}), title: () => "Verified project build and runtime" },
  web_search: { name: "web_search", description: "Search the web. Returns titles, URLs, snippets (and sometimes a summarised answer).", parameters: obj({ query: str("Search query") }, ["query"]), title: (a) => `Searched “${String(a.query).slice(0, 60)}”` },
  read_url: { name: "read_url", description: "Read a web page or docs page as clean text.", parameters: obj({ url: str("URL") }, ["url"]), title: (a) => `Read ${String(a.url).replace(/^https?:\/\//, "").slice(0, 50)}` },
  search_npm: { name: "search_npm", description: "Search npm for packages. Returns name@version, weekly downloads, description.", parameters: obj({ query: str("What the package should do") }, ["query"]), title: (a) => `Searched npm for “${String(a.query).slice(0, 40)}”` },
  search_github: { name: "search_github", description: "Search GitHub repositories by stars (free tools, examples, templates).", parameters: obj({ query: str("Search query") }, ["query"]), title: (a) => `Searched GitHub for “${String(a.query).slice(0, 40)}”` },
  get_docs: { name: "get_docs", description: "Read an npm package's README (its official docs). Use focus to pull the relevant sections.", parameters: obj({ package: str("npm package name"), focus: str("Optional: the API or topic you need") }, ["package"]), title: (a) => `Read the docs for ${a.package}` },
  find_photos: { name: "find_photos", description: "Find real, free-to-use photos for the app (Pexels/Unsplash if connected, else Openverse and Wikimedia). Returns direct image URLs you can put in <img src>, with alt text and credit.", parameters: obj({ query: str("What the photo should show, e.g. 'warm bakery interior, morning light'"), count: { type: "number", description: "How many (1-8)" } }, ["query"]), title: (a) => `Found photos of “${String(a.query).slice(0, 40)}”` },
  generate_image: { name: "generate_image", description: "Make a custom AI image (free, no key) for heroes, illustrations, game art, textures or icons. Returns a permanent image URL to use directly in <img src> or CSS. Describe style, subject, colors and composition.", parameters: obj({ prompt: str("Detailed image description"), width: { type: "number", description: "Pixels, default 1600" }, height: { type: "number", description: "Pixels, default 1000" } }, ["prompt"]), title: (a) => `Made an image: “${String(a.prompt).slice(0, 40)}”` },
  ask_user: { name: "ask_user", description: "Ask 1-4 short clarifying questions with tappable options. Stops and waits for the answers.", parameters: obj({ questions: arr(obj({ q: str("The question"), options: arr({ type: "string" }, "2-5 short options"), multi: { type: "boolean", description: "Allow several options" } }, ["q", "options"]), "Questions") }, ["questions"]), title: () => "Asked a few questions" },
  propose_brief: { name: "propose_brief", description: "Propose what will be built, for approval. Stops and waits for the person to tap Build it.", parameters: obj({ title: str("Short title"), summary: str("1-3 sentences"), features: arr({ type: "string" }, "Concrete features"), design: str("Design direction: mood, palette, type pairing"), backend: str("Backend needs, or 'none'"), size: { type: "string", enum: ["quick", "full"], description: "quick = small tweak; full = new or substantial" } }, ["title", "summary", "features", "design", "size"]), title: (a) => `Proposed: ${a.title}` },
  save_research: { name: "save_research", description: "Save your final research notes (markdown). Call once at the end.", parameters: obj({ notes: str("Dense, actionable markdown notes") }, ["notes"]), title: () => "Saved research notes" },
  submit_plan: { name: "submit_plan", description: "Submit the build plan. Call exactly once.", parameters: obj({ title: str("Plan title"), steps: arr(obj({ title: str("Step name"), detail: str("Exactly what to build"), files: arr({ type: "string" }, "Files touched") }, ["title", "detail"]), "Ordered steps") }, ["title", "steps"]), title: () => "Wrote the build plan" },
  report_issues: { name: "report_issues", description: "Report concrete problems to fix (empty list if excellent). Call once.", parameters: obj({ verdict: str("One-sentence overall verdict"), issues: arr({ type: "string" }, "Problem + exact fix, most important first") }, ["verdict", "issues"]), title: (a) => (a.issues?.length ? `Found ${a.issues.length} thing${a.issues.length === 1 ? "" : "s"} to improve` : "Looks great") },
  share_sql: { name: "share_sql", description: "Hand the person SQL to paste into Supabase's SQL editor (tables + row level security).", parameters: obj({ title: str("What it sets up"), sql: str("The SQL") }, ["title", "sql"]), title: (a) => `SQL: ${a.title}` },
};

export const SETS = {
  talk: ["list_files", "read_file", "web_search", "ask_user", "propose_brief"],
  research: ["web_search", "read_url", "search_npm", "search_github", "get_docs", "find_photos", "list_files", "read_file", "save_research"],
  plan: ["list_files", "read_file", "search_code", "submit_plan"],
  build: ["list_files", "read_file", "search_code", "write_file", "edit_file", "delete_file", "verify_project", "get_docs", "web_search", "find_photos", "generate_image", "share_sql"],
  check: ["report_issues"],
} as const;
export const toolDefs = (names: readonly string[]): ToolDef[] => names.map((n) => { const { title, ...d } = TOOLS[n]; return d; });
export const toolTitle = (name: string, args: any) => { try { return TOOLS[name]?.title(args) || name; } catch { return name; } };

const norm = (p: string) => String(p || "").replace(/^\.?\/+/, "").replace(/\\/g, "/");
const clip = (s: string, n = 14000) => (s.length > n ? s.slice(0, n) + `\n…[truncated ${s.length - n} chars]` : s);
export function lineDiff(a: string | undefined, b: string) {
  const A = (a ?? "").split("\n"), B = b.split("\n");
  const setA = new Map<string, number>(); A.forEach((l) => setA.set(l, (setA.get(l) || 0) + 1));
  let common = 0; for (const l of B) { const n = setA.get(l) || 0; if (n > 0) { common++; setA.set(l, n - 1); } }
  return { added: B.length - common, removed: a === undefined ? 0 : A.length - common };
}

/** Self-workspace check: make sure every changed TypeScript file at least parses. */
async function syntaxCheck(files: Record<string, string>, changed: Iterable<string>) {
  const errs: string[] = [];
  for (const p of changed) {
    if (!/\.(tsx?|jsx?)$/.test(p) || files[p] == null) continue;
    try { await esbuild.transform(files[p], { loader: p.endsWith("x") ? "tsx" : "ts" }); }
    catch (e: any) { for (const er of e.errors || [{ text: e.message }]) errs.push(`${p}${er.location ? `:${er.location.line}:${er.location.column}` : ""} ${er.text}`); }
  }
  return errs;
}

export async function runTool(ws: Workspace, name: string, a: any): Promise<ToolOut> {
  const files = ws.all();
  switch (name) {
    case "list_files": {
      const list = Object.keys(files).sort().map((p) => `${p} (${files[p].length}b)`);
      return { result: list.join("\n") || "(empty project)", stat: `${list.length} files` };
    }
    case "read_file": {
      const c = files[norm(a.path)];
      if (c == null) return { result: `No such file: ${a.path}. Files: ${Object.keys(files).slice(0, 60).join(", ")}` };
      return { result: clip(c, 24000), stat: `${c.split("\n").length} lines` };
    }
    case "search_code": {
      const t = String(a.text || "").toLowerCase();
      const hits: string[] = [];
      for (const [p, c] of Object.entries(files)) c.split("\n").forEach((l, i) => { if (hits.length < 60 && l.toLowerCase().includes(t)) hits.push(`${p}:${i + 1}: ${l.trim().slice(0, 160)}`); });
      return { result: hits.join("\n") || "No matches.", stat: `${hits.length} matches` };
    }
    case "write_file": {
      const p = norm(a.path);
      if (!p || typeof a.content !== "string") return { result: "ERROR: path and content are required." };
      const credentialError = credentialGuardMessage(p, a.content, "write");
      if (credentialError) return { result: credentialError };
      const d = lineDiff(files[p], a.content);
      ws.write(p, a.content);
      return { result: `Wrote ${p} (${a.content.split("\n").length} lines).`, stat: `+${d.added} -${d.removed}` };
    }
    case "edit_file": {
      const p = norm(a.path);
      const c = files[p];
      if (c == null) return { result: `ERROR: No such file: ${p}` };
      const find = String(a.find ?? "");
      let n = find ? c.split(find).length - 1 : 0;
      let next: string | null = null;
      if (n === 1) next = c.replace(find, () => String(a.replace ?? ""));
      else if (n === 0 && find.trim()) {
        // forgiving match: ignore indentation/whitespace differences (weak models often get these wrong)
        const esc = find.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
        const m = c.match(new RegExp(esc));
        if (m && c.split(m[0]).length === 2) { next = c.replace(m[0], () => String(a.replace ?? "")); n = 1; }
      }
      if (next == null) return { result: n === 0 ? `ERROR: "find" text not found in ${p}. Read the file again and copy the exact text, or use write_file.` : `ERROR: "find" matches ${n} places in ${p}; include more surrounding text.` };
      const credentialError = credentialGuardMessage(p, next, "edit");
      if (credentialError) return { result: credentialError };
      const d = lineDiff(c, next);
      ws.write(p, next);
      return { result: `Edited ${p}.`, stat: `+${d.added} -${d.removed}` };
    }
    case "delete_file": {
      const p = norm(a.path);
      if (files[p] == null) return { result: `ERROR: No such file: ${p}` };
      ws.remove(p);
      return { result: `Deleted ${p}.` };
    }
    case "verify_project": {
      if (ws.kind === "self") {
        const errs = await syntaxCheck(files, (ws as any).changed || []);
        return { result: errs.length ? `Syntax errors:\n${errs.join("\n")}` : "All changed files parse cleanly. (The full type-check and build run on GitHub Actions.)", stat: errs.length ? `${errs.length} errors` : "clean" };
      }
      const b = await buildQaHarness(files, ws.env());
      if (b.errors.length) return { result: `BUILD ERRORS:\n${b.errors.join("\n")}`, stat: `${b.errors.length} errors` };
      const rt = await runtimeCheck(b.html);
      set({ runtimeErrors: rt });
      return { result: rt.length ? `Builds, but it crashed or logged errors while running:\n${rt.join("\n")}` : "Builds and runs cleanly.", stat: rt.length ? `${rt.length} runtime errors` : "clean" };
    }
    case "web_search": {
      const r = await R.webSearch(String(a.query || ""));
      const text = `${r.answer ? `Answer (${r.engine}):\n${clip(r.answer, 4000)}\n\n` : `Engine: ${r.engine}\n\n`}${r.hits.map((h, i) => `${i + 1}. ${h.title}\n${h.url}${h.snippet ? `\n${h.snippet}` : ""}`).join("\n\n")}`;
      return { result: text || "No results.", stat: `${r.hits.length} results`, sources: r.hits.slice(0, 8).map((h) => ({ title: h.title, url: h.url })), detail: clip(text, 2000) };
    }
    case "read_url": {
      const t = await R.readUrl(String(a.url));
      return { result: t, stat: `${Math.round(t.length / 100) / 10}k chars`, sources: [{ title: String(a.url).replace(/^https?:\/\//, "").slice(0, 60), url: String(a.url) }], detail: t.slice(0, 1200) };
    }
    case "search_npm": { const t = await R.npmSearch(String(a.query)); return { result: t, detail: t }; }
    case "search_github": {
      const h = await R.github(String(a.query));
      const t = h.map((x) => `- ${x.title}: ${x.snippet}\n  ${x.url}`).join("\n") || "No repos found.";
      return { result: t, detail: t, stat: `${h.length} repos`, sources: h.map((x) => ({ title: x.title, url: x.url })) };
    }
    case "get_docs": { const t = await R.packageDocs(String(a.package), a.focus); return { result: t, stat: `${Math.round(t.length / 100) / 10}k chars`, detail: t.slice(0, 1200) }; }
    case "find_photos": {
      const r = await R.findPhotos(String(a.query || ""), Math.max(1, Math.min(8, Number(a.count) || 5)));
      if (!r.photos.length) return { result: "No photos found. Try a simpler query, or use generate_image." };
      return { result: `From ${r.source}:\n` + r.photos.map((p, i) => `${i + 1}. ${p.url}\n   alt: ${p.alt}\n   credit: ${p.credit}`).join("\n"), stat: `${r.photos.length} photos`, sources: r.photos.slice(0, 4).map((p) => ({ title: p.alt, url: p.url })) };
    }
    case "generate_image": {
      const w = Math.max(256, Math.min(2048, Number(a.width) || 1600)), h = Math.max(256, Math.min(2048, Number(a.height) || 1000));
      const url = R.imageUrl(String(a.prompt || "abstract gradient"), w, h, Math.floor(Math.random() * 1e6));
      return { result: `Image URL (use it exactly as is; it renders on first load):\n${url}`, stat: `${w}×${h}` };
    }
    case "ask_user": {
      const qs: Question[] = (Array.isArray(a.questions) ? a.questions : []).slice(0, 4).map((q: any, i: number) => ({ id: `q${i}`, q: String(q.q || q.question || ""), options: (Array.isArray(q.options) ? q.options : []).slice(0, 6).map(String), multi: !!q.multi }));
      const good = qs.filter((q) => q.q.trim() && q.options.length >= 2);
      if (!good.length) return { result: 'ERROR: no valid questions. Call ask_user again with valid JSON like {"questions":[{"q":"Who is it for?","options":["Just me","My customers"]}]}' };
      return { result: "Questions shown. Stop now and wait for the answers.", questions: good };
    }
    case "propose_brief": {
      const b: Brief = { title: String(a.title || "Your app"), summary: String(a.summary || ""), features: (Array.isArray(a.features) ? a.features : []).map(String), design: String(a.design || ""), backend: a.backend && !/^none$/i.test(a.backend) ? String(a.backend) : undefined, size: a.size === "quick" ? "quick" : "full" };
      if (!a.title && !a.summary && !b.features.length) return { result: 'ERROR: the brief was empty. Call propose_brief again with title, summary, features, design and size.' };
      return { result: "Brief shown. Stop now and wait for approval.", brief: b };
    }
    case "save_research": return { result: "Saved.", research: String(a.notes || "") };
    case "submit_plan": {
      const steps: PlanStep[] = (Array.isArray(a.steps) ? a.steps : []).slice(0, 10).map((s: any) => (typeof s === "string" ? { title: s, status: "todo" } : { title: String(s.title || "Step"), detail: s.detail ? String(s.detail) : undefined, files: Array.isArray(s.files) ? s.files.map(String) : undefined, status: "todo" }));
      return { result: "Plan saved.", plan: { title: String(a.title || "Build plan"), steps } };
    }
    case "report_issues": return { result: "Reported.", issues: (Array.isArray(a.issues) ? a.issues : []).map(String).slice(0, 8), detail: String(a.verdict || "") };
    case "share_sql": return { result: "SQL shown to the person with a copy button and a link to Supabase's SQL editor.", sql: { title: String(a.title || "Database setup"), sql: String(a.sql || "") } };
  }
  return { result: `Unknown tool: ${name}` };
}

export { look };
export const hasGeminiSearch = () => getState().keys.some((k) => k.provider === "google");
