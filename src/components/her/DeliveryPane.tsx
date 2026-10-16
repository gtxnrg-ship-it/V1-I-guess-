import { useMemo, useState } from "react";
import { Activity, ArrowUpRight, GitBranch, GitCommitHorizontal, GitPullRequest, Loader2, PackageCheck, RefreshCw, ScanSearch, ShieldAlert, Smartphone, Terminal, Workflow } from "lucide-react";
import * as db from "@/engine/db";
import { GH } from "@/engine/github";
import { analyzeProject } from "@/engine/project-intelligence";
import type { ProjectIntelligenceReport } from "@/engine/types";

type Run = { name: string; status: string; conclusion: string | null; url: string; at: string };
type Release = { name: string; tag: string; url: string; publishedAt: string | null; assets: { name: string; url: string; size: number; contentType: string }[] };
type PullRequest = { number: number; title: string; url: string; branch: string; updatedAt: string };

const statusLabel = (run: Run) => run.status === "in_progress" || run.status === "queued" ? "Running" : run.conclusion === "success" ? "Passed" : run.conclusion === "failure" ? "Failed" : run.conclusion || run.status;
const statusClass = (run: Run) => run.status === "in_progress" || run.status === "queued" ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" : run.conclusion === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : run.conclusion === "failure" ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" : "border-border bg-muted text-muted-foreground";
const severityClass = (severity: string) => severity === "high" ? "border-rose-500/30 bg-rose-500/10" : severity === "medium" ? "border-amber-500/30 bg-amber-500/10" : "border-border bg-muted/40";
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "Not reported";
const shortSha = (value: string) => value.slice(0, 7);

export function DeliveryPane() {
  const project = db.project();
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [release, setRelease] = useState<Release | null>(null);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [githubError, setGithubError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState("");

  const report = project.intelligence;
  const token = db.keyOf("github");
  const repo = project.repo || "";
  const repoParts = repo.split("/");
  const repoValid = repoParts.length === 2 && repoParts.every(Boolean);
  const snapshots = db.snapshots(project.id);
  const diffBase = snapshots.length > 1 ? snapshots[snapshots.length - 2] : snapshots[0];
  const changedPaths = useMemo(() => {
    if (!diffBase) return [];
    const all = new Set([...Object.keys(diffBase.files), ...Object.keys(project.files)]);
    return [...all].filter((path) => diffBase.files[path] !== project.files[path]).sort();
  }, [diffBase, project.files]);

  const analyze = () => {
    setAnalyzing(true);
    try {
      const next: ProjectIntelligenceReport = analyzeProject(project.files);
      db.updateProject(project.id, { intelligence: next });
    } finally {
      setAnalyzing(false);
    }
  };

  const refresh = async () => {
    if (!repoValid) { setGithubError("Connect or import a GitHub repository first."); return; }
    if (!token?.secret) { setGithubError("Add your GitHub credential in Settings to inspect Actions, releases, and pull requests."); return; }
    setRefreshing(true);
    setGithubError("");
    const [owner, name] = repoParts;
    const gh = new GH(token.secret);
    const [runResult, releaseResult, prResult] = await Promise.allSettled([
      gh.runs(owner, name),
      gh.latestRelease(owner, name),
      gh.pullRequests(owner, name),
    ]);
    if (runResult.status === "fulfilled") setRuns(runResult.value);
    else setGithubError("Actions status: " + (runResult.reason instanceof Error ? runResult.reason.message : String(runResult.reason)));
    if (releaseResult.status === "fulfilled") setRelease(releaseResult.value);
    else setRelease(null);
    if (prResult.status === "fulfilled") setPullRequests(prResult.value);
    else if (!githubError) setGithubError("Pull requests: " + (prResult.reason instanceof Error ? prResult.reason.message : String(prResult.reason)));
    setRefreshedAt(new Date().toISOString());
    setRefreshing(false);
  };

  const apk = release?.assets.find((asset) => asset.name.toLowerCase().endsWith(".apk"));
  const latestRun = runs[0];

  return (
    <section className="her-scroll h-full overflow-y-auto p-3 md:p-4" data-testid="delivery-pane">
      <div className="mx-auto max-w-4xl space-y-4 pb-6">
        <header className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><PackageCheck className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold">Engineering & delivery center</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">Evidence from the imported source, GitHub Actions, releases, and checkpoints. No build or deployment is marked successful unless GitHub reports it.</p>
          </div>
        </header>

        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><GitBranch className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13.5px] font-semibold">Connected repository</h3>
              {repoValid ? <a href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-[12.5px] text-primary hover:underline">{repo}<ArrowUpRight className="h-3 w-3 shrink-0" /></a> : <p className="mt-1 text-[12.5px] text-muted-foreground">No GitHub repository connected to this project.</p>}
              {project.repoBaseSha && repoValid && <a href={`https://github.com/${repo}/commit/${project.repoBaseSha}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"><GitCommitHorizontal className="h-3.5 w-3.5" /> Last known remote baseline: {shortSha(project.repoBaseSha)}</a>}
              <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1">{Object.keys(project.files).length} local files</span>
                <span className="rounded-md bg-muted px-2 py-1">{changedPaths.length} changes since checkpoint</span>
                <span className="rounded-md bg-muted px-2 py-1">{snapshots.length} checkpoints</span>
              </div>
            </div>
          </div>
          {changedPaths.length > 0 && <div className="mt-3 border-t border-border pt-3"><p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Files changed since previous checkpoint</p><div className="flex flex-wrap gap-1.5">{changedPaths.slice(0, 30).map((path) => <code key={path} className="max-w-full break-all rounded-md bg-muted px-2 py-1 text-[10.5px]">{path}</code>)}</div>{changedPaths.length > 30 && <p className="mt-2 text-[11px] text-muted-foreground">Showing 30 of {changedPaths.length} files.</p>}</div>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><ScanSearch className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><h3 className="text-[13.5px] font-semibold">Repository intelligence</h3><p className="mt-1 text-[12px] text-muted-foreground">Map project areas, scripts, local imports, tests, CI, and review signals. This is static analysis; findings are labeled as evidence or signals, not assumed to be proven bugs.</p></div>
            <button data-testid="button-analyze-project" onClick={analyze} disabled={analyzing} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-[11.5px] font-medium text-primary-foreground disabled:opacity-60">{analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />} Analyze</button>
          </div>
          {report ? <>
            <p className="mt-3 text-[12px] text-foreground/90">{report.summary}</p>
            <p className="mt-1 text-[10.5px] text-muted-foreground">Saved locally · analyzed {formatDate(report.generatedAt)} · {report.fileCount} files</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{report.architecture.map((area) => <span key={area} className="rounded-md border border-border px-2 py-1 text-[10.5px]">{area}</span>)}</div>
            {report.scripts.length > 0 && <div className="mt-3"><p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><Terminal className="h-3.5 w-3.5" /> Available scripts</p><div className="space-y-1.5">{report.scripts.slice(0, 8).map((script) => <div key={script.name} className="flex gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-[11.5px]"><span className="w-16 shrink-0 font-medium">{script.name}</span><code className="min-w-0 break-all text-muted-foreground">{script.command}</code></div>)}</div></div>}
            {report.findings.length > 0 && <div className="mt-3 space-y-2"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Review findings</p>{report.findings.map((finding, i) => <article key={finding.title + i} className={`rounded-xl border p-2.5 ${severityClass(finding.severity)}`}><div className="flex items-center gap-2"><span className="text-[10px] font-semibold uppercase">{finding.severity} · {finding.confidence}</span><span className="text-[12px] font-medium">{finding.title}</span></div><p className="mt-1 text-[11.5px] text-muted-foreground">{finding.evidence}</p>{finding.files.length > 0 && <p className="mt-1 break-all font-mono text-[10.5px] text-muted-foreground">{finding.files.join(", ")}</p>}</article>)}</div>}
            {report.importEdges.length > 0 && <details className="mt-3 rounded-xl border border-border p-2.5"><summary className="cursor-pointer text-[12px] font-medium">Local dependency links ({report.importEdges.length})</summary><div className="mt-2 max-h-52 space-y-1 overflow-y-auto">{report.importEdges.slice(0, 40).map((edge, i) => <div key={edge.from + edge.to + i} className="break-all font-mono text-[10.5px] text-muted-foreground">{edge.from} → {edge.to}</div>)}</div></details>}
          </> : <p className="mt-3 text-[12px] text-muted-foreground">No report saved yet. Analyze the imported files to build a reusable project map.</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><Activity className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><h3 className="text-[13.5px] font-semibold">GitHub Actions, pull requests & artifacts</h3><p className="mt-1 text-[12px] text-muted-foreground">Live repository metadata requires a connected GitHub credential with permission to read the repository and workflow results.</p></div>
            <button data-testid="button-refresh-delivery" onClick={refresh} disabled={refreshing} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[11.5px] font-medium hover:bg-muted disabled:opacity-60">{refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh</button>
          </div>
          {!token && <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11.5px] text-amber-800 dark:text-amber-200">GitHub is not connected. Open Settings to connect credentials before fetching private repository status.</p>}
          {githubError && <p role="alert" className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-[11.5px] text-rose-700 dark:text-rose-300">{githubError}</p>}
          {refreshedAt && <p className="mt-2 text-[10.5px] text-muted-foreground">Last refreshed {formatDate(refreshedAt)}. Results below reflect GitHub's response at that time.</p>}
          {latestRun && <div className="mt-3 rounded-xl border border-border p-2.5"><div className="flex items-center gap-2"><Workflow className="h-4 w-4 text-primary" /><span className="text-[12px] font-semibold">Latest workflow</span><span className={`ml-auto rounded-md border px-2 py-0.5 text-[10px] ${statusClass(latestRun)}`}>{statusLabel(latestRun)}</span></div><p className="mt-1 text-[12px]">{latestRun.name}</p><a href={latestRun.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline">Open run and logs <ArrowUpRight className="h-3 w-3" /></a></div>}
          {runs.length > 0 && <div className="mt-3 space-y-2">{runs.slice(0, 6).map((run) => <a key={run.url} href={run.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-border p-2.5 hover:bg-muted/50"><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium">{run.name}</span><span className="block text-[10.5px] text-muted-foreground">{formatDate(run.at)}</span></span><span className={`rounded-md border px-2 py-1 text-[10px] ${statusClass(run)}`}>{statusLabel(run)}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /></a>)}</div>}
          {release && <div className="mt-3 rounded-xl border border-border p-2.5"><div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-primary" /><span className="text-[12px] font-semibold">Latest GitHub release</span></div><a href={release.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-primary hover:underline">{release.name || release.tag}<ArrowUpRight className="h-3 w-3" /></a><p className="mt-1 text-[10.5px] text-muted-foreground">Published {formatDate(release.publishedAt)} · tag {release.tag}</p>{apk ? <a href={apk.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 p-2.5 text-[12px] font-medium text-primary"><Smartphone className="h-4 w-4" /> Download verified APK asset: {apk.name}<span className="ml-auto text-[10.5px]">{(apk.size / 1024 / 1024).toFixed(1)} MB</span></a> : <p className="mt-2 text-[11.5px] text-muted-foreground">This release has no APK asset; no Android download link is shown.</p>}</div>}
          {pullRequests.length > 0 && <div className="mt-3 space-y-2"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Open pull requests</p>{pullRequests.map((pr) => <a key={pr.number} href={pr.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-border p-2.5 hover:bg-muted/50"><GitPullRequest className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block text-[12px] font-medium">#{pr.number} · {pr.title}</span><span className="block truncate text-[10.5px] text-muted-foreground">{pr.branch} · updated {formatDate(pr.updatedAt)}</span></span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /></a>)}</div>}
          {token && !runs.length && !release && !pullRequests.length && !refreshing && !githubError && <p className="mt-3 text-[11.5px] text-muted-foreground">No GitHub status has been fetched yet. Tap Refresh to query this repository.</p>}
        </div>

        <p className="flex items-start gap-2 px-1 text-[10.5px] text-muted-foreground"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Static analysis can miss issues and produce false positives. Workflow success is taken from GitHub; local static analysis never claims that tests, builds, deployments, or APKs succeeded.</p>
      </div>
    </section>
  );
}
