import { assertNotPersonalGitHubToken } from "./keys";
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
for (const token of ["sk-example-provider-key", "AIza-example-provider-key", "custom-token-not-github"]) {
  let rejected = false; try { assertNotPersonalGitHubToken(token); } catch { rejected = true; }
  assert(!rejected, `non-GitHub provider key should remain accepted: ${token}`);
}
for (const token of ["ghp_123456789012345678901234567890", "gho_123456789012345678901234567890", "ghu_123456789012345678901234567890", "ghs_123456789012345678901234567890", "ghr_123456789012345678901234567890", "github_pat_123456789012345678901234567890"]) {
  let message = ""; try { assertNotPersonalGitHubToken(token); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  assert(message.includes("Personal GitHub access tokens are not supported"), `GitHub credential must be rejected with actionable explanation: ${token}`);
}
console.log("GitHub personal access token boundary tests passed");
