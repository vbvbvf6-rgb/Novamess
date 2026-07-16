import React, { useEffect, useRef } from "react";

/** Floating gradient-orb layer + tiny star-particles.
 *  Pure CSS orbs (GPU-only, no JS paint loop).
 *  Canvas particles use a single rAF loop; auto-cleaned on unmount.
 */
export function AnimatedBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    let raf: number;
    let alive = true;

    interface Particle {
      x: number; y: number; r: number;
      o: number; speed: number; drift: number; phase: number;
    }

    let particles: Particle[] = [];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      const count = Math.min(Math.floor((W * H) / 9000), 80);
      particles = Array.from({ length: count }, () => ({
        x: rand(0, W), y: rand(0, H),
        r: rand(0.4, 1.8),
        o: rand(0.03, 0.14),
        speed: rand(0.04, 0.18),
        drift: rand(-0.08, 0.08),
        phase: rand(0, Math.PI * 2),
      }));
    };

    const draw = (t: number) => {
      if (!alive) return;
      ctx.clearRect(0, 0, W, H);
      const ts = t / 1000;
      for (const p of particles) {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -4) { p.y = H + 4; p.x = rand(0, W); }
        if (p.x < -4 || p.x > W + 4) { p.x = rand(0, W); p.y = rand(0, H); }
        const pulse = 0.55 + 0.45 * Math.sin(ts * 1.2 + p.phase);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        // Alternate between blue-white and warm-gold tones
        const warm = p.phase > Math.PI;
        ctx.fillStyle = warm
          ? `rgba(255,190,80,${p.o * pulse})`
          : `rgba(160,200,255,${p.o * pulse})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    raf = requestAnimationFrame(draw);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden
    >
      {/* ── Star-particle canvas ─────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: "screen" }}
      />

      {/* ── Floating gradient orbs ───────────────────────────── */}

      {/* Orb 1 — Blue / primary  (top-left area) */}
      <div
        className="absolute rounded-full"
        style={{
          width: 680, height: 680,
          top: "-18%", left: "-12%",
          background: "radial-gradient(circle, hsl(213 94% 62% / 0.13) 0%, transparent 70%)",
          filter: "blur(72px)",
          animation: "orb-drift-1 28s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Orb 2 — Violet / purple  (top-right area) */}
      <div
        className="absolute rounded-full"
        style={{
          width: 560, height: 560,
          top: "5%", right: "-15%",
          background: "radial-gradient(circle, hsl(265 75% 65% / 0.11) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "orb-drift-2 34s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Orb 3 — Amber / Nova-brand  (center-bottom) */}
      <div
        className="absolute rounded-full"
        style={{
          width: 500, height: 500,
          bottom: "-10%", left: "30%",
          background: "radial-gradient(circle, hsl(30 100% 58% / 0.09) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "orb-drift-3 38s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Orb 4 — Indigo  (bottom-left) */}
      <div
        className="absolute rounded-full"
        style={{
          width: 420, height: 420,
          bottom: "5%", left: "-10%",
          background: "radial-gradient(circle, hsl(240 70% 68% / 0.09) 0%, transparent 70%)",
          filter: "blur(70px)",
          animation: "orb-drift-4 44s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Orb 5 — Cyan accent  (mid-right) */}
      <div
        className="absolute rounded-full"
        style={{
          width: 340, height: 340,
          top: "40%", right: "5%",
          background: "radial-gradient(circle, hsl(190 80% 60% / 0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "orb-drift-1 52s ease-in-out infinite reverse",
          willChange: "transform",
        }}
      />

      {/* Aurora-shimmer horizontal band */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "35%", height: 220,
          background: "linear-gradient(90deg, transparent 0%, hsl(213 94% 62% / 0.05) 25%, hsl(265 75% 65% / 0.07) 50%, hsl(30 100% 58% / 0.04) 75%, transparent 100%)",
          filter: "blur(40px)",
          animation: "aurora-shift 18s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />

      {/* Subtle noise-vignette overlay — adds micro-texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "160px 160px",
          opacity: 0.025,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
