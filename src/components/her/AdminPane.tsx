import { useEffect, useState } from "react";
import { Lock, Github, RefreshCw, ExternalLink, CheckCircle2, XCircle, Loader2, Smartphone, Globe, ShieldAlert } from "lucide-react";
import * as db from "@/engine/db";
import { GH } from "@/engine/github";
import { DEFAULT_SELF_REPO, selfRepo, resetSelf, runDailySelfSearch, getSelfSuggestions } from "@/engine/self";
import { errMsg } from "@/lib/kuro";
import { ChatPanel } from "./ChatPanel";

type Run = { name: string; status: string; conclusion: string | null; url: string; at: string };

/** Locked (grayed out) unless the hidden sequence + admin email were entered. */
export function AdminPane({ onOpenKeys }: { onOpenKeys: () => void }) {
  const st = db.useKuro();
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState(getSelfSuggestions());

  useEffect(() => {
    if (st.settings.adminUnlocked) {
      runDailySelfSearch(null).then(() => {
        setSuggestions(getSelfSuggestions());
      });
    }
  }, [st.settings.adminUnlocked]);
  if (!st.settings.adminUnlocked) {
    return (
      <div className="grid h-full place-items-center px-6" data-testid="admin-locked">
        <div className="max-w-[300px] text-center opacity-60">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted"><Lock className="h-5 w-5 text-muted-foreground" /></span>
          <h2 className="mt-4 text-[15px] font-semibold">Admin is locked</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Only Kuro-chan's owner can open this.</p>
        </div>
      </div>
    );
  }
  const gh = st.keys.find((k) => k.provider === "github");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AdminHeader hasToken={!!gh} onOpenKeys={onOpenKeys} />
      {suggestions && (
        <div className="border-t border-border bg-card px-4 py-3 md:px-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--cyan))]">
            I'VE BEEN THINKING.
          </div>
          <div className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
            {suggestions}
          </div>
          <button
            data-testid="button-apply-suggestion"
            onClick={() => setDraft(suggestions)}
            className="mt-2.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-muted"
          >
            Apply this
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 border-t border-border">
        <ChatPanel scope="self" onOpenKeys={onOpenKeys} draft={draft} setDraft={setDraft} />
      </div>
    </div>
  );
}

function AdminHeader({ hasToken, onOpenKeys }: { hasToken: boolean; onOpenKeys: () => void }) {
  const st = db.useKuro();
  const [repo, setRepo] = useState(st.settings.selfRepo || DEFAULT_SELF_REPO);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const full = selfRepo();
  const [owner, name] = full.split("/");
  const site = `https://${(owner || "").toLowerCase()}.github.io/${name}/`;
  const apk = `https://github.com/${full}/releases/latest/download/app-debug.apk`;
  const load = async () => {
    const k = db.keyOf("github"); if (!k) return;
    setLoading(true); setErr("");
    try { setRuns(await new GH(k.secret).runs(owner, name)); } catch (e) { setErr(errMsg(e)); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [full, hasToken]); // eslint-disable-line
  return (
    <div className="space-y-3 px-4 py-3 md:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--ember))]/10 px-2 py-1 text-[12px] font-medium text-[hsl(var(--ember))]"><ShieldAlert className="h-3.5 w-3.5" /> Admin</span>
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted px-2.5">
          <Github className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input data-testid="input-self-repo" value={repo} onChange={(e) => setRepo(e.target.value)}
            onBlur={() => { const v = repo.trim() || DEFAULT_SELF_REPO; db.setSettings({ selfRepo: v }); resetSelf(); }}
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] outline-none" spellCheck={false} />
        </div>
        <a href={site} target="_blank" rel="noopener noreferrer" data-testid="link-self-site" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[12.5px] hover:bg-muted"><Globe className="h-3.5 w-3.5" /> Website</a>
        <a href={apk} target="_blank" rel="noopener noreferrer" data-testid="link-self-apk" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[12.5px] hover:bg-muted"><Smartphone className="h-3.5 w-3.5" /> APK</a>
      </div>
      {!hasToken ? (
        <div className="rounded-xl bg-muted p-3 text-[12.5px] text-muted-foreground">
          To upgrade herself, Kuro-chan needs a GitHub token for <span className="font-mono text-foreground">{full}</span>. Make a fine-grained token with Contents, Pull requests, Workflows and Pages set to read and write, then paste it in Keys.
          <button data-testid="button-admin-open-keys" onClick={onOpenKeys} className="ml-2 font-medium text-foreground underline underline-offset-2">Open Keys</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <button aria-label="Refresh builds" data-testid="button-refresh-runs" onClick={load} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></button>
          {err && <span className="truncate text-[12px] text-rose-600">{err}</span>}
          {runs?.length === 0 && <span className="text-[12px] text-muted-foreground">No builds yet.</span>}
          {runs?.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-[11.5px] hover:bg-muted">
              {r.status !== "completed" ? <Loader2 className="h-3 w-3 animate-spin text-amber-500" /> : r.conclusion === "success" ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-rose-600" />}
              {r.name}<ExternalLink className="h-2.5 w-2.5 opacity-50" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
