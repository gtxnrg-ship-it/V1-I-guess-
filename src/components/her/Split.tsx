import { useRef, useState, type ReactNode } from "react";

/** Two-pane horizontal split with a draggable divider. No storage, pure state. */
export function Split({ left, right, initial = 38, min = 28, max = 60 }: { left: ReactNode; right: ReactNode; initial?: number; min?: number; max?: number }) {
  const [pct, setPct] = useState(initial);
  const [drag, setDrag] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault(); setDrag(true);
    const move = (ev: PointerEvent) => {
      const r = box.current?.getBoundingClientRect(); if (!r) return;
      setPct(Math.min(max, Math.max(min, ((ev.clientX - r.left) / r.width) * 100)));
    };
    const up = () => { setDrag(false); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  return (
    <div ref={box} className={`flex min-h-0 flex-1 ${drag ? "select-none cursor-col-resize" : ""}`}>
      <div style={{ width: `${pct}%` }} className="min-w-0 shrink-0">{left}</div>
      <div role="separator" aria-orientation="vertical" data-testid="split-handle" onPointerDown={onDown}
        className="group relative w-px shrink-0 cursor-col-resize bg-border">
        <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
        <span className={`absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/20 opacity-0 transition-opacity group-hover:opacity-100 ${drag ? "opacity-100" : ""}`} />
      </div>
      {/* While dragging, block iframes from swallowing pointer events */}
      <div className={`relative min-w-0 flex-1 ${drag ? "[&_iframe]:pointer-events-none" : ""}`}>{right}</div>
    </div>
  );
}
