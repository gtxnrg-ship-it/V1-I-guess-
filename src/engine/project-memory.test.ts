import { buildProjectContextPack } from "./project-memory";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const pack = buildProjectContextPack({
  projectName: "Kuro-chan",
  repository: "gtxnrg-ship-it/V1-I-guess-",
  baselineSha: "abc123",
  facts: [
    { text: "User wants Android APK as primary delivery.", source: "user-confirmed" },
    { text: "Repository contains a Vite/React app.", source: "repository-observed", confidence: "high" },
  ],
  decisions: [{ text: "Do not show live preview to the user.", source: "user-confirmed" }],
  openQuestions: ["Which GitHub callback URI will be registered?"],
  recentSummary: "Working on GitHub sign-in and repository intelligence.",
});
assert(pack.text.includes("Repository baseline SHA: abc123"), "baseline must be explicit");
assert(pack.text.includes("confirmed by user"), "confirmed facts must preserve provenance");
assert(pack.text.includes("observed in repository"), "observations must preserve provenance");
assert(pack.text.includes("never invent missing decisions"), "prompt must explicitly discourage fabricated memory");
assert(pack.hasRepositoryBaseline, "baseline status should be machine-readable");
assert(pack.includedFacts === 3, "facts and decisions should be counted");

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

console.log("Project memory context tests passed");
