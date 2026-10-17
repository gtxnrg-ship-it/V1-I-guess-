import { buildRepositoryContext, type RepositoryContextClient } from "./repository-context";

function b64(value: string) { return btoa(unescape(encodeURIComponent(value))); }
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function run() {
  const source = "export const answer = 42;\n";
  const requests: string[] = [];
  const client: RepositoryContextClient = {
    async req(_method, path) {
      requests.push(path);
      if (path === "/repos/acme/app/") return { status: 200, json: { default_branch: "main" } };
      if (path.endsWith("/commits?per_page=1")) return { status: 200, json: [{ sha: "commit-123" }] };
      if (path.includes("/git/trees/commit-123?recursive=1")) return { status: 200, json: { truncated: false, tree: [
        { type: "blob", path: "README.md", sha: "blob-readme", size: 15 },
        { type: "blob", path: "src/App.tsx", sha: "blob-app", size: source.length },
        { type: "blob", path: "assets/logo.png", sha: "blob-image", size: 900 },
        { type: "blob", path: "src/secret.lock", sha: "blob-lock", size: 900 },
      ] } };
      if (path.endsWith("/git/blobs/blob-readme")) return { status: 200, json: { encoding: "base64", content: b64("# Acme app") } };
      if (path.endsWith("/git/blobs/blob-app")) return { status: 200, json: { encoding: "base64", content: b64(source) } };
      throw new Error("Unexpected request: " + path);
    },
  };
  const pack = await buildRepositoryContext(client, "https://github.com/acme/app.git");
  assert(pack.repository === "acme/app" && pack.branch === "main", "normalizes repository and captures branch");
  assert(pack.commitSha === "commit-123", "records the observed commit SHA");
  assert(pack.inventoryCount === 2, "filters binary and lockfile paths from inventory");
  assert(pack.includedCount === 2 && pack.files.some((file) => file.content.includes("answer = 42")), "loads actual source file bodies");
  assert(pack.asPrompt().includes("Actual file bodies loaded: 2"), "prompt discloses actual source coverage");
  assert(pack.asPrompt().includes("not file contents"), "distinguishes path inventory from source content");
  assert(!requests.some((path) => path.includes("blob-image") || path.includes("blob-lock")), "never fetches binary assets or lockfiles");
  let rejected = false;
  try { await buildRepositoryContext(client, "https://github.com/acme/app/tree/main"); } catch { rejected = true; }
  assert(rejected, "rejects nested URLs instead of guessing the repository");
  const branchRequests: string[] = [];
  const branchClient: RepositoryContextClient = {
    async req(_method, path) {
      branchRequests.push(path);
      if (path === "/repos/acme/app/") return { status: 200, json: { default_branch: "main" } };
      if (path === "/repos/acme/app/commits?sha=feature%2Fbranch-sync&per_page=1") return { status: 200, json: [{ sha: "feature-commit-456" }] };
      if (path === "/repos/acme/app/git/trees/feature-commit-456?recursive=1") return { status: 200, json: { truncated: false, tree: [
        { type: "blob", path: "src/App.tsx", sha: "branch-app", size: source.length },
      ] } };
      if (path.endsWith("/git/blobs/branch-app")) return { status: 200, json: { encoding: "base64", content: b64("export const branch = true;") } };
      throw new Error("Unexpected branch request: " + path);
    },
  };
  const branchPack = await buildRepositoryContext(branchClient, "acme/app", { branch: "feature/branch-sync" });
  assert(branchPack.branch === "feature/branch-sync", "uses the explicitly selected branch in the context metadata");
  assert(branchPack.commitSha === "feature-commit-456", "anchors context to the selected branch's commit");
  assert(branchPack.files[0]?.content.includes("branch = true"), "loads source from the selected branch");
  assert(branchPack.asPrompt().includes("Selected source ref: feature/branch-sync"), "prompt names the selected ref clearly");
  assert(branchRequests.some((path) => path.includes("trees/feature-commit-456?recursive=1")), "reads the tree by immutable observed commit SHA rather than moving branch name");
  let unsafeRefRejected = false;
  try { await buildRepositoryContext(branchClient, "acme/app", { branch: "../main" }); } catch { unsafeRefRejected = true; }
  assert(unsafeRefRejected, "rejects malformed refs before fetching the tree");
  const pinnedRequests: string[] = [];
  const pinnedClient: RepositoryContextClient = {
    async req(_method, path) {
      pinnedRequests.push(path);
      if (path === "/repos/acme/app/") return { status: 200, json: { default_branch: "main" } };
      if (path.endsWith("/commits?per_page=1")) return { status: 403, json: { message: "Rate limited after inspection" } };
      if (path === "/repos/acme/app/git/trees/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?recursive=1") return { status: 200, json: { truncated: false, tree: [{ type: "blob", path: "src/App.tsx", sha: "pinned-app", size: source.length }] } };
      if (path.endsWith("/git/blobs/pinned-app")) return { status: 200, json: { encoding: "base64", content: b64("export const pinned = true;") } };
      throw new Error("Unexpected pinned request: " + path);
    },
  };
  const pinnedPack = await buildRepositoryContext(pinnedClient, "acme/app", { commitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
  assert(pinnedPack.commitSha === "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "preserves the caller's inspected baseline SHA");
  assert(pinnedPack.files[0]?.content.includes("pinned = true"), "loads bodies from the pinned inspected commit even if a second moving-ref lookup is unavailable");
  assert(pinnedRequests.some((path) => path.includes("/trees/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")), "uses the exact inspected baseline for tree lookup");

  const emptyRequests: string[] = [];
  const emptyClient: RepositoryContextClient = {
    async req(_method, path) {
      emptyRequests.push(path);
      if (path === "/repos/acme/blank/") return { status: 200, json: { default_branch: null } };
      if (path === "/repos/acme/blank/commits?per_page=1") return { status: 409, json: { message: "Git Repository is empty." } };
      if (path === "/repos/acme/blank/git/trees/main?recursive=1") return { status: 404, json: { message: "Not Found" } };
      throw new Error("Unexpected empty-repository request: " + path);
    },
  };
  const emptyPack = await buildRepositoryContext(emptyClient, "acme/blank");
  assert(emptyPack.repository === "acme/blank" && emptyPack.branch === "main", "creates a valid context pack for an empty repository");
  assert(emptyPack.commitSha === null && emptyPack.inventoryCount === 0 && emptyPack.includedCount === 0, "does not invent a commit or files for a blank repository");
  assert(emptyPack.asPrompt().includes("no commits yet"), "tells the agent to bootstrap from requirements instead of diagnosing nonexistent code");
  assert(emptyPack.warnings.some((warning) => warning.includes("no commits yet")), "records the empty-repository limitation as a warning");
  assert(emptyRequests.some((path) => path.endsWith("/commits?per_page=1")) && emptyRequests.some((path) => path.includes("/git/trees/main")), "confirms empty state from the paired GitHub API responses");
  console.log("Repository context pack tests passed");
}
void run();
