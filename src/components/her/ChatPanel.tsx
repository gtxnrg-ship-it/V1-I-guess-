import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Capacitor } from "@capacitor/core";
import { ArrowUp, Square, Plus, ImagePlus, Mic, X, MousePointerClick, Volume2, VolumeX, Sparkles, Github, Cpu, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AssistantMessage } from "./AssistantMessage";
import { HerOrb } from "./Logo";
import { compressImage, imgSrc, haptic } from "@/lib/kuro";
import * as agents from "@/engine/agents";
import * as db from "@/engine/db";
import { generateKokoroWav } from "@/engine/local-voice";
import { tryEgg } from "@/engine/admin";
import type { Img, Message } from "@/engine/types";

const SUGGESTIONS = [
  "A landing page for a small bakery, warm and elegant",
  "A habit tracker I can install on my Android phone",
  "A neon arcade game where you dodge falling stars",
  "A recipe app with accounts and saved favourites",
];
const SELF_SUGGESTIONS = [
  "Read your own code and tell me what you'd improve first",
  "Make your chat bubbles a little rounder",
  "Add a keyboard shortcut to stop a build",
];

const isNativeApp = () => Capacitor.isNativePlatform();

let activeRemoteAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
// Every stop/new utterance invalidates pending async speech work. Without this,
// a slow TTS network response can begin speaking again after the user presses Stop.
let speechGeneration = 0;

function stopAssistantSpeech(onSpeaking: (speaking: boolean) => void = () => {}, onLoading: (loading: boolean) => void = () => {}) {
  speechGeneration += 1;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  if (typeof window !== "undefined" && isNativeApp()) void TextToSpeech.stop().catch(() => {});
  if (activeRemoteAudio) {
    activeRemoteAudio.onended = null;
    activeRemoteAudio.onerror = null;
    activeRemoteAudio.pause();
    activeRemoteAudio.removeAttribute("src");
    activeRemoteAudio.load();
    activeRemoteAudio = null;
  }
  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl);
    activeAudioUrl = null;
  }
  onLoading(false);
  onSpeaking(false);
}

async function speakAssistantReply(text: string, voiceProvider: "browser" | "openai" | "kokoro", openaiKey?: string, onSpeaking: (speaking: boolean) => void = () => {}, speed = 1, voiceName = "af_heart", onLoading: (loading: boolean) => void = () => {}, onFallback: (message: string) => void = () => {}) {
  const safeText = text
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    .replace(/[*_#`\[\]()]/g, "")
    .trim();

  if (!safeText) return;
  stopAssistantSpeech(onSpeaking, onLoading);
  const generation = speechGeneration;
  const isCurrentSpeech = () => generation === speechGeneration;

  if (voiceProvider === "kokoro") {
    onLoading(true);
    try {
      const blob = await generateKokoroWav(safeText.slice(0, 4096), voiceName, speed);
      onLoading(false);
      if (!isCurrentSpeech()) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioUrl = url;
      activeRemoteAudio = audio;
      audio.onplay = () => { if (isCurrentSpeech()) onSpeaking(true); };
      const release = () => {
        if (activeRemoteAudio === audio) activeRemoteAudio = null;
        if (activeAudioUrl === url) activeAudioUrl = null;
        URL.revokeObjectURL(url);
        if (isCurrentSpeech()) onSpeaking(false);
      };
      audio.onended = release;
      audio.onerror = release;
      try {
        await audio.play();
        if (!isCurrentSpeech()) {
          if (activeRemoteAudio === audio) {
            audio.onended = null;
            audio.onerror = null;
            audio.pause();
            activeRemoteAudio = null;
          }
          if (activeAudioUrl === url) activeAudioUrl = null;
          URL.revokeObjectURL(url);
          return;
        }
        return;
      } catch (error) {
        if (!isCurrentSpeech()) return;
        if (activeRemoteAudio === audio) {
          audio.onended = null;
          audio.onerror = null;
          audio.pause();
          activeRemoteAudio = null;
        }
        if (activeAudioUrl === url) activeAudioUrl = null;
        URL.revokeObjectURL(url);
        onFallback(error instanceof Error ? error.message : "Local audio playback was blocked.");
      }
    } catch (error) {
      onLoading(false);
      if (!isCurrentSpeech()) return;
      onFallback(error instanceof Error ? error.message : String(error));
    }
  }

  if (voiceProvider === "openai" && openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: "alloy",
          speed,
          input: safeText.slice(0, 4096),
        }),
      });
      if (!isCurrentSpeech()) return;
      if (response.ok) {
        const blob = await response.blob();
        if (!isCurrentSpeech()) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        activeAudioUrl = url;
        activeRemoteAudio = audio;
        audio.onplay = () => { if (isCurrentSpeech()) onSpeaking(true); };
        const release = () => {
          if (activeRemoteAudio === audio) activeRemoteAudio = null;
          if (activeAudioUrl === url) activeAudioUrl = null;
          URL.revokeObjectURL(url);
          if (isCurrentSpeech()) onSpeaking(false);
        };
        audio.onended = release;
        audio.onerror = release;
        try {
          await audio.play();
          if (!isCurrentSpeech()) {
            if (activeRemoteAudio === audio) {
              audio.onended = null;
              audio.onerror = null;
              audio.pause();
              activeRemoteAudio = null;
            }
            if (activeAudioUrl === url) activeAudioUrl = null;
            URL.revokeObjectURL(url);
            return;
          }
          return;
        } catch {
          if (!isCurrentSpeech()) return;
          // Playback can be blocked by mobile autoplay policy; try device speech below.
          if (activeRemoteAudio === audio) {
            audio.onended = null;
            audio.onerror = null;
            audio.pause();
            activeRemoteAudio = null;
          }
          if (activeAudioUrl === url) activeAudioUrl = null;
          URL.revokeObjectURL(url);
        }
      }
      // A provider error (including an expired or invalid key) falls back to device speech.
    } catch {
      // Network and provider errors must not prevent the device-voice fallback.
    }
  }

  if (!isCurrentSpeech()) return;

  if (typeof window !== "undefined" && isNativeApp()) {
    try {
      onSpeaking(true);
      await TextToSpeech.speak({ text: safeText.slice(0, 4000), lang: navigator.language || "en-US", rate: speed, pitch: 1.05, volume: 1, category: "ambient", queueStrategy: 1 });
      if (isCurrentSpeech()) onSpeaking(false);
      return;
    } catch {
      if (isCurrentSpeech()) onSpeaking(false);
      if (!isCurrentSpeech()) return;
      // Native voice can be unavailable when the Android device has no TTS engine installed.
    }
  }

  if (!isCurrentSpeech()) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onSpeaking(false);
    return;
  }
  window.speechSynthesis.cancel();
  const ut = new SpeechSynthesisUtterance(safeText);
  ut.onstart = () => { if (isCurrentSpeech()) onSpeaking(true); };
  ut.onend = () => { if (isCurrentSpeech()) onSpeaking(false); };
  ut.onerror = () => { if (isCurrentSpeech()) onSpeaking(false); };
  ut.rate = speed; ut.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Victoria") || v.name.includes("Zira") || v.name.includes("Google US English")));
  if (preferredVoice) ut.voice = preferredVoice;
  window.speechSynthesis.speak(ut);
}

export function ChatPanel({ scope = "app", onOpenKeys, draft, setDraft, onSent }: {
  scope?: agents.Scope; onOpenKeys: () => void; draft: string; setDraft: (s: string) => void;
  onSent?: () => void;
}) {
  const { toast } = useToast();
  const st = db.useKuro();
  const pid = scope === "self" ? agents.SELF_PID : db.project().id;
  const messages: Message[] = st.messages[pid] || [];
  const running = st.busy;
  const [images, setImages] = useState<Img[]>([]);
  const autoVoice = st.settings.voiceAutoSpeak !== false;
  const [speaking, setSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const localVoiceFallbackShown = useRef(false);
  const prevRunning = useRef(running);
  const initialMessage = messages[messages.length - 1];
  const lastSpokenId = useRef(initialMessage?.role === "assistant" && initialMessage.data?.done ? initialMessage.id : "");
  const nativeVoiceAvailable = typeof window !== "undefined" && isNativeApp();
  const speechAvailable = nativeVoiceAvailable || (typeof window !== "undefined" && "speechSynthesis" in window);
  const premiumVoiceReady = !!db.keyOf("openai");
  const voiceProvider = st.settings.voiceProvider === "kokoro" || (!st.settings.voiceProvider && st.settings.preferOfflineVoice) ? "kokoro" : st.settings.voiceProvider === "openai" && premiumVoiceReady ? "openai" : "browser";
  const voiceOutputAvailable = speechAvailable || premiumVoiceReady || voiceProvider === "kokoro";
  const fileRef = useRef<HTMLInputElement>(null);
  const dict = useDictation(draft, setDraft, (m) => { haptic("error"); toast({ title: "Voice input", description: m }); });

  useEffect(() => {
    if (prevRunning.current && !running && messages.length) {
      haptic("success");
    }
    prevRunning.current = running;
  }, [running, messages.length]);

  useEffect(() => {
    if (!autoVoice || running || !messages.length) return;
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && last.data?.done && lastSpokenId.current !== last.id) {
      lastSpokenId.current = last.id;
      const text = (last.data.blocks || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n\n");
      if (text.trim()) void speakAssistantReply(
        text,
        voiceProvider,
        db.keyOf("openai")?.secret,
        setSpeaking,
        st.settings.voiceSpeed ?? 1,
        st.settings.voiceName || "af_heart",
        setVoiceLoading,
        (message) => {
          if (voiceProvider === "kokoro" && !localVoiceFallbackShown.current) {
            localVoiceFallbackShown.current = true;
            toast({ title: "Using device voice instead", description: "Local Kokoro voice could not start. " + message.slice(0, 160) });
          }
        },
      );
    }
  }, [messages, running, autoVoice, voiceProvider, st.settings.voiceSpeed, st.settings.voiceName, toast]);
  useEffect(() => () => {
    stopAssistantSpeech(setSpeaking, setVoiceLoading);
  }, []);
  const addFiles = async (files: FileList | File[] | null) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    try {
      const imgs = await Promise.all(list.slice(0, 4).map((f) => compressImage(f)));
      setImages((cur) => [...cur, ...imgs].slice(0, 4));
    } catch { toast({ title: "Couldn't read that image", variant: "destructive" }); }
  };
  const scroller = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);

  useLayoutEffect(() => {
    const el = scroller.current; if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);
  useLayoutEffect(() => {
    const el = ta.current; if (!el) return;
    el.style.height = "0px"; el.style.height = Math.min(220, el.scrollHeight) + "px";
  }, [draft]);
  useEffect(() => { if (draft && ta.current) ta.current.focus(); }, [draft === ""]); // eslint-disable-line

  const send = async (t = draft) => {
    const text = t.trim(); if ((!text && !images.length) || running) return;
    haptic("light");
    dict.stop();
    if (/^[\d\s+()-]{8,20}$/.test(text) && (await tryEgg(text))) {
      setDraft("");
      toast({ title: "You found something", description: "A hidden door opened in Keys, under Settings." });
      return;
    }
    stick.current = true;
    dict.resetBase();
    setDraft(""); setImages([]); onSent?.();
    agents.send(text || "Here's an image.", { images, scope });
  };
  const isEmpty = !messages.length;
  const lastId = messages[messages.length - 1]?.id;
  const project = db.project();
  const githubConnected = st.keys.some((k) => k.provider === "github");
  const modelCount = st.keys.filter((k) => k.kind === "ai").reduce((total, k) => total + k.models.length, 0);

  return (
    <div className="studio-chat-panel relative flex h-full min-h-0 flex-col">
      {!isEmpty && (running || speaking || dict.listening) && (
        <div role="status" aria-live="polite" className="absolute right-4 top-4 z-50 pointer-events-none" aria-label={running ? "Kuro-chan is thinking" : dict.listening ? "Listening" : "Kuro-chan is speaking"}>
          <HerOrb size={32} state={running ? "thinking" : dict.listening ? "listening" : "speaking"} className="her-orb-glow" />
        </div>
      )}
      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="her-scroll min-h-0 flex-1 overflow-y-auto">
        {scope !== "self" && !running && (
          <div className="sticky top-0 z-10 flex justify-end px-4 pt-2">
            <button data-testid="button-clear-chat" onClick={() => {
              const existing = new Set(db.getState().projects.map((p) => p.name));
              let name = "New chat"; let index = 2;
              while (existing.has(name)) name = `New chat ${index++}`;
              db.createProject(name, {});
              setDraft(""); setImages([]);
            }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">
              <Plus className="h-3 w-3" /> New chat
            </button>
          </div>
        )}
        {isEmpty ? (
          <div className="studio-welcome flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
            <button
              type="button"
              data-testid="button-orb-talk"
              aria-label={dict.listening ? "Stop talking to Kuro-chan" : "Talk to Kuro-chan"}
              title={dict.listening ? "Tap to stop listening" : "Tap to talk to Kuro-chan"}
              onClick={() => { db.setSettings({ voiceAutoSpeak: true }); dict.toggle(); }}
              className="rounded-full outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
            >
              <HerOrb size={76} className="her-orb-glow" state={dict.listening ? "listening" : running ? "thinking" : "idle"} />
            </button>
            <div className="studio-welcome-label mt-4"><Sparkles className="h-3 w-3" /> {scope === "self" ? "SELF-IMPROVEMENT MODE" : "YOUR AI BUILD PARTNER"}</div>
            <h1 className="studio-welcome-title mt-4 font-display text-[36px] font-semibold leading-[1.08]">{scope === "self" ? "Let's make me\nbetter." : <>An idea becomes<br /><span>a product.</span></>}</h1>
            <p className="mt-3 max-w-[370px] text-[14px] leading-relaxed text-muted-foreground">
              {scope === "self" ? "Tell me what to change. I'll plan it, build it into my own code, and ship it to GitHub." : "Describe what you want to create. I'll plan, research, build, and test it with you, right here."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => { db.setSettings({ voiceAutoSpeak: true }); if (!dict.listening) dict.toggle(); }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[12.5px] font-medium text-primary-foreground shadow-[0_0_24px_rgba(0,240,255,0.12)] transition-transform hover:-translate-y-0.5 hover:opacity-90">
                <Mic className="h-3.5 w-3.5" /> Talk to Kuro-chan
              </button>
              <button type="button" onClick={() => { db.setSettings({ voiceAutoSpeak: true }); setDraft("Build me a polished SaaS dashboard with auth and billing."); }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted">
                <Sparkles className="h-3.5 w-3.5" /> Try a complex prompt
              </button>
            </div>
            {scope !== "self" && (
              <div className="mt-5 flex max-w-[520px] flex-wrap items-center justify-center gap-2">
                {githubConnected ? (
                  project.repo ? (
                    <a href={"https://github.com/" + project.repo} target="_blank" rel="noopener noreferrer"
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1.5 text-[11.5px] text-emerald-700 transition-colors hover:bg-emerald-500/[0.12] dark:text-emerald-300">
                      <Github className="h-3.5 w-3.5" /> {project.repo} <GitBranch className="ml-0.5 h-3 w-3 opacity-70" />
                    </a>
                  ) : (
                    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1.5 text-[11.5px] text-emerald-700 dark:text-emerald-300">
                      <Github className="h-3.5 w-3.5" /> GitHub connected · ready to import
                    </span>
                  )
                ) : (
                  <button type="button" onClick={onOpenKeys}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    <Github className="h-3.5 w-3.5" /> Connect GitHub
                  </button>
                )}
                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11.5px] text-muted-foreground">
                  <Cpu className="h-3.5 w-3.5" /> {modelCount ? modelCount + " models available" : st.settings.freeStarter ? "Free starter model ready" : "Choose your AI model"}
                </span>
                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11.5px] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> 5 specialist agents
                </span>
              </div>
            )}
            <div className="mt-7 grid w-full max-w-[460px] gap-2 sm:grid-cols-2">
              {(scope === "self" ? SELF_SUGGESTIONS : SUGGESTIONS).map((s) => (
                <button key={s} data-testid="button-suggestion" onClick={() => { haptic("medium"); send(s); }}
                  className="studio-suggestion group flex min-h-12 items-center gap-3 px-3.5 py-2.5 text-left text-[12.5px] transition-all">
                  <span className="flex-1">{s}</span>
                  <ArrowUp className="h-3.5 w-3.5 rotate-45 text-cyan-200/60 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-100" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[720px] space-y-7 px-4 py-6 md:px-6">
            {messages.map((m) => m.role === "user"
              ? <UserBubble key={m.id} m={m} />
              : <AssistantMessage key={m.id} data={m.data || { blocks: [], models: [] }} live={running && m.id === lastId && !m.data?.done} pid={pid} msgId={m.id} scope={scope}
                  onOpenKeys={onOpenKeys} onEdit={(t) => setDraft(t)} />)}
          </div>
        )}
      </div>

      <div className="px-3 pb-3 md:px-4 md:pb-4">
        <div
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          className="studio-composer mx-auto max-w-[720px] rounded-2xl border bg-card transition-colors focus-within:border-foreground/25">
          {images.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-3 pt-3">              {images.map((im, i) => (
                <span key={i} className="group relative">
                  <img src={imgSrc(im)} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
                  <button aria-label="Remove image" data-testid={`button-remove-image-${i}`} onClick={() => setImages((c) => c.filter((_, j) => j !== i))}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          <textarea
            ref={ta} data-testid="input-message" value={draft} rows={1}
            onPaste={(e) => { const f = Array.from(e.clipboardData.files || []); if (f.length) { e.preventDefault(); addFiles(f); } }}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
            placeholder={dict.listening ? "Listening…" : scope === "self" ? "What should I change about myself?" : "Describe what you want to build…"}
            className="block w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
          />
          <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1">
            <span className="min-w-0 flex-1 truncate pl-1.5 text-[11.5px] text-muted-foreground/80">{running ? "Working…" : voiceLoading ? "Preparing Kuro-chan’s local voice…" : speaking ? "Kuro-chan is speaking…" : nativeVoiceAvailable ? (autoVoice ? voiceProvider === "kokoro" ? "Kokoro local voice ready" : "Device voice ready" : "Tap the speaker to enable voice") : !voiceOutputAvailable ? "Voice needs a supported browser or an API key." : autoVoice ? (voiceProvider === "openai" ? "AI voice enabled" : voiceProvider === "kokoro" ? "Kokoro local voice enabled" : "Device voice enabled") : "Type or talk — either works."}</span>
            <div className="ml-auto flex items-center gap-1">
              <input ref={fileRef} type="file" accept="image/*" multiple hidden data-testid="input-attach" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <button data-testid="button-attach" aria-label="Attach image" title="Attach a screenshot or reference" onClick={() => fileRef.current?.click()}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><ImagePlus className="h-4 w-4" /></button>
              {(speaking || voiceLoading) && <button data-testid="button-stop-speaking" aria-label="Stop voice output" title="Stop Kuro-chan's voice output" onClick={() => stopAssistantSpeech(setSpeaking, setVoiceLoading)}
                className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary hover:bg-primary/25"><Square className="h-3 w-3 fill-current" /></button>}
              <button data-testid="button-auto-voice" aria-label={voiceOutputAvailable ? autoVoice ? "Disable voice output" : "Enable voice output" : "Voice output unavailable"}
                title={voiceOutputAvailable ? autoVoice ? "Kuro-chan will speak replies (Active)" : "Kuro-chan speaks replies" : "Voice needs a supported browser or an API key"}
                disabled={!voiceOutputAvailable}
                onClick={() => {
                  if (!autoVoice && !running) {
                    const last = messages[messages.length - 1];
                    if (last?.role === "assistant" && last.data?.done) lastSpokenId.current = last.id;
                  }
                  db.setSettings({ voiceAutoSpeak: !autoVoice });
                  if (autoVoice) stopAssistantSpeech(setSpeaking, setVoiceLoading);
                }}
                className={`grid h-8 w-8 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${autoVoice ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {autoVoice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button data-testid="button-mic" aria-label={dict.listening ? "Stop listening" : "Speak"} title="Speak instead of typing" onClick={dict.toggle}
                className={`relative grid h-8 w-8 place-items-center rounded-full transition-colors ${dict.listening ? "bg-[hsl(var(--ember))] text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {dict.listening && <span className="absolute inset-0 animate-ping rounded-full bg-[hsl(var(--ember))]/40" />}
                <Mic className="relative h-4 w-4" />
              </button>
              {running ? (
                <button data-testid="button-stop" aria-label="Stop" onClick={agents.stop} className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90">
                  <Square className="h-3 w-3 fill-current" />
                </button>
              ) : (
                <button data-testid="button-send" aria-label="Send" disabled={!draft.trim() && !images.length} onClick={() => send()}
                  className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ m }: { m: Message }) {
  return (
    <div className="her-rise flex flex-col items-end gap-1.5">
      {!!m.images?.length && (
        <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
          {m.images.map((im, i) => <img key={i} src={imgSrc(im)} alt="Attached" className="h-24 max-w-[180px] rounded-xl border border-border object-cover" />)}
        </div>
      )}      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-[14.5px] leading-relaxed">{m.content}</div>
    </div>
  );
}

/** Browser speech-to-text. Android browsers may end recognition after silence, so
 * state is tied to the actual recognizer lifecycle rather than the button click. */
function useDictation(draft: string, setDraft: (s: string) => void, onError: (m: string) => void) {
  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);
  const rec = useRef<any>(null);
  const nativeListeners = useRef<Array<{ remove: () => Promise<void> }>>([]);
  const base = useRef("");
  const draftRef = useRef(draft);
  const stoppedByUser = useRef(false);
  draftRef.current = draft;
  const resetBase = () => { base.current = ""; };
  const releaseNativeListeners = async () => {
    const handles = nativeListeners.current;
    nativeListeners.current = [];
    await Promise.all(handles.map(async (handle) => {
      try { await handle.remove(); } catch { /* Plugin may already be shutting down. */ }
    }));
  };
  const stop = () => {
    stoppedByUser.current = true;
    listeningRef.current = false;
    setListening(false);
    const active = rec.current;
    rec.current = null;
    try { active?.stop?.(); } catch { /* Browser recognition may already have ended. */ }
    if (isNativeApp()) {
      void SpeechRecognition.stop().catch(() => {});
      void releaseNativeListeners();
    }
    resetBase();
  };
  const start = async () => {
    if (listeningRef.current || rec.current) return;
    stoppedByUser.current = false;
    base.current = draftRef.current ? draftRef.current.replace(/\\s*$/, " ") : "";
    // Android WebViews do not consistently implement browser SpeechRecognition.
    // Use the maintained Capacitor native bridge first; web keeps the browser API.
    if (isNativeApp()) {
      const sentinel = { stop: () => { void SpeechRecognition.stop().catch(() => {}); } };
      rec.current = sentinel;
      listeningRef.current = true;
      setListening(true);
      try {
        const available = await SpeechRecognition.available();
        if (!available.available) throw new Error("Speech recognition isn't available on this Android device. Check that a speech service is installed and enabled.");
        if (rec.current !== sentinel || stoppedByUser.current) return;
        const permission = await SpeechRecognition.requestPermissions();
        if (permission.speechRecognition !== "granted") throw new Error("Microphone or speech-recognition permission was denied. Allow it in Android app settings, then try again.");
        if (rec.current !== sentinel || stoppedByUser.current) return;
        await releaseNativeListeners();
        nativeListeners.current.push(await SpeechRecognition.addListener("partialResults", (event) => {
          if (rec.current !== sentinel || stoppedByUser.current) return;
          const transcript = (event.matches || []).join(" ").trim();
          if (transcript) setDraft((base.current + transcript).replace(/\\s+/g, " ").trimStart());
        }));
        nativeListeners.current.push(await SpeechRecognition.addListener("listeningState", (event) => {
          if (rec.current !== sentinel) return;
          if (event.status === "stopped") {
            rec.current = null;
            listeningRef.current = false;
            setListening(false);
            void releaseNativeListeners();
            if (!stoppedByUser.current) resetBase();
          }
        }));
        if (rec.current !== sentinel || stoppedByUser.current) {
          await releaseNativeListeners();
          return;
        }
        await SpeechRecognition.start({ language: navigator.language || "en-US", maxResults: 1, partialResults: true, popup: false });
        if (rec.current !== sentinel || stoppedByUser.current) {
          await SpeechRecognition.stop().catch(() => {});
          await releaseNativeListeners();
        }
      } catch (error) {
        if (rec.current === sentinel) {
          rec.current = null;
          listeningRef.current = false;
          setListening(false);
        }
        await releaseNativeListeners();
        if (!stoppedByUser.current) onError(error instanceof Error ? error.message : "Couldn't start Android speech recognition. Check microphone permission and try again.");
      }
      return;
    }
    const SR = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
    if (!SR) {
      onError("This browser doesn't support voice input. Open Kuro-chan in Chrome, or use your keyboard's microphone.");
      return;
    }
    const r = new SR();
    rec.current = r;
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onstart = () => {
      if (rec.current !== r) return;
      listeningRef.current = true;
      setListening(true);
    };
    r.onresult = (e: any) => {
      if (rec.current !== r) return;
      const transcript = Array.from(e.results as ArrayLike<any>).map((result: any) => result?.[0]?.transcript || "").join(" ");
      setDraft((base.current + transcript).replace(/\\s+/g, " ").trimStart());
    };
    r.onerror = (e: any) => {
      if (rec.current !== r) return;
      listeningRef.current = false;
      setListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") onError("Microphone permission was denied. Open the site in its own browser tab, tap the site controls, and allow Microphone access.");
      else if (e.error === "audio-capture") onError("No microphone was found. Check your phone's microphone permission and make sure another app isn't holding it.");
      else if (e.error === "network") onError("Speech recognition couldn't reach its speech service. Check your connection and try again.");
      else if (e.error !== "aborted" && e.error !== "no-speech") onError("Voice input stopped (" + e.error + "). Tap the microphone to try again.");
    };
    r.onend = () => {
      if (rec.current !== r) return;
      rec.current = null;
      listeningRef.current = false;
      setListening(false);
      if (!stoppedByUser.current) resetBase();
    };
    try { r.start(); }
    catch {
      rec.current = null;
      listeningRef.current = false;
      setListening(false);
      onError("Couldn't start the microphone. Check browser permissions, then tap the mic again.");
    }
  };
  const toggle = () => {
    if (listeningRef.current || rec.current) stop();
    else void start();
  };
  useEffect(() => () => {
    stoppedByUser.current = true;
    listeningRef.current = false;
    try { rec.current?.abort?.(); } catch { /* Browser recognition may already have ended. */ }
    try { rec.current?.stop?.(); } catch { /* Native or browser recognition may already have stopped. */ }
    rec.current = null;
    if (isNativeApp()) {
      void SpeechRecognition.stop().catch(() => {});
      void releaseNativeListeners();
    }
  }, []);
  return { listening, toggle, start, stop, resetBase };
}
