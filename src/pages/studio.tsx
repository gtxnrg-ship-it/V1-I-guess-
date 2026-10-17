import { useCallback, useEffect, useState } from "react";
import { Moon, Sun, Github, Code2, KeyRound, MessageCircle, Loader2, Rocket, ExternalLink, ChevronDown, Check, Plus, Pencil, Trash2, Download, Globe, FolderKanban, Activity, Menu, X, MoreHorizontal, PanelLeftClose, Archive, Palette } from "lucide-react";
import { downloadZip } from "@/lib/zip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { HerOrb } from "@/components/her/Logo";
import { GalaxyBackdrop } from "@/components/her/GalaxyBackdrop";
import { useTheme } from "@/components/her/theme";
import { ChatPanel } from "@/components/her/ChatPanel";
import { CodeBrowser } from "@/components/her/CodePane";
import { SettingsHub } from "@/components/her/SettingsHub";
import { ProjectsActivity } from "@/components/her/ProjectsActivity";
import { CheckpointsPane } from "@/components/her/CheckpointsPane";
import { VisualIntentStudio } from "@/components/her/VisualIntentStudio";
import * as db from "@/engine/db";
import { GH } from "@/engine/github";
import { inspectGitHubRepository } from "@/engine/live-repository-intelligence";
import { shipFiles, syncDependencies } from "@/engine/ship";
import { starterFiles, type StarterVariant } from "@/engine/template";
import { errMsg } from "@/lib/kuro";

type Tab = "projects" | "activity" | "code" | "checkpoints" | "design" | "keys";
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "code", label: "Code", icon: Code2 },
  { id: "checkpoints", label: "Checkpoints", icon: Archive },
  { id: "design", label: "Visual design", icon: Palette },
  { id: "keys", label: "Settings", icon: KeyRound },
];

export default function Studio() {
  const { theme, toggle } = useTheme();
  const st = db.useKuro();
  const p = db.project();
  const [activeView, setActiveView] = useState<"chat" | Tab>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches);
  const [draft, setDraft] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const running = st.busy;
  const openTab = useCallback((t: Tab) => { setActiveView(t); setSidebarOpen(false); }, []);

  const chat = <ChatPanel scope="app" onOpenKeys={() => openTab("keys")} draft={draft} setDraft={setDraft} />;
  const pane = (t: Tab) => t === "projects" || t === "activity"
    ? <ProjectsActivity view={t} onOpenChat={() => { setActiveView("chat"); setSidebarOpen(false); }} />
    : t === "code" ? <CodeBrowser files={p.files} /> : t === "checkpoints" ? <CheckpointsPane /> : t === "design" ? <VisualIntentStudio /> : <SettingsHub />;

  const aiKeys = st.keys.filter((k) => k.kind === "ai").length;
  const navItems = [
    { id: "chat" as const, label: "New chat", icon: MessageCircle },
    ...TABS,
  ];
  const selectView = (view: "chat" | Tab) => {
    setActiveView(view);
    setSidebarOpen(false);
  };
  const sidebar = (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="studio-brand-mark"><HerOrb size={30} className="her-orb-glow" /></span>
          <span className="font-display text-[16px] font-semibold">Kuro-chan</span>
        </div>
        <button aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"><X className="h-4 w-4" /></button>
        <button aria-label="Collapse sidebar" onClick={() => setSidebarOpen(false)} className="hidden h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted md:grid"><PanelLeftClose className="h-4 w-4" /></button>
      </div>
      <button data-testid="button-new-chat" onClick={() => { db.createProject("New chat", {}); selectView("chat"); setDraft(""); }} className="flex w-full items-center gap-2 rounded-xl border border-border/80 px-3 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-muted">
        <Plus className="h-4 w-4" /> New chat
      </button>
      <div className="space-y-1">
        {navItems.filter((item) => item.id !== "chat").map((item) => {
          const Icon = item.icon;
          return <button key={item.id} data-testid={`sidebar-${item.id}`} onClick={() => selectView(item.id)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${activeView === item.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}><Icon className="h-4 w-4" />{item.label}</button>;
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pt-2">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your projects</span>
          <ProjectMenu busy={running} onSwitched={() => selectView("chat")} />
        </div>
        <div className="space-y-1">
          {st.projects.map((project) => (
            <button key={project.id} data-testid={`sidebar-project-${project.id}`} onClick={() => { db.switchProject(project.id); selectView("chat"); }} className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${p.id === project.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}>
              <FolderKanban className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
              {project.repo && <Github className="h-3.5 w-3.5 shrink-0 opacity-60" />}
            </button>
          ))}
          {!st.projects.length && <p className="px-2 py-3 text-xs text-muted-foreground">Your projects will appear here.</p>}
        </div>
        <p className="px-2 pt-3 text-[10.5px] leading-relaxed text-muted-foreground">Projects and repositories already opened in Kuro-chan. Connect GitHub to import more.</p>
      </div>
      <div className="border-t border-border/70 pt-2">
        <button data-testid="sidebar-settings" onClick={() => selectView("keys")} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ${activeView === "keys" ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><KeyRound className="h-4 w-4" /> Settings <span className="ml-auto text-[10px] text-muted-foreground">{aiKeys ? "Connected" : "Setup"}</span></button>
      </div>
    </div>
  );

  return (
    <div className="studio-shell relative isolate flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <GalaxyBackdrop />
      {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/50 md:hidden" />}
      <aside className={`studio-sidebar fixed inset-y-0 left-0 z-40 w-[min(84vw,292px)] border-r border-border/70 bg-background/95 backdrop-blur-xl transition-transform duration-200 ${sidebarOpen ? "translate-x-0 md:relative md:z-10 md:flex md:w-[260px] md:shrink-0" : "-translate-x-full md:hidden"}`}>
        {sidebar}
      </aside>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="studio-header relative z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-3 pt-[env(safe-area-inset-top)] md:px-5">
          <button data-testid="button-open-sidebar" aria-label="Open sidebar" onClick={() => setSidebarOpen((open) => !open)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{activeView === "chat" ? p.name || "New chat" : TABS.find((t) => t.id === activeView)?.label}</div>
            <div className="hidden truncate text-[10px] text-muted-foreground sm:block">{activeView === "chat" ? p.repo || "Your AI coding companion" : "Kuro-chan workspace"}</div>
          </div>
          {running && <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex"><Loader2 className="h-3 w-3 animate-spin" /> Working</span>}
          <button data-testid="button-theme" aria-label="Toggle theme" onClick={toggle} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button data-testid="button-more-menu" aria-label="More options" className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Kuro-chan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => selectView("projects")}><FolderKanban className="mr-2 h-4 w-4" /> Projects</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => selectView("activity")}><Activity className="mr-2 h-4 w-4" /> Activity</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => selectView("code")}><Code2 className="mr-2 h-4 w-4" /> Code</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => selectView("keys")}><KeyRound className="mr-2 h-4 w-4" /> Settings & tools</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => downloadZip(p.files, (p.name || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-"))}><Download className="mr-2 h-4 w-4" /> Download project ZIP</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPublishOpen(true)}><Github className="mr-2 h-4 w-4" /> Publish to GitHub</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="relative min-h-0 flex-1">
          {activeView === "chat" ? chat : <div className="h-full min-h-0 overflow-y-auto">{pane(activeView)}</div>}
        </main>
      </div>
      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} onOpenKeys={() => { setPublishOpen(false); openTab("keys"); }} />
    </div>
  );

}

function ProjectMenu({ busy, onSwitched }: { busy: boolean; onSwitched: () => void }) {
  const st = db.useKuro();
  const [dialog, setDialog] = useState<null | "new" | "rename" | "import">(null);
  const [importing, setImporting] = useState(false);
  const [preset, setPreset] = useState<StarterVariant>("starter");
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthCode, setOauthCode] = useState("");
  const [oauthUrl, setOauthUrl] = useState("https://github.com/login/device");
  const [oauthMessage, setOauthMessage] = useState("");
  const current = db.project();

  const connectGitHub = async () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID?.trim();
    if (!clientId) {
      setOauthMessage("GitHub sign-in needs the public OAuth App client ID. Register a GitHub OAuth App with Device Flow enabled, then add VITE_GITHUB_CLIENT_ID to the app build environment. No client secret belongs in this app.");
      return;
    }
    setOauthBusy(true);
    setOauthMessage("Starting secure GitHub authorization…");
    setOauthCode("");
    try {
      const deviceResponse = await fetch("https://github.com/login/device/code", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, scope: "repo workflow" }),
      });
      if (!deviceResponse.ok) throw new Error(`GitHub authorization setup failed (${deviceResponse.status}). Check the OAuth App's Device Flow setting and try again.`);
      const device = await deviceResponse.json();
      if (!device.device_code || !device.user_code || !device.verification_uri) {
        throw new Error(device.error_description || device.error || "GitHub did not return a device authorization code.");
      }
      setOauthCode(device.user_code);
      setOauthUrl(device.verification_uri);
      setOauthMessage("Open GitHub, enter the code shown below, and approve access. Keep this window open while Kuro-chan waits.");
      let interval = Math.max(5, Number(device.interval) || 5);
      const expiresAt = Date.now() + Math.max(60, Number(device.expires_in) || 900) * 1000;
      while (Date.now() < expiresAt) {
        await new Promise((resolve) => window.setTimeout(resolve, interval * 1000));
        const poll = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            device_code: device.device_code,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          }),
        });
        const result = await poll.json();
        if (result.access_token) {
          const token = String(result.access_token);
          const login = await new GH(token).me();
          db.getState().keys.filter((key) => key.provider === "github").forEach((key) => db.removeKey(key.id));
          db.addKey({
            id: db.uid(), label: `GitHub (@${login})`, kind: "github", provider: "github",
            secret: token, hint: `••••${token.slice(-4)}`, models: [], status: "active",
            requests: 0, errors: 0, login, createdAt: Date.now(),
          });
          setOauthMessage(`Connected successfully as @${login}. Choose a repository below to start a dedicated chat.`);
          setOauthCode("");
          toast({ title: "GitHub connected", description: `Signed in as @${login}. You can now import a repository.` });
          return;
        }
        if (result.error === "authorization_pending") continue;
        if (result.error === "slow_down") { interval += 5; continue; }
        if (result.error === "expired_token") throw new Error("That authorization code expired. Start again to get a fresh code.");
        if (result.error === "access_denied") throw new Error("GitHub authorization was cancelled.");
        throw new Error(result.error_description || result.error || "GitHub authorization failed.");
      }
      throw new Error("That authorization code expired. Start again to get a fresh code.");
    } catch (error) {
      const message = errMsg(error);
      setOauthMessage(message.includes("Failed to fetch") || message.includes("NetworkError")
        ? "Kuro-chan couldn't reach GitHub's device authorization endpoint from this app. The OAuth App must be configured, and this platform may need a small secure callback service; no token was saved."
        : message);
    } finally {
      setOauthBusy(false);
    }
  };
  const starterChoices: { id: StarterVariant; label: string; blurb: string }[] = [
    { id: "starter", label: "Starter", blurb: "A blank canvas" },
    { id: "paytm", label: "Paytm-style wallet", blurb: "Fast wallet + payments" },
    { id: "saas", label: "SaaS dashboard", blurb: "Normal business app" },
    { id: "ops", label: "Ops command center", blurb: "Very dense operations UI" },
  ];
  const doImport = async () => {
    const spec = name.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
    const tok = db.keyOf("github");
    if (!tok) { toast({ title: "Add a GitHub token in Keys first", variant: "destructive" }); return; }
    setImporting(true);
    try {
      const gh = new GH(tok.secret);
      const info = await gh.ensureRepo(spec);
      const inspection = await inspectGitHubRepository(gh, `${info.owner}/${info.name}`);
      if (inspection.diagnosis.condition === "unknown" || (!inspection.treeComplete && inspection.diagnosis.condition !== "empty")) {
        throw new Error(`I couldn't safely classify ${info.owner}/${info.name}. ${inspection.diagnosis.summary} I stopped before importing or initializing it so I don't mistake an incomplete inspection for an empty repository.`);
      }
      const baseSha = inspection.baselineSha || await gh.headSha(info.owner, info.name, info.defaultBranch);
      const files = inspection.diagnosis.condition === "empty" ? {} : await gh.readTree(info.owner, info.name, info.defaultBranch, (p) => !/^(node_modules|dist|build|android|ios|\.git)\//.test(p) && !/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(p));
      if (inspection.diagnosis.condition !== "empty" && !Object.keys(files).length) {
        throw new Error(`GitHub reported an existing project but Kuro-chan could not read its files. No starter files were created. ${inspection.diagnosis.summary}`);
      }
      const empty = inspection.diagnosis.condition === "empty";
      // Importing an empty repository should not silently initialize it; let the user decide what to build in chat.
      const created = db.createProject(info.name, files);
      db.updateProject(created.id, {
        repo: `${info.owner}/${info.name}`,
        repoBaseSha: baseSha || undefined,
        privateRepo: info.private,
        shipped: Boolean(files[".github/workflows/deploy-website.yml"] && files[".github/workflows/build-android.yml"]),
      });
      db.saveProjectMemory({
        facts: [
          ...(created.memory?.facts || []),
          { text: `Repository diagnosis: ${inspection.diagnosis.title}. ${inspection.diagnosis.summary}`, source: "repository-observed", confidence: inspection.diagnosis.confidence, updatedAt: Date.now() },
          { text: `Inspected default branch ${inspection.defaultBranch}; ${inspection.fileCount} paths reported; tree complete: ${inspection.treeComplete}.`, source: "repository-observed", confidence: inspection.treeComplete ? "high" : "low", updatedAt: Date.now() },
        ],
        recentSummary: inspection.diagnosis.summary,
        observedAt: Date.now(),
      }, created.id);
      toast({
        title: empty ? "Empty repo confirmed" : `Imported ${Object.keys(files).length} files`,
        description: `${inspection.diagnosis.title}: ${inspection.diagnosis.summary} ${empty ? "I left it untouched. Tell me what you'd like to build before I create starter files." : "The diagnosis is saved to this project's memory for our next conversation."}`,
      });
      setDialog(null); onSwitched();
    } catch (e) { toast({ title: "Couldn't import", description: errMsg(e), variant: "destructive" }); }
    setImporting(false);
  };
  const save = () => {
    if (dialog === "import") { doImport(); return; }
    const n = name.trim(); if (!n) return;
    if (dialog === "new") db.createProject(n, starterFiles(n, preset));
    else db.updateProject(current.id, { name: n });
    setDialog(null); onSwitched();
  };
  return (
    <>
      <DropdownMenu onOpenChange={() => setConfirmDelete(false)}>
        <DropdownMenuTrigger asChild>
          <button data-testid="button-project-menu" className="inline-flex min-w-0 max-w-[150px] items-center gap-1 rounded-md px-1.5 py-1 text-[13.5px] font-medium hover:bg-muted sm:max-w-[220px]">
            <span className="truncate">{!current?.name || current.name === "My App" ? "Kuro-chan" : current.name}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Chats &amp; projects</DropdownMenuLabel>
          {st.projects.map((p) => (
            <DropdownMenuItem key={p.id} data-testid={`menu-project-${p.id}`} disabled={busy && p.id !== current.id}
              onSelect={() => { if (p.id !== current.id) { db.switchProject(p.id); onSwitched(); } }} className="gap-2">
              <span className="grid h-4 w-4 place-items-center">{p.id === current.id && <Check className="h-3.5 w-3.5" />}</span>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{Object.keys(p.files).length} files</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="menu-project-new" disabled={busy} onSelect={() => { setName(""); setPreset("starter"); setDialog("new"); }} className="gap-2"><Plus className="h-3.5 w-3.5" /> New project</DropdownMenuItem>
          <DropdownMenuItem data-testid="menu-project-import" disabled={busy} onSelect={() => { setName(""); setDialog("import"); }} className="gap-2"><Github className="h-3.5 w-3.5" /> New chat from GitHub</DropdownMenuItem>
          <DropdownMenuItem data-testid="menu-project-rename" onSelect={() => { setName(current?.name || ""); setDialog("rename"); }} className="gap-2"><Pencil className="h-3.5 w-3.5" /> Rename</DropdownMenuItem>
          {st.projects.length > 1 && (
            <DropdownMenuItem data-testid="menu-project-delete" disabled={busy}
              onSelect={(e) => { if (!confirmDelete) { e.preventDefault(); setConfirmDelete(true); return; } db.deleteProject(current.id); onSwitched(); }}
              className="gap-2 text-rose-600 focus:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> {confirmDelete ? "Tap again to delete for good" : "Delete this app"}</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={!!dialog} onOpenChange={(o) => { if (!o) { setDialog(null); setPreset("starter"); } }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-[17px]">{dialog === "new" ? "New project" : dialog === "import" ? "New chat from GitHub" : "Rename project"}</DialogTitle>
            <DialogDescription className="text-[13.5px]">{dialog === "new" ? "A fresh project with its own chat, files and memory." : dialog === "import" ? "Paste a repo link or owner/name. Empty repos work too; this creates a separate chat and memory for it." : "This only changes the name you see."}</DialogDescription>
          </DialogHeader>
          {dialog === "import" && !db.keyOf("github") && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Github className="h-4 w-4" /> Connect GitHub first</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Sign in once in this panel. After approval, Kuro-chan can list and import repositories you authorize—no need to visit Settings.</p>
              {oauthCode && <div className="my-3 rounded-lg border border-border bg-background p-3 text-center"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your one-time code</div><div className="my-1 font-mono text-2xl font-bold tracking-[0.18em]">{oauthCode}</div><a className="text-xs text-primary underline" href={oauthUrl} target="_blank" rel="noreferrer">Open GitHub to authorize <ExternalLink className="inline h-3 w-3" /></a></div>}
              <button type="button" disabled={oauthBusy} onClick={connectGitHub} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60">
                {oauthBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                {oauthBusy ? "Waiting for GitHub approval…" : oauthCode ? "Restart GitHub sign-in" : "Connect GitHub"}
              </button>
              {oauthMessage && <p role="status" className="mt-2 text-xs leading-relaxed text-muted-foreground">{oauthMessage}</p>}
            </div>
          )}
          <input data-testid="input-project-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder={dialog === "import" ? "github.com/you/your-repo" : "e.g. Habit Tracker"}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[14px] outline-none focus:border-foreground/30" />
          {dialog === "new" && (
            <div className="mt-3 grid gap-2">
              {starterChoices.map((choice) => (
                <button key={choice.id} type="button" onClick={() => setPreset(choice.id)} className={`rounded-xl border px-3 py-2 text-left ${preset === choice.id ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                  <div className="text-[13px] font-medium">{choice.label}</div>
                  <div className="text-[11.5px] text-muted-foreground">{choice.blurb}</div>
                </button>
              ))}
            </div>
          )}
          <button data-testid="button-project-save" disabled={!name.trim() || importing} onClick={save} className="w-full rounded-lg bg-primary py-2.5 text-[14px] font-medium text-primary-foreground disabled:opacity-50">
            {importing ? "Importing…" : dialog === "new" ? "Create project" : dialog === "import" ? "Create linked chat" : "Save"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PublishDialog({ open, onOpenChange, onOpenKeys }: { open: boolean; onOpenChange: (o: boolean) => void; onOpenKeys: () => void }) {
  const { toast } = useToast();
  const st = db.useKuro();
  const p = db.project();
  const [repo, setRepo] = useState("");
  const [ship, setShip] = useState(true);
  const [priv, setPriv] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [links, setLinks] = useState<{ label: string; url: string }[] | null>(null);
  const [publishedPrivate, setPublishedPrivate] = useState(false);
  const [confirmedPublish, setConfirmedPublish] = useState(false);
  const token = st.keys.find((k) => k.provider === "github");
  const previewPaths = Object.keys(p.files).filter((path) => path !== ".env" && path !== ".kuro/research.md").sort();
  const slug = (p?.name || "my-app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  useEffect(() => { if (open) { setRepo(p?.repo || slug); setLinks(null); setPublishedPrivate(false); setSessionOnly(false); setConfirmedPublish(false); } }, [open]); // eslint-disable-line

  const go = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const gh = new GH(token.secret);
      setStep("Checking the repository");
      const info = await gh.ensureRepo(repo.trim(), { private: priv, description: `${p.name}, built with Kuro-chan` });
      const full = `${info.owner}/${info.name}`;
      const remoteHead = await gh.headSha(info.owner, info.name, info.defaultBranch);
      if (p.repo && p.repo.toLowerCase() === full.toLowerCase() && p.repoBaseSha && remoteHead && remoteHead !== p.repoBaseSha) {
        throw new Error(`This repository changed since you imported it (remote commit ${remoteHead.slice(0, 7)}; saved baseline ${p.repoBaseSha.slice(0, 7)}). I stopped before pushing so newer work is not overwritten. Re-import the latest repository into a separate project, then bring your changes across before publishing.`);
      }
      const files: Record<string, string> = { ...p.files };
      delete files[".kuro/research.md"];
      setStep("Listing packages");
      files["package.json"] = (await syncDependencies(files)).pkg;
      // Never publish local environment values: they may contain private API keys.
      // Keep only variable names in a safe template so the repository documents setup.
      const env = Object.keys(p.env || {});
      if (env.length) files[".env.example"] = env.map((k) => String(k) + "=").join("\n") + "\n";
      delete files[".env"];
      const out: { label: string; url: string }[] = [{ label: "Repository", url: info.htmlUrl }];
      if (ship) {
        const s = shipFiles(p.name, full);
        Object.assign(files, s.files);
        const base = files["README.md"] || `# ${p.name}\n`;
        files["README.md"] = base.includes("## Try it") ? base : base.trimEnd() + "\n" + s.readme;
        if (!info.private) out.push({ label: "Website (live in a few minutes)", url: s.site }, { label: "Android APK (ready in about 10 minutes)", url: s.apk });
      }
      setStep("Pushing files");
      await gh.commitFiles(info.owner, info.name, info.defaultBranch, Object.entries(files).map(([path, content]) => ({ path, content })), `Update from Kuro-chan: ${p.name}`);
      const publishedHead = await gh.headSha(info.owner, info.name, info.defaultBranch);
      if (ship && !info.private) { setStep("Turning on GitHub Pages"); try { await gh.enablePages(info.owner, info.name); } catch (e) { toast({ title: "Pages needs a manual switch", description: errMsg(e) }); } }
      if (!sessionOnly) db.updateProject(p.id, { repo: full, repoBaseSha: publishedHead || undefined, privateRepo: info.private, shipped: ship || p.shipped });
      setPublishedPrivate(info.private);
      setLinks(out);
    } catch (e) { toast({ title: "Publish failed", description: errMsg(e), variant: "destructive" }); }
    setBusy(false); setStep("");
  };

  const createTemp = () => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const temporaryName = `${slug || "my-app"}-${suffix}`;
    // Changing the destination invalidates consent for the previous repository.
    setConfirmedPublish(false);
    setRepo(temporaryName);
    setSessionOnly(true);
    toast({ title: "Temporary repository name created", description: `Using ${temporaryName} for this publish only.` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[17px]"><Rocket className="h-4 w-4" /> Publish to GitHub</DialogTitle>
          <DialogDescription className="text-[13.5px]">Review the publish summary before pushing. For connected projects, I check whether the remote repository changed since import.</DialogDescription>
        </DialogHeader>
        {!token ? (
          <div className="rounded-xl bg-muted p-4 text-[13.5px]">
            Add a GitHub token in Keys first. Use a fine-grained token with <b>Contents</b>, <b>Workflows</b>, <b>Pages</b> and <b>Administration</b> set to read and write.
            <div className="mt-3 flex gap-2">
              <button data-testid="button-publish-open-keys" onClick={onOpenKeys} className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground">Open Keys</button>
              <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[13px]">Make a token <ExternalLink className="h-3 w-3" /></a>
            </div>
          </div>
        ) : links ? (
          <div className="space-y-2">
            <div className="rounded-xl bg-emerald-50 p-3 text-[13px] text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {ship && publishedPrivate
                ? "Pushed to your private repo. GitHub is building the APK; only people with repo access can download it. The website won’t be publicly hosted."
                : `Published. GitHub Actions is now building${ship ? " your website and Android APK" : ""}.`}
              {sessionOnly && <div className="mt-2">This repository was used for this publish only and was not saved to the project settings.</div>}
            </div>
            {links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12.5px] hover:bg-muted">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0"><span className="block font-medium">{l.label}</span><span className="block truncate text-muted-foreground">{l.url}</span></span>
              </a>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-[12.5px]">
              <div className="flex items-center justify-between gap-3"><span className="font-medium">Publish preflight</span><span className="text-muted-foreground">{Object.keys(p.files).length} project files</span></div>
              <p className="mt-1 text-muted-foreground">The current publish sends your project files to the selected repository default branch. Local environment values are excluded; only variable names are written to .env.example.</p>
              {p.repo && <p className="mt-1 text-muted-foreground">{p.repoBaseSha ? `Last observed remote commit: ${p.repoBaseSha.slice(0, 7)}` : "No saved remote baseline yet; this project may have been connected before change detection was added."}</p>}
              <div className="mt-3 border-t border-border/70 pt-3">
                <div className="font-medium">Files in this project</div>
                <ul data-testid="publish-file-preview" className="mt-1 space-y-1 font-mono text-[11px] text-muted-foreground">
                  {previewPaths.slice(0, 8).map((path) => <li key={path} className="truncate">{path}</li>)}
                  {previewPaths.length > 8 && <li>…and {previewPaths.length - 8} more files</li>}
                  {!previewPaths.length && <li>No project files yet</li>}
                </ul>
                <p className="mt-2 text-muted-foreground">The publish also prepares package.json and may add deployment workflows, Capacitor configuration, a download page, and README links when Ship it is enabled. This is a file-list preview, not a line-by-line diff against GitHub.</p>
              </div>
            </div>
            <div>
              <label className="text-[12.5px] font-medium text-muted-foreground">Repository</label>
              <input data-testid="input-publish-repo" value={repo} onChange={(e) => { setRepo(e.target.value); setConfirmedPublish(false); }} placeholder="my-app or owner/my-app" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-[13px] outline-none focus:border-foreground/30" />
            </div>
            <label className="flex items-start gap-3">
              <Switch data-testid="switch-ship" checked={ship} onCheckedChange={(value) => { setShip(value); setConfirmedPublish(false); }} />
              <span><span className="block text-[13.5px] font-medium">Ship it: website and Android APK</span><span className="block text-[12.5px] text-muted-foreground">Adds GitHub Actions, turns on Pages, and puts download links in the README.</span></span>
            </label>
            <label className="flex items-start gap-3">
              <Switch data-testid="switch-session-only" checked={sessionOnly} onCheckedChange={(value) => { setSessionOnly(value); setConfirmedPublish(false); }} />
              <span><span className="block text-[13.5px] font-medium">Session-only publish</span><span className="block text-[12.5px] text-muted-foreground">Use this repository for this publish without saving it to the project.</span></span>
            </label>
            <div className="flex justify-end">
              <button type="button" onClick={createTemp} className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-muted">Generate temporary repo name</button>
            </div>
            <label className="flex items-start gap-3">
              <Switch data-testid="switch-private" checked={priv} onCheckedChange={(value) => { setPriv(value); setConfirmedPublish(false); }} />
              <span><span className="block text-[13.5px] font-medium">Private repo</span><span className="block text-[12.5px] text-muted-foreground">Free GitHub Pages needs a public repo.</span></span>
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-[12.5px] leading-relaxed">
              <input data-testid="checkbox-publish-confirmation" type="checkbox" checked={confirmedPublish} onChange={(event) => setConfirmedPublish(event.target.checked)} disabled={busy} className="mt-0.5 accent-primary" />
              <span>I reviewed the file preview and understand this publishes to <b>{repo.trim() || "the selected repository"}</b>'s default branch{ship ? ", with deployment workflows enabled" : ""}. I understand this can change files on GitHub.</span>
            </label>
            <button data-testid="button-publish-confirm" disabled={busy || !repo.trim() || !confirmedPublish} onClick={go} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-[14px] font-medium text-primary-foreground disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />} {busy ? step + "…" : "Push to GitHub"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
