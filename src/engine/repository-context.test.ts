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
      if (path.includes("/git/trees/")) return { status: 200, json: { truncated: false, tree: [
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
  console.log("Repository context pack tests passed");
}
void run();
