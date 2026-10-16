import {
  buildGitHubAuthorizationUrl,
  matchesOAuthState,
} from "./github-auth";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testAuthorizationUrl() {
  const url = new URL(buildGitHubAuthorizationUrl({
    clientId: "example-client",
    redirectUri: "https://example.com/auth/callback",
    scopes: ["read:user", "repo"],
  }, "s".repeat(43), "c".repeat(43)));
  assert(url.origin === "https://github.com", "authorization must use GitHub's official origin");
  assert(url.pathname === "/login/oauth/authorize", "authorization endpoint should be correct");
  assert(url.searchParams.get("client_id") === "example-client", "client ID should be included");
  assert(url.searchParams.get("state") === "s".repeat(43), "state should be included");
  assert(url.searchParams.get("code_challenge_method") === "S256", "PKCE must use S256");
  assert(url.searchParams.get("scope") === "read:user repo", "scopes should be explicit");
}

function testRejectsUnsafeConfiguration() {
  let missingClientId = false;
  try { buildGitHubAuthorizationUrl({ clientId: " ", redirectUri: "https://example.com/callback" }, "s".repeat(43), "c".repeat(43)); }
  catch { missingClientId = true; }
  assert(missingClientId, "missing client ID must fail closed");

  let unsafeRedirect = false;
  try { buildGitHubAuthorizationUrl({ clientId: "example-client", redirectUri: "http://example.com/callback" }, "s".repeat(43), "c".repeat(43)); }
  catch { unsafeRedirect = true; }
  assert(unsafeRedirect, "non-local HTTP callback must be rejected");
}

function testStateComparison() {
  assert(matchesOAuthState("abc123", "abc123"), "matching state should pass");
  assert(!matchesOAuthState("abc123", "abc124"), "mismatched state should fail");
  assert(!matchesOAuthState("abc123", null), "missing callback state should fail");
  assert(!matchesOAuthState("abc123", "abc"), "different-length state should fail");
}

testAuthorizationUrl();
testRejectsUnsafeConfiguration();
testStateComparison();
console.log("GitHub OAuth foundation tests passed");
