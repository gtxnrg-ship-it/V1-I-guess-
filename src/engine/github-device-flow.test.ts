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

  // Failure paths must not leave an authenticated session behind.
  const beforeFailureFetch = globalThis.fetch;
  try {
    clearGitHubSession();
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "access_denied" }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;
    let denied = "";
    try {
      await completeGitHubDeviceFlow({ deviceCode: "denied-device", userCode: "ABCD", verificationUri: "https://github.com/login/device", expiresAt: Date.now() + 10_000, intervalSeconds: 0 }, "public-client-id");
    } catch (error) { denied = error instanceof Error ? error.message : String(error); }
    assert(denied.includes("was denied"), "explicit authorization denial should be explained");
    assert(getGitHubSession() === null, "denied authorization must not create a session");

    const controller = new AbortController();
    controller.abort();
    let cancelled = "";
    try {
      await completeGitHubDeviceFlow({ deviceCode: "cancelled-device", userCode: "ABCD", verificationUri: "https://github.com/login/device", expiresAt: Date.now() + 10_000, intervalSeconds: 1 }, "public-client-id", { signal: controller.signal });
    } catch (error) { cancelled = error instanceof Error ? error.name : ""; }
    assert(cancelled === "AbortError", "an already-cancelled sign-in should stop without polling");
    assert(getGitHubSession() === null, "cancelled authorization must not create a session");

    let expired = "";
    try {
      await completeGitHubDeviceFlow({ deviceCode: "expired-device", userCode: "ABCD", verificationUri: "https://github.com/login/device", expiresAt: Date.now() - 1, intervalSeconds: 1 }, "public-client-id");
    } catch (error) { expired = error instanceof Error ? error.message : String(error); }
    assert(expired.includes("expired"), "expired device code should ask the user to restart sign-in");
    assert(getGitHubSession() === null, "expired authorization must not create a session");
  } finally {
    globalThis.fetch = beforeFailureFetch;
    clearGitHubSession();
  }
  console.log("GitHub device flow tests passed");
}
void run();
