import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Eye, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { buildQaHarness } from "@/engine/qa-harness";

interface PreviewPaneProps {
  files: Record<string, string>;
  env: Record<string, string>;
}

const hasEntryPoint = (files: Record<string, string>) =>
  ["src/main.tsx", "src/main.jsx", "src/main.ts", "src/main.js", "src/index.tsx", "main.tsx"]
    .some((path) => files[path] != null);

export function PreviewPane({ files, env }: PreviewPaneProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState("");
  const [buildErrors, setBuildErrors] = useState<string[]>([]);
  const [runtimeErrors, setRuntimeErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoaded(false);
    setRuntimeErrors([]);
    setBuildErrors([]);
    setHtml("");

    if (!Object.keys(files).length || !hasEntryPoint(files)) {
      setLoading(false);
      return () => { current = false; };
    }

    void buildQaHarness(files, env)
      .then((result) => {
        if (!current) return;
        setHtml(result.html);
        setBuildErrors(result.errors);
      })
      .catch((error: unknown) => {
        if (!current) return;
        setBuildErrors([error instanceof Error ? error.message : String(error)]);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => { current = false; };
  }, [files, env, revision]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // The sandboxed preview has an opaque origin. Trust only messages from this iframe,
      // not other tabs or embedded content elsewhere in the studio.
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as { __her?: string; errors?: unknown };
      if (!data || typeof data !== "object") return;
      if (data.__her === "loaded") setLoaded(true);
      if (data.__her === "runtime-error" && Array.isArray(data.errors)) {
        setRuntimeErrors(data.errors.filter((item): item is string => typeof item === "string").slice(0, 8));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const hasProject = Object.keys(files).length > 0;
  const hasRunnableEntry = hasProject && hasEntryPoint(files);

  return (
    <section data-testid="project-preview" className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 py-3 sm:px-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Eye className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold">Live project preview</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Updates from your current project files</p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground sm:inline-flex">
          <ShieldCheck className="h-3 w-3" /> Isolated sandbox
        </span>
        <button
          type="button"
          data-testid="preview-refresh"
          aria-label="Refresh preview"
          title="Rebuild and reload preview"
          disabled={loading || !hasRunnableEntry}
          onClick={() => setRevision((value) => value + 1)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </header>

      {(buildErrors.length > 0 || runtimeErrors.length > 0) && (
        <div role="alert" className="mx-3 mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive sm:mx-4">
          <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Preview needs attention</div>
          {buildErrors.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{buildErrors.slice(0, 5).map((error, index) => <li key={index} className="break-words">{error}</li>)}</ul>}
          {runtimeErrors.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{runtimeErrors.slice(0, 5).map((error, index) => <li key={index} className="break-words">{error}</li>)}</ul>}
        </div>
      )}

      <div className="relative min-h-0 flex-1 bg-muted/30 p-2 sm:p-3">
        {loading ? (
          <div className="flex h-full min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Preparing your preview…
          </div>
        ) : !hasProject ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-6 text-center">
            <Eye className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Nothing to preview yet</p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">Tell Kuro-chan what you want to build. Your project preview will appear here when there is code to run.</p>
          </div>
        ) : !hasRunnableEntry ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-6 text-center">
            <Eye className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Waiting for an app entry point</p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">The project has files, but no supported app entry file was found yet. Ask Kuro-chan to finish the app scaffold.</p>
          </div>
        ) : html ? (
          <iframe
            key={revision}
            ref={frame}
            data-testid="project-preview-frame"
            title="Current project live preview"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            srcDoc={html}
            className="h-full min-h-[320px] w-full rounded-xl border border-border bg-white shadow-sm"
          />
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground">Preview could not be prepared. Check the error details above.</div>
        )}
      </div>
      <footer className="shrink-0 border-t border-border px-4 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
        {buildErrors.length ? "The preview contains a build error; use the details above to guide a fix." : runtimeErrors.length ? "The preview reported a runtime error." : loaded ? "Preview loaded. Changes you make to project files will rebuild it." : "Project code runs in a separate sandboxed frame without access to the studio's origin storage."}
        {" "}External network requests from previewed code are still possible.
      </footer>
    </section>
  );
}
