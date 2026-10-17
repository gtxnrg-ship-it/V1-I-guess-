import { runGitHubChecks, type GitHubWorkflowClient } from "./github-check-runner";
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function scenario(conclusion: string | null, movedSha?: string) {
  const baseline = "a".repeat(40), other = movedSha || baseline; let dispatched = false;
  const client: GitHubWorkflowClient = { async req(method, path, body) {
    if (method === "GET" && path === "/repos/acme/demo") return { status: 200, json: { default_branch: "main" } };
    if (method === "GET" && path === "/repos/acme/demo/commits/main") return { status: 200, json: { sha: baseline } };
    if (method === "GET" && path.includes("/actions/workflows/check.yml/runs?")) return { status: 200, json: { workflow_runs: dispatched ? [{ id: 42, name: "Check", event: "workflow_dispatch", head_branch: "main", head_sha: other, status: conclusion === null ? "in_progress" : "completed", conclusion, html_url: "https://github.com/acme/demo/actions/runs/42" }] : [] } };
    if (method === "POST" && path === "/repos/acme/demo/actions/workflows/check.yml/dispatches") { assert(JSON.stringify(body) === JSON.stringify({ ref: "main" }), "dispatch only requested branch and fixed workflow"); dispatched = true; return { status: 204, json: null }; }
    throw new Error("Unexpected request: " + method + " " + path);
  }};
  return runGitHubChecks(client, "https://github.com/acme/demo.git", undefined, { attempts: 2, intervalMs: 0, sleep: async () => {} });
}
async function main() {
  const passed = await scenario("success"); assert(passed.state === "passed" && passed.run?.headSha === "a".repeat(40), "reports exact-commit success");
  const failed = await scenario("failure"); assert(failed.state === "failed" && failed.run?.url.includes("/runs/42"), "links to failed workflow run");
  const moved = await scenario("success", "b".repeat(40)); assert(moved.state === "blocked", "does not report success if the branch moved to another SHA");
  const running = await scenario(null); assert(running.state === "running", "does not report pass before workflow completion");
  let denied = false;
  try { await runGitHubChecks({ async req(method, path) { if (method === "GET" && path === "/repos/acme/demo") return { status: 200, json: { default_branch: "main" } }; if (method === "GET" && path.includes("/commits/")) return { status: 200, json: { sha: "a".repeat(40) } }; if (method === "GET") return { status: 200, json: { workflow_runs: [] } }; return { status: 403, json: { message: "Resource not accessible by integration" } }; } }, "acme/demo", undefined, { attempts: 1, sleep: async () => {} }); } catch (e) { denied = String(e).includes("Actions write permission"); }
  assert(denied, "explains missing Actions write permission");
  console.log("GitHub Actions verification runner tests passed");
}
void main();