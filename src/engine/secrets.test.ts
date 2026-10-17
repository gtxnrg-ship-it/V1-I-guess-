import { describeCredentialFindings, findCredentialLeaks } from "./secrets";
import { GH } from "./github";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testDetectsKnownCredentialsWithoutReturningValues() {
  const openAi = "sk-proj-" + "a".repeat(32);
  const google = "AIza" + "B".repeat(35);
  const github = "ghp_" + "c".repeat(40);
  const privateKey = "-----BEGIN " + "PRIVATE KEY-----";
  const findings = findCredentialLeaks([
    { path: "src/config.ts", content: `const apiKey = "${openAi}";` },
    { path: ".env", content: `GOOGLE_API_KEY=${google}` },
    { path: "scripts/release.js", content: `const token = "${github}";` },
    { path: "keys.pem", content: privateKey },
  ]);
  assert(findings.length === 4, "should detect provider tokens and private-key headers");
  assert(findings.some((f) => f.path === "src/config.ts" && f.line === 1), "finding should identify the file and line");
  const report = describeCredentialFindings(findings);
  assert(!report.includes(openAi) && !report.includes(google) && !report.includes(github), "diagnostics must not reveal secret values");
}

function testAllowsClearlyFakePlaceholdersAndIgnoresDeletes() {
  const findings = findCredentialLeaks([
    { path: ".env.example", content: 'API_KEY="your_api_key_here"\nTOKEN="replace-me-with-your-token"' },
    { path: "src/file.ts", content: null },
    { path: "README.md", content: "Use process.env.API_KEY instead of hard-coding credentials." },
  ]);
  assert(findings.length === 0, "placeholders, deleted files, and environment-variable guidance should be allowed");
}

async function testPublishGuardRunsBeforeNetwork() {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    throw new Error("Network should not be called");
  }) as typeof fetch;
  let message = "";
  const leaked = "sk-proj-" + "d".repeat(32);
  try {
    await new GH("test-token").commitFiles("owner", "repo", "main", [
      { path: "src/config.ts", content: `export const apiKey = "${leaked}";` },
    ], "test publish");
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert(message.includes("Publish blocked before contacting GitHub"), "publish should fail with an actionable safety message");
  assert(!message.includes(leaked), "publish error must not include the credential");
  assert(calls === 0, "secret scan must block before any GitHub network request");
}

testDetectsKnownCredentialsWithoutReturningValues();
testAllowsClearlyFakePlaceholdersAndIgnoresDeletes();
await testPublishGuardRunsBeforeNetwork();
console.log("Credential leak prevention tests passed");
