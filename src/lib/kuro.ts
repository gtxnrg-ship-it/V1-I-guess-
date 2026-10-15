export const fmtMs = (ms?: number) => {
  if (!ms) return "0s";
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};
export const prettyModel = (id: string) =>
  id.includes(" ") ? id : id.replace(/^models\//, "").split("/").pop()!.replace(/[_-]/g, " ").replace(/\b(\w)/g, (c) => c.toUpperCase()).replace(/(\d) (\d)/g, "$1.$2");
export const fmtTokens = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n || 0));
export const errMsg = (e: unknown) => String((e as any)?.message || e);

/** Shrink an image to at most `max` px on its long side; returns base64 JPEG (no prefix). */
export async function compressImage(file: Blob, max = 1280): Promise<{ mime: string; data: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return { mime: "image/jpeg", data: c.toDataURL("image/jpeg", 0.85).split(",")[1] };
  } finally { URL.revokeObjectURL(url); }
}
export const imgSrc = (i: { mime: string; data: string }) => `data:${i.mime};base64,${i.data}`;

/** Haptic feedback for mobile — short tap for light, double for medium, pattern for success */
export function haptic(type: "light" | "medium" | "success" | "error" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const patterns: Record<typeof type, number | number[]> = {
    light: 30,
    medium: 60,
    success: [40, 30, 40],
    error: [80, 40, 80],
  };
  try { navigator.vibrate(patterns[type]); } catch {}
}
