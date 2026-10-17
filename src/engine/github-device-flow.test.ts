import { beginGitHubDeviceFlow, completeGitHubDeviceFlow } from "./github-device-flow";
import { clearGitHubSession, getGitHubSession } from "./github-session";
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function run() {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    if (url === "https://github.com/login/device/code") {
      return new Response(JSON.stringify({ device_code: "device-secret", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 1 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url === "https://github.com/login/oauth/access_token") {
      return new Response(JSON.stringify({ access_token: "verified-token", scope: "repo workflow" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url === "https://api.github.com/user") {
      assert(new Headers(init?.headers).get("Authorization") === "Bearer verified-token", "validates the account using the returned token");
      return new Response(JSON.stringify({ login: "octocat" }), { status: 200, headers: { "Content-Type": "application/json", "X-OAuth-Scopes": "repo, workflow" } });
    }
    throw new Error("Unexpected fetch URL: " + url);
  }) as typeof fetch;
  try {
    const flow = await beginGitHubDeviceFlow("public-client-id");
    assert(flow.userCode === "ABCD-1234", "shows the one-time user code");
    assert(flow.verificationUri === "https://github.com/login/device", "uses GitHub's verification URI");
    flow.intervalSeconds = 0;
    const session = await completeGitHubDeviceFlow(flow, "public-client-id");
    assert(session.login === "octocat", "stores only the verified GitHub identity");
    assert(getGitHubSession()?.token === "verified-token", "stores the token in the runtime session");
    assert(calls.length === 3, "performs device request, token exchange, and identity verification");
    assert(!JSON.stringify(session).includes("device-secret"), "does not include the device code in the final session");
    clearGitHubSession();
  } finally {
    globalThis.fetch = originalFetch;
    clearGitHubSession();
  }
  let missingClientId = false;
  try { await beginGitHubDeviceFlow(""); } catch (error) { missingClientId = String(error).includes("VITE_GITHUB_APP_CLIENT_ID"); }
  assert(missingClientId, "explains how to configure the public client ID");
  console.log("GitHub device flow tests passed");
}
void run();
