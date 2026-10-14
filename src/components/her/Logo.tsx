import { useId } from "react";

/** Kuro-chan's mark: an ink-black orb with cat ears and a warm ember smile. */
export function KuroMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Kuro-chan" role="img" className={className}>
      <defs>
        <linearGradient id={`e${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb38a" />
          <stop offset=".55" stopColor="#ec5f3a" />
          <stop offset="1" stopColor="#d9467a" />
        </linearGradient>
        <radialGradient id={`b${id}`} cx="38%" cy="32%" r="80%">
          <stop offset="0" stopColor="#3a3330" />
          <stop offset=".6" stopColor="#171312" />
          <stop offset="1" stopColor="#0b0908" />
        </radialGradient>
      </defs>
      <path d="M4.6 14.2C4.4 9.6 5.2 6.2 7.4 4.3c2.6.6 4.9 2 6.8 3.9Z" fill={`url(#b${id})`} className="stroke-white/0 dark:stroke-white/25" strokeWidth=".8" strokeLinejoin="round" />
      <path d="M27.4 14.2c.2-4.6-.6-8-2.8-9.9-2.6.6-4.9 2-6.8 3.9Z" fill={`url(#b${id})`} className="stroke-white/0 dark:stroke-white/25" strokeWidth=".8" strokeLinejoin="round" />
      <circle cx="16" cy="17.5" r="12.5" fill={`url(#b${id})`} className="stroke-white/0 dark:stroke-white/25" strokeWidth=".8" strokeLinejoin="round" />
      <path d="M7.9 6.4c-.9 1.2-1.2 2.7-1.2 4.3l3.9-2.6c-.8-.8-1.7-1.4-2.7-1.7Z M24.1 6.4c.9 1.2 1.2 2.7 1.2 4.3l-3.9-2.6c.8-.8 1.7-1.4 2.7-1.7Z" fill={`url(#e${id})`} opacity=".9" />
      <circle cx="11.6" cy="16.4" r="1.6" fill={`url(#e${id})`} />
      <circle cx="20.4" cy="16.4" r="1.6" fill={`url(#e${id})`} />
      <path d="M12.2 21.2c1.1 1.3 2.4 1.9 3.8 1.9s2.7-.6 3.8-1.9" stroke={`url(#e${id})`} strokeWidth="1.9" strokeLinecap="round" fill="none" />
    </svg>
  );
}
/** Back-compat alias used across the UI. */
export const HerOrb = KuroMark;
