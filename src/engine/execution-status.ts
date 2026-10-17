export type ExecutionOutcome = "completed" | "failed" | "stopped";

/**
 * Classifies the final state of an agent run from observable runtime facts.
 * A cancelled run is never reported as completed, even if it has no error string.
 */
export function executionOutcome(input: { aborted: boolean; error?: string | null }): ExecutionOutcome {
  if (input.aborted) return "stopped";
  if (input.error?.trim()) return "failed";
  return "completed";
}

/**
 * Classifies a tool result for the visible tool block. Tool output is not
 * guaranteed to begin with "ERROR": verification failures and CI failures have
 * their own established prefixes/status labels.
 */
export function toolResultFailed(result: string, stat?: string): boolean {
  if (/^(?:failed|failure|error\b|blocked\b|unverified\b|not verified\b|not run\b)/i.test(stat?.trim() || "")) return true;
  if (/\b\d+\b.*\berrors?\b/i.test(stat || "")) return true;
  return /^(?:ERROR\b|No such\b|Unknown tool\b|BUILD ERRORS\s*:|Syntax errors\s*:|Builds, but it crashed or logged errors while running\s*:)/i.test(result.trim());
}
