import { diagnoseWorkflowRun, extractLogClues, type WorkflowClient } from "./workflow-failure-diagnostics";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function run() {
  const sampleToken = "ghp_" + "abcdefghijklmnopqrstuvwxyz123456";
  const clues = extractLogClues("install complete\nError: Cannot find module 'vite'\nError: GITHUB_TOKEN=" + sampleToken + "\nBuild failed with exit code 1");
  assert(clues.some((line) => line.includes("Cannot find module")), "extracts relevant build error clues");
  assert(!clues.some((line) => line.includes(sampleToken)), "never returns raw GitHub tokens");
  assert(clues.some((line) => line.includes("[REDACTED_ENV_SECRET]")), "redacts secret environment values");

  const client: WorkflowClient = {
    async req(_method, path) {
      if (path.endsWith("/runs/42/jobs?per_page=100")) return { status: 200, json: { jobs: [
        { id: 9, name: "Build and test", status: "completed", conclusion: "failure", steps: [
          { name: "Checkout", conclusion: "success" }, { name: "npm run build", conclusion: "failure" },
        ] },
        { id: 10, name: "CodeQL", status: "completed", conclusion: "success", steps: [] },
      ] } };
      if (path.endsWith("/jobs/9/logs")) return { status: 200, json: "Error: TypeScript compilation failed\nAPI_KEY=sample-secret-value\nProcess completed with exit code 2" };
      throw new Error("Unexpected request " + path);
    },
  };
  const report = await diagnoseWorkflowRun(client, "acme", "app", 42);
  assert(report.status === "diagnosed" && report.failedJobs.length === 1, "reports only actually failed jobs");
  assert(report.failedJobs[0].failedSteps[0] === "npm run build", "identifies the failed step");
  assert(report.failedJobs[0].logClues.some((line) => line.includes("TypeScript compilation failed")), "surfaces log clues");
  assert(!report.failedJobs[0].logClues.some((line) => line.includes("sample-secret-value")), "sanitizes logs before exposing clues");

  const unavailable = await diagnoseWorkflowRun({ async req() { return { status: 403, json: { message: "Forbidden" } }; } }, "acme", "app", 42);
  assert(unavailable.status === "unavailable" && unavailable.failedJobs.length === 0, "does not invent a diagnosis when GitHub denies access");
  const healthy = await diagnoseWorkflowRun({ async req() { return { status: 200, json: { jobs: [{ status: "completed", conclusion: "success" }] } }; } }, "acme", "app", 43);
  assert(healthy.status === "no-failures", "does not flag a successful run");
  let rejected = false;
  try { await diagnoseWorkflowRun(client, "acme", "app", -1); } catch { rejected = true; }
  assert(rejected, "rejects invalid run IDs");
  console.log("Workflow failure diagnostics tests passed");
}
void run();
