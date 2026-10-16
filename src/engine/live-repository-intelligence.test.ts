import { inspectGitHubRepository, type GitHubInspectionClient } from "./live-repository-intelligence";

function clientWith(responses: Record<string, { status: number; json: any }>): GitHubInspectionClient {
  return {
    async req(_method, path) {
      const match = Object.entries(responses).find(([key]) => path.includes(key));
      if (!match) throw new Error(`Unexpected request: ${path}`);
      return match[1];
    },
  };
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function run() {
  const healthy = clientWith({
    "/repos/acme/app": { status: 200, json: { default_branch: "trunk" } },
    "/commits?": { status: 200, json: [{ sha: "abc123" }] },
    "/git/trees/trunk": { status: 200, json: { truncated: false, tree: [
      { type: "blob", path: "package.json" }, { type: "blob", path: "src/main.tsx" }, { type: "blob", path: "README.md" },
    ] } },
    "/actions/runs": { status: 200, json: { workflow_runs: [{ name: "CI", status: "completed", conclusion: "failure", html_url: "https://github.com/acme/app/actions/runs/1" }] } },
  });
  const report = await inspectGitHubRepository(healthy, "https://github.com/acme/app.git");
  assert(report.repository === "acme/app", "normalizes repository URLs");
  assert(report.defaultBranch === "trunk" && report.baselineSha === "abc123", "captures actual branch and baseline");
  assert(report.fileCount === 3 && report.treeComplete, "uses actual complete tree evidence");
  assert(report.diagnosis.condition === "likely-broken", "reports failing Actions as a diagnostic signal");
  assert(!report.diagnosis.safeToInitialize, "never initializes a non-empty repo");

  const unavailableTree = clientWith({
    "/repos/acme/app": { status: 200, json: { default_branch: "main" } },
    "/commits?": { status: 200, json: [{ sha: "abc123" }] },
    "/git/trees/main": { status: 403, json: { message: "Forbidden" } },
    "/actions/runs": { status: 403, json: { message: "Forbidden" } },
  });
  const unknown = await inspectGitHubRepository(unavailableTree, "acme/app");
  assert(unknown.diagnosis.condition === "unknown", "does not misclassify failed tree requests as empty");
  assert(!unknown.diagnosis.safeToInitialize, "failed inspection is never safe to initialize");

  let rejected = false;
  try { await inspectGitHubRepository(healthy, "https://github.com/acme/app/issues/2"); } catch { rejected = true; }
  assert(rejected, "rejects nested issue/file URLs instead of guessing a repository");

  console.log("Live repository intelligence tests passed");
}
void run();
