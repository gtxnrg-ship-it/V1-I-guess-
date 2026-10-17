import { useEffect, useState, type ReactNode } from "react";
import {
  AudioLines, Bot, Check, ChevronRight, CircleHelp, Github,
  HardDrive, LockKeyhole, Mic, Palette, RotateCcw, ShieldCheck,
  SlidersHorizontal, Sparkles, Waves,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as db from "@/engine/db";
import { clearGitHubSession } from "@/engine/github-session";
import { KeysPane } from "@/components/her/KeysPane";
import { LocalModelsPane } from "@/components/her/LocalModelsPane";

type Section = "appearance" | "voice" | "personality" | "models" | "repositories" | "privacy" | "device" | "about";
const SECTIONS: { id: Section; label: string; description: string; icon: typeof Palette }[] = [
  { id: "appearance", label: "Appearance", description: "Theme and motion", icon: Palette },
  { id: "voice", label: "Voice & speech", description: "Talk naturally, or type", icon: AudioLines },
  { id: "personality", label: "Personality & chat", description: "Tune Kuro-chan’s conversational style", icon: Sparkles },
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
  const [, refreshSessionStatus] = useState(0);
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
              <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><Waves className="h-6 w-6" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">Kuro-chan’s voice</h3><span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">On-device option</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Kokoro can synthesize speech on-device after its model is downloaded on first use. The model is not bundled in the APK; first setup needs internet and storage. If it cannot load, Kuro-chan falls back to device speech.</p></div></div>
            </div>
            <Card title="Conversation" subtitle="Typing always works. Voice is optional and should never block a reply.">
              <SettingRow title="Speak completed replies" detail="Automatically read new assistant replies aloud when the current speech engine supports it."><Toggle checked={settings.voiceAutoSpeak !== false} label="Speak completed replies" onChange={(v) => patch({ voiceAutoSpeak: v })} /></SettingRow>
              <SettingRow title="Auto-send recognized voice turns" detail="Opt in to send a spoken transcript automatically when speech recognition ends. Kuro-chan can then speak the reply if voice output is enabled; this never auto-approves a build or publish action."><Toggle checked={!!settings.voiceConversationMode} label="Auto-send recognized voice turns" onChange={(v) => { patch({ voiceConversationMode: v }); toast({ title: v ? "Voice auto-send enabled" : "Voice auto-send disabled", description: v ? "Tap the mic for a turn; the transcript sends when recognition ends. Tap again for your next turn." : "Speech will stay in the composer until you send it." }); }} /></SettingRow>
              <SettingRow title="Voice output provider" detail="Device speech works without an API key. OpenAI speech needs an OpenAI API key. Local Kokoro downloads its model on first use and then synthesizes speech on-device.">
                <select aria-label="Voice output provider" value={settings.voiceProvider || (settings.preferOfflineVoice ? "kokoro" : "browser")} onChange={(e) => {
                  const provider = e.target.value as "browser" | "openai" | "kokoro";
                  patch({ voiceProvider: provider, preferOfflineVoice: provider === "kokoro" });
                  toast({ title: "Voice preference saved", description: provider === "kokoro" ? "Kokoro will download its model when local speech is first used. Device speech remains the fallback." : provider === "openai" ? "OpenAI voice uses your saved OpenAI API key; device speech remains the fallback." : "Replies will use your device's speech engine." });
                }} className="max-w-[210px] rounded-lg border border-border bg-background px-2 py-2 text-xs">
                  <option value="browser">Device voice</option><option value="openai">OpenAI voice</option><option value="kokoro">Local Kokoro voice</option>
                </select>
              </SettingRow>
              {(settings.voiceProvider === "kokoro" || settings.preferOfflineVoice) && <SettingRow title="Local voice" detail="Choose Kuro-chan’s default local English voice. The model is loaded only when speech is needed."><select aria-label="Kokoro voice" value={settings.voiceName || "af_heart"} onChange={(e) => patch({ voiceName: e.target.value })} className="max-w-[180px] rounded-lg border border-border bg-background px-2 py-2 text-xs"><option value="af_heart">Heart (default)</option><option value="af_bella">Bella</option><option value="af_sarah">Sarah</option><option value="af_sky">Sky</option></select></SettingRow>}
              <SettingRow title="Speech speed" detail="Adjust playback speed when supported by the selected speech provider."><div className="flex items-center gap-2"><input aria-label="Speech speed" type="range" min="0.8" max="1.2" step="0.05" value={settings.voiceSpeed ?? 1.0} onChange={(e) => patch({ voiceSpeed: Number(e.target.value) })} className="w-24 accent-primary" /><span className="w-8 text-right text-xs tabular-nums">{(settings.voiceSpeed ?? 1).toFixed(2)}×</span></div></SettingRow>
              <SettingRow title="Voice input" detail="Use the microphone button in chat for speech recognition. Text entry remains available at all times."><span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground"><Mic className="h-3 w-3" /> Chat microphone</span></SettingRow>
              <SettingRow title="Interrupt speech" detail="Stop playback cancels active browser, native, and remote audio where the platform permits it. Cancellation of pending speech work is guarded; physical-device behavior still needs acceptance testing."><span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] text-amber-300">Partially supported</span></SettingRow>
            </Card>
            <Card title="Privacy and offline use" subtitle="Local speech models can reduce network dependence, but require storage and compatible hardware.">
              <SettingRow title="Prefer offline voice" detail="Use local Kokoro synthesis instead of a remote voice provider. The model downloads on first use; device speech remains the fallback."><Toggle checked={!!settings.preferOfflineVoice} label="Prefer offline voice" onChange={(v) => { patch({ preferOfflineVoice: v, voiceProvider: v ? "kokoro" : "browser" }); toast({ title: v ? "Local voice selected" : "Device voice selected", description: v ? "Kokoro will be prepared when the next reply is spoken." : "Replies will use the device speech engine." }); }} /></SettingRow>
              <SettingRow title="Automatic voice tuning" detail="Kuro-chan will use sensible pacing and clean text automatically rather than requiring detailed manual tuning."><span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] text-primary">Automatic defaults</span></SettingRow>
            </Card>
          </>}
          {section === "personality" && <>
            <Card title="Conversation style" subtitle="Shape how Kuro-chan talks to you. These preferences affect her conversation prompt, not the code or safety checks she uses.">
              <SettingRow title="Playfulness" detail="From calm and direct to more expressive and mischievous. She should still read the room and never force a joke.">
                <div className="flex min-w-[150px] items-center gap-3">
                  <input aria-label="Playfulness" type="range" min="0" max="3" step="1" value={settings.personalityPlayfulness ?? 2} onChange={(e) => patch({ personalityPlayfulness: Number(e.target.value) })} className="w-20 accent-primary" />
                  <span className="w-20 text-right text-xs text-muted-foreground">{(["Calm", "Subtle", "Playful", "Extra playful"][settings.personalityPlayfulness ?? 2])}</span>
                </div>
              </SettingRow>
              <SettingRow title="Reply length" detail="Choose how much detail Kuro-chan usually gives. She can still go deeper when a task genuinely needs it.">
                <select aria-label="Reply length" value={settings.responseLength ?? "balanced"} onChange={(e) => patch({ responseLength: e.target.value as "concise" | "balanced" | "detailed" })} className="max-w-[180px] rounded-lg border border-border bg-background px-2 py-2 text-xs">
                  <option value="concise">Concise</option><option value="balanced">Balanced</option><option value="detailed">Detailed</option>
                </select>
              </SettingRow>
              <SettingRow title="Use saved project memory" detail="Include facts and decisions you explicitly saved for this project. Memory stays project-scoped; disabling this does not disable technical repository inspection.">
                <Toggle checked={settings.conversationPersonalization !== false} label="Use saved project memory" onChange={(v) => { patch({ conversationPersonalization: v }); toast({ title: v ? "Project memory enabled" : "Project memory paused", description: v ? "Kuro-chan can use this project's saved facts and decisions again." : "Saved project facts and decisions won't be added to new conversation context." }); }} />
              </SettingRow>
              <p className="pt-2 text-xs leading-relaxed text-muted-foreground">Kuro-chan remains an AI, keeps claims honest, and will not invent personal details or carry project memories into unrelated workspaces.</p>
            </Card>
          </>}
          {section === "models" && <>
            <Card title="AI providers" subtitle="Connect providers and choose models for planning, research, building, and checking."><KeysPane /></Card>
            <Card title="Local models" subtitle="Inspect the local model options currently supported by this build."><LocalModelsPane /></Card>
          </>}
          {section === "repositories" && <>
            <Card title="GitHub connection" subtitle="Connect only the account and repositories you want Kuro-chan to access.">
              <SettingRow title="Connect or manage GitHub" detail="Sign in with GitHub's one-time device code from AI & models, or manage an existing session there.">
                <button type="button" onClick={() => setSection("models")} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Open AI & models</button>
              </SettingRow>
              <SettingRow title="Connection status" detail="GitHub access tokens stay in memory for this session and are not saved in the ordinary browser key store. Reconnect after restarting Kuro-chan."><span className={`rounded-full border px-2.5 py-1 text-[10px] ${db.keyOf("github") ? "border-emerald-500/25 text-emerald-300" : "border-amber-500/25 text-amber-300"}`}>{db.keyOf("github") ? "Connected" : "Not connected"}</span></SettingRow>
              {db.keyOf("github") && <SettingRow title="Disconnect GitHub" detail="Clear the runtime session and remove any separately saved GitHub token. To revoke authorization completely, also remove it in GitHub settings."><button type="button" onClick={() => { clearGitHubSession(); st.keys.filter((key) => key.provider === "github").forEach((key) => db.removeKey(key.id)); refreshSessionStatus((value) => value + 1); toast({ title: "GitHub disconnected", description: "Kuro-chan cleared the session. Revoke app access in GitHub settings if you want to remove authorization too." }); }} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Disconnect</button></SettingRow>}
              <SettingRow title="Revoke app access" detail="Open GitHub's authorized applications page to review or revoke Kuro-chan's access."><a href="https://github.com/settings/apps/authorizations" target="_blank" rel="noreferrer" className="text-xs text-primary underline">Manage authorization</a></SettingRow>
              <SettingRow title="Repository source branch" detail="Choose the branch or exact ref Kuro-chan should inspect for this project. Leave blank to follow the repository's default branch. File reads and initial source context use this ref; publishing remains a separate workflow.">
                <input aria-label="Repository source branch" value={st.projects.find((project) => project.id === settings.activeProject)?.repoBranch || ""} onChange={(event) => {
                  const active = st.projects.find((project) => project.id === settings.activeProject);
                  if (active) db.updateProject(active.id, { repoBranch: event.target.value.trim() || undefined });
                }} placeholder="Default branch" className="w-36 rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary sm:w-48" />
              </SettingRow>
              <SettingRow title="Repository workspace" detail="Projects are isolated. Each chat/project keeps its own repository connection and source branch."><span className="text-xs text-muted-foreground">{st.projects.length} project{st.projects.length === 1 ? "" : "s"}</span></SettingRow>
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
              <SettingRow title="Voice model storage" detail="Kokoro model files are not bundled in the APK. They are downloaded only when local voice is selected and first used."><span className="text-xs text-muted-foreground">{settings.voiceProvider === "kokoro" || settings.preferOfflineVoice ? "Download on first use" : "Not downloaded"}</span></SettingRow>
            </Card>
          </>}
          {section === "about" && <>
            <Card title="Kuro-chan" subtitle="An open-source, GitHub-first AI product studio.">
              <SettingRow title="Application version" detail="Version declared in package.json."><span className="text-xs tabular-nums">2.0.0</span></SettingRow>
              <SettingRow title="Project license" detail="Check the repository license and individual model/voice licenses before redistribution."><span className="text-xs">MIT app license</span></SettingRow>
              <SettingRow title="Source repository" detail="Browse the code, report issues, and follow development."><a className="inline-flex items-center gap-1 text-xs text-primary hover:underline" href="https://github.com/gtxnrg-ship-it/kuro-chan" target="_blank" rel="noreferrer"><Github className="h-3.5 w-3.5" /> GitHub <ChevronRight className="h-3 w-3" /></a></SettingRow>
              <SettingRow title="Reset optional preferences" detail="Restore voice and appearance preferences to the recommended defaults."><button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted" onClick={() => { patch({ reduceMotion: false, voiceAutoSpeak: true, voiceProvider: "browser", voiceSpeed: 1, voiceConversationMode: false, preferOfflineVoice: false, personalityPlayfulness: 2, responseLength: "balanced", conversationPersonalization: true }); toast({ title: "Preferences restored", description: "Your projects and provider keys were not changed." }); }}><RotateCcw className="h-3 w-3" /> Reset</button></SettingRow>
            </Card>
          </>}
          <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">Settings marked as planned describe preferences for upcoming functionality; they do not claim a model or capability is installed. Your projects and settings stay in this app’s local storage.</p>
        </div>
      </div>
    </div>
  </div>;
}
