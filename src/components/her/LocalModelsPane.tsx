import { useMemo, useState } from "react";
import { Cpu, Download, ExternalLink, Gauge, HardDrive, Smartphone } from "lucide-react";
import { LOCAL_MODEL_CATALOG, gradeLocalModel, localModelRecommendation, type ModelGrade } from "@/engine/local-models";
const gradeStyle: Record<ModelGrade, string> = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  yellow: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  red: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};
const gradeLabel: Record<ModelGrade, string> = { green: "Green · good candidate", yellow: "Yellow · test carefully", red: "Red · not recommended" };
export function LocalModelsPane() {
  const detectedRam = typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory : undefined;
  const [ram, setRam] = useState(String(detectedRam || 6));
  const [filter, setFilter] = useState<"all" | ModelGrade>("all");
  const ramGb = Number(ram);
  const recommendation = localModelRecommendation(ramGb);
  const models = useMemo(() => LOCAL_MODEL_CATALOG.filter((model) => filter === "all" || gradeLocalModel(model, ramGb) === filter), [filter, ramGb]);
  return (
    <section data-testid="local-models-pane">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Cpu className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><h2 className="text-[15px] font-semibold">Local model library</h2><p className="mt-1 text-[13px] text-muted-foreground">Open-weight models that can run on-device without an API key. Download more than one and let Kuro-chan route different jobs to different brains.</p></div>
      </div>
      <div className="mt-3 rounded-2xl border border-border bg-card p-3.5">
        <div className="flex items-center gap-2 text-[13px] font-medium"><Smartphone className="h-4 w-4 text-primary" /> Device fit estimate</div>
        <p className="mt-1 text-[12px] text-muted-foreground">This is an early RAM-based estimate, not a hardware benchmark. The Android runtime must still verify supported model format, memory use, speed and temperature.</p>
        <label className="mt-3 flex items-center gap-3 text-[12.5px]"><span className="shrink-0">Phone RAM</span><select aria-label="Phone RAM" value={ram} onChange={(e) => setRam(e.target.value)} className="h-9 flex-1 rounded-lg bg-muted px-2.5 text-foreground outline-none"><option value="2">2 GB</option><option value="3">3 GB</option><option value="4">4 GB</option><option value="6">6 GB</option><option value="8">8 GB</option><option value="12">12 GB</option><option value="16">16 GB</option><option value="24">24 GB+</option></select></label>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3"><Gauge className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-[12px] text-muted-foreground">{recommendation}</p></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-auto text-[12px] text-muted-foreground">{models.length} of {LOCAL_MODEL_CATALOG.length} candidates</span>{(["all", "green", "yellow", "red"] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg border px-2.5 py-1.5 text-[12px] ${filter === value ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>{value === "all" ? "All models" : value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      <div className="mt-3 space-y-2">
        {models.map((model) => { const grade = gradeLocalModel(model, ramGb); return (
          <article key={model.id} className="rounded-2xl border border-border bg-card p-3.5" data-testid={`local-model-${model.id}`}>
            <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><Cpu className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[13.5px] font-semibold">{model.name}</h3><span className="rounded-md border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground">{model.parameters}</span></div><p className="mt-1 text-[12px] text-muted-foreground">{model.task}</p></div></div>
            <div className="mt-2.5 flex flex-wrap gap-2"><span className={`rounded-md border px-2 py-1 text-[10.5px] ${gradeStyle[grade]}`}>{gradeLabel[grade]}</span><span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10.5px] text-muted-foreground"><HardDrive className="h-3 w-3" /> {model.estimatedDownload}</span></div>
            <p className="mt-2 text-[11.5px] text-muted-foreground">{model.notes}</p>
            <a href={model.modelPage} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-medium hover:bg-muted"><Download className="h-3.5 w-3.5" /> Open model page <ExternalLink className="h-3 w-3" /></a>
          </article>
        ); })}
      </div>
      <p className="mt-3 text-[11.5px] text-muted-foreground">Important: these links open upstream model cards; this phase does not download or execute model files inside Kuro-chan yet. The next phase will add a native Android download manager, supported-format validation, runtime loading, progress/resume/delete, and real device benchmarks. Model licenses and access restrictions vary.</p>
    </section>
  );
}
