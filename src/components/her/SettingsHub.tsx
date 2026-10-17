import { useEffect, useState, type ReactNode } from "react";
import {
  AudioLines, Bot, Check, ChevronRight, CircleHelp, Github,
  HardDrive, LockKeyhole, Mic, Palette, RotateCcw, ShieldCheck,
  SlidersHorizontal, Sparkles, Waves,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as db from "@/engine/db";
import { KeysPane } from "@/components/her/KeysPane";
import { LocalModelsPane } from "@/components/her/LocalModelsPane";

type Section = "appearance" | "voice" | "models" | "repositories" | "privacy" | "device" | "about";
const SECTIONS: { id: Section; label: string; description: string; icon: typeof Palette }[] = [
  { id: "appearance", label: "Appearance", description: "Theme and motion", icon: Palette },
  { id: "voice", label: "Voice & speech", description: "Talk naturally, or type", icon: AudioLines },
  { id: "models", label: "AI & models", description: "Providers and local models", icon: Bot },
  { id: "repositories", label: "Repositories", description: "GitHub and project access", icon: Github },
  { id: "privacy", label: "Privacy & security", description: "Your data and permissions", icon: ShieldCheck },
  { id: "device", label: "Device & performance", description: "Storage and compatibility", icon: HardDrive },
  { id: "about", label: "About Kuro-chan", description: "Version and project details", icon: CircleHelp },
];

function SettingRow({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return <div className="flex items-center justify-between gap-4 border-b border-border/60 py-4 last:border-0">
    <div className="min-w-0"><div className="text-sm font-medium">{title}</div><p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">{detail}</p></div>
    <div className="shrink-0">{children}</div>
  </div>;
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${checked ? "border-primary bg-primary" : "border-border bg-muted"}`}>
    <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
  </button>;
}
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border/80 bg-card/80 p-4 sm:p-5">
    <div className="mb-2"><h3 className="text-sm font-semibold">{title}</h3>{subtitle && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>}</div>{children}
  </section>;
}

export function SettingsHub() {
  const st = db.useKuro();
  const [section, setSection] = useState<Section>("appearance");
  const { toast } = useToast();
  const settings = st.settings;
  const patch = (value: Parameters<typeof db.setSettings>[0]) => db.setSettings(value);
  const sectionMeta = SECTIONS.find((item) => item.id === section)!;
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  useEffect(() => { if (typeof document !== "undefined") document.documentElement.dataset.reduceMotion = settings.reduceMotion ? "true" : "false"; }, [settings.reduceMotion]);

  return <div className="her-scroll h-full min-h-0 overflow-y-auto">
    <div className="mx-auto w-full max-w-5xl p-3 pb-8 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><SlidersHorizontal className="h-3.5 w-3.5" /> Control room</div>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">Make Kuro-chan feel right for you. Sensible defaults are already selected.</p></div>
        <span className="hidden rounded-full border border-border bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground sm:inline-flex"><Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" /> Personal workspace</span>
      </div>
      <div className="grid gap-4 md:grid-cols-[205px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/60 p-2 md:flex-col md:overflow-visible">
          {SECTIONS.map((item) => { const Icon = item.icon; const active = item.id === section; return <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-current={active ? "page" : undefined}
            className={`flex min-w-max items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors md:w-full ${active ? "bg-primary/12 text-foreground ring-1 ring-primary/25" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}>
            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} /><span className="text-xs font-medium">{item.label}</span>{active && <ChevronRight className="ml-auto hidden h-3.5 w-3.5 md:block" />}
          </button>; })}
        </nav>
        <div className="min-w-0 space-y-4">
          <div className="mb-1"><h2 className="text-lg font-semibold">{sectionMeta.label}</h2><p className="mt-1 text-xs text-muted-foreground">{sectionMeta.description}</p></div>
          {section === "appearance" && <>
            <Card title="Look and feel" subtitle="Keep the interface calm, readable, and responsive across phone and desktop.">
              <SettingRow title="Reduce motion" detail="Prefer calmer transitions and avoid non-essential movement where supported."><Toggle checked={!!settings.reduceMotion} label="Reduce motion" onChange={(v) => patch({ reduceMotion: v })} /></SettingRow>
              <SettingRow title="Theme" detail={`The current app theme is ${isDark ? "dark" : "light"}. Use the sun/moon control in the top bar to switch it.`}><span className="rounded-lg border border-border px-3 py-1.5 text-xs">{isDark ? "Dark" : "Light"}</span></SettingRow>
            </Card>
          </>}
          {section === "voice" && <>
            <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5">
              <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><Waves className="h-6 w-6" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">Kuro-chan’s voice</h3><span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">Engine integration next</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">The target is one natural, consistent default voice with automatic speech preparation. Kokoro is our selected local TTS candidate; it is not installed by this settings screen yet.</p></div></div>
            </div>
            <Card title="Conversation" subtitle="Typing always works. Voice is optional and should never block a reply.">
              <SettingRow title="Speak completed replies" detail="Automatically read new assistant replies aloud when the current speech engine supports it."><Toggle checked={settings.voiceAutoSpeak !== false} label="Speak completed replies" onChange={(v) => patch({ voiceAutoSpeak: v })} /></SettingRow>
              <SettingRow title="Voice output provider" detail="Current playback uses device speech by default. OpenAI speech requires an OpenAI API key; local Kokoro support will be added separately.">
                <select aria-label="Voice output provider" value={settings.voiceProvider || "browser"} onChange={(e) => { patch({ voiceProvider: e.target.value as "browser" | "openai" }); toast({ title: "Voice preference saved", description: "This changes the current playback provider, not the planned Kokoro integration." }); }} className="max-w-[170px] rounded-lg border border-border bg-background px-2 py-2 text-xs">
                  <option value="browser">Device voice</option><option value="openai">OpenAI voice</option>
                </select>
              </SettingRow>
              <SettingRow title="Speech speed" detail="Adjust playback speed when supported by the selected speech provider."><div className="flex items-center gap-2"><input aria-label="Speech speed" type="range" min="0.8" max="1.2" step="0.05" value={settings.voiceSpeed ?? 1.0} onChange={(e) => patch({ voiceSpeed: Number(e.target.value) })} className="w-24 accent-primary" /><span className="w-8 text-right text-xs tabular-nums">{(settings.voiceSpeed ?? 1).toFixed(2)}×</span></div></SettingRow>
              <SettingRow title="Voice input" detail="Use the microphone button in chat for speech recognition. Text entry remains available at all times."><span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground"><Mic className="h-3 w-3" /> Chat microphone</span></SettingRow>
              <SettingRow title="Interrupt speech" detail="Device speech can be cancelled. Remote audio cancellation is being hardened in the dedicated voice integration."><span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] text-amber-300">Partially supported</span></SettingRow>
            </Card>
            <Card title="Privacy and offline use" subtitle="Local speech models can reduce network dependence, but require storage and compatible hardware.">
              <SettingRow title="Prefer offline voice" detail="Preference saved for the upcoming local engine integration; no model is downloaded yet."><Toggle checked={!!settings.preferOfflineVoice} label="Prefer offline voice" onChange={(v) => patch({ preferOfflineVoice: v })} /></SettingRow>
              <SettingRow title="Automatic voice tuning" detail="Kuro-chan will use sensible pacing and clean text automatically rather than requiring detailed manual tuning."><span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] text-primary">Automatic defaults</span></SettingRow>
            </Card>
          </>}
          {section === "models" && <>
            <Card title="AI providers" subtitle="Connect providers and choose models for planning, research, building, and checking."><KeysPane /></Card>
            <Card title="Local models" subtitle="Inspect the local model options currently supported by this build."><LocalModelsPane /></Card>
          </>}
          {section === "repositories" && <>
            <Card title="GitHub connection" subtitle="Connect only the account and repositories you want Kuro-chan to access.">
              <SettingRow title="Connection status" detail="GitHub access tokens stay in memory for this session and are not saved in the ordinary browser key store. Reconnect after restarting Kuro-chan."><span className={`rounded-full border px-2.5 py-1 text-[10px] ${st.keys.some((k) => k.provider === "github") ? "border-emerald-500/25 text-emerald-300" : "border-amber-500/25 text-amber-300"}`}>{st.keys.some((k) => k.provider === "github") ? "Connected" : "Not connected"}</span></SettingRow>
              <SettingRow title="Repository workspace" detail="Projects are isolated. Import a repository from the project menu in the top bar."><span className="text-xs text-muted-foreground">{st.projects.length} project{st.projects.length === 1 ? "" : "s"}</span></SettingRow>
              <SettingRow title="Publishing review" detail="Review changes and confirm before pushing code or creating a pull request."><span className="text-xs text-muted-foreground">User-controlled</span></SettingRow>
            </Card>
          </>}
          {section === "privacy" && <>
            <Card title="Local data" subtitle="Kuro-chan stores workspace data in this browser's IndexedDB where available.">
              <SettingRow title="Storage status" detail="If browser storage is unavailable, the app may fall back to temporary in-memory state."><span className={`rounded-full border px-2.5 py-1 text-[10px] ${st.persistent ? "border-emerald-500/25 text-emerald-300" : "border-amber-500/25 text-amber-300"}`}>{st.persistent ? "Persistent storage" : "Session fallback"}</span></SettingRow>
              <SettingRow title="Diagnostic reporting" detail="No automatic upload is configured here. Share diagnostic details only when you choose to."><span className="text-xs text-muted-foreground">Manual only</span></SettingRow>
              <SettingRow title="Credentials" detail="AI provider keys are kept in local app storage. GitHub access tokens are session-only and cleared when Kuro-chan restarts. Avoid using shared or untrusted devices."><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" /> Local storage</span></SettingRow>
            </Card>
          </>}
          {section === "device" && <>
            <Card title="Runtime" subtitle="Current device and app capability information.">
              <SettingRow title="Browser storage" detail="Persistent workspace storage is required to keep projects after closing the app."><span className="text-xs">{st.persistent ? "Available" : "Fallback mode"}</span></SettingRow>
              <SettingRow title="Reduced motion preference" detail="This setting affects the app preference; individual animation support may vary."><span className="text-xs text-muted-foreground">{settings.reduceMotion ? "On" : "Off"}</span></SettingRow>
              <SettingRow title="Voice model storage" detail="No local speech model is bundled or downloaded in this build."><span className="text-xs text-muted-foreground">Not installed</span></SettingRow>
            </Card>
          </>}
          {section === "about" && <>
            <Card title="Kuro-chan" subtitle="An open-source, GitHub-first AI product studio.">
              <SettingRow title="Application version" detail="Version declared in package.json."><span className="text-xs tabular-nums">2.0.0</span></SettingRow>
              <SettingRow title="Project license" detail="Check the repository license and individual model/voice licenses before redistribution."><span className="text-xs">MIT app license</span></SettingRow>
              <SettingRow title="Source repository" detail="Browse the code, report issues, and follow development."><a className="inline-flex items-center gap-1 text-xs text-primary hover:underline" href="https://github.com/gtxnrg-ship-it/V1-I-guess-" target="_blank" rel="noreferrer"><Github className="h-3.5 w-3.5" /> GitHub <ChevronRight className="h-3 w-3" /></a></SettingRow>
              <SettingRow title="Reset optional preferences" detail="Restore voice and appearance preferences to the recommended defaults."><button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted" onClick={() => { patch({ reduceMotion: false, voiceAutoSpeak: true, voiceProvider: "browser", voiceSpeed: 1, preferOfflineVoice: false }); toast({ title: "Preferences restored", description: "Your projects and provider keys were not changed." }); }}><RotateCcw className="h-3 w-3" /> Reset</button></SettingRow>
            </Card>
          </>}
          <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">Settings marked as planned describe preferences for upcoming functionality; they do not claim a model or capability is installed. Your projects and settings stay in this app’s local storage.</p>
        </div>
      </div>
    </div>
  </div>;
}
