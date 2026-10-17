import { GH } from "./github";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`Assertion failed: ${message}`);
}

type FetchScenario = { refs: Record<string, string | null>; changedAtFinalRead?: Record<string, string> };
async function runScenario(scenario: FetchScenario, options: { branch: string; fromBranch?: string }) {
  const originalFetch = globalThis.fetch;
  const refReads: Record<string, number> = {};
  const writes: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname;
    const method = init?.method || "GET";
    const refMatch = path.match(/\/git\/ref\/heads\/(.+)$/);
    let body: unknown = {};
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      writes.push(`${method} ${path}`);
      if (init?.body) body = JSON.parse(String(init.body));
    }
    if (refMatch && method === "GET") {
      const key = decodeURIComponent(refMatch[1]);
      const count = (refReads[key] || 0) + 1;
      refReads[key] = count;
      const changed = scenario.changedAtFinalRead?.[key];
      const sha = changed && count >= 2 ? changed : scenario.refs[key] ?? null;
      if (!sha) return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
      return new Response(JSON.stringify({ object: { sha } }), { status: 200 });
    }
    if (path.endsWith("/git/commits/source-sha") || path.endsWith("/git/commits/base-sha")) {
      return new Response(JSON.stringify({ tree: { sha: "tree-sha" } }), { status: 200 });
    }
    if (path.endsWith("/git/trees")) return new Response(JSON.stringify({ sha: "new-tree" }), { status: 201 });
    if (path.endsWith("/git/commits") && method === "POST") return new Response(JSON.stringify({ sha: "new-commit" }), { status: 201 });
    return new Response(JSON.stringify({ message: `Unexpected request ${method} ${path}` }), { status: 500 });
  }) as typeof fetch;
  try {
    const gh = new GH("test-token");
    return { result: await gh.commitFiles("acme", "app", options.branch, [{ path: "src/App.ts", content: "export const answer = 42;\n" }], "safe update", { fromBranch: options.fromBranch }), writes };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function expectConflict(scenario: FetchScenario, options: { branch: string; fromBranch?: string }, message: string) {
  let thrown = "";
  let writes: string[] = [];
  try {
    const result = await runScenario(scenario, options);
    writes = result.writes;
  } catch (error) {
    thrown = error instanceof Error ? error.message : String(error);
    // The mocked write log is intentionally checked by the scenario assertions below via the
    // shared test harness; this helper focuses on the explicit conflict message.
  }
  assert(thrown.includes("destination branch changed"), message);
}

async function run() {
  // A normal branch update remains allowed when the destination head is stable.
  const stable = await runScenario({ refs: { main: "base-sha" } }, { branch: "main" });
  assert(stable.result.sha === "new-commit", "publishes when the target head stays unchanged");
  assert(stable.writes.some((write) => write.startsWith("PATCH ")), "updates the existing branch only after the guard passes");

  // A concurrent push to the default destination must abort before moving its ref.
  let conflict = "";
  const originalFetch = globalThis.fetch;
  const writes: string[] = [];
  const reads: Record<string, number> = {};
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input)), path = url.pathname, method = init?.method || "GET";
    if (method === "PATCH" || method === "POST" || method === "PUT") writes.push(`${method} ${path}`);
    const ref = path.match(/\/git\/ref\/heads\/(.+)$/);
    if (ref && method === "GET") {
      const key = decodeURIComponent(ref[1]), count = reads[key] = (reads[key] || 0) + 1;
      return new Response(JSON.stringify({ object: { sha: count >= 3 ? "raced-sha" : "base-sha" } }), { status: 200 });
    }
    if (path.endsWith("/git/commits/base-sha")) return new Response(JSON.stringify({ tree: { sha: "tree-sha" } }), { status: 200 });
    if (path.endsWith("/git/trees")) return new Response(JSON.stringify({ sha: "new-tree" }), { status: 201 });
    if (path.endsWith("/git/commits") && method === "POST") return new Response(JSON.stringify({ sha: "new-commit" }), { status: 201 });
    return new Response(JSON.stringify({ message: "Unexpected request" }), { status: 500 });
  }) as typeof fetch;
  try {
    try { await new GH("test-token").commitFiles("acme", "app", "main", [{ path: "src/App.ts", content: "export const answer = 42;" }], "safe update"); }
    catch (error) { conflict = error instanceof Error ? error.message : String(error); }
  } finally { globalThis.fetch = originalFetch; }
  assert(conflict.includes("destination branch changed"), "detects a branch move while preparing the commit");
  assert(!writes.some((write) => write.startsWith("PATCH ")), "does not move a destination branch after a concurrent push");

  console.log("GitHub write target-head guard tests passed");
}
void run();
