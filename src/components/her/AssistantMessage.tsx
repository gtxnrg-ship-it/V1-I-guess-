import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AssistantData, Block } from "@/engine/types";
import {
  ChevronRight, FileText, FilePen, Trash2, FolderTree, Eye, Search, Globe, Brain, ListChecks, Check, X, Loader2, Shuffle, Copy,
  Sparkles, KeyRound, AlertTriangle, Pencil, Play, Cpu, History, FileDiff, Camera, Package, Github, BookOpen, MessageCircle,
  Telescope, Map as MapIcon, Hammer, ScanEye, Database, ExternalLink, Circle, GitPullRequestArrow, Rocket, Code2, Volume2, VolumeX,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { KuroMark } from "./Logo";
import { fmtMs, prettyModel, errMsg } from "@/lib/kuro";
import * as agents from "@/engine/agents";
import { shipUpgrade } from "@/engine/self";
import * as db from "@/engine/db";

const ICONS: Record<string, any> = {
  list_files: FolderTree, read_file: FileText, write_file: FilePen, edit_file: FilePen, delete_file: Trash2, search_code: Search,
  verify_project: Eye, look: Camera, web_search: Globe, read_url: BookOpen, search_npm: Package, search_github: Github, get_docs: BookOpen,
  save_research: Telescope, report_issues: ScanEye,
};
const AGENT_ICON: Record<string, any> = { Talker: MessageCircle, Researcher: Telescope, Planner: MapIcon, Builder: Hammer, Checker: ScanEye };

type ToolB = Extract<Block, { type: "tool" }>;
type Ctx = { pid: string; msgId: string; scope: agents.Scope; live: boolean; onOpenKeys: () => void; onEdit: (t: string) => void };

function Thinking({ b, live }: { b: Extract<Block, { type: "thinking" }>; live: boolean }) {
  const [open, setOpen] = useState(false);
  const active = live && !b.done;
  return (
    <div className="her-rise">
      <button data-testid="button-thinking" onClick={() => setOpen((o) => !o)} className="group flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        <Brain className="h-3.5 w-3.5" />
        <span className={active ? "her-shimmer font-medium" : ""}>{active ? "Thinking…" : `Thought for ${fmtMs(b.ms)}`}</span>
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="her-rise her-scroll ml-1.5 mt-2 max-h-80 overflow-auto whitespace-pre-wrap border-l-2 border-border pl-3.5 text-[13px] leading-relaxed text-muted-foreground">{b.text.trim() || "…"}</div>}
    </div>
  );
}

function StatChip({ stat }: { stat?: string }) {
  if (!stat) return null;
  const m = stat.match(/^\+(\d+) [-−](\d+)$/);
  if (m) return <span className="font-mono text-[11px] tabular-nums"><span className="text-emerald-600 dark:text-emerald-400">+{m[1]}</span> <span className="text-rose-600 dark:text-rose-400">−{m[2]}</span></span>;
  return <span className="text-[11px] tabular-nums text-muted-foreground">{stat}</span>;
}

function ToolRow({ b }: { b: ToolB }) {
  const [open, setOpen] = useState(b.name === "look" || b.name === "report_issues" || b.name === "verify_project");
  const Icon = ICONS[b.name] || Cpu;
  const hasMore = !!(b.detail || b.sources?.length || b.thumbs?.length);
  return (
    <div className="border-b border-border/70 last:border-0">
      <button data-testid={`button-tool-${b.name}`} onClick={() => hasMore && setOpen((o) => !o)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/60">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className={`min-w-0 flex-1 truncate text-[13px] ${b.status === "running" ? "her-shimmer" : ""}`}>{b.title}</span>
        <StatChip stat={b.stat} />
        {b.ms != null && b.status !== "running" && <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground/70">{b.ms < 1000 ? `${b.ms}ms` : fmtMs(b.ms)}</span>}
        {b.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          : b.status === "ok" ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          : <X className="h-3.5 w-3.5 text-rose-600" />}
      </button>
      {open && hasMore && (
        <div className="mx-3 mb-2.5 space-y-2">
          {!!b.thumbs?.length && (
            <div className="flex gap-2 overflow-x-auto her-scroll pb-1">
              {b.thumbs.map((t) => (
                <a key={t.label} href={t.url} target="_blank" rel="noopener noreferrer" className="shrink-0" title={t.label}>
                  <img src={t.url} alt={t.label} className={`rounded-lg border border-border object-cover object-top ${/Phone/.test(t.label) ? "h-40 w-[74px]" : "h-40 w-[256px]"}`} />
                  <span className="mt-1 block text-[11px] text-muted-foreground">{t.label}</span>
                </a>
              ))}
            </div>
          )}
          {!!b.sources?.length && (
            <div className="flex flex-wrap gap-1.5">
              {b.sources.slice(0, 8).map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[240px] items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11.5px] text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{s.title}</span>
                </a>
              ))}
            </div>
          )}
          {b.detail && <pre className="her-scroll max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted px-3 py-2 font-mono text-[11.5px] leading-relaxed text-muted-foreground">{b.detail}</pre>}
        </div>
      )}
    </div>
  );
}

function ToolGroup({ tools, live }: { tools: ToolB[]; live: boolean }) {
  const [open, setOpen] = useState(live || tools.some((tool) => tool.thumbs?.length));
  const running = tools.some((tool) => tool.status === "running");
  const edits = tools.filter((tool) => tool.name === "write_file" || tool.name === "edit_file").length;
  const searches = tools.filter((tool) => ["web_search", "read_url", "search_npm", "search_github", "get_docs"].includes(tool.name)).length;
  return (
    <div className="her-rise py-1" data-testid="tool-activity">
      <button data-testid="button-toolgroup" type="button" onClick={() => setOpen((value) => !value)} className="inline-flex max-w-full items-center gap-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:text-foreground">
        {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        <span>{running ? "I'm working through this" : "What I did"}</span>
        <span className="truncate">· {tools.length} {tools.length === 1 ? "action" : "actions"}{edits ? ` · ${edits} edits` : ""}{searches ? ` · ${searches} lookups` : ""}</span>
        <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="mt-2 ml-1 border-l border-border pl-3">{tools.map((tool) => <ToolRow key={tool.id} b={tool} />)}</div>}
    </div>
  );
}

function AgentLabel({ b, active }: { b: Extract<Block, { type: "agent" }>; active: boolean }) {
  const Icon = AGENT_ICON[b.name] || Sparkles;
  return (
    <div className="her-rise flex items-center gap-2 pt-1 text-[12px]" data-testid={`agent-${b.name.toLowerCase()}`}>
      <span className={`grid h-5 w-5 place-items-center rounded-md ${active ? "bg-[hsl(var(--ember))]/15 text-[hsl(var(--ember))]" : "bg-muted text-muted-foreground"}`}><Icon className="h-3 w-3" /></span>
      <span className="font-medium text-foreground">{b.name}</span>
      <span className={`truncate text-muted-foreground ${active ? "her-shimmer" : ""}`}>{b.label}</span>
    </div>
  );
}

function QuestionsCard({ b, ctx }: { b: Extract<Block, { type: "questions" }>; ctx: Ctx }) {
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const done = b.answered || ctx.live;
  const toggle = (qid: string, opt: string, multi?: boolean) => setSel((s) => {
    const cur = s[qid] || [];
    return { ...s, [qid]: multi ? (cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]) : cur[0] === opt ? [] : [opt] };
  });
  const submit = () => {
    const ans: Record<string, string[]> = {};
    for (const q of b.items) ans[q.id] = [...(sel[q.id] || []), ...(other[q.id]?.trim() ? [other[q.id].trim()] : [])];
    agents.answer(ctx.pid, ctx.msgId, b.id, ans, ctx.scope);
  };
  return (
    <div className="her-rise rounded-xl border border-border bg-card p-4" data-testid="card-questions">
      <div className="space-y-4">
        {b.items.map((q) => (
          <div key={q.id}>
            <div className="text-[14px] font-medium leading-snug">{q.q}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {q.options.map((o) => {
                const on = (sel[q.id] || []).includes(o);
                return (
                  <button key={o} disabled={done} data-testid="button-option" onClick={() => toggle(q.id, o, q.multi)}
                    className={`rounded-full border px-3 py-1.5 text-[13px] transition-all disabled:opacity-60 ${on ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-foreground/30"}`}>{o}</button>
                );
              })}
              {!done && <input value={other[q.id] || ""} onChange={(e) => setOther((s) => ({ ...s, [q.id]: e.target.value }))} placeholder="Or type…" className="h-[34px] min-w-[120px] flex-1 rounded-full border border-dashed border-border bg-transparent px-3 text-[13px] outline-none focus:border-foreground/30" />}
            </div>
          </div>
        ))}
      </div>
      {!done ? (
        <div className="mt-4 flex gap-2">
          <button data-testid="button-send-answers" onClick={submit} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90">Send answers</button>
          <button data-testid="button-you-decide" onClick={() => agents.answer(ctx.pid, ctx.msgId, b.id, {}, ctx.scope)} className="rounded-lg border border-border px-3 py-1.5 text-[13px] hover:bg-muted">You decide</button>
        </div>
      ) : b.answered && <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground"><Check className="h-3 w-3" /> Answered</div>}
    </div>
  );
}

function BriefCard({ b, ctx }: { b: Extract<Block, { type: "brief" }>; ctx: Ctx }) {
  const busy = db.getState().busy;
  const br = b.brief;
  return (
    <div className="her-rise relative overflow-hidden rounded-2xl border border-border bg-card" data-testid="card-brief">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[hsl(var(--ember))] via-[hsl(var(--rose))] to-transparent" />
      <div className="p-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--ember))]" /> {br.size === "quick" ? "Quick change" : "The brief"}
        </div>
        <div className="mt-1.5 text-[16px] font-semibold leading-snug">{br.title}</div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{br.summary}</p>
        {!!br.features.length && (
          <ul className="mt-3 space-y-1.5">
            {br.features.map((f, i) => <li key={i} className="flex gap-2 text-[13.5px] leading-snug"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /><span>{f}</span></li>)}
          </ul>
        )}
        {(br.design || br.backend) && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {br.design && <div className="rounded-lg bg-muted/70 px-3 py-2"><div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Design</div><div className="mt-0.5 text-[13px] leading-snug">{br.design}</div></div>}
            {br.backend && <div className="rounded-lg bg-muted/70 px-3 py-2"><div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Backend</div><div className="mt-0.5 text-[13px] leading-snug">{br.backend}</div></div>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 px-4 py-3">
        {b.status === "pending" ? (
          <>
            <button data-testid="button-build-it" disabled={busy || ctx.live} onClick={() => agents.approve(ctx.pid, ctx.msgId, b.id, ctx.scope)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              <Play className="h-3.5 w-3.5" /> Build it
            </button>
            <button data-testid="button-change-brief" disabled={ctx.live} onClick={() => { agents.changeBrief(ctx.pid, ctx.msgId, b.id); ctx.onEdit(`Change the brief: `); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[13.5px] hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Change something</button>
            <span className="text-[12px] text-muted-foreground">Nothing is built until you say so.</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">{b.status === "approved" ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Approved</> : <><Pencil className="h-3.5 w-3.5" /> Changing</>}</span>
        )}
      </div>
    </div>
  );
}

function PlanCard({ b }: { b: Extract<Block, { type: "plan" }> }) {
  const done = b.steps.filter((s) => s.status === "done").length;
  return (
    <div className="her-rise rounded-xl border border-border bg-card p-4" data-testid="card-plan">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5" /> {b.title}<span className="ml-auto tabular-nums normal-case tracking-normal">{done}/{b.steps.length}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[hsl(var(--ember))] transition-all duration-500" style={{ width: `${(done / Math.max(1, b.steps.length)) * 100}%` }} /></div>
      <ol className="mt-3 space-y-2">
        {b.steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[13.5px] leading-snug">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
              {s.status === "done" ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : s.status === "doing" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(var(--ember))]" /> : s.status === "error" ? <X className="h-4 w-4 text-rose-600" /> : <Circle className="h-3 w-3 text-muted-foreground/50" />}
            </span>
            <span className={s.status === "todo" ? "text-muted-foreground" : ""}>{s.title}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SqlCard({ b }: { b: Extract<Block, { type: "sql" }> }) {
  const { toast } = useToast();
  const url = db.project().env.VITE_SUPABASE_URL?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  return (
    <div className="her-rise overflow-hidden rounded-xl border border-border bg-card" data-testid="card-sql">
      <div className="flex items-center gap-2 px-4 pt-3.5 text-[13.5px] font-medium"><Database className="h-4 w-4 text-emerald-600" /> {b.title}</div>
      <p className="px-4 pt-1 text-[12.5px] text-muted-foreground">Paste this into Supabase's SQL editor and run it once.</p>
      <pre className="her-scroll mx-4 mt-2 max-h-56 overflow-auto rounded-lg bg-muted px-3 py-2 font-mono text-[11.5px] leading-relaxed">{b.sql}</pre>
      <div className="flex gap-2 p-3 px-4">
        <button data-testid="button-copy-sql" onClick={() => { navigator.clipboard?.writeText(b.sql); toast({ title: "SQL copied" }); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground"><Copy className="h-3.5 w-3.5" /> Copy SQL</button>
        <a href={url ? `https://supabase.com/dashboard/project/${url}/sql/new` : "https://supabase.com/dashboard/projects"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] hover:bg-muted"><ExternalLink className="h-3.5 w-3.5" /> Open Supabase</a>
      </div>
    </div>
  );
}

function UpgradeCard({ b, ctx }: { b: Extract<Block, { type: "upgrade" }>; ctx: Ctx }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<false | "pr" | "merge">(false);
  const setB = (patch: Partial<Extract<Block, { type: "upgrade" }>>) => db.updateMessage(ctx.pid, ctx.msgId, (m) => ({ ...m, data: { ...m.data!, blocks: m.data!.blocks.map((x) => (x.type === "upgrade" && x.title === b.title ? { ...x, ...patch } : x)) } }));
  const go = async (merge: boolean) => {
    setBusy(merge ? "merge" : "pr");
    try {
      const pr = await shipUpgrade(b.title, b.summary, b.files, merge);
      setB({ status: "shipped", pr: pr.url, prNumber: pr.number });
      toast({ title: merge ? "Upgrade merged" : "Pull request opened", description: merge ? "GitHub is rebuilding my website and APK now." : "Review it on GitHub, then merge." });
    } catch (e) { setB({ status: "error", error: errMsg(e) }); }
    setBusy(false);
  };
  return (
    <div className="her-rise relative overflow-hidden rounded-xl border border-border bg-card p-4" data-testid="card-upgrade">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[hsl(var(--ember))] via-[hsl(var(--rose))] to-[hsl(var(--iris))]" />
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"><GitPullRequestArrow className="h-3.5 w-3.5" /> Upgrade to myself</div>
      <div className="mt-1.5 text-[15px] font-semibold">{b.title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">{Object.keys(b.files).map((f) => <span key={f} className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px]">{f}{b.files[f] === null ? " (deleted)" : ""}</span>)}</div>
      {b.status === "shipped" ? (
        <a href={b.pr} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-[hsl(var(--ember))] underline underline-offset-2"><ExternalLink className="h-3.5 w-3.5" /> View on GitHub</a>
      ) : (
        <>
          {b.error && <div className="mt-3 text-[12.5px] text-rose-600">{b.error}</div>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button data-testid="button-ship-upgrade" disabled={!!busy} onClick={() => go(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50">{busy === "merge" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />} Ship upgrade</button>
            <button data-testid="button-open-pr" disabled={!!busy} onClick={() => go(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] hover:bg-muted disabled:opacity-50">{busy === "pr" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Code2 className="h-3.5 w-3.5" />} Open a pull request instead</button>
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">Ship merges it into my repo; GitHub then rebuilds my website and Android APK.</p>
        </>
      )}
    </div>
  );
}

function RestoreButton({ id }: { id: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button data-testid={`button-restore-${id}`} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted hover:text-foreground"><History className="h-3.5 w-3.5" /> Restore</button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3.5">
        <div className="text-[13.5px] font-medium">Go back to this version?</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">Your app's files go back to how they were right after this reply. Your current version is saved first, so nothing is lost.</p>
        <div className="mt-3 flex gap-2">
          <button data-testid={`button-restore-confirm-${id}`} onClick={() => { if (agents.restore(id)) toast({ title: "Restored", description: "The version before is saved too, so you can undo this." }); setOpen(false); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground"><History className="h-3 w-3" /> Restore</button>
          <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] hover:bg-muted">Cancel</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/```[\s\S]*?```/g, "Code block omitted.").replace(/[*_#`[\]()]/g, "");
    if (!cleanText.trim()) return;
    const ut = new SpeechSynthesisUtterance(cleanText);
    ut.rate = 1.05;
    ut.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Victoria") || v.name.includes("Zira") || v.name.includes("Google US English")));
    if (femaleVoice) ut.voice = femaleVoice;
    ut.onend = () => setSpeaking(false);
    ut.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(ut);
  };
  return (
    <button data-testid="button-speak" aria-label={speaking ? "Stop speaking" : "Speak reply"} title={speaking ? "Stop speaking" : "Read out loud"} onClick={speak} className="rounded-md p-1 hover:bg-muted hover:text-foreground">
      {speaking ? <VolumeX className="h-3.5 w-3.5 text-[hsl(var(--ember))]" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}

function ModelFooter({ data, text }: { data: AssistantData; text: string }) {
  const { toast } = useToast();
  const models = data.models || [];
  const uniq = models.filter((m, i) => models.findIndex((x) => x.model === m.model && x.keyId === m.keyId) === i);
  const main = uniq[uniq.length - 1];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground opacity-80 transition-opacity hover:opacity-100">
      {main && (
        <Popover>
          <PopoverTrigger asChild>
            <button data-testid="button-model-chip" className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-muted hover:text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--ember))]" />{prettyModel(main.model)}{uniq.length > 1 ? ` +${uniq.length - 1}` : ""}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Models used</div>
            <div className="mt-2 space-y-2">
              {models.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-[13px]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ember))]" />
                  <div className="min-w-0"><div className="truncate font-medium">{prettyModel(m.model)}</div><div className="text-[12px] text-muted-foreground">{m.providerName} · {m.keyLabel} · {m.role}</div></div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      {data.done && <span className="px-1.5">Worked for {fmtMs(data.ms)}</span>}
      {data.done && !!data.filesChanged && <span className="hidden items-center gap-1 px-1 sm:inline-flex"><FileDiff className="h-3.5 w-3.5" />{data.filesChanged} {data.filesChanged === 1 ? "file" : "files"}</span>}
      {data.done && data.snapshotId && <RestoreButton id={data.snapshotId} />}
      {data.done && text && (
        <>
          <SpeakButton text={text} />
          <button data-testid="button-copy" aria-label="Copy" className="rounded-md p-1 hover:bg-muted hover:text-foreground" onClick={() => { navigator.clipboard?.writeText(text); toast({ title: "Copied" }); }}>
            <Copy className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

export function AssistantMessage({ data, live, pid, msgId, scope, onOpenKeys, onEdit }: {
  data: AssistantData; live: boolean; pid: string; msgId: string; scope: agents.Scope; onOpenKeys: () => void; onEdit: (t: string) => void;
}) {
  const [, force] = useState(0);
  useEffect(() => { if (!live) return; const t = setInterval(() => force((n) => n + 1), 500); return () => clearInterval(t); }, [live]);
  const ctx: Ctx = { pid, msgId, scope, live, onOpenKeys, onEdit };
  const groups: (Block | { type: "tools"; items: ToolB[] })[] = [];
  for (const b of data.blocks || []) {
    const last = groups[groups.length - 1] as any;
    if (b.type === "tool") { if (last?.type === "tools") last.items.push(b); else groups.push({ type: "tools", items: [b] }); }
    else if (b.type === "text" && !b.text.trim()) continue;
    else if (b.type === "thinking" && b.done && !b.text.trim()) continue;
    else groups.push(b);
  }
  const lastAgentIdx = groups.map((g) => g.type).lastIndexOf("agent");
  const lastTextIdx = groups.map((g) => g.type).lastIndexOf("text");
  const fullText = (data.blocks || []).filter((b) => b.type === "text").map((b: any) => b.text).join("\n\n");
  const empty = !groups.length && live;
  return (
    <div className="group/msg">
      <div className="mb-2 flex items-center gap-2">
        <KuroMark size={20} className={live ? "her-orb-glow animate-pulse" : ""} />
        <span className="text-[13px] font-medium">Kuro-chan</span>
      </div>
      <div className="space-y-3 pl-0.5">
        {empty && <div className="her-shimmer text-[13px] font-medium">Waking up…</div>}
        {groups.map((g, i) => {
          if (g.type === "agent") return <AgentLabel key={i} b={g} active={live && i === lastAgentIdx} />;
          if (g.type === "thinking") return <Thinking key={i} b={g} live={live} />;
          if (g.type === "tools") return <ToolGroup key={i} tools={(g as any).items} live={live} />;
          if (g.type === "route") return <div key={i} className="her-rise flex items-start gap-2 text-[12.5px] text-amber-700 dark:text-amber-400"><Shuffle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{g.text}</div>;
          if (g.type === "questions") return <QuestionsCard key={i} b={g} ctx={ctx} />;
          if (g.type === "brief") return <BriefCard key={i} b={g} ctx={ctx} />;
          if (g.type === "plan") return <PlanCard key={i} b={g} />;
          if (g.type === "sql") return <SqlCard key={i} b={g} />;
          if (g.type === "upgrade") return <UpgradeCard key={i} b={g} ctx={ctx} />;
          if (g.type === "text") return (
            <div key={i} className={`prose-her her-rise ${i !== lastTextIdx && groups.length > 1 ? "text-foreground/80" : ""}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (p) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}>{g.text}</ReactMarkdown>
            </div>
          );
          return null;
        })}
        {data.error === "NO_KEYS" && (
          <div className="her-rise rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-[14px] font-medium"><KeyRound className="h-4 w-4 text-[hsl(var(--ember))]" /> I need an AI key to think</div>
            <p className="mt-1 text-[13.5px] text-muted-foreground">Paste any AI key (a free Gemini key works great) and I'll detect it and find its models. Or switch the free starter back on in Keys.</p>
            <button data-testid="button-open-keys" onClick={onOpenKeys} className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground">Add a key</button>
          </div>
        )}
        {data.error && data.error !== "NO_KEYS" && (
          <div className="her-rise flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{data.error.startsWith("HARD_CAP_") ? data.error.replace(/^HARD_CAP_[A-Z]+:\s*/, "") : data.error}</span>
          </div>
        )}
      </div>
      {!live && <ModelFooter data={data} text={fullText} />}
      {live && data.models?.length > 0 && <div className="mt-2 text-[12px] text-muted-foreground">{prettyModel(data.models[data.models.length - 1].model)} · {fmtMs(data.ms)}</div>}
    </div>
  );
}
