import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createParticles, makeRng, seedFromString, stepParticles, type Particle } from "@shared/particle-sim";
import type { SceneProps } from "./scenes";

// ~9s at 60fps, then the scene holds its end state (no endless battery drain).
const TICKS = 540;
const LABEL_SWITCH_AT = 0.55;

/** Read a shadcn-style "H S% L%" CSS variable as a usable color string. */
function themeColor(varName: string, fallback: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return raw ? `hsl(${raw})` : fallback;
}

export default function ParticlesScene({ spec, play, instant }: SceneProps<"particles">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ended, setEnded] = useState(instant);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Seeded from the caption: the same scene animates identically every visit.
    const rng = makeRng(seedFromString(spec.caption));
    const particles: Particle[] = createParticles(spec.mode, spec.mode === "mix" ? 140 : 120, rng);
    let tick = 0;
    let frame = 0;

    let colors = { a: "", b: "", barrier: "" };
    const readColors = () => {
      colors = {
        a: themeColor("--primary", "#7c3aed"),
        b: "hsl(38 92% 50%)",
        barrier: themeColor("--muted-foreground", "#888"),
      };
    };
    readColors();

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // The wall that "lifts" at the start of spread/mix, fading as it goes.
      if (spec.mode !== "cluster") {
        const fade = Math.max(0, 1 - tick / 90);
        if (fade > 0) {
          const x = (spec.mode === "spread" ? 0.21 : 0.5) * width;
          ctx.globalAlpha = 0.5 * fade;
          ctx.strokeStyle = colors.barrier;
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = Math.max(1, width / 400);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }

      const r = Math.max(1.6, width / 240);
      for (const p of particles) {
        ctx.fillStyle = p.group === 1 ? colors.b : colors.a;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Theme toggles flip the `dark` class on <html>; recolor without restarting.
    const mo = new MutationObserver(() => {
      readColors();
      draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    if (instant) {
      // Reduced motion: compute the end state up front and show it still.
      for (; tick < TICKS; tick++) stepParticles(particles, spec.mode, rng);
      resize();
    } else if (play) {
      resize();
      const loop = () => {
        stepParticles(particles, spec.mode, rng);
        tick++;
        draw();
        if (tick === Math.round(TICKS * LABEL_SWITCH_AT)) setEnded(true);
        if (tick < TICKS) frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    } else {
      resize();
    }

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
    };
  }, [spec, play, instant]);

  return (
    <div className="relative aspect-[5/2] w-full overflow-hidden rounded-lg border border-border bg-muted/30">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={`${spec.startLabel} to ${spec.endLabel}`} />
      <div className="pointer-events-none absolute left-2 top-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={ended ? "end" : "start"}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="inline-block rounded-md border bg-card/90 px-2 py-0.5 text-xs font-medium shadow-sm backdrop-blur"
          >
            {ended ? spec.endLabel : spec.startLabel}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
