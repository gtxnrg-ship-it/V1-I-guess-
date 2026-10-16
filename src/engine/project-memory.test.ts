import { buildProjectContextPack, parseProjectMemoryCommand, sanitizeProjectMemoryFact, sanitizeProjectMemoryFacts } from "./project-memory";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const pack = buildProjectContextPack({
  projectName: "Kuro-chan",
  repository: "gtxnrg-ship-it/V1-I-guess-",
  baselineSha: "new-sha",
  facts: [
    { text: "User wants Android APK as primary delivery.", source: "user-confirmed", evidence: "User explicitly requested a downloadable APK." },
    { text: "Repository contains a Vite/React app.", source: "repository-observed", confidence: "high", baselineSha: "old-sha", evidence: "package.json dependencies" },
    { text: "Assistant suggests adding Linux support.", source: "assistant-proposed" },
    { text: "GitHub token=ghp_abcdefghijklmnopqrstuvwxyz012345", source: "user-confirmed" },
  ],
  decisions: [{ text: "Do not show live preview to the user.", source: "user-confirmed" }],
  openQuestions: ["Which GitHub callback URI will be registered?", "access_token=super-secret-value"],
  recentSummary: "Working on GitHub sign-in and repository intelligence.",
});
assert(pack.text.includes("Repository baseline SHA: new-sha"), "baseline must be explicit");
assert(pack.text.includes("confirmed by user"), "confirmed facts must preserve provenance");
assert(pack.text.includes("observed in repository"), "observations must preserve provenance");
assert(pack.text.includes("STALE: repository baseline changed"), "old repository observations must be flagged stale");
assert(pack.text.includes("evidence: User explicitly requested"), "supporting evidence must be preserved");
assert(pack.text.includes("never infer missing facts"), "prompt must discourage fabricated memory");
assert(pack.hasRepositoryBaseline, "baseline status should be machine-readable");
assert(pack.includedFacts === 4, "unsafe fact should be removed from included count");
assert(!pack.text.includes("ghp_abcdefghijklmnopqrstuvwxyz012345"), "credential-like facts must not enter prompt");
assert(!pack.text.includes("super-secret-value"), "credential-like questions must not enter prompt");

const bounded = buildProjectContextPack({
  projectName: "x",
  facts: Array.from({ length: 20 }, (_, i) => ({ text: `fact-${i}`, source: "user-confirmed" as const })),
  decisions: [],
  openQuestions: Array.from({ length: 10 }, (_, i) => `question-${i}`),
  recentSummary: "s".repeat(2000),
});
assert(bounded.includedFacts <= 12, "memory facts must be bounded");
assert(bounded.omittedFacts > 0, "omitted facts must be reported");
assert(bounded.text.length < 8000, "context must remain bounded");
assert(!bounded.text.includes("question-9"), "open questions must be capped");
assert(!bounded.text.includes("s".repeat(901)), "summary must be capped");

assert(sanitizeProjectMemoryFact({ text: "api_key = abc123", source: "user-confirmed" }) === null, "key assignments should be rejected");
assert(sanitizeProjectMemoryFact({ text: "-----BEGIN PRIVATE KEY-----", source: "user-confirmed" }) === null, "private keys should be rejected");
const deduped = sanitizeProjectMemoryFacts([
  { text: "Keep Android supported", source: "user-confirmed" },
  { text: "  Keep   Android supported ", source: "user-confirmed" },
  { text: "Keep Android supported", source: "assistant-proposed" },
]);
assert(deduped.length === 2, "duplicate entries with same provenance should be deduplicated");

assert(parseProjectMemoryCommand("remember: User wants Android APK delivery.")?.action === "remember", "explicit remember command should be recognized");
const decision = parseProjectMemoryCommand("/remember decision: Keep all current features free");
assert(decision?.action === "remember" && decision.kind === "decision", "decisions should be typed separately");
assert(parseProjectMemoryCommand("remember: access_token=super-secret-value") === null, "secret-like memory commands should be rejected");
assert(parseProjectMemoryCommand("I wish Kuro-chan remembered this") === null, "ordinary conversation must not be captured implicitly");
assert(parseProjectMemoryCommand("/forget memory")?.action === "forget-all", "forget-all command should be recognized");
assert(parseProjectMemoryCommand("forget: Android APK")?.action === "forget-match", "targeted forget command should be recognized");
console.log("Project memory context and command tests passed");
