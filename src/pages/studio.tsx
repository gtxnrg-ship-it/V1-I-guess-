import { useCallback, useEffect, useState } from "react";
import { Moon, Sun, Github, Eye, Code2, KeyRound, ShieldCheck, Lock, MessageCircle, Loader2, Rocket, ExternalLink, ChevronDown, Check, Plus, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Split } from "@/components/her/Split";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { HerOrb } from "@/components/her/Logo";
import { useTheme } from "@/components/her/theme";
import { ChatPanel } from "@/components/her/ChatPanel";
import { PreviewPane } from "@/components/her/PreviewPane";
import { CodeBrowser } from "@/components/her/CodePane";
import { KeysPane } from "@/components/her/KeysPane";
import { AdminPane } from "@/components/her/AdminPane";
import * as db from "@/engine/db";
import * as agents from "@/engine/agents";
import { GH } from "@/engine/github";
import { shipFiles, syncDependencies } from "@/engine/ship";
import { starterFiles } from "@/engine/template";
import { errMsg } from "@/lib/kuro";
import type { PickedElement } from "@/engine/types";

type Tab = "preview" | "code" | "keys" | "admin";
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "preview", label: "Preview", icon: Eye },
  { id: "code", label: "Code", icon: Code2 },
  { id: "keys", label: "Keys", icon: KeyRound },
  { id: "admin", label: "Admin", icon: ShieldCheck },
];

export default function Studio() {
  const { theme, toggle } = useTheme();
  const isMobile = useIsMobile();
  const st = db.useKuro();
  const p = db.project();
  const [tab, setTab] = useState<Tab>("preview");
  const [mobileTab, setMobileTab] = useState<"chat" | Tab>("chat");
  const [selection, setSelection] = useState<PickedElement | null>(null);
  const [draft, setDraft] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const running = st.busy;
  const unlocked = !!st.settings.adminUnlocked;

  const openTab = useCallback((t: Tab) => { setTab(t); setMobileTab(t); }, []);
  const onPick = useCallback((el: PickedElement) => { setSelection(el); setMobileTab("chat"); }, []);
  useEffect(() => { if (!unlocked && tab === "admin") setTab("preview"); }, [unlocked]); // eslint-disable-line

  const chat = <ChatPanel scope="app" onOpenKeys={() => openTab("keys")} draft={draft} setDraft={setDraft}
    selection={selection} clearSelection={() => setSelection(null)} onSent={() => isMobile && setMobileTab("chat")} />;
  const pane = (t: Tab) => t === "preview" ? <PreviewPane onFix={(m) => { setMobileTab("chat"); agents.send(m); }} onPick={onPick} />
    : t === "code" ? <CodeBrowser files={p.files} />
    : t === "keys" ? <KeysPane />
    : <AdminPane onOpenKeys={() => openTab("keys")} />;

  const aiKeys = st.keys.filter((k) => k.kind === "ai").length;
  const tabBtn = (t: (typeof TABS)[number], active: boolean, onClick: () => void, mobile = false) => {
    const locked = t.id === "admin" && !unlocked;
    const Icon = locked ? Lock : t.icon;
    return (
      <button key={t.id} data-testid={`tab-${mobile ? "mobile-" : ""}${t.id}`} onClick={onClick} aria-disabled={locked}
        title={locked ? "Locked" : undefined}
        className={mobile
          ? `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium ${locked ? "opacity-35" : ""} ${active ? "text-foreground" : "text-muted-foreground"}`
          : `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${locked ? "opacity-35" : ""} ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
        <Icon className={mobile ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />{t.label}
      </button>
    );
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 pt-[env(safe-area-inset-top)] md:px-4">
        <HerOrb size={22} />
        <span className="hidden font-display text-[19px] leading-none sm:inline">Kuro-chan</span>
        <span className="mx-1 h-4 w-px bg-border" />
        <ProjectMenu busy={running} onSwitched={() => setSelection(null)} />
        <div className="ml-auto flex items-center gap-1">
          <button data-testid="button-key-status" onClick={() => openTab("keys")} className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex">
            <span className={`h-1.5 w-1.5 rounded-full ${aiKeys ? "bg-emerald-500" : st.settings.freeStarter ? "bg-amber-500" : "bg-rose-500"}`} />
            {aiKeys ? `${aiKeys} ${aiKeys === 1 ? "key" : "keys"}` : st.settings.freeStarter ? "Free starter" : "No keys"}
          </button>
          <button data-testid="button-theme" aria-label="Toggle theme" onClick={toggle} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button data-testid="button-publish" onClick={() => setPublishOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90">
            <Github className="h-3.5 w-3.5" /><span className="hidden min-[400px]:inline">Publish</span>
          </button>
        </div>
      </header>

      {isMobile ? (
        <>
          <main className="min-h-0 flex-1">{mobileTab === "chat" ? chat : pane(mobileTab)}</main>
          <nav className="flex shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
            <button data-testid="tab-mobile-chat" onClick={() => setMobileTab("chat")}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium ${mobileTab === "chat" ? "text-foreground" : "text-muted-foreground"}`}>
              <MessageCircle className="h-[18px] w-[18px]" />Chat
              {running && mobileTab !== "chat" && <span className="absolute right-[30%] top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--ember))]" />}
            </button>
            {TABS.map((t) => tabBtn(t, mobileTab === t.id, () => setMobileTab(t.id), true))}
          </nav>
        </>
      ) : (
        <Split left={<div className="h-full bg-background">{chat}</div>} right={
          <div className="flex h-full flex-col bg-sidebar/40 p-2 pl-0">
            <div className="ml-2 flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5">
                {TABS.map((t) => tabBtn(t, tab === t.id, () => setTab(t.id)))}
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
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const current = db.project();
  const doImport = async () => {
    const spec = name.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
    const tok = db.keyOf("github");
    if (!tok) { toast({ title: "Add a GitHub token in Keys first", variant: "destructive" }); return; }
    setImporting(true);
    try {
      const gh = new GH(tok.secret);
      const info = await gh.ensureRepo(spec);
      const files = await gh.readTree(info.owner, info.name, info.defaultBranch, (p) => !/^(node_modules|dist|build|android|ios|\.git)\//.test(p) && !/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(p));
      const empty = !Object.keys(files).filter((p) => p !== ".kuro").length;
      const created = db.createProject(info.name, empty ? starterFiles(info.name) : files);
      db.updateProject(created.id, { repo: `${info.owner}/${info.name}` });
      toast({ title: empty ? "Empty repo connected" : `Imported ${Object.keys(files).length} files`, description: empty ? "I started it with a clean template. Publish pushes it to that repo." : "Tell me what to change. Publish pushes it back." });
      setDialog(null); onSwitched();
    } catch (e) { toast({ title: "Couldn't import", description: errMsg(e), variant: "destructive" }); }
    setImporting(false);
  };
  const save = () => {
    if (dialog === "import") { doImport(); return; }
    const n = name.trim(); if (!n) return;
    if (dialog === "new") db.createProject(n, starterFiles(n));
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
          <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Your apps</DropdownMenuLabel>
          {st.projects.map((p) => (
            <DropdownMenuItem key={p.id} data-testid={`menu-project-${p.id}`} disabled={busy && p.id !== current.id}
              onSelect={() => { if (p.id !== current.id) { db.switchProject(p.id); onSwitched(); } }} className="gap-2">
              <span className="grid h-4 w-4 place-items-center">{p.id === current.id && <Check className="h-3.5 w-3.5" />}</span>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{Object.keys(p.files).length} files</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="menu-project-new" disabled={busy} onSelect={() => { setName(""); setDialog("new"); }} className="gap-2"><Plus className="h-3.5 w-3.5" /> New app</DropdownMenuItem>
          <DropdownMenuItem data-testid="menu-project-import" disabled={busy} onSelect={() => { setName(""); setDialog("import"); }} className="gap-2"><Github className="h-3.5 w-3.5" /> Import from GitHub</DropdownMenuItem>
          <DropdownMenuItem data-testid="menu-project-rename" onSelect={() => { setName(current?.name || ""); setDialog("rename"); }} className="gap-2"><Pencil className="h-3.5 w-3.5" /> Rename</DropdownMenuItem>
          {st.projects.length > 1 && (
            <DropdownMenuItem data-testid="menu-project-delete" disabled={busy}
              onSelect={(e) => { if (!confirmDelete) { e.preventDefault(); setConfirmDelete(true); return; } db.deleteProject(current.id); onSwitched(); }}
              className="gap-2 text-rose-600 focus:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> {confirmDelete ? "Tap again to delete for good" : "Delete this app"}</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-[17px]">{dialog === "new" ? "New app" : dialog === "import" ? "Import from GitHub" : "Rename app"}</DialogTitle>
            <DialogDescription className="text-[13.5px]">{dialog === "new" ? "A fresh project with its own chat, files and GitHub repo." : dialog === "import" ? "Paste a repo link or owner/name. Empty repos work too." : "This only changes the name you see."}</DialogDescription>
          </DialogHeader>
          <input data-testid="input-project-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder={dialog === "import" ? "github.com/you/your-repo" : "e.g. Habit Tracker"}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[14px] outline-none focus:border-foreground/30" />
          <button data-testid="button-project-save" disabled={!name.trim() || importing} onClick={save} className="w-full rounded-lg bg-primary py-2.5 text-[14px] font-medium text-primary-foreground disabled:opacity-50">
            {importing ? "Importing…" : dialog === "new" ? "Create app" : dialog === "import" ? "Import" : "Save"}
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
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [links, setLinks] = useState<{ label: string; url: string }[] | null>(null);
  const token = st.keys.find((k) => k.provider === "github");
  const slug = (p?.name || "my-app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  useEffect(() => { if (open) { setRepo(p?.repo || slug); setLinks(null); } }, [open]); // eslint-disable-line

  const go = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const gh = new GH(token.secret);
      setStep("Checking the repository");
      const info = await gh.ensureRepo(repo.trim(), { private: priv, description: `${p.name}, built with Kuro-chan` });
      const full = `${info.owner}/${info.name}`;
      const files: Record<string, string> = { ...p.files };
      delete files[".kuro/research.md"];
      setStep("Listing packages");
      files["package.json"] = (await syncDependencies(files)).pkg;
      const env = Object.entries(p.env || {});
      if (env.length) files[".env"] = env.map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
      const out: { label: string; url: string }[] = [{ label: "Repository", url: info.htmlUrl }];
      if (ship) {
        const s = shipFiles(p.name, full);
        Object.assign(files, s.files);
        const base = files["README.md"] || `# ${p.name}\n`;
        files["README.md"] = base.includes("## Try it") ? base : base.trimEnd() + "\n" + s.readme;
        out.push({ label: "Website (live in a few minutes)", url: s.site }, { label: "Android APK (ready in about 10 minutes)", url: s.apk });
      }
      setStep("Pushing files");
      await gh.commitFiles(info.owner, info.name, info.defaultBranch, Object.entries(files).map(([path, content]) => ({ path, content })), `Update from Kuro-chan: ${p.name}`);
      if (ship && !priv) { setStep("Turning on GitHub Pages"); try { await gh.enablePages(info.owner, info.name); } catch (e) { toast({ title: "Pages needs a manual switch", description: errMsg(e) }); } }
      db.updateProject(p.id, { repo: full });
      setLinks(out);
    } catch (e) { toast({ title: "Publish failed", description: errMsg(e), variant: "destructive" }); }
    setBusy(false); setStep("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[17px]"><Rocket className="h-4 w-4" /> Publish to GitHub</DialogTitle>
          <DialogDescription className="text-[13.5px]">I'll push your whole project. Empty repo? Fine. Missing repo? I'll create it.</DialogDescription>
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
            <div className="rounded-xl bg-emerald-50 p-3 text-[13px] text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">Published. GitHub Actions is now building{ship ? " your website and Android APK" : ""}.</div>
            {links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12.5px] hover:bg-muted">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0"><span className="block font-medium">{l.label}</span><span className="block truncate text-muted-foreground">{l.url}</span></span>
              </a>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-[12.5px] font-medium text-muted-foreground">Repository</label>
              <input data-testid="input-publish-repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="my-app or owner/my-app" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-[13px] outline-none focus:border-foreground/30" />
            </div>
            <label className="flex items-start gap-3">
              <Switch data-testid="switch-ship" checked={ship} onCheckedChange={setShip} />
              <span><span className="block text-[13.5px] font-medium">Ship it: website and Android APK</span><span className="block text-[12.5px] text-muted-foreground">Adds GitHub Actions, turns on Pages, and puts download links in the README.</span></span>
            </label>
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
