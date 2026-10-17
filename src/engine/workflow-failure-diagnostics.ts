export type VerificationCheckState = "passed" | "failed" | "running" | "skipped" | "unavailable" | "missing";
export type VerificationOverallState = "passed" | "failed" | "running" | "blocked" | "incomplete";
export interface VerificationCheck { name: string; state: VerificationCheckState; detail?: string; url?: string }
export interface VerificationSummary {
  state: VerificationOverallState; ready: boolean; checks: VerificationCheck[];
  passed: number; failed: number; running: number; skipped: number; unavailable: number; missing: number;
  summary: string; limitations: string[];
}
export interface ObservedVerificationCheck { name?: unknown; status?: unknown; conclusion?: unknown; details_url?: unknown; html_url?: unknown }

const normalizeCheckName = (name: string) => name.trim().replace(/\\s+/g, " ").toLowerCase();

/** Never treats an absent or inconclusive conclusion as a pass. */
export function normalizeVerificationCheck(status: unknown, conclusion: unknown): VerificationCheckState {
  const s = typeof status === "string" ? status.toLowerCase() : "";
  const c = typeof conclusion === "string" ? conclusion.toLowerCase() : "";
  if (s !== "completed" && !c) return "running";
  if (["failure", "timed_out", "action_required", "startup_failure"].includes(c)) return "failed";
  if (["success", "neutral"].includes(c)) return "passed";
  if (["skipped", "cancelled", "stale"].includes(c)) return "skipped";
  if (s === "completed" || c) return "unavailable";
  return "running";
}

/** Build a report against explicit required checks for one exact commit. */
export function buildVerificationSummary(requiredNames: string[], observed: ObservedVerificationCheck[], sourceAvailable = true): VerificationSummary {
  const grouped = new Map<string, ObservedVerificationCheck[]>();
  for (const item of observed) if (typeof item.name === "string" && item.name.trim()) {
    const key = normalizeCheckName(item.name); grouped.set(key, [...(grouped.get(key) || []), item]);
  }
  const checks = requiredNames.map((name): VerificationCheck => {
    const found = grouped.get(normalizeCheckName(name)) || [];
    if (!sourceAvailable) return { name, state: "unavailable", detail: "Provider check list could not be retrieved." };
    if (!found.length) return { name, state: "missing", detail: "No matching check was found for this commit." };
    const states = found.map((item) => normalizeVerificationCheck(item.status, item.conclusion));
    const priority: VerificationCheckState[] = ["failed", "running", "unavailable", "missing", "skipped", "passed"];
    const state = priority.find((candidate) => states.includes(candidate)) || "unavailable";
    const chosen = found.find((item) => normalizeVerificationCheck(item.status, item.conclusion) === state) || found[0];
    const url = typeof chosen.html_url === "string" ? chosen.html_url : typeof chosen.details_url === "string" ? chosen.details_url : undefined;
    return { name, state, ...(found.length > 1 ? { detail: "Duplicate records found; the most conservative result is shown." } : {}), ...(url ? { url } : {}) };
  });
  const count = (state: VerificationCheckState) => checks.filter((check) => check.state === state).length;
  const passed = count("passed"), failed = count("failed"), running = count("running"), skipped = count("skipped"), unavailable = count("unavailable"), missing = count("missing");
  const state: VerificationOverallState = failed ? "failed" : running ? "running" : unavailable || missing ? "blocked" : skipped ? "incomplete" : "passed";
  const ready = state === "passed" && checks.length > 0;
  const summary = ready ? `All ${checks.length} required verification checks passed.`
    : failed ? `${failed} required check(s) failed. This change is not verified.`
    : running ? `${running} required check(s) are still running. Verification is not complete.`
    : unavailable || missing ? `${missing + unavailable} required check(s) are missing or unavailable. Verification cannot be confirmed.`
    : skipped ? `${skipped} required check(s) were skipped or cancelled. Verification is incomplete.`
    : "No required checks were configured. Verification cannot be declared successful.";
  const limitations: string[] = [];
  if (!checks.length) limitations.push("No required checks were supplied; an empty list is never considered a pass.");
  if (missing) limitations.push("A missing check is not proof that it passed; confirm workflow configuration and commit identity.");
  if (unavailable) limitations.push("Provider data was unavailable or inconclusive for one or more required checks.");
  if (skipped) limitations.push("Skipped or cancelled checks require a rerun or documented exception.");
  if (running) limitations.push("Recheck after in-progress checks have completed.");
  return { state, ready, checks, passed, failed, running, skipped, unavailable, missing, summary, limitations };
}

export interface WorkflowApiResponse { status: number; json: any }
export interface WorkflowClient {
  req(method: string, path: string, body?: unknown): Promise<WorkflowApiResponse>;
}
export interface FailedWorkflowJob {
  id: number;
  name: string;
  conclusion: string | null;
  failedSteps: string[];
  logClues: string[];
  logAvailable: boolean;
}
export interface WorkflowFailureReport {
  runId: number;
  status: "diagnosed" | "no-failures" | "unavailable";
  summary: string;
  failedJobs: FailedWorkflowJob[];
  limitations: string[];
}

const clip = (value: string, limit = 220) => value.length > limit ? value.slice(0, limit) + "…" : value;
function safeLogLine(line: string): string {
  return clip(line
    .replace(/\b(gh[pousr]_[A-Za-z0-9_]{20,})\b/g, "[REDACTED_TOKEN]")
    .replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, "[REDACTED_TOKEN]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_KEY]")
    .replace(/\bAIza[0-9A-Za-z_-]{30,}\b/g, "[REDACTED_GOOGLE_KEY]")
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ig, "[REDACTED_SLACK_TOKEN]")
    .replace(/\bnpm_[A-Za-z0-9]{30,}\b/ig, "[REDACTED_NPM_TOKEN]")
    .replace(/\b[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY)[A-Z0-9_]*=[^\s]+/g, "[REDACTED_ENV_SECRET]")
    .replace(/(authorization\s*:\s*bearer\s+)\S+/ig, "$1[REDACTED]")
    .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*)[^\s,;]+/ig, "$1[REDACTED]")
  );
}
export function extractLogClues(log: string, max = 8): string[] {
  const lines = log.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const matches = lines.filter((line) => /\b(error|failed|failure|exception|traceback|fatal|cannot find|not found|timed out|timed-out)\b/i.test(line));
  return [...new Set(matches.map(safeLogLine))].slice(-Math.max(1, Math.min(12, max)));
}
export async function diagnoseWorkflowRun(
  client: WorkflowClient,
  owner: string,
  repository: string,
  runId: number,
): Promise<WorkflowFailureReport> {
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repository) || !Number.isSafeInteger(runId) || runId <= 0) {
    throw new Error("A valid GitHub owner, repository, and workflow run ID are required.");
  }
  const root = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/actions`;
  let jobsResponse: WorkflowApiResponse;
  try { jobsResponse = await client.req("GET", `${root}/runs/${runId}/jobs?per_page=100`); }
  catch {
    return { runId, status: "unavailable", summary: "GitHub job details could not be fetched. No repair should be proposed from this incomplete evidence.", failedJobs: [], limitations: ["The workflow-jobs request failed before a response was received."] };
  }
  if (jobsResponse.status >= 300 || !Array.isArray(jobsResponse.json?.jobs)) {
    return { runId, status: "unavailable", summary: "GitHub did not provide readable job details. No repair should be proposed from this incomplete evidence.", failedJobs: [], limitations: [`Job details returned HTTP ${jobsResponse.status} or an unexpected response.`] };
  }
  const jobs = jobsResponse.json.jobs as any[];
  const failed = jobs.filter((job) => job?.conclusion === "failure" || job?.conclusion === "timed_out" || job?.conclusion === "action_required");
  if (!failed.length) {
    const stillRunning = jobs.some((job) => job?.status !== "completed");
    return { runId, status: "no-failures", summary: stillRunning ? "No failed jobs are reported yet; at least one job is still running." : "GitHub reports no failed jobs for this workflow run.", failedJobs: [], limitations: stillRunning ? ["The workflow may not have finished; recheck after it completes."] : [] };
  }
  const failedJobs: FailedWorkflowJob[] = [];
  const limitations: string[] = [];
  for (const job of failed.slice(0, 8)) {
    const failedSteps = (Array.isArray(job.steps) ? job.steps : [])
      .filter((step: any) => step?.conclusion === "failure" || step?.conclusion === "timed_out")
      .map((step: any) => String(step.name || "Unnamed step").slice(0, 160));
    let logClues: string[] = [];
    let logAvailable = false;
    if (Number.isSafeInteger(job.id) && job.id > 0) {
      try {
        const response = await client.req("GET", `${root}/jobs/${job.id}/logs`);
        if (response.status < 300) {
          const log = typeof response.json === "string" ? response.json : typeof response.json?.content === "string" ? response.json.content : "";
          if (log) { logAvailable = true; logClues = extractLogClues(log); }
          else limitations.push(`Logs for job ${job.id} were empty or returned in an unsupported format.`);
        } else limitations.push(`Logs for job ${job.id} returned HTTP ${response.status}.`);
      } catch { limitations.push(`Logs for job ${job.id} could not be fetched.`); }
    }
    failedJobs.push({ id: Number(job.id) || 0, name: String(job.name || "Unnamed job").slice(0, 160), conclusion: typeof job.conclusion === "string" ? job.conclusion : null, failedSteps, logClues, logAvailable });
  }
  const stepCount = failedJobs.reduce((sum, job) => sum + job.failedSteps.length, 0);
  const clueCount = failedJobs.reduce((sum, job) => sum + job.logClues.length, 0);
  return {
    runId, status: "diagnosed",
    summary: `GitHub reports ${failed.length} failed job(s). ${stepCount} failed step(s) and ${clueCount} sanitized log clue(s) were collected where available. This is diagnostic evidence, not proof of a specific fix.`,
    failedJobs,
    limitations: [...limitations, ...(failed.length > failedJobs.length ? [`Only the first ${failedJobs.length} failed jobs were inspected to keep requests bounded.`] : []), ...(clueCount === 0 ? ["No useful error lines were extracted from logs; inspect the raw workflow run before proposing a repair."] : [])],
  };
}
