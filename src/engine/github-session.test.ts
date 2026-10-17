import { clearGitHubSession, filterPersistableCredentials, getGitHubSession, getGitHubSessionToken, setGitHubSession } from "./github-session";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(`Assertion failed: ${message}`);
}

const credentials = [
  { provider: "openai", secret: "ai-key" },
  { provider: "github", secret: "github-access-token" },
  { provider: "anthropic", secret: "another-ai-key" },
];
const persisted = filterPersistableCredentials(credentials);
assert(persisted.length === 2, "only non-GitHub credentials may be persisted");
assert(persisted.every((credential) => credential.provider !== "github"), "GitHub access token must not enter persistent storage");
assert(persisted.some((credential) => credential.provider === "openai"), "AI provider keys retain current behavior");
assert(persisted.some((credential) => credential.provider === "anthropic"), "other AI provider keys retain current behavior");
assert(filterPersistableCredentials([]).length === 0, "empty credential set remains empty");
clearGitHubSession();
setGitHubSession({ token: "runtime-only-token", login: "octocat", scopes: ["repo"], connectedAt: Date.now() });
assert(getGitHubSessionToken() === "runtime-only-token", "a verified token is available to runtime GitHub clients");
assert(getGitHubSession()?.login === "octocat", "the verified account identity is retained in memory");
assert(filterPersistableCredentials([{ provider: "github", secret: "runtime-only-token" }]).length === 0, "runtime GitHub tokens are still excluded from persistence");
clearGitHubSession();
assert(getGitHubSessionToken() === null, "disconnect clears the runtime token");
console.log("GitHub session credential boundary tests passed");
