import { GH } from "./github";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(`Assertion failed: ${message}`);
}

async function withFetch(run: (calls: { url: string; method: string }[]) => Promise<void>) {
  const original = globalThis.fetch;
  const calls: { url: string; method: string }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || "GET";
    calls.push({ url, method });
    if (url.endsWith("/user")) {
      return new Response(JSON.stringify({ login: "demo-user" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.endsWith("/repos/demo-user/existing-app")) {
      return new Response(JSON.stringify({ name: "existing-app", full_name: "demo-user/existing-app", default_branch: "trunk", html_url: "https://github.com/demo-user/existing-app", private: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.endsWith("/repos/demo-user/missing-app")) {
      return new Response(JSON.stringify({ message: "Not Found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ message: "Unexpected request" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try { await run(calls); } finally { globalThis.fetch = original; }
}

await withFetch(async (calls) => {
  const repo = await new GH("test-token").getExistingRepo("existing-app");
  assert(repo.owner === "demo-user" && repo.name === "existing-app", "resolves shorthand against the authenticated user");
  assert(repo.defaultBranch === "trunk" && repo.private, "preserves branch and privacy metadata");
  assert(repo.created === false, "existing-repo lookup never reports a creation");
  assert(calls.every((call) => call.method === "GET"), "successful import lookup only issues GET requests");
});

await withFetch(async (calls) => {
  let message = "";
  try { await new GH("test-token").getExistingRepo("missing-app"); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  assert(message.includes("Import never creates repositories"), "404 explains import is non-mutating");
  assert(calls.length === 2 && calls.every((call) => call.method === "GET"), "missing repository cannot trigger repository creation");
});

await withFetch(async () => {
  let rejected = false;
  try { await new GH("test-token").getExistingRepo("owner/repo/branch"); } catch { rejected = true; }
  assert(rejected, "rejects branch/file paths instead of guessing the repository");
});

console.log("GitHub repository import safety tests passed");
