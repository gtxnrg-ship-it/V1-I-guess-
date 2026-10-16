import { useEffect, useRef, useState } from "react";

interface OrbProps {
  size?: number;
  className?: string;
  /** The orb changes its light and movement to reflect what Kuro-chan is doing. */
  state?: "idle" | "thinking" | "speaking" | "listening";
}

type Particle = { angle: number; radius: number; speed: number; size: number; alpha: number; hue: number };

export function KuroMark({ size = 52, className = "", state = "idle" }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.31;
    const particles: Particle[] = Array.from({ length: reducedMotion ? 0 : 16 }, (_, i) => ({
      angle: (Math.PI * 2 * i) / 16 + Math.random() * 0.3,
      radius: r * (1.18 + Math.random() * 0.52),
      speed: 0.08 + Math.random() * 0.12,
      size: Math.max(0.7, size * (0.012 + Math.random() * 0.012)),
      alpha: 0.28 + Math.random() * 0.42,
      hue: Math.random() > 0.55 ? 188 : 258,
    }));

    let previous = 0;
    let elapsed = 0;
    let disposed = false;
    const motionScale = state === "thinking" ? 1.65 : state === "speaking" ? 1.25 : state === "listening" ? 0.72 : 1;
    const colors = state === "listening"
      ? { a: "#75f3ff", b: "#52b9ff", c: "#a6fff4" }
      : state === "speaking"
        ? { a: "#9beaff", b: "#9c8cff", c: "#e4f7ff" }
        : state === "thinking"
          ? { a: "#7deaff", b: "#9b83ff", c: "#c7c2ff" }
          : { a: "#83eff5", b: "#827cff", c: "#d6fbff" };

    const draw = (timestamp: number) => {
      if (disposed) return;
      const dt = previous ? Math.min((timestamp - previous) / 1000, 0.05) : 0;
      previous = timestamp;
      elapsed += dt * motionScale;
      const t = elapsed;
      ctx.clearRect(0, 0, size, size);

      // A soft ambient halo — no face, eyes, mouth, or sharp silhouette.
      const pulse = reducedMotion ? 1 : 1 + Math.sin(t * (state === "listening" ? 2.8 : 1.35)) * 0.045;
      const halo = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r * 2.15 * pulse);
      halo.addColorStop(0, state === "listening" ? "rgba(79,226,255,0.24)" : "rgba(111,133,255,0.19)");
      halo.addColorStop(0.52, "rgba(92,105,255,0.08)");
      halo.addColorStop(1, "rgba(4,8,22,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size, size);

      const coreR = r * pulse;
      const gx = cx + Math.cos(t * 0.72) * r * 0.26;
      const gy = cy + Math.sin(t * 0.61) * r * 0.23;
      // A softly deforming contour gives Kuro-chan a living, liquid silhouette
      // instead of the perfectly round, mechanical ball seen in the earlier build.
      const drawBlobPath = () => {
        ctx.beginPath();
        const points = 64;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const wave = reducedMotion ? 0 : Math.sin(angle * 3 + t * 0.82) * 0.045 + Math.cos(angle * 2 - t * 0.57) * 0.035 + Math.sin(angle * 5 - t * 0.38) * 0.016;
          const radius = coreR * (1 + wave);
          const px = cx + Math.cos(angle) * radius;
          const py = cy + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      };
      const core = ctx.createRadialGradient(gx - coreR * 0.25, gy - coreR * 0.3, coreR * 0.04, cx, cy, coreR * 1.35);
      core.addColorStop(0, colors.c);
      core.addColorStop(0.28, colors.a);
      core.addColorStop(0.66, colors.b);
      core.addColorStop(1, "#20254f");
      drawBlobPath();
      ctx.fillStyle = core;
      ctx.fill();

      // Slow, translucent currents make the core feel fluid instead of mechanical.
      ctx.save();
      drawBlobPath();
      ctx.clip();
      for (let i = 0; i < 3; i++) {
        const drift = reducedMotion ? 0 : t * (0.24 + i * 0.09) * (i % 2 ? -1 : 1);
        const bx = cx + Math.cos(drift + i * 2.1) * coreR * 0.38;
        const by = cy + Math.sin(drift * 0.85 + i * 1.7) * coreR * 0.34;
        const blobR = coreR * (0.52 + i * 0.06);
        const fluid = ctx.createRadialGradient(bx, by, 0, bx, by, blobR);
        fluid.addColorStop(0, i === 1 ? "rgba(255,255,255,0.26)" : "rgba(91,246,255,0.17)");
        fluid.addColorStop(1, "rgba(120,110,255,0)");
        ctx.fillStyle = fluid;
        ctx.fillRect(cx - coreR, cy - coreR, coreR * 2, coreR * 2);
      }
      ctx.restore();

      // A fine rim gives the orb definition without the harsh neon outline.
      drawBlobPath();
      ctx.strokeStyle = "rgba(206,248,255,0.46)";
      ctx.lineWidth = Math.max(0.65, size * 0.012);
      ctx.stroke();

      // Floating motes orbit outside the core; thinking adds a little energy.
      particles.forEach((p, i) => {
        if (!reducedMotion) p.angle += p.speed * dt * (state === "thinking" ? 1.8 : 1);
        const wobble = reducedMotion ? 0 : Math.sin(t * 0.8 + i) * r * 0.045;
        const px = cx + Math.cos(p.angle) * (p.radius + wobble);
        const py = cy + Math.sin(p.angle) * (p.radius + wobble);
        const alpha = p.alpha * (reducedMotion ? 1 : 0.75 + Math.sin(t * 1.7 + i) * 0.25);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.hue < 200 ? `rgba(116,235,255,${alpha})` : `rgba(174,151,255,${alpha})`;
        ctx.fill();
      });

      // Reduced-motion users get one clean, still render rather than a hidden RAF loop.
      if (!reducedMotion && !document.hidden) frameRef.current = requestAnimationFrame(draw);
    };

    const start = () => {
      cancelAnimationFrame(frameRef.current);
      previous = 0;
      frameRef.current = requestAnimationFrame(draw);
    };
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(frameRef.current);
      else if (!reducedMotion) start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      cancelAnimationFrame(frameRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [size, state, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size, display: "block" }}
      className={className}
      aria-hidden="true"
    />
  );
}

export const HerOrb = KuroMark;
