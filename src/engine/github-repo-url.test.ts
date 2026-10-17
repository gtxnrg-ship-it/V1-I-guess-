import { parseBareGitHubRepositoryLink } from "./github-repo-url";
function assert(condition: boolean, message: string) { if (!condition) throw new Error(`Assertion failed: ${message}`); }
assert(parseBareGitHubRepositoryLink("https://github.com/acme/demo")?.repository === "acme/demo", "parses repository root");
assert(parseBareGitHubRepositoryLink("https://github.com/acme/demo.git")?.repository === "acme/demo", "accepts .git suffix");
assert(parseBareGitHubRepositoryLink("https://github.com/acme/demo/tree/feature%2Fchat")?.branch === "feature/chat", "decodes encoded slash in branch");
assert(parseBareGitHubRepositoryLink("https://github.com/acme/demo/tree/feature/chat")?.branch === "feature/chat", "preserves slash-containing branch");
assert(parseBareGitHubRepositoryLink("https://github.com/acme/demo/pull/12") === null, "rejects PR links");
assert(parseBareGitHubRepositoryLink("https://github.com/acme/demo/issues/12") === null, "rejects issue links");
assert(parseBareGitHubRepositoryLink("https://github.com/acme/demo/blob/main/README.md") === null, "rejects file links");
assert(parseBareGitHubRepositoryLink("https://evil.example/acme/demo") === null, "rejects other hosts");
assert(parseBareGitHubRepositoryLink("here is https://github.com/acme/demo") === null, "requires a bare URL");
console.log("✓ bare GitHub repository URL tests passed");
