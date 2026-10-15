import { useEffect, useRef } from "react";

interface OrbProps {
  size?: number;
  className?: string;
  /** "idle" = slow breathing | "thinking" = faster spin | "speaking" = pulse */
  state?: "idle" | "thinking" | "speaking";
}

export function KuroMark({ size = 52, className = "", state = "idle" }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef  = useRef<number>(0);
  const reducedMotion = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r  = size * 0.38;

    // Particles
    const PARTICLE_COUNT = reducedMotion ? 0 : 18;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: r * (0.55 + Math.random() * 0.6),
      speed:  0.003 + Math.random() * 0.006,
      size:   0.8 + Math.random() * 1.8,
      alpha:  0.2 + Math.random() * 0.5,
      color:  Math.random() > 0.5 ? "#00F0FF" : "#7B2CBF",
    }));

    let blinkT = 0;
    let nextBlink = 3 + Math.random() * 4;

    function draw(timestamp: number) {
      if (!ctx) return;
      const dt = (timestamp - timeRef.current) / 1000;
      timeRef.current = timestamp;
      const t = timestamp / 1000;
      ctx.clearRect(0, 0, size, size);

      // Speed factor by state
      const speedMul = state === "thinking" ? 3 : state === "speaking" ? 1.8 : 1;

      // ── Outer glow rings ─────────────────────────────────────────
      if (!reducedMotion) {
        const ringScales = [1.55, 1.38, 1.2];
        const ringAlphas = [0.06, 0.1, 0.16];
        ringScales.forEach((rs, i) => {
          const pulse = Math.sin(t * 0.8 * speedMul + i * 1.1) * 0.04;
          const grad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * (rs + pulse));
          grad.addColorStop(0, `rgba(0,240,255,${ringAlphas[i]})`);
          grad.addColorStop(0.5, `rgba(123,44,191,${ringAlphas[i] * 0.6})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.arc(cx, cy, r * (rs + pulse), 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        });
      }

      // ── Main orb body ─────────────────────────────────────────────
      const breathe = reducedMotion ? 0 : Math.sin(t * 0.9 * speedMul) * r * 0.025;
      const orbR = r + breathe;

      // Rotating mesh gradient (two layers)
      const angle1 = t * 0.15 * speedMul;
      const angle2 = t * 0.22 * speedMul + Math.PI;

      // Layer 1: violet → deep blue
      const g1 = ctx.createRadialGradient(
        cx + Math.cos(angle1) * r * 0.3, cy + Math.sin(angle1) * r * 0.3, 0,
        cx, cy, orbR * 1.1
      );
      g1.addColorStop(0, "#4B1E85");
      g1.addColorStop(0.5, "#1B1736");
      g1.addColorStop(1, "#030308");
      ctx.beginPath();
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
      ctx.fillStyle = g1;
      ctx.fill();

      // Layer 2: cyan shimmer overlay
      const g2 = ctx.createRadialGradient(
        cx + Math.cos(angle2) * r * 0.35, cy + Math.sin(angle2) * r * 0.25, 0,
        cx, cy, orbR
      );
      g2.addColorStop(0, "rgba(0,240,255,0.18)");
      g2.addColorStop(0.4, "rgba(0,119,255,0.08)");
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
      ctx.fillStyle = g2;
      ctx.fill();

      // Rim light
      const rim = ctx.createLinearGradient(cx - orbR, cy - orbR, cx + orbR, cy + orbR);
      rim.addColorStop(0, "rgba(0,240,255,0.22)");
      rim.addColorStop(0.5, "rgba(255,255,255,0)");
      rim.addColorStop(1, "rgba(123,44,191,0.15)");
      ctx.beginPath();
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // ── Cat ears ─────────────────────────────────────────────────
      const earGrad = ctx.createLinearGradient(cx, cy - orbR, cx, cy - orbR * 1.6);
      earGrad.addColorStop(0, "#4B1E85");
      earGrad.addColorStop(1, "#7B2CBF");

      // Left ear
      ctx.beginPath();
      ctx.moveTo(cx - orbR * 0.52, cy - orbR * 0.75);
      ctx.lineTo(cx - orbR * 0.78, cy - orbR * 1.4);
      ctx.lineTo(cx - orbR * 0.18, cy - orbR * 0.92);
      ctx.closePath();
      ctx.fillStyle = earGrad;
      ctx.fill();
      // Left ear inner
      const innerEar = ctx.createLinearGradient(cx, cy, cx, cy - orbR * 1.5);
      innerEar.addColorStop(0, "rgba(0,240,255,0.3)");
      innerEar.addColorStop(1, "rgba(0,240,255,0.05)");
      ctx.beginPath();
      ctx.moveTo(cx - orbR * 0.52, cy - orbR * 0.82);
      ctx.lineTo(cx - orbR * 0.7, cy - orbR * 1.25);
      ctx.lineTo(cx - orbR * 0.28, cy - orbR * 0.92);
      ctx.closePath();
      ctx.fillStyle = innerEar;
      ctx.fill();

      // Right ear
      ctx.beginPath();
      ctx.moveTo(cx + orbR * 0.52, cy - orbR * 0.75);
      ctx.lineTo(cx + orbR * 0.78, cy - orbR * 1.4);
      ctx.lineTo(cx + orbR * 0.18, cy - orbR * 0.92);
      ctx.closePath();
      ctx.fillStyle = earGrad;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + orbR * 0.52, cy - orbR * 0.82);
      ctx.lineTo(cx + orbR * 0.7, cy - orbR * 1.25);
      ctx.lineTo(cx + orbR * 0.28, cy - orbR * 0.92);
      ctx.closePath();
      ctx.fillStyle = innerEar;
      ctx.fill();

      // ── Eyes with blinking ───────────────────────────────────────
      blinkT += dt;
      if (blinkT > nextBlink && !reducedMotion) {
        blinkT = 0;
        nextBlink = 3 + Math.random() * 5;
      }
      const blinkPhase = blinkT < 0.15 ? blinkT / 0.15 : blinkT < 0.3 ? 1 - (blinkT - 0.15) / 0.15 : 0;
      const eyeScaleY = reducedMotion ? 1 : 1 - blinkPhase * 0.92;

      const eyeY  = cy + orbR * 0.02;
      const eyeX1 = cx - orbR * 0.32;
      const eyeX2 = cx + orbR * 0.32;
      const eyeRx = orbR * 0.13;
      const eyeRy = orbR * 0.1 * eyeScaleY;

      [eyeX1, eyeX2].forEach(ex => {
        // Glow
        const eyeGlow = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, eyeRx * 2.5);
        eyeGlow.addColorStop(0, "rgba(0,240,255,0.4)");
        eyeGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeRx * 2, eyeRy * 2.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = eyeGlow;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#00F0FF";
        ctx.fill();
        // Pupil
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeRx * 0.45, eyeRy * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#030308";
        ctx.fill();
      });

      // ── Mouth (small curved smile, always visible) ───────────────
      const mouthY = cy + orbR * 0.45;
      ctx.beginPath();
      ctx.moveTo(cx - orbR * 0.22, mouthY);
      ctx.quadraticCurveTo(cx, mouthY + orbR * 0.12, cx + orbR * 0.22, mouthY);
      ctx.strokeStyle = "rgba(255,51,102,0.7)";
      ctx.lineWidth = orbR * 0.065;
      ctx.lineCap = "round";
      ctx.stroke();

      // ── Particles ────────────────────────────────────────────────
      particles.forEach(p => {
        p.angle += p.speed * speedMul * (reducedMotion ? 0 : 1);
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius;
        const a  = p.alpha * (0.6 + Math.sin(t * 2 + p.angle) * 0.4);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color === "#00F0FF"
          ? `rgba(0,240,255,${a})`
          : `rgba(123,44,191,${a})`;
        ctx.fill();
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [size, state, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={className}
      aria-label="Kuro-chan"
      role="img"
    />
  );
}

export const HerOrb = KuroMark;
