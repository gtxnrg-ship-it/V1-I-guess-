import { executionOutcome } from "./execution-status";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

assertEqual(executionOutcome({ aborted: false }), "completed", "clean return is completed");
assertEqual(executionOutcome({ aborted: false, error: "" }), "completed", "empty error is not a failure");
assertEqual(executionOutcome({ aborted: false, error: "Build failed" }), "failed", "recorded error is a failure");
assertEqual(executionOutcome({ aborted: false, error: "   " }), "completed", "whitespace error is ignored");
assertEqual(executionOutcome({ aborted: true }), "stopped", "cancellation is stopped, not completed");
assertEqual(executionOutcome({ aborted: true, error: "network error" }), "stopped", "cancellation takes precedence over stale errors");
console.log("Execution outcome regression tests passed");
