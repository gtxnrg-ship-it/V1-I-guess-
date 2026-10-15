import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Square, RotateCcw, ImagePlus, Mic, X, MousePointerClick, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AssistantMessage } from "./AssistantMessage";
import { HerOrb } from "./Logo";
import { compressImage, imgSrc } from "@/lib/kuro";
import * as agents from "@/engine/agents";
import * as db from "@/engine/db";
import { tryEgg } from "@/engine/admin";
import type { Img, Message, PickedElement } from "@/engine/types";

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

export function ChatPanel({ scope = "app", onOpenKeys, draft, setDraft, selection, clearSelection, onSent }: {
  scope?: agents.Scope; onOpenKeys: () => void; draft: string; setDraft: (s: string) => void;
  selection?: PickedElement | null; clearSelection?: () => void; onSent?: () => void;
}) {
  const { toast } = useToast();
  const st = db.useKuro();
  const pid = scope === "self" ? agents.SELF_PID : db.project().id;
  const messages: Message[] = st.messages[pid] || [];
  const running = st.busy;
  const [images, setImages] = useState<Img[]>([]);
  const [autoVoice, setAutoVoice] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dict = useDictation(draft, setDraft, (m) => toast({ title: "Voice input", description: m }));

  useEffect(() => {
    if (!autoVoice || running || !messages.length) return;
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && last.data?.done) {
      const text = (last.data.blocks || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n\n");
      const cleanText = text.replace(/```[\s\S]*?```/g, "Code block omitted.").replace(/[*_#`[\]()]/g, "");
      if (cleanText.trim() && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(cleanText);
        ut.rate = 1.05; ut.pitch = 1.1;
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Victoria") || v.name.includes("Zira") || v.name.includes("Google US English")));
        if (femaleVoice) ut.voice = femaleVoice;
        window.speechSynthesis.speak(ut);
      }
    }
  }, [messages, running, autoVoice]);
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
    dict.stop();
    if (/^[\d\s+()-]{8,20}$/.test(text) && (await tryEgg(text))) {
      setDraft("");
      toast({ title: "You found something", description: "A hidden door opened in Keys, under Settings." });
      return;
    }
    stick.current = true;
    const sel = selection || null;
    dict.resetBase();
    setDraft(""); setImages([]); clearSelection?.(); onSent?.();
    agents.send(text || "Here's an image.", { images, picked: sel, scope });
  };
  const isEmpty = !messages.length;
  const lastId = messages[messages.length - 1]?.id;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {!isEmpty && running && (
        <div className="absolute right-4 top-4 z-50 pointer-events-none">
          <HerOrb size={32} state="thinking" className="her-orb-glow" />
        </div>
      )}
      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="her-scroll min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
            <HerOrb size={72} className="her-orb-glow" state={running ? "thinking" : "idle"} />
            <h1 className="mt-6 font-display text-[34px] leading-none tracking-tight">{scope === "self" ? "Let's improve me." : "Hi, I'm Kuro-chan."}</h1>
            <p className="mt-3 max-w-[360px] text-[14px] leading-relaxed text-muted-foreground">
              {scope === "self" ? "Tell me what to change about myself. I'll talk it through, research, build it on my own code, and ship it to my GitHub repo." : "Tell me what you want. I'll ask a few questions, research it, then my team builds it here. Websites, apps, games."}
            </p>
            <div className="mt-8 grid w-full max-w-[420px] gap-2">
              {(scope === "self" ? SELF_SUGGESTIONS : SUGGESTIONS).map((s) => (
                <button key={s} data-testid="button-suggestion" onClick={() => send(s)}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left text-[13.5px] transition-all hover:border-foreground/20 hover:shadow-sm">
                  <span className="flex-1">{s}</span>
                  <ArrowUp className="h-3.5 w-3.5 rotate-45 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[720px] space-y-7 px-4 py-6 md:px-6">
            {messages.length > 0 && !running && (
              <div className="-mb-3 flex justify-end">
                <button data-testid="button-clear-chat" onClick={() => db.clearMessages(pid)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">
                  <RotateCcw className="h-3 w-3" /> New chat
                </button>
              </div>
            )}
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
          className="mx-auto max-w-[720px] rounded-2xl border border-border bg-card shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] transition-colors focus-within:border-foreground/25">
          {(selection || images.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
              {selection && (
                <span data-testid="chip-selection" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[hsl(var(--ember))]/40 bg-[hsl(var(--ember))]/10 py-1 pl-2 pr-1 text-[12.5px]">
                  <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--ember))]" />
                  <span className="truncate"><span className="font-mono text-[11.5px] text-muted-foreground">&lt;{selection.tag}&gt;</span> {selection.text || selection.classes.split(" ")[0] || "element"}</span>
                  <button aria-label="Clear selection" data-testid="button-clear-selection" onClick={clearSelection} className="grid h-5 w-5 shrink-0 place-items-center rounded hover:bg-muted"><X className="h-3 w-3" /></button>
                </span>
              )}
              {images.map((im, i) => (
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
            placeholder={dict.listening ? "Listening…" : selection ? "What should change about this?" : scope === "self" ? "What should I change about myself?" : "Describe what you want to build…"}
            className="block w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
          />
          <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1">
            <span className="pl-1.5 text-[11.5px] text-muted-foreground/80">{running ? "Working…" : "She talks it through before building."}</span>
            <div className="ml-auto flex items-center gap-1">
              <input ref={fileRef} type="file" accept="image/*" multiple hidden data-testid="input-attach" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <button data-testid="button-attach" aria-label="Attach image" title="Attach a screenshot or reference" onClick={() => fileRef.current?.click()}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><ImagePlus className="h-4 w-4" /></button>
              <button data-testid="button-auto-voice" aria-label={autoVoice ? "Disable voice output" : "Enable voice output"} title={autoVoice ? "Kuro-chan will speak replies (Active)" : "Kuro-chan speaks replies"} onClick={() => { setAutoVoice((v) => !v); if (autoVoice && "speechSynthesis" in window) window.speechSynthesis.cancel(); }}
                className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${autoVoice ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
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
      )}
      {m.picked && (
        <span className="inline-flex max-w-[85%] items-center gap-1.5 rounded-lg bg-[hsl(var(--ember))]/10 px-2 py-1 text-[12px] text-muted-foreground">
          <MousePointerClick className="h-3 w-3 shrink-0 text-[hsl(var(--ember))]" />
          <span className="truncate"><span className="font-mono">&lt;{m.picked.tag}&gt;</span> {m.picked.text}</span>
        </span>
      )}
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-[14.5px] leading-relaxed">{m.content}</div>
    </div>
  );
}

/** Browser speech-to-text (Chrome/Edge/Android). Appends to the draft as you talk. */
function useDictation(draft: string, setDraft: (s: string) => void, onError: (m: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<any>(null);
  const base = useRef("");
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const resetBase = () => { base.current = ""; };
  const stop = () => { resetBase(); try { rec.current?.stop(); } catch { /* */ } };
  const toggle = () => {
    if (listening) return stop();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return onError("This browser doesn't support voice input. Try Chrome, or use your keyboard's mic button.");
    const r = new SR();
    r.lang = navigator.language || "en-US";
    r.continuous = true; r.interimResults = true;
    base.current = draftRef.current ? draftRef.current.replace(/\s*$/, " ") : "";
    let finalText = "";
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      setDraft((base.current + finalText + interim).replace(/\s+/g, " ").trimStart());
    };
    r.onerror = (e: any) => {
      setListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") onError("Microphone access was blocked. Open the app in its own tab and allow the mic.");
      else if (e.error !== "aborted" && e.error !== "no-speech") onError(`Voice input stopped (${e.error}).`);
    };
    r.onend = () => setListening(false);
    try { r.start(); rec.current = r; setListening(true); } catch { onError("Couldn't start the microphone."); }
  };
  useEffect(() => () => stop(), []); // eslint-disable-line
  return { listening, toggle, stop, resetBase };
}
