// Kuro-chan's eyes: renders the app in hidden frames at desktop and phone sizes,
// collects runtime errors, and asks the page to screenshot itself.
// The frames are sandboxed WITHOUT same-origin, so app code can never touch her keys.
export interface Look { errors: string[]; shots: { label: string; url: string }[]; shotError?: string }

function frame(html: string, width: number, height: number) {
  const f = document.createElement("iframe");
  f.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-modals");
  f.setAttribute("aria-hidden", "true");
  f.tabIndex = -1;
  f.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:${height}px;border:0;opacity:0;pointer-events:none`;
  f.srcdoc = html;
  document.body.appendChild(f);
  return f;
}

function ask<T>(f: HTMLIFrameElement, msg: any, type: string, ms: number): Promise<T | null> {
  return new Promise((res) => {
    const id = Math.random().toString(36).slice(2);
    const t = setTimeout(() => { window.removeEventListener("message", on); res(null); }, ms);
    function on(e: MessageEvent) {
      if (e.source !== f.contentWindow || e.data?.__her !== type) return;
      if (type === "shot" && e.data.id !== id) return;
      clearTimeout(t); window.removeEventListener("message", on); res(e.data);
    }
    window.addEventListener("message", on);
    f.contentWindow?.postMessage({ ...msg, id }, "*");
  });
}

async function settle(f: HTMLIFrameElement, ms: number) {
  await new Promise<void>((res) => { const t = setTimeout(res, 8000); f.addEventListener("load", () => { clearTimeout(t); res(); }, { once: true }); });
  await new Promise((r) => setTimeout(r, ms));
}

/** Just render and listen for crashes (cheap; no pixels). */
export async function runtimeCheck(html: string): Promise<string[]> {
  const f = frame(html, 1280, 800);
  const errs: string[] = [];
  const on = (e: MessageEvent) => { if (e.source === f.contentWindow && e.data?.__her === "runtime-error") for (const x of e.data.errors) if (!errs.includes(x)) errs.push(x); };
  window.addEventListener("message", on);
  try { await settle(f, 2500); return errs; } finally { window.removeEventListener("message", on); f.remove(); }
}

export async function look(html: string, which: "desktop" | "mobile" | "both" = "both"): Promise<Look> {
  const sizes = [
    ...(which !== "mobile" ? [{ label: "Desktop 1280px", w: 1280, h: 800, maxH: 2400 }] : []),
    ...(which !== "desktop" ? [{ label: "Phone 390px", w: 390, h: 844, maxH: 2600 }] : []),
  ];
  const out: Look = { errors: [], shots: [] };
  await Promise.all(sizes.map(async (s) => {
    const f = frame(html, s.w, s.h);
    const on = (e: MessageEvent) => { if (e.source === f.contentWindow && e.data?.__her === "runtime-error") for (const x of e.data.errors) if (!out.errors.includes(x)) out.errors.push(x); };
    window.addEventListener("message", on);
    try {
      await settle(f, 2200);
      const r = await ask<{ url?: string; error?: string }>(f, { __her: "shot", maxH: s.maxH, scale: 1 }, "shot", 25000);
      if (r?.url) out.shots.push({ label: s.label, url: r.url });
      else out.shotError = r?.error || "The screenshot timed out.";
    } finally { window.removeEventListener("message", on); f.remove(); }
  }));
  return out;
}
