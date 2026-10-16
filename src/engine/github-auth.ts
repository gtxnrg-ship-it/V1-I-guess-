/**
 * GitHub sign-in primitives for Kuro-chan.
 *
 * This module deliberately does not exchange authorization codes or persist credentials.
 * A real sign-in flow must be completed with a registered GitHub App, a verified callback,
 * PKCE, state validation, and platform-appropriate secure credential storage before it is
 * wired into the GitHub client. Never put a GitHub App client secret in Vite env or an APK.
 */

export interface GitHubOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}

export interface GitHubAuthorizationRequest {
  url: string;
  state: string;
  codeVerifier: string;
}

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const DEFAULT_SCOPES = ["read:user", "repo", "workflow"];

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBytes(length: number): Uint8Array {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure randomness is unavailable; GitHub sign-in cannot start safely.");
  }
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

export function createOAuthState(): string {
  return base64Url(randomBytes(32));
}

export function createCodeVerifier(): string {
  return base64Url(randomBytes(32));
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  if (!verifier || verifier.length < 43 || verifier.length > 128) {
    throw new Error("The PKCE verifier must be between 43 and 128 characters.");
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable; PKCE cannot be created safely.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function buildGitHubAuthorizationUrl(
  config: GitHubOAuthConfig,
  state: string,
  codeChallenge: string,
): string {
  const clientId = config.clientId.trim();
  if (!clientId) throw new Error("GitHub sign-in is not configured: the GitHub App client ID is missing.");
  if (!state || state.length < 32) throw new Error("A strong OAuth state value is required.");
  if (!codeChallenge || codeChallenge.length < 43) throw new Error("A valid PKCE code challenge is required.");

  let redirect: URL;
  try {
    redirect = new URL(config.redirectUri);
  } catch {
    throw new Error("The GitHub callback URL is invalid.");
  }
  if (redirect.protocol !== "https:" && redirect.protocol !== "http:" && redirect.protocol !== "kurochan:") {
    throw new Error("The GitHub callback must use HTTPS or the registered Kuro-chan app scheme.");
  }
  if (redirect.protocol === "http:" && redirect.hostname !== "localhost" && redirect.hostname !== "127.0.0.1") {
    throw new Error("Non-local GitHub callbacks must use HTTPS.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect.toString(),
    scope: (config.scopes?.length ? config.scopes : DEFAULT_SCOPES).join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/** Compare callback state without leaking timing information through early character exits. */
export function matchesOAuthState(expected: string, received: string | null | undefined): boolean {
  if (!expected || !received || expected.length !== received.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  return difference === 0;
}
