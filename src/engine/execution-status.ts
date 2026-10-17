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
