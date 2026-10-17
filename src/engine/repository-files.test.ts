import { readRepositoryFile, searchRepositoryCode, type RepositoryFileClient } from "./repository-files";
function b64(value: string) { return btoa(unescape(encodeURIComponent(value))); }
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function run() {
  const seen: string[] = [];
  const client: RepositoryFileClient = { async req(_method, path) {
    seen.push(path);
    if (path.includes("/contents/src/App.tsx")) return { status: 200, json: { type: "file", encoding: "base64", content: b64("export default function App() { return null; }") } };
    if (path.includes("/contents/src")) return { status: 200, json: [{ type: "file", path: "src/App.tsx" }, { type: "dir", path: "src/lib" }] };
    if (path.startsWith("/search/code?")) return { status: 200, json: { total_count: 1, items: [{ path: "src/App.tsx", html_url: "https://github.com/acme/app/blob/main/src/App.tsx" }] } };
    return { status: 404, json: { message: "Not Found" } };
  } };
  const file = await readRepositoryFile(client, "https://github.com/acme/app.git", "src/App.tsx");
  assert(file.result.includes("export default function App()"), "returns actual decoded file contents");
  assert(file.sources?.[0].url.includes("src/App.tsx"), "links to the real GitHub file");
  const directory = await readRepositoryFile(client, "acme/app", "src");
  assert(directory.result.includes("[dir] src/lib"), "handles directory responses clearly");
  const branchFile = await readRepositoryFile(client, "acme/app", "src/App.tsx", "feature/branch-sync");
  assert(seen.some((path) => path.endsWith("?ref=feature%2Fbranch-sync")), "requests the explicitly selected branch ref");
  assert(branchFile.result.includes("ref: feature/branch-sync"), "labels the returned source with the requested ref");
  assert(branchFile.sources?.[0].url.includes("/blob/feature/branch-sync/"), "links to the matching branch rather than the default branch");
  const search = await searchRepositoryCode(client, "acme/app", "useState");
  assert(search.result.includes("src/App.tsx") && search.sources?.length === 1, "returns code search paths and source links");
  let rejected = false;
  try { await readRepositoryFile(client, "acme/app", "../secrets.env"); } catch { rejected = true; }
  assert(rejected, "rejects traversal paths");
  assert(seen.every((path) => !path.includes("..")), "does not send traversal paths to GitHub");
  let invalidBranchRejected = false;
  try { await readRepositoryFile(client, "acme/app", "src/App.tsx", "feature/../main"); } catch { invalidBranchRejected = true; }
  assert(invalidBranchRejected, "rejects malformed branch refs before making a GitHub request");

  const fallbackCalls: string[] = [];
  const fallbackClient: RepositoryFileClient = { async req(_method, path) {
    fallbackCalls.push(path);
    if (path.startsWith("/search/code?")) return { status: 403, json: { message: "Resource not accessible by integration" } };
    if (path === "/repos/acme/app") return { status: 200, json: { default_branch: "main" } };
    if (path.includes("/git/trees/main?recursive=1")) return { status: 200, json: { truncated: false, tree: [
      { type: "blob", path: "src/App.tsx", sha: "blob-app", size: 80 },
      { type: "blob", path: ".env", sha: "secret-env", size: 30 },
      { type: "blob", path: "node_modules/pkg/index.js", sha: "vendor", size: 90 },
      { type: "blob", path: "README.md", sha: "blob-readme", size: 60 },
    ] } };
    if (path.endsWith("/git/blobs/blob-app")) return { status: 200, json: { encoding: "base64", content: b64("export const uniqueSymbol = 'target-value';\nexport default function App() {}") } };
    if (path.endsWith("/git/blobs/blob-readme")) return { status: 200, json: { encoding: "base64", content: b64("# App\nNo match here") } };
    throw new Error("Unexpected fallback request " + path);
  } };
  const fallback = await searchRepositoryCode(fallbackClient, "acme/app", "uniqueSymbol");
  assert(fallback.result.includes("src/App.tsx:1"), "falls back to searching actual repository blob contents");
  assert(fallback.result.includes("not an exhaustive repository search"), "clearly reports bounded, non-exhaustive coverage");
  assert(fallbackCalls.some((path) => path.endsWith("/git/blobs/blob-app")), "reads actual GitHub blob data in fallback");
  assert(!fallbackCalls.some((path) => path.endsWith("/git/blobs/secret-env") || path.includes("node_modules")), "does not scan environment secrets or vendored dependencies");
  console.log("Repository file read/search tests passed");
}
void run();
