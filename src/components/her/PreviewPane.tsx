import { useEffect, useRef, useState } from "react";
import { Monitor, Smartphone, RotateCw, AlertTriangle, Wand2, MousePointerClick, Maximize2, Minimize2 } from "lucide-react";
import type { PickedElement } from "@/engine/types";
import { buildPreview } from "@/engine/preview";
import * as db from "@/engine/db";

export function PreviewPane({ onFix, onPick }: { onFix: (t: string) => void; onPick: (el: PickedElement) => void }) {
  const st = db.useKuro();
  const p = db.project();
  const frame = useRef<HTMLIFrameElement>(null);
  const [picking, setPicking] = useState(false);
  const setPick = (on: boolean) => { setPicking(on); frame.current?.contentWindow?.postMessage({ __her: "pick", on }, "*"); };
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [bump, setBump] = useState(0);
  const [html, setHtml] = useState<string>("");
  const [buildErrors, setBuildErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [full, setFull] = useState(false);
  const errors = buildErrors.length ? buildErrors : st.runtimeErrors;

  useEffect(() => {
    let off = false;
    const t = setTimeout(async () => {
      const b = await buildPreview(p.files, p.env);
      if (off) return;
      setBuildErrors(b.errors);
      if (b.html !== html || bump) { setLoading(true); setHtml(b.html); db.set({ runtimeErrors: [] }); }
    }, 250);
    return () => { off = true; clearTimeout(t); };
  }, [p.files, p.env, bump]); // eslint-disable-line

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data;
      if (d?.__her === "runtime-error") db.set({ runtimeErrors: d.errors || [] });
      if (d?.__her === "loaded") setLoading(false);
      if (d?.__her === "picked" && d.el) { setPicking(false); onPick(d.el); }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [onPick]);

  return (
    <div className={`flex min-h-0 flex-col bg-card ${full ? "fixed inset-0 z-50" : "h-full"}`}>
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        <div className="flex rounded-lg bg-muted p-0.5">
          {(["desktop", "mobile"] as const).map((d) => (
            <button key={d} data-testid={`button-device-${d}`} aria-label={d} onClick={() => setDevice(d)}
              className={`grid h-7 w-8 place-items-center rounded-md transition-all ${device === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {d === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
        <div className="mx-2 flex h-7 min-w-0 flex-1 items-center rounded-lg bg-muted px-3 font-mono text-[11.5px] text-muted-foreground">
          <span className={`mr-2 h-1.5 w-1.5 shrink-0 rounded-full ${errors.length ? "bg-rose-500" : loading ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />
          <span className="truncate">{p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")} / live</span>
        </div>
        <button data-testid="button-select-element" aria-pressed={picking} title="Tap any part of your app, then tell me what to change" onClick={() => setPick(!picking)}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium transition-colors ${picking ? "bg-[hsl(var(--ember))] text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
          <MousePointerClick className="h-3.5 w-3.5" /><span className="hidden sm:inline">{picking ? "Tap an element" : "Select"}</span>
        </button>
        <button data-testid="button-refresh-preview" aria-label="Refresh" onClick={() => setBump((b) => b + 1)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <button data-testid="button-fullscreen" aria-label={full ? "Exit full screen" : "Full screen"} onClick={() => setFull((f) => !f)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          {full ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      {errors.length > 0 && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{errors.length} {buildErrors.length ? "build" : "runtime"} {errors.length === 1 ? "error" : "errors"}: {errors[errors.length - 1]}</span>
          <button data-testid="button-fix-error" disabled={st.busy} onClick={() => onFix(`The preview shows ${buildErrors.length ? "a build" : "a runtime"} error. Please fix it:\n${errors.slice(-3).join("\n")}`)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-[12px] font-medium text-white hover:bg-rose-700 disabled:opacity-50">
            <Wand2 className="h-3 w-3" /> Ask Kuro-chan to fix
          </button>
        </div>
      )}
      <div className={`relative min-h-0 flex-1 ${device === "mobile" ? "grid place-items-center overflow-auto bg-muted/50 p-4" : "bg-white"}`}>
        {loading && device === "desktop" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-card/70 backdrop-blur-[1px]">
            <span className="her-shimmer text-[13px] font-medium">Rendering preview…</span>
          </div>
        )}
        {picking && <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-foreground px-3 py-1.5 text-[12px] font-medium text-background shadow-lg">Tap the part you want to change</div>}
        {html && (
          <iframe
            ref={frame} key={`${bump}:${html.length}:${html.slice(-200)}`} srcDoc={html} title="App preview" data-testid="iframe-preview" onLoad={() => setTimeout(() => setLoading(false), 300)}
            sandbox="allow-scripts allow-forms allow-popups allow-modals allow-pointer-lock"
            allow="fullscreen; gamepad; autoplay"
            className={device === "mobile" ? "h-[720px] max-h-full w-[375px] rounded-[28px] border-[6px] border-foreground/90 bg-white shadow-2xl" : "h-full w-full border-0"}
          />
        )}
      </div>
    </div>
  );
}
