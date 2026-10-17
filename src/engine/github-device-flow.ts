import { setGitHubSession, type GitHubSession } from "./github-session";

export interface GitHubDeviceFlow {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresAt: number;
  intervalSeconds: number;
}
const DEVICE_CODE_URL = "https://github.com/login/device/code";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const API_URL = "https://api.github.com";

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { message: text.slice(0, 300) }; }
}
function explainError(data: any, status: number): string {
  return String(data?.error_description || data?.message || data?.error || `GitHub returned HTTP ${status}`);
}
function abortError(): Error {
  const error = new Error("GitHub sign-in was cancelled.");
  error.name = "AbortError";
  return error;
}
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, ms);
    function cleanup() { clearTimeout(timer); signal?.removeEventListener("abort", cancel); }
    function done() { cleanup(); resolve(); }
    function cancel() { cleanup(); reject(abortError()); }
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

/** Start GitHub App Device Flow. The public client ID must be configured; no client secret is used. */
export async function beginGitHubDeviceFlow(clientId: string, scopes = ["repo", "workflow"]): Promise<GitHubDeviceFlow> {
  const id = clientId.trim();
  if (!id) throw new Error("GitHub sign-in is not configured. Set VITE_GITHUB_APP_CLIENT_ID to the public client ID of a GitHub App with Device Flow enabled.");
  const response = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, scope: scopes.join(" ") }),
  });
  const data = await parseResponse(response);
  if (!response.ok || !data.device_code || !data.user_code || !data.verification_uri) {
    throw new Error(`Couldn't start GitHub sign-in: ${explainError(data, response.status)}. Check the app's client ID and Device Flow setting.`);
  }
  return {
    deviceCode: String(data.device_code),
    userCode: String(data.user_code),
    verificationUri: String(data.verification_uri),
    expiresAt: Date.now() + Math.max(30, Number(data.expires_in) || 900) * 1000,
    intervalSeconds: Math.max(1, Number(data.interval) || 5),
  };
}

/** Poll until approval, cancellation, expiry, or a verifiable token is returned. */
export async function completeGitHubDeviceFlow(
  flow: GitHubDeviceFlow,
  clientId: string,
  options: { signal?: AbortSignal; onPending?: () => void } = {},
): Promise<GitHubSession> {
  const id = clientId.trim();
  if (!id || !flow.deviceCode) throw new Error("GitHub sign-in session is incomplete.");
  let interval = flow.intervalSeconds;
  while (Date.now() < flow.expiresAt) {
    await wait(interval * 1000, options.signal);
    if (options.signal?.aborted) throw abortError();
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: id,
        device_code: flow.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
      signal: options.signal,
    });
    const data = await parseResponse(response);
    if (data.access_token) {
      const token = String(data.access_token);
      const userResponse = await fetch(`${API_URL}/user`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        signal: options.signal,
      });
      const user = await parseResponse(userResponse);
      if (!userResponse.ok || typeof user.login !== "string" || !user.login) {
        throw new Error("GitHub returned a token, but the account could not be verified. Sign in again.");
      }
      const scopes = String(userResponse.headers.get("X-OAuth-Scopes") || data.scope || "").split(/[ ,]+/).filter(Boolean);
      const session: GitHubSession = {
        token, login: user.login, scopes, connectedAt: Date.now(),
        ...(Number(data.expires_in) > 0 ? { expiresAt: Date.now() + Number(data.expires_in) * 1000 } : {}),
      };
      setGitHubSession(session);
      return session;
    }
    const error = String(data.error || "");
    if (error === "authorization_pending") { options.onPending?.(); continue; }
    if (error === "slow_down") { interval += 5; options.onPending?.(); continue; }
    if (error === "access_denied") throw new Error("GitHub sign-in was denied.");
    if (error === "expired_token") throw new Error("The GitHub device code expired. Start sign-in again.");
    if (error) throw new Error(`GitHub sign-in failed: ${explainError(data, response.status)}`);
    if (!response.ok) throw new Error(`GitHub sign-in failed: ${explainError(data, response.status)}`);
    options.onPending?.();
  }
  throw new Error("The GitHub device code expired. Start sign-in again.");
}
