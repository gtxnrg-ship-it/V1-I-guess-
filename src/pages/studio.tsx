import { useCallback, useEffect, useState } from "react";
import { Moon, Sun, Github, Code2, KeyRound, MessageCircle, Loader2, Rocket, ExternalLink, ChevronDown, Check, Plus, Pencil, Trash2, Download, Globe, FolderKanban, Activity } from "lucide-react";
import { downloadZip } from "@/lib/zip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Split } from "@/components/her/Split";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { HerOrb } from "@/components/her/Logo";
import { GalaxyBackdrop } from "@/components/her/GalaxyBackdrop";
import { useTheme } from "@/components/her/theme";
import { ChatPanel } from "@/components/her/ChatPanel";
import { CodeBrowser } from "@/components/her/CodePane";
import { SettingsHub } from "@/components/her/SettingsHub";
import { ProjectsActivity } from "@/components/her/ProjectsActivity";
import * as db from "@/engine/db";
import { GH } from "@/engine/github";
import { inspectGitHubRepository } from "@/engine/live-repository-intelligence";
import { shipFiles, syncDependencies } from "@/engine/ship";
import { starterFiles, type StarterVariant } from "@/engine/template";
import { errMsg } from "@/lib/kuro";

type Tab = "projects" | "activity" | "code" | "keys";
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "code", label: "Code", icon: Code2 },
  { id: "keys", label: "Settings", icon: KeyRound },
];

export default function Studio() {
  const { theme, toggle } = useTheme();
  const isMobile = useIsMobile();
  const st = db.useKuro();
  const p = db.project();
  const [tab, setTab] = useState<Tab>("keys");
  const [mobileTab, setMobileTab] = useState<"chat" | Tab>("chat");
  const [draft, setDraft] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const running = st.busy;
  const visibleTabs = TABS;

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) setTab("keys");
    if (!visibleTabs.some((t) => t.id === mobileTab)) setMobileTab("chat");
  }, [mobileTab, tab, visibleTabs]);

  const openTab = useCallback((t: Tab) => { setTab(t); setMobileTab(t); }, []);

  const chat = <ChatPanel scope="app" onOpenKeys={() => openTab("keys")} draft={draft} setDraft={setDraft}
    onSent={() => isMobile && setMobileTab("chat")} />;
  const pane = (t: Tab) => t === "projects" || t === "activity"
    ? <ProjectsActivity view={t} onOpenChat={() => setMobileTab("chat")} />
    : t === "code" ? <CodeBrowser files={p.files} /> : <SettingsHub />;

  const aiKeys = st.keys.filter((k) => k.kind === "ai").length;
  const repoParts = (p.repo || "").split("/").filter(Boolean);
  const siteUrl = p.shipped && !p.privateRepo && repoParts.length === 2 ? `https://${repoParts[0].toLowerCase()}.github.io/${repoParts[1]}/` : "";
  const apkUrl = p.shipped && !p.privateRepo && repoParts.length === 2 ? `https://github.com/${p.repo}/releases/latest/download/app-debug.apk` : "";
  const tabBtn = (t: (typeof TABS)[number], active: boolean, onClick: () => void, mobile = false) => (
    <button key={t.id} data-testid={`tab-${mobile ? "mobile-" : ""}${t.id}`} onClick={onClick}
      className={mobile
        ? `studio-mobile-tab relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium ${active ? "is-active text-foreground" : "text-muted-foreground"}`
        : `studio-workspace-tab inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${active ? "is-active text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      <t.icon className={mobile ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />{t.label}
    </button>
  );

  return (
    <div className="studio-shell relative isolate flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <GalaxyBackdrop />
      <header className="studio-header relative z-10 flex h-14 shrink-0 items-center gap-2 px-3 pt-[env(safe-area-inset-top)] md:px-5">
        <span className="studio-brand-mark"><HerOrb size={29} className="her-orb-glow" /></span>
        <span className="hidden min-w-[112px] sm:block"><span className="block font-display text-[16px] font-semibold leading-tight">Kuro-chan</span><span className="studio-eyebrow">AI PRODUCT STUDIO</span></span>
        <span className="mx-1 h-6 w-px bg-border/70" />
        <ProjectMenu busy={running} onSwitched={() => {}} />
        <div className="ml-auto flex items-center gap-1">
          <button data-testid="button-key-status" onClick={() => openTab("keys")} className="studio-status hidden items-center gap-2 px-2.5 py-1.5 text-[12px] text-muted-foreground sm:inline-flex">
            <span className={`h-1.5 w-1.5 rounded-full ${aiKeys ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" : st.settings.freeStarter ? "bg-amber-400" : "bg-rose-400"}`} />
            {aiKeys ? `${aiKeys} ${aiKeys === 1 ? "key" : "keys"}` : st.settings.freeStarter ? "Free starter" : "No keys"}
          </button>
          <button data-testid="button-theme" aria-label="Toggle theme" onClick={toggle} className="studio-icon-button grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button data-testid="button-export-zip" title="Download project as ZIP" onClick={() => downloadZip(p.files, (p.name || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-"))} className="studio-zip-button hidden items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground min-[480px]:inline-flex">
            <Download className="h-3.5 w-3.5" /><span>ZIP</span>
          </button>
          {siteUrl && (
            <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="studio-status hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex">
              <Globe className="h-3.5 w-3.5" /> Website
            </a>
          )}
          {apkUrl && (
            <a href={apkUrl} target="_blank" rel="noopener noreferrer" className="studio-status hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex">
              <Download className="h-3.5 w-3.5" /> APK
            </a>
          )}
          <button data-testid="button-publish" onClick={() => setPublishOpen(true)} className="studio-publish inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-primary-foreground hover:opacity-90">
            <Github className="h-3.5 w-3.5" /><span className="hidden min-[400px]:inline">Publish</span>
          </button>
        </div>
      </header>

      {isMobile ? (
        <>
          <main className="min-h-0 flex-1">{mobileTab === "chat" ? chat : pane(mobileTab)}</main>
          <nav className="studio-mobile-nav relative z-10 flex shrink-0 pb-[env(safe-area-inset-bottom)]">
            <button data-testid="tab-mobile-chat" onClick={() => setMobileTab("chat")}
              className={`studio-mobile-tab relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium ${mobileTab === "chat" ? "is-active text-foreground" : "text-muted-foreground"}`}>
              <MessageCircle className="h-[18px] w-[18px]" />Chat
              {running && mobileTab !== "chat" && <span className="absolute right-[30%] top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--ember))]" />}
            </button>
            {visibleTabs.map((t) => tabBtn(t, mobileTab === t.id, () => setMobileTab(t.id), true))}
          </nav>
        </>
      ) : (
        <Split left={<div className="studio-chat-stage relative z-10 h-full">{chat}</div>} right={
          <div className="studio-workspace-stage relative z-10 flex h-full flex-col p-2 pl-0">
            <div className="studio-workspace-frame ml-2 flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
              <div className="studio-workspace-nav flex items-center gap-0.5 px-2 py-1.5">
                {visibleTabs.map((t) => tabBtn(t, tab === t.id, () => setTab(t.id)))}
                {running && <span className="ml-auto mr-2 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Kuro-chan is working</span>}
              </div>
              <div className="min-h-0 flex-1">{pane(tab)}</div>
            </div>
          </div>
        } />
      )}
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
  const current = db.project();
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
            <span className="truncate">{current?.name || "My App"}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
  const token = st.keys.find((k) => k.provider === "github");
  const slug = (p?.name || "my-app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  useEffect(() => { if (open) { setRepo(p?.repo || slug); setLinks(null); setPublishedPrivate(false); setSessionOnly(false); } }, [open]); // eslint-disable-line

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
            </div>
            <div>
              <label className="text-[12.5px] font-medium text-muted-foreground">Repository</label>
              <input data-testid="input-publish-repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="my-app or owner/my-app" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-[13px] outline-none focus:border-foreground/30" />
            </div>
            <label className="flex items-start gap-3">
              <Switch data-testid="switch-ship" checked={ship} onCheckedChange={setShip} />
              <span><span className="block text-[13.5px] font-medium">Ship it: website and Android APK</span><span className="block text-[12.5px] text-muted-foreground">Adds GitHub Actions, turns on Pages, and puts download links in the README.</span></span>
            </label>
            <label className="flex items-start gap-3">
              <Switch data-testid="switch-session-only" checked={sessionOnly} onCheckedChange={setSessionOnly} />
              <span><span className="block text-[13.5px] font-medium">Session-only publish</span><span className="block text-[12.5px] text-muted-foreground">Use this repository for this publish without saving it to the project.</span></span>
            </label>
            <div className="flex justify-end">
              <button type="button" onClick={createTemp} className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-muted">Generate temporary repo name</button>
            </div>
            <label className="flex items-start gap-3">
              <Switch data-testid="switch-private" checked={priv} onCheckedChange={setPriv} />
              <span><span className="block text-[13.5px] font-medium">Private repo</span><span className="block text-[12.5px] text-muted-foreground">Free GitHub Pages needs a public repo.</span></span>
            </label>
            <button data-testid="button-publish-confirm" disabled={busy || !repo.trim()} onClick={go} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-[14px] font-medium text-primary-foreground disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />} {busy ? step + "…" : "Push to GitHub"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
