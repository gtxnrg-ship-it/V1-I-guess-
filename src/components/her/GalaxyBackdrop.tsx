import { useEffect, useRef } from "react";

export function GalaxyBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stars = Array.from({ length: 110 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: 0.35 + Math.random() * 1.05,
      alpha: 0.18 + Math.random() * 0.58,
      phase: Math.random() * Math.PI * 2,
      drift: 0.000004 + Math.random() * 0.000012,
      tint: Math.random(),
    }));
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastPaint = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const paint = (time: number) => {
      if (time - lastPaint < 32 && !reducedMotion) {
        frame = requestAnimationFrame(paint);
        return;
      }
      lastPaint = time;
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        if (!reducedMotion) star.y -= star.drift * 32;
        if (star.y < -0.01) star.y = 1.01;
        const pulse = reducedMotion ? 1 : 0.72 + Math.sin(time * 0.001 + star.phase) * 0.28;
        const color = star.tint > 0.72 ? "151, 170, 255" : star.tint > 0.4 ? "111, 225, 255" : "235, 239, 255";
        context.beginPath();
        context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color}, ${star.alpha * pulse})`;
        context.fill();
      }
      if (!reducedMotion) frame = requestAnimationFrame(paint);
    };

    resize();
    paint(0);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="galaxy-backdrop" aria-hidden="true">
      <canvas ref={canvasRef} className="galaxy-stars" />
      <div className="galaxy-nebula" />
    </div>
  );
}