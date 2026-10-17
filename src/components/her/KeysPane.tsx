import { useEffect, useRef, useState } from "react";
import { KeyRound, Eye, EyeOff, Loader2, Plus, RefreshCw, Trash2, ChevronDown, Code2, MessageCircle, Settings2, ShieldCheck, Database, Save, Telescope, Map as MapIcon, ScanEye, Sparkles, Lock, Unlock, ExternalLink, Download, Upload } from "lucide-react";
import { SiGooglegemini, SiAnthropic, SiGithub, SiMistralai, SiHuggingface, SiNvidia, SiPerplexity, SiOpenrouter, SiX } from "react-icons/si";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { errMsg, prettyModel, fmtTokens } from "@/lib/kuro";
import * as db from "@/engine/db";
import { addKey, refreshKey, addPluginKey, PLUGINS, type PluginId } from "@/engine/keys";
import { chain } from "@/engine/router";
import { PROVIDERS } from "@/engine/providers";
import { tryAdminEmail, lockAdmin } from "@/engine/admin";
import { beginGitHubDeviceFlow, completeGitHubDeviceFlow, type GitHubDeviceFlow } from "@/engine/github-device-flow";
import { clearGitHubSession, getGitHubSession } from "@/engine/github-session";
import type { KeyRec, Role, UsageDay } from "@/engine/types";

const PIcon: Record<string, any> = { google: SiGooglegemini, anthropic: SiAnthropic, github: SiGithub, mistral: SiMistralai, huggingface: SiHuggingface, nvidia: SiNvidia, perplexity: SiPerplexity, openrouter: SiOpenrouter, xai: SiX };
const ROLES: { id: Role; label: string; icon: any; desc: string }[] = [
  { id: "talk", label: "Talker", icon: MessageCircle, desc: "Talks with you first. Fast and cheap." },
  { id: "research", label: "Researcher", icon: Telescope, desc: "Searches the web, npm, GitHub and docs." },
  { id: "plan", label: "Planner", icon: MapIcon, desc: "Turns the brief into steps. Deep reasoning." },
  { id: "code", label: "Builder", icon: Code2, desc: "Writes the code. Strongest model." },
  { id: "check", label: "Checker", icon: ScanEye, desc: "Looks at screenshots. Needs vision." },
];
const FREE_KEYS = [
  { name: "Google Gemini", note: "Best start: fast, sees images, searches Google", url: "https://aistudio.google.com/apikey" },
  { name: "Groq", note: "Very fast open models", url: "https://console.groq.com/keys" },
  { name: "OpenRouter", note: "Dozens of free models", url: "https://openrouter.ai/keys" },
  { name: "Tavily", note: "Better web research (1,000 free searches a month)", url: "https://app.tavily.com" },
];

function usageFor(keyId: string) {
  const u = db.getState().settings.usage;
  const days = Object.keys(u).sort();
  const today = u[db.today()]?.[keyId];
  const week = days.slice(-7).map((d) => u[d][keyId]).filter(Boolean) as UsageDay[];
  return { today, weekCalls: week.reduce((a, x) => a + x.calls, 0), weekTokens: week.reduce((a, x) => a + x.input + x.output, 0) };
}

function usageSummary() {
  const usage = db.getState().settings.usage;
  const windowDays = Object.keys(usage).sort().slice(-7);
  const totals = windowDays.reduce((acc, day) => {
    for (const rec of Object.values(usage[day] || {})) {
      acc.calls += rec.calls;
      acc.tokens += rec.input + rec.output;
      acc.errors += rec.errors;
    }
    return acc;
  }, { calls: 0, tokens: 0, errors: 0 });
  return totals;
}

export function KeysPane() {
  const { toast } = useToast();
  const st = db.useKuro();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [base, setBase] = useState("");
  const [show, setShow] = useState(false);
  const [adv, setAdv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [githubSession, setGithubSession] = useState(() => getGitHubSession());
  const [githubFlow, setGithubFlow] = useState<GitHubDeviceFlow | null>(null);
  const [githubBusy, setGithubBusy] = useState(false);
  const [githubNote, setGithubNote] = useState("");
  const githubAbort = useRef<AbortController | null>(null);
  const githubClientId = String((import.meta as any).env?.VITE_GITHUB_APP_CLIENT_ID || "");

  useEffect(() => () => githubAbort.current?.abort(), []);

  const connectGithub = async () => {
    if (githubBusy) return;
    const controller = new AbortController();
    githubAbort.current = controller;
    setGithubBusy(true);
    setGithubNote("Starting secure GitHub device sign-in…");
    try {
      const flow = await beginGitHubDeviceFlow(githubClientId);
      setGithubFlow(flow);
      setGithubNote("Enter the one-time code on GitHub. Kuro-chan is waiting for approval.");
      const session = await completeGitHubDeviceFlow(flow, githubClientId, {
        signal: controller.signal,
        onPending: () => setGithubNote("Waiting for GitHub approval…"),
      });
      setGithubSession(session);
      setGithubFlow(null);
      setGithubNote("Connected as @" + session.login + ". This session stays in memory and will need reconnecting after a reload.");
      toast({ title: "GitHub connected", description: "Signed in as @" + session.login + ". Your token is not saved in ordinary browser storage." });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setGithubNote(errMsg(error));
      setGithubFlow(null);
    } finally {
      setGithubBusy(false);
      githubAbort.current = null;
    }
  };
  const disconnectGithub = () => {
    githubAbort.current?.abort();
    clearGitHubSession();
    setGithubSession(null);
    setGithubFlow(null);
    setGithubBusy(false);
    setGithubNote("GitHub sign-in disconnected. Any separately saved personal access token remains unchanged.");
  };

  const add = async () => {
    if (!key.trim() && !base.trim()) return;
    setBusy(true);
    try {
      const { rec, note } = await addKey(key, { label: label.trim() || undefined, baseUrl: base.trim() || undefined });
      toast({ title: `Detected ${rec.label}`, description: rec.kind === "ai" ? `${rec.models.length} models found and ranked. I'll use them automatically.` : note || "Saved on this device." });
      setKey(""); setLabel(""); setBase("");
    } catch (e) { toast({ title: "Couldn't add that key", description: errMsg(e), variant: "destructive" }); }
    setBusy(false);
  };
  const aiKeys = st.keys.filter((k) => k.kind === "ai");
  const allModels = aiKeys.flatMap((k) => k.models.map((m) => ({ keyId: k.id, keyLabel: k.label, model: m.id, name: m.name || prettyModel(m.id) })));
  const activity = usageSummary();

  return (
    <div className="her-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[680px] space-y-8 px-4 py-6 md:px-6">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--cyan))]">Recent usage</div>
              <div className="mt-1 text-[15px] font-semibold text-foreground">{activity.calls} calls · {fmtTokens(activity.tokens)} tokens</div>
            </div>
            <div className="flex flex-wrap gap-2 text-[12px] text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1 tabular-nums">{activity.errors} limit/error hits</span>
              <span className="rounded-md bg-muted px-2 py-1 tabular-nums">7-day window</span>
            </div>
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">This is a local usage snapshot, so it helps you keep an eye on recent API activity and rate-limit events without guessing at your bill.</p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold">Paste any API key</h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">Gemini, Claude, OpenRouter, Groq, Grok, Mistral, Cerebras, Hugging Face, Tavily and more. I detect the provider, find available models, and rank them. GitHub repository access is configured separately under Repositories—not by pasting a personal access token.</p>
          <div className="mt-4 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 rounded-xl bg-muted px-3">
              <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input data-testid="input-api-key" type={show ? "text" : "password"} value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="AI provider key (Gemini, Claude, OpenRouter…)" autoComplete="off" spellCheck={false}
                className="h-11 min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:font-sans placeholder:text-muted-foreground/70" />
              <button aria-label="Show key" onClick={() => setShow((s) => !s)} className="text-muted-foreground hover:text-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            {adv && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input data-testid="input-key-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="h-10 rounded-xl bg-muted px-3 text-[13px] outline-none" />
                <input data-testid="input-key-base" value={base} onChange={(e) => setBase(e.target.value)} placeholder="Endpoint URL (OpenAI-compatible)" className="h-10 rounded-xl bg-muted px-3 font-mono text-[12px] outline-none placeholder:font-sans" />
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => setAdv((a) => !a)} className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"><Settings2 className="h-3.5 w-3.5" />{adv ? "Hide options" : "Options"}</button>
              <span className="ml-auto hidden items-center gap-1 text-[12px] text-muted-foreground sm:inline-flex"><ShieldCheck className="h-3.5 w-3.5" /> Stays on this device</span>
              <button data-testid="button-add-key" disabled={busy || (!key.trim() && !base.trim())} onClick={add}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 sm:ml-0">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} {base.trim() && !key.trim() ? "Connect endpoint" : "Add key"}
              </button>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-card p-3.5" data-testid="github-device-signin">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><SiGithub className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">Connect GitHub account</div>
                <p className="mt-1 text-[12px] text-muted-foreground">Use GitHub's device authorization instead of pasting a personal access token. Access is verified against your GitHub account and the token stays in runtime memory only.</p>
                {githubSession && <p className="mt-2 text-[12px] font-medium text-emerald-700 dark:text-emerald-300">Connected as @{githubSession.login}</p>}
                {githubNote && <p className="mt-2 whitespace-pre-wrap text-[12px] text-muted-foreground">{githubNote}</p>}
                {githubFlow && (
                  <div className="mt-3 rounded-xl border border-border bg-muted/50 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">One-time device code</div>
                    <div className="mt-1 font-mono text-xl font-semibold tracking-[0.18em]">{githubFlow.userCode}</div>
                    <a href={githubFlow.verificationUri} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium underline underline-offset-2">Open GitHub verification <ExternalLink className="h-3 w-3" /></a>
                    <p className="mt-1 text-[11px] text-muted-foreground">The code expires at {new Date(githubFlow.expiresAt).toLocaleTimeString()}.</p>
                  </div>
                )}
              </div>
              {githubSession ? (
                <button onClick={disconnectGithub} className="shrink-0 rounded-lg border border-border px-3 py-2 text-[12px] hover:bg-muted">Disconnect</button>
              ) : githubBusy ? (
                <button type="button" onClick={() => { githubAbort.current?.abort(); setGithubFlow(null); setGithubNote("Sign-in cancelled."); }} className="shrink-0 rounded-lg border border-border px-3 py-2 text-[12px] hover:bg-muted">Cancel</button>
              ) : (
                <button data-testid="button-github-device-signin" onClick={connectGithub} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground">
                  <SiGithub className="h-3.5 w-3.5" /> Sign in
                </button>
              )}
            </div>
            {!githubClientId && !githubSession && <p className="mt-3 text-[11.5px] text-amber-700 dark:text-amber-300">This build is missing VITE_GITHUB_APP_CLIENT_ID. Configure the public GitHub App client ID and enable Device Flow; no client secret belongs in this app.</p>}
          </div>
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted"><Code2 className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">Run a local model with Ollama</div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Free to run on your own computer. Install <a className="underline underline-offset-2" href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">Ollama</a>, download a model, then connect its OpenAI-compatible endpoint. Your browser may require Ollama to allow requests from this site.</p>
            </div>
            <button onClick={() => { setLabel("Ollama (local)"); setBase("http://localhost:11434/v1"); setAdv(true); }} className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-muted">Connect</button>
          </div>
          {!aiKeys.length && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {FREE_KEYS.map((f) => (
                <a key={f.name} href={f.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 hover:border-foreground/20">
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span><span className="block text-[13px] font-medium">Free {f.name} key</span><span className="block text-[12px] text-muted-foreground">{f.note}</span></span>
                </a>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-[15px] font-semibold">My team</h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">Five agents, each on the best model you have for the job. If one runs out or hits a limit, I switch to the next one automatically.</p>
          <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
            {ROLES.map((r) => {
              const c = chain(r.id);
              const ov = st.settings.roleOverrides[r.id];
              return (
                <div key={r.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted"><r.icon className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium">{r.label}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground">
                        {c.length ? c.slice(0, 3).map((x, i) => (
                          <span key={i} className="inline-flex items-center gap-1">{i > 0 && <span className="opacity-50">→</span>}<span className={i === 0 ? "text-foreground" : ""}>{x.model.name || prettyModel(x.model.id)}</span></span>
                        )) : <span>{r.desc}</span>}
                        {r.id === "check" && c[0] && !c[0].model.vision && <span className="text-amber-700 dark:text-amber-400">(no vision yet: add a Gemini key)</span>}
                      </div>
                    </div>
                  </div>
                  <Select value={ov || "auto"} onValueChange={(v) => db.setSettings({ roleOverrides: { ...st.settings.roleOverrides, [r.id]: v === "auto" ? undefined : v } })}>
                    <SelectTrigger data-testid={`select-role-${r.id}`} className="h-8 w-full text-[12.5px] sm:w-48"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="auto">Auto (recommended)</SelectItem>
                      {allModels.map((m) => <SelectItem key={`${m.keyId}::${m.model}`} value={`${m.keyId}::${m.model}`}>{m.name} · {m.keyLabel}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between">
            <h2 className="text-[15px] font-semibold">Vault</h2>
            <span className="text-[12px] text-muted-foreground">{st.keys.length} saved</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><Sparkles className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">Free starter</div>
                <div className="text-[12px] text-muted-foreground">A free, no-key model (Pollinations, GPT-OSS 20B) so you can try me right away. It's slow and can't see images. Used last, after your own keys.</div>
              </div>
              <Switch data-testid="switch-free" checked={st.settings.freeStarter} onCheckedChange={(v) => db.setSettings({ freeStarter: v })} />
            </div>
            {st.keys.map((k) => <KeyCard key={k.id} k={k} />)}
          </div>
        </section>

        <Plugins />
        <AppSettings />
        <HiddenSettings />
      </div>
    </div>
  );
}

/** Every service she can plug into, what it does for you, and whether it's connected. */
function Plugins() {
  const { toast } = useToast();
  const st = db.useKuro();
  const [open, setOpen] = useState<PluginId | null>(null);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const has = (p: string) => st.keys.some((k) => k.provider === p);
  const proj = db.project();
  const rows: { id: string; name: string; what: string; on: boolean; how: string; link?: string; plugin?: PluginId }[] = [
    { id: "github", name: "GitHub", what: "Publish apps, import repos, build websites and APKs, and her self-upgrades", on: has("github"), how: "Paste a token above", link: "https://github.com/settings/personal-access-tokens/new" },
    { id: "supabase", name: "Supabase", what: "Real logins, databases, file storage and realtime for your apps", on: !!(proj?.env?.VITE_SUPABASE_URL && proj?.env?.VITE_SUPABASE_ANON_KEY), how: "Set it in App settings below", link: "https://supabase.com/dashboard" },
    { id: "gsearch", name: "Google Search", what: "Grounded web research through your Gemini key", on: has("google"), how: "Comes with a Gemini key", link: "https://aistudio.google.com/apikey" },
    { id: "tavily", name: "Tavily", what: "Deep web research for the Researcher", on: has("tavily"), how: "Paste a tvly- key above", link: "https://app.tavily.com" },
    { id: "jina", name: "Jina", what: "Web search and clean page reading", on: has("jina"), how: "Paste a jina_ key above", link: "https://jina.ai" },
    { id: "pexels", name: "Pexels", what: PLUGINS.pexels.what, on: has("pexels"), how: "Connect", link: PLUGINS.pexels.url, plugin: "pexels" },
    { id: "unsplash", name: "Unsplash", what: PLUGINS.unsplash.what, on: has("unsplash"), how: "Connect", link: PLUGINS.unsplash.url, plugin: "unsplash" },
    { id: "free", name: "Free built-ins", what: "Openverse and Wikimedia photos, AI image generation, npm, GitHub search, Wikipedia, Stack Overflow, package docs. Always on.", on: true, how: "" },
  ];
  return (
    <section>
      <h2 className="text-[15px] font-semibold">Plugins</h2>
      <p className="mt-1 text-[13.5px] text-muted-foreground">Services I plug into while I research and build. Everything runs from your device.</p>
      <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
        {rows.map((r) => (
          <div key={r.id} className="p-3.5" data-testid={`plugin-${r.id}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${r.on ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">{r.name}{r.on && <span className="ml-2 text-[11.5px] font-normal text-emerald-700 dark:text-emerald-400">Connected</span>}</div>
                <div className="text-[12px] text-muted-foreground">{r.what}</div>
              </div>
              {r.plugin ? (
                <button data-testid={`button-plugin-${r.id}`} onClick={() => { setOpen(open === r.plugin ? null : r.plugin!); setVal(""); }} className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[12px] hover:bg-muted">{r.on ? "Change" : "Connect"}</button>
              ) : r.link && !r.on ? (
                <a href={r.link} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">{r.how}<ExternalLink className="h-3 w-3" /></a>
              ) : null}
            </div>
            {open === r.plugin && r.plugin && (
              <div className="mt-2.5 flex gap-2 pl-[18px]">
                <input data-testid={`input-plugin-${r.id}`} type="password" value={val} onChange={(e) => setVal(e.target.value)} placeholder={`${r.name} API key`} autoComplete="off" spellCheck={false}
                  className="h-9 min-w-0 flex-1 rounded-lg bg-muted px-3 font-mono text-[12.5px] outline-none placeholder:font-sans" />
                <button data-testid={`button-plugin-save-${r.id}`} disabled={busy || !val.trim()} onClick={async () => {
                  setBusy(true);
                  try { await addPluginKey(r.plugin!, val); toast({ title: `${r.name} connected` }); setOpen(null); } catch (e) { toast({ title: "Couldn't connect", description: errMsg(e), variant: "destructive" }); }
                  setBusy(false);
                }} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-medium text-primary-foreground disabled:opacity-50">{busy && <Loader2 className="h-3 w-3 animate-spin" />}Save</button>
                <a href={r.link} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted" aria-label={`Get a ${r.name} key`}><ExternalLink className="h-3.5 w-3.5" /></a>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const SUPA = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
function AppSettings() {
  const { toast } = useToast();
  db.useKuro();
  const project = db.project();
  const importInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<{ k: string; v: string }[]>([]);
  useEffect(() => {
    const env = project?.env || {};
    const keys = Array.from(new Set([...SUPA, ...Object.keys(env)]));
    setRows(keys.map((k) => ({ k, v: env[k] || "" })));
  }, [project?.id, JSON.stringify(project?.env || {})]); // eslint-disable-line
  if (!project) return null;
  const save = () => {
    const env: Record<string, string> = {};
    for (const r of rows) { const k = r.k.trim().toUpperCase(); if (k && r.v.trim()) env[k.startsWith("VITE_") ? k : `VITE_${k}`] = r.v.trim(); }
    db.updateProject(project.id, { env });
    toast({ title: "App settings saved", description: "The preview uses them right away. They're added when you publish too." });
  };
  const exportProject = () => {
    const bundle = { format: "kuro-chan-project", version: 1, project: { name: project.name, files: project.files, env: project.env } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kuro-chan-project"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const importProject = async (file: File) => {
    try {
      const bundle = JSON.parse(await file.text());
      const source = bundle?.project;
      if (bundle?.format !== "kuro-chan-project" || bundle.version !== 1 || !source || typeof source.name !== "string" || !source.files || typeof source.files !== "object" || Array.isArray(source.files)) {
        throw new Error("That file isn't a supported Kuro-chan project export.");
      }
      const files: Record<string, string> = {};
      for (const [path, content] of Object.entries(source.files)) {
        if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..") || ["__proto__", "constructor", "prototype"].includes(path) || typeof content !== "string") {
          throw new Error("The export contains an invalid project file.");
        }
        files[path] = content;
      }
      if (!Object.keys(files).length) throw new Error("The export doesn't contain any project files.");
      const env: Record<string, string> = {};
      if (source.env != null) {
        if (typeof source.env !== "object" || Array.isArray(source.env)) throw new Error("The export contains invalid app settings.");
        for (const [name, value] of Object.entries(source.env)) {
          if (!/^VITE_[A-Z0-9_]+$/.test(name) || typeof value !== "string") throw new Error("The export contains invalid app settings.");
          env[name] = value;
        }
      }
      const imported = db.createProject(`${source.name.slice(0, 80)} (imported)`, files);
      db.updateProject(imported.id, { env });
      toast({ title: "Project imported", description: `${imported.name} is ready to edit.` });
    } catch (error) {
      toast({ title: "Couldn't import project", description: error instanceof Error ? error.message : "Invalid project file.", variant: "destructive" });
    }
  };
  return (
    <section>
      <h2 className="text-[15px] font-semibold">App settings</h2>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        Public settings for <b className="font-medium text-foreground">{project.name}</b>. For real logins and a database, make a free project at{" "}
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Supabase</a>{" "}
        and paste its Project URL and anon (publishable) key here. Never paste secret or service keys.
      </p>
      <div className="mt-3 space-y-2 rounded-2xl border border-border bg-card p-3">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-1.5 sm:grid-cols-[minmax(0,210px)_1fr]">
            <div className="flex h-10 items-center gap-2 rounded-xl bg-muted px-3">
              {SUPA.includes(r.k) ? <Database className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <Settings2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <input data-testid={`input-env-key-${i}`} value={r.k} readOnly={SUPA.includes(r.k)} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, k: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") } : x)))}
                className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] outline-none" />
            </div>
            <input data-testid={`input-env-value-${i}`} value={r.v} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))}
              placeholder={r.k === "VITE_SUPABASE_URL" ? "https://xxxx.supabase.co" : r.k === "VITE_SUPABASE_ANON_KEY" ? "eyJ… or sb_publishable_…" : "value"} spellCheck={false}
              className="h-10 min-w-0 rounded-xl bg-muted px-3 font-mono text-[12px] outline-none placeholder:text-muted-foreground/60" />
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <button data-testid="button-env-add" onClick={() => setRows((rs) => [...rs, { k: "VITE_", v: "" }])} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] hover:bg-muted"><Plus className="h-3 w-3" /> Add setting</button>
          <button data-testid="button-env-save" onClick={save} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground"><Save className="h-3 w-3" /> Save</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <button onClick={exportProject} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] hover:bg-muted"><Download className="h-3.5 w-3.5" /> Export project</button>
          <button onClick={() => importInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] hover:bg-muted"><Upload className="h-3.5 w-3.5" /> Import project</button>
          <input ref={importInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void importProject(file);
            event.currentTarget.value = "";
          }} />
          <span className="basis-full text-[11.5px] text-muted-foreground">Exports source files and app settings, but not API keys. Keep the file private if its settings are sensitive.</span>
        </div>
      </div>
    </section>
  );
}

/** Settings: normal user controls live here, while the hidden admin door stays tucked behind an explicit advanced toggle. */
function HiddenSettings() {
  const { toast } = useToast();
  const st = db.useKuro();
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const s = st.settings;
  return (
    <section data-testid="section-settings">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Settings</h2>
        {(s.eggFound || s.adminUnlocked) && (
          <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="rounded-lg border border-border bg-background px-2.5 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">
            {showAdvanced ? "Hide advanced" : "Advanced"}
          </button>
        )}
      </div>
      <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-3.5 text-[13px]">
        <div className="flex items-start gap-2.5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{st.persistent ? "Your keys, apps and chats are saved in this browser only. Nothing goes to any server of mine; AI calls go straight from your device to the provider." : "This browser blocked storage, so nothing is saved after you close the page. Open Kuro-chan in its own tab to keep your work."}</span>
        </div>
        <div className="rounded-xl border border-border bg-background p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium">Voice</span>
            <span className="text-[11.5px] text-muted-foreground">{db.keyOf("openai") ? "OpenAI TTS ready" : "Browser voice fallback"}</span>
          </div>
          <Select value={s.voiceProvider || "browser"} onValueChange={(v) => db.setSettings({ voiceProvider: v as "browser" | "openai" })}>
            <SelectTrigger className="h-9 w-full text-[12.5px]">
              <SelectValue placeholder="Voice output" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="browser">Browser voice</SelectItem>
              <SelectItem value="openai" disabled={!db.keyOf("openai")}>OpenAI TTS{!db.keyOf("openai") ? " (add an OpenAI key first)" : ""}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showAdvanced && s.eggFound && !s.adminUnlocked && (
          <div className="her-rise rounded-xl border border-[hsl(var(--ember))]/40 bg-[hsl(var(--ember))]/5 p-3" data-testid="admin-door">
            <div className="flex items-center gap-2 font-medium"><Lock className="h-4 w-4 text-[hsl(var(--ember))]" /> Admin access</div>
            <p className="mt-1 text-[12.5px] text-muted-foreground">This extra door is hidden on purpose. Open Advanced in Settings to reveal it, then enter the admin email.</p>
            <div className="mt-2 flex gap-2">
              <input data-testid="input-admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off"
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.nextElementSibling as HTMLButtonElement)?.click()}
                className="h-10 min-w-0 flex-1 rounded-xl bg-muted px-3 text-[13px] outline-none" />
              <button data-testid="button-admin-unlock" disabled={checking || !email.includes("@")} onClick={async () => {
                setChecking(true);
                const ok = await tryAdminEmail(email);
                setChecking(false);
                toast(ok ? { title: "Admin unlocked", description: "The Admin tab is open now." } : { title: "That email isn't the admin", variant: "destructive" });
              }} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground disabled:opacity-50">
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />} Unlock
              </button>
            </div>
          </div>
        )}
        {showAdvanced && s.adminUnlocked && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Unlock className="h-4 w-4 shrink-0 text-emerald-600" /><span className="flex-1">Admin unlocked for {s.adminEmail}</span>
            <button data-testid="button-admin-lock" onClick={lockAdmin} className="rounded-lg border border-border px-2.5 py-1 text-[12px] hover:bg-muted">Lock</button>
          </div>
        )}
      </div>
    </section>
  );
}

function KeyCard({ k }: { k: KeyRec }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const Icon = PIcon[k.provider] || KeyRound;
  const u = usageFor(k.id);
  const blocked = PROVIDERS.find((p) => p.id === k.provider)?.noBrowser;
  return (
    <div className="rounded-2xl border border-border bg-card" data-testid={`card-key-${k.id}`}>
      <div className="flex items-center gap-3 p-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-medium">{k.label}</span>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${k.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} title={k.statusMsg || k.status} />
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-muted-foreground">
            <span className="font-mono">{k.secret ? k.hint : "No API key"}</span>
            {k.baseUrl && <span className="max-w-full truncate font-mono" title={k.baseUrl}>{k.baseUrl}</span>}
            {k.kind === "ai" && <span>· {k.models.length} models</span>}
            {k.login && <span>· @{k.login}</span>}
            {k.kind === "tool" && <span>· research</span>}
          </div>
          {blocked && <div className="mt-1 text-[11.5px] text-amber-700 dark:text-amber-400">This provider blocks browser calls, so I can't use it from here.</div>}
          {k.kind === "ai" && (u.today || u.weekCalls > 0) && (
            <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]" data-testid={`usage-key-${k.id}`}>
              <span className="rounded-md bg-muted px-1.5 py-0.5 tabular-nums">Today: {u.today?.calls || 0} calls · {fmtTokens((u.today?.input || 0) + (u.today?.output || 0))} tokens</span>
              {!!u.today?.errors && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 tabular-nums text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">{u.today.errors} errors or limits</span>}
              <span className="rounded-md px-1.5 py-0.5 tabular-nums text-muted-foreground">7 days: {u.weekCalls} · {fmtTokens(u.weekTokens)}</span>
            </div>
          )}
          {k.status === "error" && k.statusMsg && <div className="mt-1 truncate text-[11.5px] text-rose-600" title={k.statusMsg}>{k.statusMsg}</div>}
        </div>
        {k.kind === "ai" && (
          <button data-testid={`button-refresh-key-${k.id}`} aria-label="Refresh models" disabled={busy} onClick={async () => {
            setBusy(true);
            try { const n = await refreshKey(k.id); toast({ title: `${n} models` }); } catch (e) { toast({ title: "Refresh failed", description: errMsg(e), variant: "destructive" }); }
            setBusy(false);
          }} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /></button>
        )}
        <button data-testid={`button-delete-key-${k.id}`} aria-label="Delete key" onClick={() => { db.removeKey(k.id); toast({ title: "Key removed" }); }}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
        {k.kind === "ai" && k.models.length > 0 && (
          <button aria-label="Show models" onClick={() => setOpen((o) => !o)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></button>
        )}
      </div>
      {open && (
        <div className="her-scroll max-h-72 overflow-y-auto border-t border-border px-3.5 py-2">
          {[...k.models].sort((a, b) => b.power - a.power).map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-1.5 text-[12.5px]">
              <span className="min-w-0 flex-1 truncate">{m.name || prettyModel(m.id)}</span>
              {m.free && <Tag c="emerald">free</Tag>}
              {m.vision && <Tag>sees</Tag>}
              {m.reasoning && <Tag>thinks</Tag>}
              {m.tools && <Tag>tools</Tag>}
              {m.context ? <span className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">{m.context >= 1e6 ? `${Math.round(m.context / 1e5) / 10}M` : `${Math.round(m.context / 1000)}k`}</span> : null}
              <span className="w-16"><span className="block h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[hsl(var(--ember))]" style={{ width: `${m.power}%` }} /></span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const Tag = ({ children, c }: { children: any; c?: "emerald" }) => (
  <span className={`rounded px-1.5 py-px text-[10.5px] ${c === "emerald" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{children}</span>
);
