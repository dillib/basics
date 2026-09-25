import { useEffect, useRef } from "react";
import { makeRng } from "@shared/particle-sim";

/**
 * Generative hero backdrop: drifting points that periodically gather into
 * small connected constellations, hold, and let go -- scattered pieces
 * becoming structure, which is what the product does to a topic.
 *
 * Masked away from the center so the headline and search stay clean.
 * Pauses when off-screen or in a hidden tab; reduced motion shows a still
 * frame with a few constellations already formed.
 */

interface Dot { x: number; y: number; vx: number; vy: number; tx: number | null; ty: number | null }
interface Constellation { members: number[]; born: number }

const DOTS = 90;
const FORM_MS = 1400;   // gather
const HOLD_MS = 2600;   // hold the shape
const LIFE_MS = 5200;   // then release
const EVERY_MS = 1700;  // a new constellation this often
const MAX_ALIVE = 3;

// Small convex shapes in unit coords, listed in perimeter order because
// they're drawn as a closed loop: triangle, pentagon, hexagon.
const SHAPES: ReadonlyArray<ReadonlyArray<[number, number]>> = [
  [[0, -1], [0.87, 0.5], [-0.87, 0.5]],
  [[0, -1], [0.95, -0.31], [0.59, 0.81], [-0.59, 0.81], [-0.95, -0.31]],
  [[1, 0], [0.5, 0.87], [-0.5, 0.87], [-1, 0], [-0.5, -0.87], [0.5, -0.87]],
];

function themeHsl(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  return v || "250 70% 55%";
}

export default function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rng = makeRng(7);
    let w = 0, h = 0, dpr = 1;
    let color = themeHsl();
    const dots: Dot[] = Array.from({ length: DOTS }, () => ({
      x: rng(), y: rng(), vx: (rng() - 0.5) * 0.0004, vy: (rng() - 0.5) * 0.0004, tx: null, ty: null,
    }));
    const alive: Constellation[] = [];
    let lastSpawn = -Infinity;
    let frame = 0;
    let visible = true;

    // Constellations form only in the side margins: the content column
    // (headline, search, topic chips, trust row) spans nearly the full hero
    // height, so any central anchor ends up drawing lines over it.
    const pickAnchor = (): [number, number] => {
      const x = 0.05 + rng() * 0.11;
      return [rng() < 0.5 ? x : 1 - x, 0.12 + rng() * 0.76];
    };

    const spawn = (now: number) => {
      const busy = new Set(alive.flatMap((c) => c.members));
      const shape = SHAPES[Math.floor(rng() * SHAPES.length)];
      const [ax, ay] = pickAnchor();
      const free = dots.map((d, i) => ({ i, d: (d.x - ax) ** 2 + (d.y - ay) ** 2 }))
        .filter(({ i }) => !busy.has(i))
        .sort((a, b) => a.d - b.d)
        .slice(0, shape.length);
      if (free.length < shape.length) return;
      // Radius in normalized units, corrected for aspect so shapes aren't squashed.
      const r = 0.045, sx = h / Math.max(w, 1);
      free.forEach(({ i }, k) => {
        dots[i].tx = ax + shape[k][0] * r * sx;
        dots[i].ty = ay + shape[k][1] * r;
      });
      alive.push({ members: free.map((f) => f.i), born: now });
    };

    const release = (c: Constellation) => {
      for (const i of c.members) {
        dots[i].tx = dots[i].ty = null;
        dots[i].vx = (rng() - 0.5) * 0.0012;
        dots[i].vy = (rng() - 0.5) * 0.0012;
      }
    };

    const step = (now: number) => {
      if (now - lastSpawn > EVERY_MS && alive.length < MAX_ALIVE) { spawn(now); lastSpawn = now; }
      for (let k = alive.length - 1; k >= 0; k--) {
        if (now - alive[k].born > LIFE_MS) { release(alive[k]); alive.splice(k, 1); }
      }
      for (const d of dots) {
        if (d.tx !== null && d.ty !== null) {
          d.x += (d.tx - d.x) * 0.06;
          d.y += (d.ty - d.y) * 0.06;
        } else {
          d.vx = (d.vx + (rng() - 0.5) * 0.00004) * 0.995;
          d.vy = (d.vy + (rng() - 0.5) * 0.00004) * 0.995;
          d.x += d.vx; d.y += d.vy;
          if (d.x < 0 || d.x > 1) d.vx = -d.vx;
          if (d.y < 0 || d.y > 1) d.vy = -d.vy;
          d.x = Math.min(1, Math.max(0, d.x)); d.y = Math.min(1, Math.max(0, d.y));
        }
      }
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w * dpr, h * dpr);
      // Constellation edges: fade in while forming, out while releasing.
      for (const c of alive) {
        const age = now - c.born;
        const a = age < FORM_MS ? age / FORM_MS : age < FORM_MS + HOLD_MS ? 1 : Math.max(0, 1 - (age - FORM_MS - HOLD_MS) / (LIFE_MS - FORM_MS - HOLD_MS));
        ctx.strokeStyle = `hsl(${color} / ${0.35 * a})`;
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        const pts = c.members.map((i) => dots[i]);
        pts.forEach((p, k) => {
          const q = pts[(k + 1) % pts.length];
          ctx.moveTo(p.x * w * dpr, p.y * h * dpr);
          ctx.lineTo(q.x * w * dpr, q.y * h * dpr);
        });
        ctx.stroke();
      }
      const inShape = new Set(alive.flatMap((c) => c.members));
      dots.forEach((d, i) => {
        ctx.fillStyle = `hsl(${color} / ${inShape.has(i) ? 0.75 : 0.28})`;
        ctx.beginPath();
        ctx.arc(d.x * w * dpr, d.y * h * dpr, (inShape.has(i) ? 2.4 : 1.6) * dpr, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    };

    const loop = (now: number) => {
      if (visible && !document.hidden) { step(now); draw(now); }
      frame = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    const mo = new MutationObserver(() => { color = themeHsl(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    if (reduce) {
      // A still frame with constellations already formed and held.
      for (let t = 0; t < MAX_ALIVE; t++) spawn(0);
      for (let t = 0; t < 120; t++) step(FORM_MS);
      draw(FORM_MS + 1);
    } else {
      frame = requestAnimationFrame(loop);
    }

    return () => { cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); mo.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_50%_45%_at_50%_45%,transparent_35%,black_85%)]"
    />
  );
}
