import { inspectGitHubRepository, type GitHubInspectionClient } from "./live-repository-intelligence";

function clientWith(responses: Record<string, { status: number; json: any }>): GitHubInspectionClient {
  return {
    async req(_method, path) {
      const url = new URL(path, "https://api.github.com");
      const key = url.pathname.endsWith("/repos/acme/app") ? "REPOSITORY"
        : url.pathname.endsWith("/commits") ? "COMMITS"
        : url.pathname.includes("/git/trees/") ? "TREE"
        : url.pathname.endsWith("/actions/runs") ? "RUNS"
        : "";
      const match = responses[key];
      if (!match) throw new Error(`Unexpected request: ${path} (mapped to ${key || "no fixture"})`);
      return match;
    },
  };
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function run() {
  const healthy = clientWith({
    "REPOSITORY": { status: 200, json: { default_branch: "trunk" } },
    "COMMITS": { status: 200, json: [{ sha: "abc123" }] },
    "TREE": { status: 200, json: { truncated: false, tree: [
      { type: "blob", path: "package.json" }, { type: "blob", path: "src/main.tsx" }, { type: "blob", path: "README.md" },
    ] } },
    "RUNS": { status: 200, json: { workflow_runs: [{ name: "CI", status: "completed", conclusion: "failure", html_url: "https://github.com/acme/app/actions/runs/1" }] } },
  });
  const report = await inspectGitHubRepository(healthy, "https://github.com/acme/app.git");
  assert(report.repository === "acme/app", "normalizes repository URLs");
  assert(report.defaultBranch === "trunk" && report.baselineSha === "abc123", "captures actual branch and baseline");
  assert(report.fileCount === 3 && report.treeComplete, "uses actual complete tree evidence");
  assert(report.diagnosis.condition === "likely-broken", "reports failing Actions as a diagnostic signal");
  assert(!report.diagnosis.safeToInitialize, "never initializes a non-empty repo");

  const unavailableTree = clientWith({
    "REPOSITORY": { status: 200, json: { default_branch: "main" } },
    "COMMITS": { status: 200, json: [{ sha: "abc123" }] },
    "TREE": { status: 403, json: { message: "Forbidden" } },
    "RUNS": { status: 403, json: { message: "Forbidden" } },
  });
  const unknown = await inspectGitHubRepository(unavailableTree, "acme/app");
  assert(unknown.diagnosis.condition === "unknown", "does not misclassify failed tree requests as empty");
  assert(!unknown.diagnosis.safeToInitialize, "failed inspection is never safe to initialize");

  const emptyRepository = clientWith({
    "REPOSITORY": { status: 200, json: { default_branch: null } },
    "COMMITS": { status: 409, json: { message: "Git Repository is empty." } },
    "TREE": { status: 404, json: { message: "Not Found" } },
    "RUNS": { status: 404, json: { message: "Not Found" } },
  });
  const empty = await inspectGitHubRepository(emptyRepository, "acme/app");
  assert(empty.diagnosis.condition === "empty", "recognizes GitHub's confirmed empty-repository response pattern");
  assert(empty.diagnosis.safeToInitialize, "only confirmed empty repositories may be proposed for initialization");

  let rejected = false;
  try { await inspectGitHubRepository(healthy, "https://github.com/acme/app/issues/2"); } catch { rejected = true; }
  assert(rejected, "rejects nested issue/file URLs instead of guessing a repository");

  const branchRequests: string[] = [];
  const branchClient: GitHubInspectionClient = { async req(_method, path) {
    branchRequests.push(path);
    const url = new URL(path, "https://api.github.com");
    if (url.pathname === "/repos/acme/app") return { status: 200, json: { default_branch: "main" } };
    if (url.pathname.endsWith("/commits")) return { status: 200, json: [{ sha: "feature-sha" }] };
    if (url.pathname.includes("/git/trees/")) return { status: 200, json: { truncated: false, tree: [{ type: "blob", path: "src/Feature.ts" }] } };
    if (url.pathname.endsWith("/actions/runs")) return { status: 200, json: { workflow_runs: [] } };
    return { status: 404, json: {} };
  } };
  const branchReport = await inspectGitHubRepository(branchClient, "acme/app", "feature/branch-sync");
  assert(branchReport.defaultBranch === "main" && branchReport.inspectedRef === "feature/branch-sync", "preserves default branch metadata while identifying selected inspection ref");
  assert(branchReport.baselineSha === "feature-sha", "anchors diagnosis to selected-ref commit");
  assert(branchRequests.some((path) => path.includes("commits?sha=feature%2Fbranch-sync")), "looks up commit from selected branch");
  assert(branchRequests.some((path) => path.includes("trees/feature%2Fbranch-sync")), "inspects selected branch tree");
  let unsafeRefRejected = false;
  try { await inspectGitHubRepository(branchClient, "acme/app", "../main"); } catch { unsafeRefRejected = true; }
  assert(unsafeRefRejected, "rejects malformed selected refs");
  console.log("Live repository intelligence tests passed");
}
void run();
