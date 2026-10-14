// Admin only: Kuro-chan reading and upgrading her own source code through her GitHub repo.
// GitHub Actions then rebuild her website and her Android APK.
import { GH } from "./github";
import { getState, keyOf } from "./db";
import { memoryWorkspace } from "./tools";

export const DEFAULT_SELF_REPO = "gtxnrg-ship-it/V1-I-guess-";
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
  const info = await gh.ensureRepo(repo);
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
  const info = await gh.ensureRepo(repo);
  const branch = `kuro-upgrade-${Date.now().toString(36)}`;
  const list = Object.entries(files).map(([path, content]) => ({ path, content }));
  await gh.commitFiles(owner, name, branch, list, `Kuro-chan upgrade: ${title}`, { fromBranch: info.defaultBranch });
  const pr = await gh.openPR(owner, name, branch, info.defaultBranch, `Kuro-chan upgrade: ${title}`, `${summary}\n\nFiles: ${Object.keys(files).join(", ")}\n\nProposed by Kuro-chan from her admin panel. The "Check" workflow builds this branch; merging it rebuilds her website and Android APK.`);
  if (merge) { await gh.mergePR(owner, name, pr.number); resetSelf(); }
  return pr;
}
