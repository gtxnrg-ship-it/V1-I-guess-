import { useState } from "react";
import { Archive, RotateCcw, ShieldCheck, Clock3, AlertTriangle } from "lucide-react";
import * as db from "@/engine/db";
import { useToast } from "@/hooks/use-toast";

function formatTime(value: number) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function CheckpointsPane() {
  const state = db.useKuro();
  const project = db.project();
  const checkpoints = [...db.snapshots(project.id)].sort((a, b) => b.createdAt - a.createdAt);
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);

  const createCheckpoint = () => {
    const cleanLabel = label.trim().slice(0, 80) || "Manual checkpoint";
    db.takeSnapshot(cleanLabel);
    setLabel("");
    toast({ title: "Checkpoint created", description: "Your current project files are saved as a restore point." });
  };

  const restoreCheckpoint = (id: string, checkpointLabel: string) => {
    if (restoring !== id) {
      setRestoring(id);
      return;
    }
    const result = db.restoreSnapshot(id, project.id);
    setRestoring(null);
    if (!result.ok) {
      toast({ title: "Restore could not be completed", description: result.reason === "project-not-found"
        ? "This project no longer exists." : result.reason === "invalid-snapshot"
          ? "This checkpoint contains invalid file data. No files were changed."
          : "This checkpoint is not available in the current project.", variant: "destructive" });
      return;
    }
    toast({ title: "Project restored", description: `Restored “${checkpointLabel}”. A safety checkpoint of the previous files was created first.` });
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300"><Archive className="h-4 w-4" /> Recovery</div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Checkpoints</h2>
          <p className="mt-1 text-sm text-muted-foreground">Save a known-good file state before risky edits, then restore it if something breaks. Checkpoints stay inside this project.</p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); createCheckpoint(); }} className="rounded-2xl border border-border/80 bg-background/55 p-4 sm:p-5">
          <label htmlFor="checkpoint-label" className="text-sm font-medium">Create a checkpoint</label>
          <p className="mt-1 text-xs text-muted-foreground">The current project files will be captured exactly as they are now.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input id="checkpoint-label" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} placeholder="e.g. Before dependency upgrade" className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:opacity-90"><Archive className="h-4 w-4" /> Save checkpoint</button>
          </div>
        </form>

        <div className="flex items-center justify-between gap-3">
          <div><h3 className="font-semibold">Saved restore points</h3><p className="text-xs text-muted-foreground">Newest first · up to 40 per project</p></div>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs tabular-nums text-muted-foreground">{checkpoints.length} saved</span>
        </div>

        {checkpoints.length ? <div className="space-y-2">
          {checkpoints.map((checkpoint) => {
            const confirm = restoring === checkpoint.id;
            return <article key={checkpoint.id} className="rounded-xl border border-border/80 bg-background/45 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"><ShieldCheck className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h4 className="break-words text-sm font-semibold">{checkpoint.label}</h4>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatTime(checkpoint.createdAt)}</span><span>{Object.keys(checkpoint.files).length} files</span></p>
                </div>
                {confirm ? <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 inline-flex items-center gap-1 text-xs text-amber-300"><AlertTriangle className="h-3.5 w-3.5" /> Replace current files?</span>
                  <button onClick={() => restoreCheckpoint(checkpoint.id, checkpoint.label)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"><RotateCcw className="h-3.5 w-3.5" /> Confirm restore</button>
                  <button onClick={() => setRestoring(null)} className="h-9 rounded-lg border border-border px-3 text-xs hover:bg-muted">Cancel</button>
                </div> : <button onClick={() => { setRestoring(checkpoint.id); }} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /> Restore</button>}
              </div>
              {confirm && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Kuro-chan will first save a safety checkpoint of your current files, then replace the current file set with this checkpoint. You can restore the safety checkpoint to undo this operation.</p>}
            </article>;
          })}
        </div> : <div className="rounded-2xl border border-dashed border-border p-8 text-center"><Archive className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="mt-3 font-medium">No checkpoints yet</h3><p className="mt-1 text-sm text-muted-foreground">Create one before a risky change. Checkpoints are stored separately for each project.</p></div>}
      </div>
    </div>
  );
}
