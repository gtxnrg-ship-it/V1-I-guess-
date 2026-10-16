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
    .replace(/(authorization\s*:\s*bearer\s+)\S+/ig, "$1[REDACTED]")
    .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*)[^\s,;]+/ig, "$1[REDACTED]")
    .replace(/\b[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY)[A-Z0-9_]*=[^\s]+/g, "[REDACTED_ENV_SECRET]")
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
