/** GitHub's OAuth Device Flow, separated from UI so its retry and cancellation paths are testable. */
export interface GitHubDeviceFlowOptions {
  clientId: string;
  signal?: AbortSignal;
  scopes?: string[];
  onCode?: (code: string, verificationUrl: string) => void;
  onStatus?: (message: string) => void;
  fetchImpl?: typeof fetch;
  /** Test seam; production uses an abort-aware timer. */
  sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}

type DeviceCodeResponse = {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  interval?: number;
  expires_in?: number;
  error?: string;
  error_description?: string;
};
type TokenResponse = { access_token?: string; error?: string; error_description?: string };

function abortError(): Error {
  const error = new Error("GitHub sign-in was cancelled.");
  error.name = "AbortError";
  return error;
}
function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}
function abortableSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}
async function jsonResponse<T>(response: Response, purpose: string): Promise<T> {
  try { return await response.json() as T; }
  catch { throw new Error(`GitHub returned an unreadable response while ${purpose}.`); }
}
function describeOAuthError(result: { error?: string; error_description?: string }): string {
  if (result.error === "expired_token") return "That authorization code expired. Start again to get a fresh code.";
  if (result.error === "access_denied") return "GitHub authorization was cancelled.";
  return result.error_description || result.error || "GitHub authorization failed.";
}

/**
 * Requests a one-time code and polls until approval, denial, expiry, network failure,
 * or cancellation. This function never stores the returned token; callers must validate
 * it against GitHub before making it available to the app.
 */
export async function runGitHubDeviceFlow(options: GitHubDeviceFlowOptions): Promise<string> {
  const clientId = options.clientId.trim();
  if (!clientId) throw new Error("GitHub sign-in is not configured: the public GitHub App client ID is missing.");
  const fetcher = options.fetchImpl || fetch;
  const sleep = options.sleep || abortableSleep;
  const signal = options.signal;
  throwIfAborted(signal);
  options.onStatus?.("Starting secure GitHub authorization…");

  const deviceResponse = await fetcher("https://github.com/login/device/code", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, scope: (options.scopes?.length ? options.scopes : ["read:user", "repo", "workflow"]).join(" ") }),
    signal,
  });
  const device = await jsonResponse<DeviceCodeResponse>(deviceResponse, "starting authorization");
  if (!deviceResponse.ok || !device.device_code || !device.user_code || !device.verification_uri) {
    throw new Error(device.error_description || device.error || `GitHub authorization setup failed (${deviceResponse.status}). Check that Device Flow is enabled for the GitHub App.`);
  }

  options.onCode?.(device.user_code, device.verification_uri);
  options.onStatus?.("Open GitHub, enter the one-time code, and approve access. Keep this window open while Kuro-chan waits.");
  let interval = Math.max(5, Number(device.interval) || 5);
  const expiresAt = Date.now() + Math.max(60, Number(device.expires_in) || 900) * 1000;

  while (Date.now() < expiresAt) {
    throwIfAborted(signal);
    await sleep(interval * 1000, signal);
    throwIfAborted(signal);
    const response = await fetcher("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        device_code: device.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
      signal,
    });
    const result = await jsonResponse<TokenResponse>(response, "checking authorization");
    if (!response.ok && !result.error) throw new Error(`GitHub authorization check failed (${response.status}). Try again.`);
    if (response.ok && typeof result.access_token === "string" && result.access_token.trim()) return result.access_token;
    if (result.error === "authorization_pending") continue;
    if (result.error === "slow_down") { interval += 5; continue; }
    throw new Error(describeOAuthError(result));
  }
  throw new Error("That authorization code expired. Start again to get a fresh code.");
}
