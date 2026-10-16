/**
 * Bounded, project-scoped context pack for Kuro-chan.
 *
 * This deliberately does not claim to be long-term semantic memory. It creates a compact,
 * inspectable context from facts explicitly provided by the caller and recent conversation.
 * Callers must not put secrets, raw credentials, or sensitive personal data in these fields.
 */

export interface ProjectMemoryFact {
  text: string;
  source: "user-confirmed" | "repository-observed" | "assistant-proposed";
  updatedAt?: number;
  confidence?: "high" | "medium" | "low";
}

export interface ProjectMemoryInput {
  projectName: string;
  repository?: string | null;
  baselineSha?: string | null;
  observedAt?: number;
  facts: ProjectMemoryFact[];
  decisions: ProjectMemoryFact[];
  openQuestions: string[];
  recentSummary?: string;
}

export interface ProjectContextPack {
  text: string;
  includedFacts: number;
  omittedFacts: number;
  hasRepositoryBaseline: boolean;
}

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const MAX_FIELD = 360;
const MAX_FACTS = 12;
const MAX_QUESTIONS = 5;
const MAX_SUMMARY = 900;

function renderFacts(label: string, facts: ProjectMemoryFact[], max: number): string[] {
  return facts.slice(0, max).map((fact) => {
    const text = clean(fact.text).slice(0, MAX_FIELD);
    const source = fact.source === "user-confirmed" ? "confirmed by user"
      : fact.source === "repository-observed" ? "observed in repository"
      : "proposed by assistant";
    const confidence = fact.confidence && fact.confidence !== "high" ? `, ${fact.confidence} confidence` : "";
    return `- [${source}${confidence}] ${text}`;
  }).filter((x) => !x.endsWith("] "));
}

export function buildProjectContextPack(input: ProjectMemoryInput): ProjectContextPack {
  const facts = renderFacts("Facts", input.facts, MAX_FACTS);
  const decisions = renderFacts("Decisions", input.decisions, MAX_FACTS);
  const questions = [...new Set(input.openQuestions.map(clean).filter(Boolean))].slice(0, MAX_QUESTIONS);
  const repo = input.repository ? clean(input.repository) : "not connected";
  const sha = input.baselineSha ? clean(input.baselineSha) : "not established";
  const summary = clean(input.recentSummary || "").slice(0, MAX_SUMMARY);
  const sections = [
    "PROJECT CONTEXT (carry forward; distinguish evidence from assumptions)",
    `Project: ${clean(input.projectName) || "Unnamed project"}`,
    `Repository: ${repo}`,
    `Repository baseline SHA: ${sha}`,
    facts.length ? `Known facts:\n${facts.join("\n")}` : "Known facts: none recorded.",
    decisions.length ? `Decisions:\n${decisions.join("\n")}` : "Decisions: none recorded.",
    questions.length ? `Open questions:\n${questions.map((q) => `- ${q.slice(0, MAX_FIELD)}`).join("\n")}` : "Open questions: none recorded.",
    summary ? `Recent conversation summary:\n${summary}` : "",
    "Memory rules: treat user-confirmed facts as requirements; treat repository observations as evidence tied to the inspected baseline; label proposals as proposals; if the repository baseline changes, re-check facts that may have gone stale; never invent missing decisions or claim an action was completed without tool evidence.",
  ].filter(Boolean);
  const text = sections.join("\n\n");
  return {
    text,
    includedFacts: facts.length + decisions.length,
    omittedFacts: Math.max(0, input.facts.length - facts.length) + Math.max(0, input.decisions.length - decisions.length),
    hasRepositoryBaseline: !!input.baselineSha,
  };
}
