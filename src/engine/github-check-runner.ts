export interface GitHubApiResponse { status: number; json: any }
export interface GitHubWorkflowClient { req(method: string, path: string, body?: unknown): Promise<GitHubApiResponse> }
export interface GitHubCheckRun { id: number; name: string; status: string; conclusion: string | null; url: string; headSha: string; branch: string }
export interface GitHubCheckResult { state: "passed" | "failed" | "running" | "blocked"; repository: string; ref: string; baselineSha: string; run?: GitHubCheckRun; message: string }
export interface GitHubCheckOptions { attempts?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> }
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Dispatch only the repository existing check.yml workflow; never accepts an arbitrary workflow path. */
export async function runGitHubChecks(client: GitHubWorkflowClient, repository: string, refInput?: string, options: GitHubCheckOptions = {}): Promise<GitHubCheckResult> {
  const clean = repository.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/\/$/, "");
  const parts = clean.split("/");
  if (parts.length !== 2 || parts.some((part) => !/^[a-zA-Z0-9_.-]+$/.test(part))) throw new Error("Choose a valid GitHub repository in owner/repository form before running checks.");
  const owner = parts[0], name = parts[1], ref = String(refInput || "").trim();
  if (ref && (ref.length > 255 || ref.startsWith("-") || /[\s~^:?*\[\\]/.test(ref) || ref.includes("..") || ref.endsWith(".lock") || ref.split("/").some((part) => !part || part.startsWith(".") || part.endsWith(".")))) throw new Error("The selected branch/ref is not safe to dispatch. Choose a normal Git branch name.");
  const meta = await client.req("GET", "/repos/" + owner + "/" + name);
  if (meta.status !== 200) throw new Error("Cannot read repository metadata (HTTP " + meta.status + "). Check the connection and repository permissions.");
  const branch = ref || String(meta.json?.default_branch || "main");
  const commit = await client.req("GET", "/repos/" + owner + "/" + name + "/commits/" + encodeURIComponent(branch));
  const baselineSha = String(commit.json?.sha || "");
  if (commit.status !== 200 || !/^[0-9a-f]{40}$/i.test(baselineSha)) throw new Error("Cannot resolve branch " + branch + " to an exact commit. Refresh repository access and try again.");
  const endpoint = "/repos/" + owner + "/" + name + "/actions/workflows/check.yml/runs?branch=" + encodeURIComponent(branch) + "&event=workflow_dispatch&per_page=20";
  const before = await client.req("GET", endpoint);
  if (before.status !== 200 || !Array.isArray(before.json?.workflow_runs)) throw new Error("Cannot inspect previous check runs (HTTP " + before.status + "). The GitHub App/session may need Actions read permission.");
  const knownIds = new Set<number>(before.json.workflow_runs.map((run: any) => Number(run.id)).filter(Number.isFinite));
  const dispatch = await client.req("POST", "/repos/" + owner + "/" + name + "/actions/workflows/check.yml/dispatches", { ref: branch });
  if (dispatch.status < 200 || dispatch.status >= 300) { const reason = String(dispatch.json?.message || ""); throw new Error("GitHub refused to start check.yml (HTTP " + dispatch.status + ")" + (reason ? ": " + reason : "") + ". The connection needs Actions write permission and check.yml must support workflow_dispatch."); }
  const attempts = Math.max(1, Math.min(90, Math.floor(options.attempts ?? 40)));
  const interval = Math.max(0, Math.min(10000, options.intervalMs ?? 3000));
  const sleep = options.sleep || wait;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(interval);
    const response = await client.req("GET", endpoint);
    if (response.status !== 200 || !Array.isArray(response.json?.workflow_runs)) continue;
    const run = response.json.workflow_runs.find((candidate: any) => !knownIds.has(Number(candidate.id)) && candidate.event === "workflow_dispatch" && candidate.head_branch === branch);
    if (!run) continue;
    const url = typeof run.html_url === "string" ? run.html_url : "https://github.com/" + owner + "/" + name + "/actions";
    const resultRun: GitHubCheckRun = { id: Number(run.id), name: String(run.name || "Check"), status: String(run.status || "unknown"), conclusion: run.conclusion || null, url, headSha: String(run.head_sha || ""), branch };
    if (resultRun.headSha !== baselineSha) return { state: "blocked", repository: clean, ref: branch, baselineSha, run: resultRun, message: "The branch moved after the check was requested (expected " + baselineSha + ", run used " + (resultRun.headSha || "unknown") + "). Review the new commit and run checks again." };
    if (run.status === "completed") { const passed = run.conclusion === "success"; return { state: passed ? "passed" : "failed", repository: clean, ref: branch, baselineSha, run: resultRun, message: passed ? "GitHub Actions check.yml passed for " + branch + " at " + baselineSha + "." : "GitHub Actions check.yml finished with conclusion " + String(run.conclusion || "unknown") + " for " + branch + " at " + baselineSha + ". Review the workflow logs before editing." }; }
  }
  return { state: "running", repository: clean, ref: branch, baselineSha, message: "The check workflow was dispatched for " + branch + " at " + baselineSha + ", but no completed run was observed before the polling limit. Check GitHub Actions for the live status." };
}