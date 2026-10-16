import { FolderKanban, MessageCircle, Clock3, GitBranch, FileCode2, ArrowUpRight, Plus, Activity, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import * as db from "@/engine/db";
import type { Message, Project } from "@/engine/types";

type WorkspaceView = "projects" | "activity";

function timeAgo(value: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString();
}

function projectMessages(project: Project, messages: Record<string, Message[]>) {
  return messages[project.id] || [];
}

export function ProjectsActivity({ view, onOpenChat }: { view: WorkspaceView; onOpenChat: () => void }) {
  const st = db.useKuro();
  const current = db.project();
  const projects = [...st.projects].sort((a, b) => b.updatedAt - a.updatedAt);

  if (view === "projects") {
    const totalFiles = projects.reduce((n, p) => n + Object.keys(p.files).length, 0);
    const totalMessages = projects.reduce((n, p) => n + projectMessages(p, st.messages).length, 0);
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300"><FolderKanban className="h-4 w-4" /> Workspace</div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your projects</h2>
              <p className="mt-1 text-sm text-muted-foreground">Every project keeps its own files, chat, and working context.</p>
            </div>
            <button data-testid="button-projects-new" onClick={() => {
              const names = new Set(st.projects.map((p) => p.name));
              let name = "New project"; let i = 2;
              while (names.has(name)) name = `New project ${i++}`;
              db.createProject(name, {});
              onOpenChat();
            }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              <Plus className="h-4 w-4" /> New project
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-border/80 bg-background/50 p-3 sm:p-4"><div className="text-xl font-semibold tabular-nums">{projects.length}</div><div className="mt-1 text-xs text-muted-foreground">Projects</div></div>
            <div className="rounded-xl border border-border/80 bg-background/50 p-3 sm:p-4"><div className="text-xl font-semibold tabular-nums">{totalFiles}</div><div className="mt-1 text-xs text-muted-foreground">Files</div></div>
            <div className="rounded-xl border border-border/80 bg-background/50 p-3 sm:p-4"><div className="text-xl font-semibold tabular-nums">{totalMessages}</div><div className="mt-1 text-xs text-muted-foreground">Messages</div></div>
          </div>

          {projects.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const active = project.id === current.id;
              const messages = projectMessages(project, st.messages);
              return <button key={project.id} data-testid={`project-card-${project.id}`} onClick={() => { if (!active) db.switchProject(project.id); onOpenChat(); }}
                className={`group flex min-h-[174px] flex-col rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/30 ${active ? "border-primary/40 bg-primary/[0.045]" : "border-border/80 bg-background/55"}`}>
                <div className="flex w-full items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300"><FolderKanban className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{project.name}</span><span className="mt-1 block text-xs text-muted-foreground">{active ? "Currently open" : "Project workspace"}</span></span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                {project.repo ? <span className="mt-4 flex items-center gap-1.5 truncate text-xs text-muted-foreground"><GitBranch className="h-3.5 w-3.5 shrink-0" />{project.repo}</span> : <span className="mt-4 text-xs text-muted-foreground">No repository connected yet</span>}
                <span className="mt-auto flex items-center gap-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><FileCode2 className="h-3.5 w-3.5" />{Object.keys(project.files).length} files</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{messages.length} messages</span>
                  <span className="ml-auto">{timeAgo(project.updatedAt)}</span>
                </span>
              </button>;
            })}
          </div> : <div className="rounded-2xl border border-dashed border-border p-8 text-center"><FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="mt-3 font-medium">Your next idea starts here</h3><p className="mt-1 text-sm text-muted-foreground">Create a project to give its chat and files their own space.</p></div>}
        </div>
      </div>
    );
  }

  const events = projects.flatMap((project) => projectMessages(project, st.messages).map((message) => ({ project, message })))
    .sort((a, b) => b.message.createdAt - a.message.createdAt).slice(0, 80);
  const toolCounts = events.reduce((counts, event) => {
    for (const block of event.message.data?.blocks || []) {
      if (block.type === "tool") {
        if (block.status === "ok") counts.ok++;
        else if (block.status === "error") counts.error++;
        else counts.running++;
      }
    }
    return counts;
  }, { ok: 0, error: 0, running: 0 });

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300"><Activity className="h-4 w-4" /> Recent work</div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">A timeline of conversations across your projects, with tool outcomes when available.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-border/80 bg-background/50 p-3 sm:p-4"><div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="h-4 w-4" /><span className="text-xl font-semibold tabular-nums">{toolCounts.ok}</span></div><div className="mt-1 text-xs text-muted-foreground">Completed tools</div></div>
          <div className="rounded-xl border border-border/80 bg-background/50 p-3 sm:p-4"><div className="flex items-center gap-2 text-rose-400"><AlertCircle className="h-4 w-4" /><span className="text-xl font-semibold tabular-nums">{toolCounts.error}</span></div><div className="mt-1 text-xs text-muted-foreground">Tool errors</div></div>
          <div className="rounded-xl border border-border/80 bg-background/50 p-3 sm:p-4"><div className="flex items-center gap-2 text-cyan-300"><Loader2 className="h-4 w-4" /><span className="text-xl font-semibold tabular-nums">{toolCounts.running + (st.busy ? 1 : 0)}</span></div><div className="mt-1 text-xs text-muted-foreground">In progress</div></div>
        </div>
        {events.length ? <div className="relative space-y-2 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-border/80">
          {events.map(({ project, message }) => {
            const userMessage = message.role === "user";
            const text = userMessage ? message.content : (message.data?.blocks || []).filter((b) => b.type === "text").map((b) => b.text).join(" ").trim() || message.data?.error || "Kuro-chan worked on this response.";
            const preview = text.length > 180 ? text.slice(0, 177) + "…" : text;
            return <button key={message.id} onClick={() => { db.switchProject(project.id); onOpenChat(); }}
              className="group relative flex w-full gap-3 rounded-xl border border-border/70 bg-background/45 p-3 text-left transition-colors hover:border-primary/35 hover:bg-muted/25 sm:p-4">
              <span className={`relative z-[1] mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${userMessage ? "border-sky-400/25 bg-sky-400/10 text-sky-300" : "border-violet-400/25 bg-violet-400/10 text-violet-300"}`}>{userMessage ? <MessageCircle className="h-4 w-4" /> : <Activity className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-xs font-semibold">{project.name}</span><span className="text-[11px] text-muted-foreground">{userMessage ? "You" : "Kuro-chan"}</span><span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" />{timeAgo(message.createdAt)}</span></span><span className="mt-1.5 block whitespace-normal break-words text-[13px] leading-relaxed text-foreground/85">{preview}</span></span>
              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>;
          })}
        </div> : <div className="rounded-2xl border border-dashed border-border p-8 text-center"><Activity className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="mt-3 font-medium">Nothing happening just yet</h3><p className="mt-1 text-sm text-muted-foreground">Your chats and tool activity will show up here as you work.</p><button onClick={onOpenChat} className="mt-4 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Back to chat</button></div>}
      </div>
    </div>
  );
}
