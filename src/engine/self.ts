// Admin only: Kuro-chan reading and upgrading her own source code through her GitHub repo.
// GitHub Actions then rebuild her website and her Android APK.
import { GH } from "./github";
import { getState, keyOf } from "./db";
import { memoryWorkspace } from "./tools";
import { webSearch } from "./research";

export const DEFAULT_SELF_REPO = "gtxnrg-ship-it/kuro-chan";
export const selfRepo = () => (getState().settings.selfRepo || DEFAULT_SELF_REPO).replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");

export const SELF_STACK = `YOUR OWN CODEBASE (you are editing Kuro-chan herself, not a user's app):
- A Vite + React 18 + TypeScript single-page app that runs entirely in the browser (and inside an Android app via Capacitor). No server. It is built by GitHub Actions: "npm run build" must pass with "tsc --noEmit" clean.
- src/engine/: types.ts (shared types), db.ts (IndexedDB store + useKuro hook), providers.ts (AI providers + key detection), llm.ts (Gemini/Anthropic/OpenAI streaming adapters), router.ts (model choice per role + failover), prompts.ts (agent prompts + design standard), tools.ts (agent tools), agents.ts (the Talker → Researcher → Planner → Builder → Checker pipeline), research.ts (web/npm/GitHub/docs research), preview.ts (esbuild-wasm bundler), eyes.ts (screenshots), github.ts, ship.ts (Pages + APK workflows), template.ts (starter app), self.ts (this self-upgrade system), admin.ts (admin unlock).
- src/components/her/*.tsx: the studio UI (ChatPanel, AssistantMessage, PreviewPane, CodePane, KeysPane, AdminPane, ...). src/pages/studio.tsx lays it out. Styling: Tailwind with the tokens in src/index.css; keep the calm, premium look.
- Rules: keep every existing feature working; make the smallest change that does the job; write complete files; never weaken security (keys never leave the device, preview frames stay sandboxed without same-origin); never use emojis in the UI.`;

let cache: { repo: string; ws: ReturnType<typeof memoryWorkspace> } | null = null;

export function ghToken(): string {
  const k = keyOf("github");
  if (!k) throw new Error("Add a GitHub token in Keys first (fine-grained, with Contents, Pull requests and Workflows: read and write on your Kuro-chan repo).");
  return k.secret;
}

export async function selfWorkspace(fresh = false) {
  const repo = selfRepo();
  if (cache && cache.repo === repo && !fresh) return cache.ws;
  const gh = new GH(ghToken());
  const [owner, name] = repo.split("/");
  const info = await gh.getExistingRepo(repo);
  const files = await gh.readTree(owner, name, info.defaultBranch, (p) => !/^(node_modules|dist|android)\//.test(p) && p !== "package-lock.json");
  if (!Object.keys(files).length) throw new Error(`${repo} is empty.`);
  cache = { repo, ws: memoryWorkspace("Kuro-chan", files) };
  return cache.ws;
}
export const resetSelf = () => { cache = null; };

export async function shipUpgrade(title: string, summary: string, files: Record<string, string | null>, merge: boolean) {
  const gh = new GH(ghToken());
  const repo = selfRepo();
  const [owner, name] = repo.split("/");
  const info = await gh.getExistingRepo(repo);
  const branch = `kuro-upgrade-${Date.now().toString(36)}`;
  const list = Object.entries(files).map(([path, content]) => ({ path, content }));
  await gh.commitFiles(owner, name, branch, list, `Kuro-chan upgrade: ${title}`, { fromBranch: info.defaultBranch });
  const pr = await gh.openPR(owner, name, branch, info.defaultBranch, `Kuro-chan upgrade: ${title}`, `${summary}\n\nFiles: ${Object.keys(files).join(", ")}\n\nProposed by Kuro-chan from her admin panel. The "Check" workflow builds this branch; merging it rebuilds her website and Android APK.`);
  if (merge) { await gh.mergePR(owner, name, pr.number); resetSelf(); }
  return pr;
}

const SELF_SEARCH_KEY = "kuro_self_search_ts";
const SELF_SUGGESTIONS_KEY = "kuro_self_suggestions";

export async function runDailySelfSearch(router: any): Promise<void> {
  try {
    const last = parseInt(localStorage.getItem(SELF_SEARCH_KEY) || "0", 10);
    if (Date.now() - last < 23 * 60 * 60 * 1000) return; // Once per 23h

    const queries = [
      "React 18 performance patterns 2024 best practices",
      "TypeScript strict mode patterns large codebases",
      "Tailwind CSS v3 advanced techniques",
      "AI agent architecture patterns reliability 2024",
    ];

    const results = await Promise.allSettled(
      queries.map((q) => webSearch(q))
    );

    const context = results
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value?.answer || r.value?.hits?.map((h: any) => h.snippet).join("\n"))
      .filter(Boolean)
      .join("\n\n");

    const repository = selfRepo();
    const promptText = `You are reviewing your own codebase (Kuro-chan AI builder at ${repository}). Based on these web research results about best practices:\n\n${context}\n\nList 3-5 specific, concrete improvements for THIS codebase. For each: which file, what change, why it matters. Keep each suggestion under 40 words. Respond as Kuro-chan (tsundere voice, honest, no fluff).`;

    let suggestions = "";
    if (router && typeof router.call === "function") {
      const response = await router.call(
        [{ role: "user", content: promptText }],
        { temperature: 0.4 }
      );
      suggestions = response?.content || response?.text || "";
    } else {
      suggestions = "1. src/engine/preview.ts: Cache esbuild transform outputs. Faster live preview updates.\n2. src/components/her/CodePane.tsx: Add virtualized rendering for 500+ line files. Smooth scrolling.\n3. src/engine/db.ts: Wrap storage writes in debounced microtasks. Reduced IO pressure.";
    }

    if (suggestions) {
      localStorage.setItem(SELF_SUGGESTIONS_KEY, suggestions);
      localStorage.setItem(SELF_SEARCH_KEY, String(Date.now()));
    }
  } catch { /* fail silently */ }
}

export function getSelfSuggestions(): string {
  try { return localStorage.getItem(SELF_SUGGESTIONS_KEY) || ""; } catch { return ""; }
}
