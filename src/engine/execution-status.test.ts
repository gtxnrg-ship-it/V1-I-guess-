import { executionOutcome, toolResultFailed } from "./execution-status";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

assertEqual(executionOutcome({ aborted: false }), "completed", "clean return is completed");
assertEqual(executionOutcome({ aborted: false, error: "" }), "completed", "empty error is not a failure");
assertEqual(executionOutcome({ aborted: false, error: "Build failed" }), "failed", "recorded error is a failure");
assertEqual(executionOutcome({ aborted: false, error: "   " }), "completed", "whitespace error is ignored");
assertEqual(executionOutcome({ aborted: true }), "stopped", "cancellation is stopped, not completed");
assertEqual(executionOutcome({ aborted: true, error: "network error" }), "stopped", "cancellation takes precedence over stale errors");

assertEqual(toolResultFailed("Syntax errors: src/App.tsx:1:4 Expected \";\""), true, "syntax verification errors must mark the tool block as failed");
assertEqual(toolResultFailed("BUILD ERRORS:\nmissing module"), true, "build failures must mark the tool block as failed");
assertEqual(toolResultFailed("Builds, but it crashed or logged errors while running:\nTypeError"), true, "runtime failures must mark the tool block as failed");
assertEqual(toolResultFailed("Workflow failed", "FAILED"), true, "failed remote checks must mark the tool block as failed");
assertEqual(toolResultFailed("NOT VERIFIED: no native runner", "UNVERIFIED"), true, "unverified projects must not look successful");
assertEqual(toolResultFailed("No repository permission", "BLOCKED"), true, "blocked tools must not look successful");
assertEqual(toolResultFailed("Builds and runs cleanly.", "clean"), false, "clean verification must remain successful");
assertEqual(toolResultFailed("Read file contents"), false, "ordinary tool output must remain successful");

console.log("Execution outcome regression tests passed");
