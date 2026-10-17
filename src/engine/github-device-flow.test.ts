import { runGitHubDeviceFlow } from "./github-device-flow";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`Assertion failed: ${message}`);
}
function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function mockFetch(results: unknown[]) {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: new URLSearchParams(String(init?.body || "")) });
    const next = results.shift();
    if (next instanceof Error) throw next;
    if (next === undefined) throw new Error("Unexpected extra fetch");
    return next instanceof Response ? next : response(next);
  };
  return { fetchImpl, calls };
}
async function testApprovalAndScope() {
  const mock = mockFetch([
    { device_code: "device-secret", user_code: "ABCD-EFGH", verification_uri: "https://github.com/login/device", interval: 1, expires_in: 300 },
    { error: "authorization_pending" },
    { access_token: "temporary-token" },
  ]);
  const codes: string[] = [];
  const statuses: string[] = [];
  const token = await runGitHubDeviceFlow({
    clientId: "public-client",
    fetchImpl: mock.fetchImpl,
    sleep: async () => {},
    onCode: (code, url) => codes.push(`${code}|${url}`),
    onStatus: (status) => statuses.push(status),
  });
  assert(token === "temporary-token", "return the token after user approval");
  assert(codes[0] === "ABCD-EFGH|https://github.com/login/device", "surface the one-time code and verification URL");
  assert(mock.calls.length === 3, "poll again while authorization is pending");
  assert(mock.calls[0].body.get("scope") === "read:user repo workflow", "request the documented repository/workflow scopes");
  assert(mock.calls[2].body.get("device_code") === "device-secret", "send the device code to the token endpoint");
  assert(statuses.length > 0, "announce authorization progress");
}
async function testSlowDownAndDenial() {
  const mock = mockFetch([
    { device_code: "device", user_code: "ABCD", verification_uri: "https://github.com/login/device", interval: 5, expires_in: 300 },
    { error: "slow_down" },
    { error: "access_denied" },
  ]);
  const waits: number[] = [];
  let denied = "";
  try {
    await runGitHubDeviceFlow({ clientId: "client", fetchImpl: mock.fetchImpl, sleep: async (ms) => { waits.push(ms); } });
  } catch (error) { denied = String((error as Error).message); }
  assert(waits[0] === 5000 && waits[1] === 10000, "slow_down must increase the polling interval by five seconds");
  assert(denied.includes("cancelled"), "report user denial without exposing a token");
}
async function testAbortStopsPolling() {
  const controller = new AbortController();
  const mock = mockFetch([
    { device_code: "device", user_code: "ABCD", verification_uri: "https://github.com/login/device", interval: 5, expires_in: 300 },
  ]);
  let cancelled = false;
  try {
    await runGitHubDeviceFlow({
      clientId: "client", fetchImpl: mock.fetchImpl, signal: controller.signal,
      sleep: async (_ms, signal) => { controller.abort(); if (signal?.aborted) throw Object.assign(new Error("cancelled"), { name: "AbortError" }); },
    });
  } catch (error) { cancelled = (error as Error).name === "AbortError"; }
  assert(cancelled, "aborting during the wait must stop the device flow");
  assert(mock.calls.length === 1, "do not poll GitHub after cancellation");
}
async function testHttpErrorCannotReturnAToken() {
  const mock = mockFetch([
    { device_code: "device", user_code: "ABCD", verification_uri: "https://github.com/login/device", interval: 5, expires_in: 300 },
    response({ access_token: "must-not-be-accepted", error: "invalid_client" }, 401),
  ]);
  let failed = false;
  try { await runGitHubDeviceFlow({ clientId: "client", fetchImpl: mock.fetchImpl, sleep: async () => {} }); }
  catch (error) { failed = String((error as Error).message).includes("invalid_client"); }
  assert(failed, "a token-shaped value in a failed HTTP response must never be accepted");
}
async function testMissingConfigurationFailsClosed() {
  let failed = false;
  try { await runGitHubDeviceFlow({ clientId: " " }); } catch (error) { failed = String(error).includes("client ID"); }
  assert(failed, "missing client ID must fail before any network request");
}
await testApprovalAndScope();
await testSlowDownAndDenial();
await testAbortStopsPolling();
await testMissingConfigurationFailsClosed();
console.log("GitHub device flow tests passed");
