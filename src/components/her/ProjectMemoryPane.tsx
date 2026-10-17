import { useState } from "react";
import { Brain, Plus, Pencil, Trash2, Save, X, ShieldCheck, AlertTriangle, MessageSquareText, Lightbulb, CircleHelp, RotateCcw } from "lucide-react";
import * as db from "@/engine/db";
import { containsSensitiveMemoryText, type ProjectMemoryFact } from "@/engine/project-memory";
import type { Project } from "@/engine/types";
import { useToast } from "@/hooks/use-toast";

type EntryKind = "fact" | "decision" | "question";
type EditableKind = "fact" | "decision";
const EMPTY_MEMORY: NonNullable<Project["memory"]> = { facts: [], decisions: [], openQuestions: [] };

function sourceLabel(source: ProjectMemoryFact["source"]) {
  if (source === "user-confirmed") return "Confirmed by you";
  if (source === "repository-observed") return "Observed in repository";
  return "Proposed by Kuro-chan";
}
function timeLabel(value?: number) {
  if (!value || !Number.isFinite(value)) return "Time not recorded";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ProjectMemoryPane() {
  const st = db.useKuro();
  const project = db.project();
  const memory = project.memory || EMPTY_MEMORY;
  const facts = memory.facts || [];
  const decisions = memory.decisions || [];
  const questions = memory.openQuestions || [];
  const { toast } = useToast();
  const [kind, setKind] = useState<EntryKind>("fact");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ kind: EditableKind; index: number } | null>(null);
  const [editText, setEditText] = useState("");
  const [summaryDraft, setSummaryDraft] = useState(memory.recentSummary || "");
  const [clearConfirm, setClearConfirm] = useState(false);

  const addEntry = () => {
    const text = draft.trim();
    if (!text) {
      toast({ title: "Nothing to save", description: "Write a short memory entry first.", variant: "destructive" });
      return;
    }
    if (containsSensitiveMemoryText(text)) {
      toast({ title: "This looks like a secret", description: "Kuro-chan won't store passwords, API keys, or access tokens in project memory.", variant: "destructive" });
      return;
    }
    if (kind === "question") {
      db.saveProjectMemory({ openQuestions: [...questions, text] }, project.id);
    } else {
      const entry: ProjectMemoryFact = { text, source: "user-confirmed", confidence: "high", evidence: "Added or confirmed by the user in the Memory workspace.", updatedAt: Date.now() };
      db.saveProjectMemory(kind === "fact" ? { facts: [...facts, entry] } : { decisions: [...decisions, entry] }, project.id);
    }
    setDraft("");
    toast({ title: "Memory saved", description: "This entry belongs only to the current project." });
  };

  const saveEdit = () => {
    if (!editing) return;
    const text = editText.trim();
    if (!text) {
      toast({ title: "Memory can't be empty", description: "Enter text or cancel the edit.", variant: "destructive" });
      return;
    }
    if (containsSensitiveMemoryText(text)) {
      toast({ title: "This looks like a secret", description: "Kuro-chan won't store passwords, API keys, or access tokens in project memory.", variant: "destructive" });
      return;
    }
    const list = editing.kind === "fact" ? [...facts] : [...decisions];
    const old = list[editing.index];
    if (!old) {
      setEditing(null);
      return;
    }
    list[editing.index] = { ...old, text, updatedAt: Date.now() };
    db.saveProjectMemory(editing.kind === "fact" ? { facts: list } : { decisions: list }, project.id);
    setEditing(null);
    toast({ title: "Memory updated", description: "The updated entry will be used as project context." });
  };

  const deleteEntry = (entryKind: EntryKind, index: number) => {
    if (entryKind === "fact") db.saveProjectMemory({ facts: facts.filter((_, i) => i !== index) }, project.id);
    else if (entryKind === "decision") db.saveProjectMemory({ decisions: decisions.filter((_, i) => i !== index) }, project.id);
    else db.saveProjectMemory({ openQuestions: questions.filter((_, i) => i !== index) }, project.id);
    if (editing?.kind === entryKind && editing.index === index) setEditing(null);
    toast({ title: "Memory deleted", description: "Kuro-chan won't include this entry in future project context." });
  };

  const saveSummary = () => {
    if (containsSensitiveMemoryText(summaryDraft)) {
      toast({ title: "This looks like a secret", description: "Remove credentials before saving the project summary.", variant: "destructive" });
      return;
    }
    db.saveProjectMemory({ recentSummary: summaryDraft.trim().slice(0, 1800) }, project.id);
    toast({ title: "Project summary saved", description: "The summary is limited to this project." });
  };

  const clearMemory = () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    db.saveProjectMemory({ facts: [], decisions: [], openQuestions: [], recentSummary: "" }, project.id);
    setSummaryDraft("");
    setEditing(null);
    setClearConfirm(false);
    toast({ title: "Project memory cleared", description: "Project files and conversation history were not changed." });
  };

  const renderFactList = (entryKind: EditableKind, entries: ProjectMemoryFact[], Icon: typeof Brain, title: string, description: string) => (
    <section className="rounded-2xl border border-border/80 bg-background/50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/60"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><h3 className="font-semibold">{title} <span className="ml-1 text-xs font-normal text-muted-foreground">({entries.length})</span></h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p></div>
      </div>
      {entries.length ? <div className="mt-4 space-y-2">
        {entries.map((entry, index) => {
          const isEditing = editing?.kind === entryKind && editing.index === index;
          return <article key={entry.source + ":" + index + ":" + entry.text.slice(0, 30)} data-testid={`memory-${entryKind}-${index}`} className="rounded-xl border border-border/70 bg-background/65 p-3.5">
            {isEditing ? <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor={`memory-edit-${entryKind}-${index}`}>Edit memory entry</label>
              <textarea id={`memory-edit-${entryKind}-${index}`} data-testid="memory-edit-input" value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={360} rows={3} className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
              <div className="flex flex-wrap gap-2"><button type="button" data-testid="memory-save-edit" onClick={saveEdit} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"><Save className="h-3.5 w-3.5" /> Save changes</button><button type="button" onClick={() => setEditing(null)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs hover:bg-muted"><X className="h-3.5 w-3.5" /> Cancel</button></div>
            </div> : <>
              <p className="break-words text-sm leading-relaxed">{entry.text}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground"><span className="rounded-full border border-border px-2 py-0.5">{sourceLabel(entry.source)}</span>{entry.confidence && <span>{entry.confidence} confidence</span>}{entry.updatedAt && <span>{timeLabel(entry.updatedAt)}</span>}</div>
              {entry.evidence && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Evidence: {entry.evidence}</p>}
              {entry.baselineSha && <p className="mt-1 break-all text-[10px] text-muted-foreground">Repository baseline: {entry.baselineSha.slice(0, 12)}</p>}
              <div className="mt-3 flex gap-2"><button type="button" aria-label={`Edit ${entryKind} ${index + 1}`} onClick={() => { setEditing({ kind: entryKind, index }); setEditText(entry.text); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Edit</button><button type="button" aria-label={`Delete ${entryKind} ${index + 1}`} onClick={() => deleteEntry(entryKind, index)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div>
            </>}
          </article>;
        })}
      </div> : <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">Nothing saved here yet.</p>}
    </section>
  );

  return <div className="h-full overflow-y-auto p-4 sm:p-6">
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300"><Brain className="h-4 w-4" /> Project continuity</div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Project memory</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review what Kuro-chan carries into future turns for <strong>{project.name || "this project"}</strong>. Memory is isolated per project; editing or clearing it never deletes your code or chat history.</p>
      </header>

      <section className="rounded-2xl border border-border/80 bg-background/50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/60"><Plus className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><h3 className="font-semibold">Add to memory</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Save a confirmed preference, architecture decision, or open question. Secrets and credentials are filtered before storage.</p></div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); addEntry(); }} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
            <label className="space-y-1.5 text-xs font-medium">Entry type
              <select aria-label="Memory entry type" value={kind} onChange={(e) => setKind(e.target.value as EntryKind)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                <option value="fact">Confirmed fact</option><option value="decision">Decision</option><option value="question">Open question</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium" htmlFor="memory-entry">Memory entry
              <textarea id="memory-entry" data-testid="memory-entry-input" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={360} rows={3} placeholder="e.g. Keep this project compatible with Android WebView." className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            </label>
          </div>
          <button type="submit" data-testid="memory-add-entry" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" /> Save memory</button>
        </form>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {renderFactList("fact", facts, ShieldCheck, "Confirmed facts", "Preferences and requirements explicitly confirmed by you.")}
        {renderFactList("decision", decisions, Lightbulb, "Decisions", "Architecture and project choices that should carry forward.")}
      </div>

      <section className="rounded-2xl border border-border/80 bg-background/50 p-4 sm:p-5">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/60"><CircleHelp className="h-5 w-5" /></span><div><h3 className="font-semibold">Open questions <span className="ml-1 text-xs font-normal text-muted-foreground">({questions.length})</span></h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Unresolved details that Kuro-chan should not silently assume.</p></div></div>
        {questions.length ? <div className="mt-4 space-y-2">{questions.map((question, index) => <article key={question + index} data-testid={`memory-question-${index}`} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/65 p-3.5 sm:flex-row sm:items-start"><p className="min-w-0 flex-1 break-words text-sm leading-relaxed">{question}</p><button type="button" aria-label={`Delete question ${index + 1}`} onClick={() => deleteEntry("question", index)} className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-lg border border-border px-2.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button></article>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">No open questions. Kuro-chan won't invent missing requirements.</p>}
      </section>

      <section className="rounded-2xl border border-border/80 bg-background/50 p-4 sm:p-5">
        <label htmlFor="memory-summary" className="font-semibold">Project summary</label>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">A compact hand-off note used when continuing work later. Up to 1,800 characters; remove private credentials before saving.</p>
        <textarea id="memory-summary" value={summaryDraft} onChange={(e) => setSummaryDraft(e.target.value)} maxLength={1800} rows={4} placeholder="What is already working, what remains, and what should happen next?" className="mt-3 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
        <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10.5px] tabular-nums text-muted-foreground">{summaryDraft.length}/1800 characters</span><button type="button" onClick={saveSummary} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted"><Save className="h-3.5 w-3.5" /> Save summary</button></div>
      </section>

      <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 sm:p-5">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" /><div className="min-w-0 flex-1"><h3 className="font-semibold">Clear this project's memory</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">This removes saved facts, decisions, open questions, and the project summary. It does not delete files, messages, repository settings, or checkpoints.</p></div></div>
        {clearConfirm && <p role="alert" className="mt-3 text-xs text-rose-200">Confirm clearing all memory for this project. This cannot be undone from the memory screen.</p>}
        <div className="mt-3 flex gap-2"><button type="button" data-testid="memory-clear" onClick={clearMemory} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 text-xs font-medium text-rose-200 hover:bg-rose-500/10">{clearConfirm ? <Trash2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}{clearConfirm ? "Confirm clear memory" : "Clear memory"}</button>{clearConfirm && <button type="button" onClick={() => setClearConfirm(false)} className="h-9 rounded-lg border border-border px-3 text-xs hover:bg-muted">Cancel</button>}</div>
      </section>
    </div>
  </div>;
}
