import { diagnoseRepository, type RepositoryDiagnosis } from "./repository-diagnosis";

type GitHubResponse = { status: number; json: any };
export interface GitHubInspectionClient {
  req(method: string, path: string, body?: unknown): Promise<GitHubResponse>;
}
export interface LiveRepositoryInspection {
  repository: string;
  defaultBranch: string;
  baselineSha: string | null;
  treeComplete: boolean;
  fileCount: number;
  readableKeyFiles: string[];
  recentRuns: { name: string; status: string; conclusion: string | null; url: string }[];
  diagnosis: RepositoryDiagnosis;
  inspectedAt: string;
}
function parseRepository(input: string): { owner: string; name: string; fullName: string } {
  const value = input.trim().replace(/\.git$/i, "").replace(/\/$/, "");
  const url = value.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/i);
  const parts = (url ? [url[1], url[2]] : value.split("/")).filter(Boolean);
  if (parts.length !== 2 || !parts.every((part) => /^[a-zA-Z0-9_.-]+$/.test(part))) {
    throw new Error("Enter a GitHub repository as owner/repository or a repository URL.");
  }
  return { owner: parts[0], name: parts[1], fullName: `${parts[0]}/${parts[1]}` };
}
async function get(client: GitHubInspectionClient, path: string): Promise<any> {
  const response = await client.req("GET", path);
  if (response.status >= 300) {
    throw new Error(`Repository inspection failed for ${path}: ${response.json?.message || `GitHub returned HTTP ${response.status}`}`);
  }
  return response.json;
}
const KEY_FILES = [
  "package.json", "README.md", "src/main.tsx", "src/main.ts", "src/index.tsx",
  "src/index.ts", "src/App.tsx", "app/page.tsx", "pyproject.toml", "requirements.txt",
  "Cargo.toml", "go.mod", "pubspec.yaml", "build.gradle", "build.gradle.kts",
];
export async function inspectGitHubRepository(
  client: GitHubInspectionClient,
  input: string,
): Promise<LiveRepositoryInspection> {
  const { owner, name, fullName } = parseRepository(input);
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const metadata = await get(client, repoPath);
  const defaultBranch = typeof metadata.default_branch === "string" && metadata.default_branch ? metadata.default_branch : "main";
  const [commitsResult, treeResult, runsResult] = await Promise.all([
    client.req("GET", `${repoPath}/commits?per_page=1`),
    client.req("GET", `${repoPath}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`),
    client.req("GET", `${repoPath}/actions/runs?per_page=10`),
  ]);
  const commitsKnown = commitsResult.status === 200 && Array.isArray(commitsResult.json);
  const emptyCommitHistory = commitsKnown && commitsResult.json.length === 0;
  const latestCommitSha = commitsKnown ? commitsResult.json[0]?.sha ?? null : null;
  const treeKnown = treeResult.status === 200 && Array.isArray(treeResult.json?.tree);
  const treeComplete = treeKnown && treeResult.json.truncated === false;
  const files = treeKnown ? treeResult.json.tree.filter((item: any) => item?.type === "blob" && typeof item.path === "string").map((item: any) => item.path) : [];
  const readableKeyFiles = KEY_FILES.filter((path) => files.includes(path));
  const actionsKnown = runsResult.status === 200 && Array.isArray(runsResult.json?.workflow_runs);
  const recentRuns = actionsKnown ? runsResult.json.workflow_runs.map((run: any) => ({
    name: String(run.name || run.workflow_id || "GitHub Actions"),
    status: String(run.status || "unknown"),
    conclusion: typeof run.conclusion === "string" ? run.conclusion : null,
    url: typeof run.html_url === "string" ? run.html_url : "",
  })) : [];
  const failures = recentRuns.filter((run: { status: string; conclusion: string | null }) =>
    run.status === "completed" && run.conclusion !== null && run.conclusion !== "success" && run.conclusion !== "skipped",
  ).length;
  const diagnosis = diagnoseRepository({
    repoFullName: fullName, defaultBranch, latestCommitSha,
    commitCount: emptyCommitHistory ? 0 : undefined,
    files, readableFileCount: readableKeyFiles.length, treeComplete,
    actionsFailures: failures, actionsRunsKnown: actionsKnown,
  });
  if (!treeKnown) {
    diagnosis.condition = "unknown";
    diagnosis.title = "Repository tree could not be inspected";
    diagnosis.summary = "GitHub did not return a readable repository tree. Kuro-chan will not initialize or change files until access is restored.";
    diagnosis.confidence = "low";
    diagnosis.safeToInitialize = false;
    diagnosis.unknowns = [...diagnosis.unknowns, "The default-branch tree request failed or returned an unexpected response."];
    diagnosis.recommendedNextSteps = ["Check repository permissions and GitHub API status.", "Retry the inspection before proposing code changes."];
  }
  if (!commitsKnown && commitsResult.status !== 409) {
    diagnosis.unknowns = [...diagnosis.unknowns, "Commit history could not be confirmed; empty-repository classification is unsafe."];
    if (diagnosis.condition === "empty") {
      diagnosis.condition = "unknown";
      diagnosis.title = "Repository status unknown";
      diagnosis.confidence = "low";
      diagnosis.safeToInitialize = false;
    }
  }
  return { repository: fullName, defaultBranch, baselineSha: latestCommitSha, treeComplete, fileCount: files.length, readableKeyFiles, recentRuns, diagnosis, inspectedAt: new Date().toISOString() };
}
