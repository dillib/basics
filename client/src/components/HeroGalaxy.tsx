import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Topic } from "@shared/schema";
import { makeRng, seedFromString } from "@shared/particle-sim";
import { categoryTheme } from "@/lib/categoryTheme";
import { onHeroSignal, type HeroSignal } from "@/lib/heroSignals";

/**
 * The library as a living galaxy: every public topic is a star, colored by
 * its field, set along slowly rotating spiral arms (fields share an arm), in
 * a haze of dust. Mouse tilts the view. It answers the search box:
 *  - "matches": those topics' stars flare, get labels and threads of light
 *    to the search box
 *  - "thinking": the galaxy spirals inward while the AI works
 * Plain canvas 2D + a hand-rolled 3D projection -- no WebGL/three.js weight.
 * Pauses off-screen / in hidden tabs; reduced motion freezes rotation.
 */

interface Star {
  x: number; y: number; z: number; // galaxy space, radius ~1
  hue: number;
  size: number;
  phase: number;
  slug?: string;
  title?: string;
  glow: number; // eased 0..1 match highlight
}

const ARMS = 4;
const DUST = 1400;

function gauss(rng: () => number): number {
  // Box-Muller, clamped so outliers don't fling points off-screen.
  const u = Math.max(1e-6, rng()), v = rng();
  return Math.max(-3, Math.min(3, Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)));
}

function place(rng: () => number, arm: number, spreadScale = 1): Pick<Star, "x" | "y" | "z"> {
  const r = 0.1 + 0.9 * Math.sqrt(rng());
  const theta = (arm * 2 * Math.PI) / ARMS + r * 3.4 + gauss(rng) * 0.22 * spreadScale;
  return {
    x: r * Math.cos(theta),
    z: r * Math.sin(theta),
    y: gauss(rng) * 0.035 * (1.2 - r) * spreadScale,
  };
}

export default function HeroGalaxy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: topics } = useQuery<Topic[]>({ queryKey: ["/api/topics"], staleTime: 5 * 60 * 1000 });
  const starsRef = useRef<Star[]>([]);

  // (Re)build the star field when the topic list arrives.
  useEffect(() => {
    const dustRng = makeRng(11);
    // Most dust hugs the arms (that's what makes the spiral legible); a
    // thinner halo at wider spread keeps it from looking drawn-on.
    const dust: Star[] = Array.from({ length: DUST }, (_, i) => ({
      ...place(dustRng, Math.floor(dustRng() * ARMS), i < DUST * 0.8 ? 0.8 : 2),
      hue: (dustRng() - 0.5) * 60, // offset from the brand hue, resolved at draw time
      size: 0.45 + dustRng() * 0.85,
      phase: dustRng() * Math.PI * 2,
      glow: 0,
    }));
    const stars: Star[] = (topics ?? []).map((t) => {
      const theme = categoryTheme(t.category);
      const rng = makeRng(seedFromString(t.slug));
      // Fields share an arm, so a field reads as a band of one color.
      const arm = seedFromString(theme.name) % ARMS;
      return { ...place(rng, arm), hue: theme.hue, size: 1.6 + rng() * 1.2, phase: rng() * Math.PI * 2, slug: t.slug, title: t.title, glow: 0 };
    });
    starsRef.current = [...dust, ...stars];
  }, [topics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1;
    let dark = document.documentElement.classList.contains("dark");
    // Core glow + dust follow the theme primary, so a rebrand recolors the galaxy.
    const readBrandHue = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--primary")) || 250;
    let brandHue = readBrandHue();
    let visible = true, frame = 0, last = performance.now();
    let yaw = 0.6, spin = 0; // spin: extra angular speed while thinking
    let mx = 0, my = 0, emx = 0, emy = 0; // mouse target / eased
    let matches = new Set<string>();
    let thinking = 0, thinkingTarget = 0;
    let searchPoint: { x: number; y: number } | null = null;
    // Text blocks labels must never cover (headline, subtitle, chips...).
    let avoid: { l: number; t: number; r: number; b: number }[] = [];

    const measureSearch = () => {
      const b = canvas.getBoundingClientRect();
      const rel = (el: Element) => {
        const a = el.getBoundingClientRect();
        return { l: a.left - b.left - 8, t: a.top - b.top - 6, r: a.right - b.left + 8, b: a.bottom - b.top + 6 };
      };
      avoid = Array.from(document.querySelectorAll("[data-hero-avoid], [data-hero-search]")).map(rel);
      const el = document.querySelector<HTMLElement>("[data-hero-search]");
      if (!el) { searchPoint = null; return; }
      const a = el.getBoundingClientRect();
      searchPoint = { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      measureSearch();
    };

    const off = onHeroSignal((s: HeroSignal) => {
      if (s.type === "matches") { matches = new Set(s.slugs); thinkingTarget = 0; measureSearch(); }
      else if (s.type === "thinking") { thinkingTarget = reduce ? 0 : s.intensity; }
      else { matches = new Set(); thinkingTarget = 0; }
    });

    const onMouse = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      thinking += (thinkingTarget - thinking) * Math.min(1, dt * 2.5);
      spin += ((reduce ? 0 : 0.035 + thinking * 1.1) - spin) * Math.min(1, dt * 2);
      yaw += spin * dt;
      emx += (mx - emx) * Math.min(1, dt * 2);
      emy += (my - emy) * Math.min(1, dt * 2);

      const cx = w / 2 + emx * 18, cy = h * 0.6 + emy * 10;
      const R = Math.min(w * 0.55, h * 1.05);
      // Closer to top-down than edge-on, so the spiral arms read.
      const pitch = 0.92 + emy * 0.08;
      const cosY = Math.cos(yaw + emx * 0.2), sinY = Math.sin(yaw + emx * 0.2);
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      const squeeze = 1 - thinking * 0.4; // pull inward while thinking

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Soft galactic core.
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
      core.addColorStop(0, `hsla(${brandHue}, 90%, ${dark ? 70 : 60}%, ${0.16 + thinking * 0.16})`);
      core.addColorStop(1, `hsla(${brandHue}, 90%, 60%, 0)`);
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);

      const labels: { x: number; y: number; title: string; hue: number; glow: number }[] = [];
      for (const s of starsRef.current) {
        const x0 = s.x * squeeze, z0 = s.z * squeeze;
        const x1 = x0 * cosY - z0 * sinY;
        const z1 = x0 * sinY + z0 * cosY;
        const y2 = s.y * cosP - z1 * sinP;
        const z2 = s.y * sinP + z1 * cosP;
        const persp = 2.4 / (2.4 + z2);
        const px = cx + x1 * R * persp;
        const py = cy + y2 * R * persp;
        if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;

        const depth = Math.max(0.25, Math.min(1, 0.75 - z2 * 0.5));
        const twinkle = reduce ? 1 : 0.8 + 0.2 * Math.sin(now * 0.0015 + s.phase);
        const isTopic = !!s.slug;
        const hue = isTopic ? s.hue : brandHue + s.hue;
        if (isTopic) {
          const target = matches.has(s.slug!) ? 1 : 0;
          s.glow += (target - s.glow) * Math.min(1, dt * 5);
        }

        const light = dark ? (isTopic ? 68 : 75) : (isTopic ? 48 : 45);
        const alpha = (isTopic ? 0.85 : dark ? 0.32 : 0.22) * depth * twinkle + s.glow * 0.2;
        const size = s.size * persp * (1 + s.glow * 1.6);

        if (s.glow > 0.02) {
          const halo = ctx.createRadialGradient(px, py, 0, px, py, 18 * s.glow + 4);
          halo.addColorStop(0, `hsla(${s.hue}, 90%, ${light}%, ${0.55 * s.glow})`);
          halo.addColorStop(1, `hsla(${s.hue}, 90%, ${light}%, 0)`);
          ctx.fillStyle = halo;
          ctx.beginPath(); ctx.arc(px, py, 18 * s.glow + 4, 0, Math.PI * 2); ctx.fill();
          labels.push({ x: px, y: py, title: s.title!, hue: s.hue, glow: s.glow });
        }
        ctx.fillStyle = `hsla(${hue}, ${isTopic ? 85 : 60}%, ${light}%, ${Math.min(1, alpha)})`;
        ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
      }

      // Threads of light from matched stars to the search box, then labels on top.
      if (searchPoint && labels.length) {
        for (const l of labels) {
          const g = ctx.createLinearGradient(l.x, l.y, searchPoint.x, searchPoint.y);
          g.addColorStop(0, `hsla(${l.hue}, 90%, ${dark ? 70 : 50}%, ${0.5 * l.glow})`);
          g.addColorStop(1, `hsla(${l.hue}, 90%, ${dark ? 70 : 50}%, 0)`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(l.x, l.y);
          ctx.quadraticCurveTo((l.x + searchPoint.x) / 2, Math.min(l.y, searchPoint.y) - 40, searchPoint.x, searchPoint.y);
          ctx.stroke();
        }
      }
      ctx.font = "500 12px Inter, system-ui, sans-serif";
      ctx.textBaseline = "middle";
      let shown = 0;
      for (const l of labels) {
        if (shown >= 6) break;
        // Skip labels that would sit on page text; the star still glows and
        // keeps its thread, it just goes unnamed.
        const tw = ctx.measureText(l.title).width;
        const box = { l: l.x + 10, t: l.y - 8, r: l.x + 10 + tw, b: l.y + 8 };
        if (box.r > w - 4 || avoid.some((a) => box.l < a.r && box.r > a.l && box.t < a.b && box.b > a.t)) continue;
        shown++;
        ctx.fillStyle = dark ? `rgba(255,255,255,${0.9 * l.glow})` : `rgba(20,20,30,${0.85 * l.glow})`;
        ctx.shadowColor = dark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.9)";
        ctx.shadowBlur = 6;
        ctx.fillText(l.title, l.x + 10, l.y);
      }
      ctx.shadowBlur = 0;
    };

    const loop = (now: number) => {
      if (visible && !document.hidden) draw(now);
      else last = now;
      frame = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    const mo = new MutationObserver(() => { dark = document.documentElement.classList.contains("dark"); brandHue = readBrandHue(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("scroll", measureSearch, { passive: true });
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect(); io.disconnect(); mo.disconnect(); off();
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", measureSearch);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      // Dim (not hide) the band behind the headline so text stays crisp.
      className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_42%_30%_at_50%_34%,rgba(0,0,0,0.35),black_80%)]"
    />
  );
}
