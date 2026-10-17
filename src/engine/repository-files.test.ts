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
  const search = await searchRepositoryCode(client, "acme/app", "useState");
  assert(search.result.includes("src/App.tsx") && search.sources?.length === 1, "returns code search paths and source links");
  let rejected = false;
  try { await readRepositoryFile(client, "acme/app", "../secrets.env"); } catch { rejected = true; }
  assert(rejected, "rejects traversal paths");
  assert(seen.every((path) => !path.includes("..")), "does not send traversal paths to GitHub");
  console.log("Repository file read/search tests passed");
}
void run();
