import { GH, b64 } from "./github";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(`Assertion failed: ${message}`);
}

const originalFetch = globalThis.fetch;
let blobRequests = 0;
let truncatedTree = false;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("/git/ref/heads/main")) {
    return new Response(JSON.stringify({ object: { sha: "tree-sha" } }), { status: 200 });
  }
  if (url.includes("/git/trees/tree-sha")) {
    return new Response(JSON.stringify({
      truncated: truncatedTree,
      tree: [
        { path: "a.ts", type: "blob", size: 4, sha: "a" },
        { path: "b.ts", type: "blob", size: 4, sha: "b" },
        { path: "c.ts", type: "blob", size: 4, sha: "c" },
        { path: "image.png", type: "blob", size: 4, sha: "img" },
      ],
    }), { status: 200 });
  }
  const match = url.match(/\/git\/blobs\/(a|b|c|img)$/);
  if (match) {
    blobRequests++;
    return new Response(JSON.stringify({ content: b64(match[1].repeat(4)), encoding: "base64" }), { status: 200 });
  }
  return new Response(JSON.stringify({ message: "Unexpected request" }), { status: 500 });
}) as typeof fetch;

try {
  const gh = new GH("test-token");
  const bounded = await gh.readTreeBounded("owner", "repo", "main", () => true, {
    maxFiles: 2, maxTotalBytes: 100, maxFileBytes: 20, concurrency: 2,
  });
  assert(!bounded.complete, "file-count budget must mark import incomplete");
  assert(bounded.files.length === 2 && bounded.skipped === 1, "only the bounded subset should be returned");
  assert(blobRequests === 2, "must not fetch blobs beyond the file-count budget");
  let rejected = false;
  try { await gh.readTree("owner", "repo", "main", () => true); } catch (e) {
    rejected = String(e).includes("safety budget");
  }
  assert(rejected, "legacy readTree must fail closed instead of returning a partial tree");

  blobRequests = 0;
  truncatedTree = true;
  const truncated = await gh.readTreeBounded("owner", "repo", "main", () => true, { maxFiles: 10 });
  assert(!truncated.complete && truncated.reason?.includes("truncated"), "GitHub tree truncation must be explicit");
  console.log("Bounded GitHub repository import tests passed");
} finally {
  globalThis.fetch = originalFetch;
}
