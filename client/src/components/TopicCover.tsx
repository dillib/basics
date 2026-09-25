import { useMemo, type CSSProperties, type ReactNode } from "react";
import { makeRng, seedFromString } from "@shared/particle-sim";
import { categoryTheme, type CoverMotif } from "@/lib/categoryTheme";

/**
 * Generative cover art for a topic: a motif suited to its field (orbits for
 * physics, circuit traces for technology, branching growth for biology...),
 * tinted in the field's hue and seeded from the slug -- unique per topic,
 * identical on every visit. Pure SVG: no requests, no AI, crisp at any size.
 */

const W = 320;
const H = 120;

// Colors come from CSS custom properties so one render works in both themes
// (the wrapper sets --cat-h; dark mode lifts lightness via --cat-l).
const ink = (alpha = 1): CSSProperties => ({ stroke: `hsl(var(--cat-h) 70% var(--cat-l) / ${alpha})` });
const fill = (alpha = 1): CSSProperties => ({ fill: `hsl(var(--cat-h) 70% var(--cat-l) / ${alpha})` });

type Rng = () => number;
const between = (rng: Rng, a: number, b: number) => a + rng() * (b - a);

function orbits(rng: Rng): ReactNode {
  const cx = between(rng, 90, 230), cy = H / 2;
  const rings = 2 + Math.floor(rng() * 2);
  return (
    <g>
      {Array.from({ length: rings }, (_, i) => {
        const rx = 34 + i * 26 + rng() * 10, ry = rx * between(rng, 0.32, 0.5), rot = between(rng, -35, 35);
        const t = rng() * Math.PI * 2;
        // Electron position on the rotated ellipse.
        const ex = rx * Math.cos(t), ey = ry * Math.sin(t), r = (rot * Math.PI) / 180;
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="none" style={ink(0.45)} strokeWidth={1.2} />
            <circle cx={cx + ex * Math.cos(r) - ey * Math.sin(r)} cy={cy + ex * Math.sin(r) + ey * Math.cos(r)} r={3.2} style={fill(0.9)} />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={7} style={fill(0.85)} />
      <circle cx={cx} cy={cy} r={14} style={fill(0.15)} />
    </g>
  );
}

function circuit(rng: Rng): ReactNode {
  const traces = 5 + Math.floor(rng() * 3);
  return (
    <g>
      {Array.from({ length: traces }, (_, i) => {
        let x = between(rng, -10, 60);
        let y = 14 + (i * (H - 28)) / (traces - 1);
        const pts = [`${x},${y}`];
        const segments = 2 + Math.floor(rng() * 3);
        for (let s = 0; s < segments; s++) {
          x += between(rng, 30, 80);
          pts.push(`${x},${y}`);
          if (rng() < 0.6) {
            y = Math.min(H - 10, Math.max(10, y + (rng() < 0.5 ? -1 : 1) * between(rng, 10, 22)));
            x += 12; // 45-degree jog
            pts.push(`${x},${y}`);
          }
        }
        return (
          <g key={i}>
            <polyline points={pts.join(" ")} fill="none" style={ink(0.5)} strokeWidth={1.4} strokeLinejoin="round" />
            <circle cx={x} cy={y} r={3.4} style={fill(0.9)} />
            <circle cx={x} cy={y} r={6.5} fill="none" style={ink(0.35)} strokeWidth={1} />
          </g>
        );
      })}
    </g>
  );
}

function branches(rng: Rng): ReactNode {
  const lines: ReactNode[] = [];
  const leaves: ReactNode[] = [];
  const grow = (x: number, y: number, angle: number, len: number, depth: number) => {
    const x2 = x + Math.cos(angle) * len, y2 = y + Math.sin(angle) * len;
    lines.push(<line key={lines.length} x1={x} y1={y} x2={x2} y2={y2} style={ink(0.3 + depth * 0.1)} strokeWidth={0.8 + depth * 0.6} strokeLinecap="round" />);
    if (depth === 0) {
      leaves.push(<circle key={leaves.length} cx={x2} cy={y2} r={between(rng, 2, 3.6)} style={fill(0.8)} />);
      return;
    }
    const spread = between(rng, 0.35, 0.6);
    grow(x2, y2, angle - spread, len * between(rng, 0.62, 0.8), depth - 1);
    grow(x2, y2, angle + spread, len * between(rng, 0.62, 0.8), depth - 1);
  };
  const trunks = 1 + Math.floor(rng() * 3);
  for (let t = 0; t < trunks; t++) {
    // Spread trunks across the width, with jitter, so covers differ.
    const x = ((t + 0.5) / trunks) * W + between(rng, -40, 40);
    grow(x, H + 4, -Math.PI / 2 + between(rng, -0.3, 0.3), between(rng, 22, 36), 3 + Math.floor(rng() * 2));
  }
  return <g>{lines}{leaves}</g>;
}

function growth(rng: Rng): ReactNode {
  // Vary count and bar width per topic so a grid of business topics
  // doesn't repeat the same chart.
  const n = 5 + Math.floor(rng() * 6);
  let bw = between(rng, 10, 22), gap = between(rng, 8, 16);
  // Many wide bars can exceed the cover; shrink to fit with side margin.
  const fit = Math.min(1, (W - 40) / (n * bw + (n - 1) * gap));
  bw *= fit; gap *= fit;
  const x0 = (W - (n * bw + (n - 1) * gap)) / 2;
  let v = between(rng, 0.18, 0.3);
  const tops: [number, number][] = [];
  const bars = Array.from({ length: n }, (_, i) => {
    v = Math.min(0.92, Math.max(0.1, v + between(rng, -0.05, 0.16))); // upward drift, with dips
    const h = v * (H - 20), x = x0 + i * (bw + gap), y = H - 8 - h;
    tops.push([x + bw / 2, y]);
    return <rect key={i} x={x} y={y} width={bw} height={h} rx={3} style={fill(0.18 + (i / n) * 0.3)} />;
  });
  return (
    <g>
      {bars}
      <polyline points={tops.map((p) => p.join(",")).join(" ")} fill="none" style={ink(0.75)} strokeWidth={1.8} strokeLinejoin="round" />
      {tops.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.6} style={fill(0.95)} />)}
    </g>
  );
}

function plot(rng: Rng): ReactNode {
  const amp = between(rng, 18, 32), freq = between(rng, 1.2, 2.4), phase = rng() * Math.PI * 2, tilt = between(rng, -0.12, 0.12);
  const f = (x: number) => H / 2 + amp * Math.sin((x / W) * Math.PI * 2 * freq + phase) + tilt * (x - W / 2);
  const d = Array.from({ length: 65 }, (_, i) => {
    const x = (i / 64) * W;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${f(x).toFixed(1)}`;
  }).join(" ");
  return (
    <g>
      {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={(i + 1) * 32} y1={0} x2={(i + 1) * 32} y2={H} style={ink(0.1)} strokeWidth={1} />)}
      {Array.from({ length: 3 }, (_, i) => <line key={`h${i}`} x1={0} y1={(i + 1) * 30} x2={W} y2={(i + 1) * 30} style={ink(0.1)} strokeWidth={1} />)}
      <path d={d} fill="none" style={ink(0.8)} strokeWidth={2} />
      {Array.from({ length: 7 }, (_, i) => {
        const x = between(rng, 20, W - 20);
        return <circle key={i} cx={x} cy={f(x) + between(rng, -9, 9)} r={2.6} style={fill(0.65)} />;
      })}
    </g>
  );
}

function constellation(rng: Rng): ReactNode {
  const pts: [number, number][] = [];
  for (let tries = 0; pts.length < 9 && tries < 200; tries++) {
    const p: [number, number] = [between(rng, 18, W - 18), between(rng, 16, H - 16)];
    if (pts.every(([x, y]) => Math.hypot(x - p[0], y - p[1]) > 34)) pts.push(p);
  }
  // Connect each point to its nearest neighbor (plus a second for half),
  // which reads as structure rather than a random scribble.
  const edges = new Set<string>();
  pts.forEach((p, i) => {
    const near = pts.map((q, j) => ({ j, d: Math.hypot(q[0] - p[0], q[1] - p[1]) })).filter((e) => e.j !== i).sort((a, b) => a.d - b.d);
    near.slice(0, i % 2 === 0 ? 2 : 1).forEach(({ j }) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });
  const hub = Math.floor(rng() * pts.length);
  return (
    <g>
      {Array.from(edges).map((e) => {
        const [a, b] = e.split("-").map(Number);
        return <line key={e} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} style={ink(0.4)} strokeWidth={1.2} />;
      })}
      {pts.map(([x, y], i) => (
        <g key={i}>
          {i === hub && <circle cx={x} cy={y} r={11} style={fill(0.15)} />}
          <circle cx={x} cy={y} r={i === hub ? 5 : 3} style={fill(i === hub ? 0.95 : 0.75)} />
        </g>
      ))}
    </g>
  );
}

const MOTIFS: Record<CoverMotif, (rng: Rng) => ReactNode> = { orbits, circuit, branches, growth, plot, constellation };

export default function TopicCover({
  slug,
  category,
  className = "",
}: {
  slug: string;
  category: string | null | undefined;
  className?: string;
}) {
  const theme = categoryTheme(category);
  const art = useMemo(() => MOTIFS[theme.motif](makeRng(seedFromString(slug))), [slug, theme.motif]);
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden [--cat-l:46%] dark:[--cat-l:68%] ${className}`}
      style={{
        ["--cat-h" as string]: theme.hue,
        background: `linear-gradient(135deg, hsl(${theme.hue} 75% 60% / 0.16), hsl(${theme.hue + 30} 75% 60% / 0.05))`,
      } as CSSProperties}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        {art}
      </svg>
    </div>
  );
}

/** Small colored dot + field name, matching the cover hue. */
export function CategoryBadge({ category }: { category: string | null | undefined }) {
  const theme = categoryTheme(category);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: `hsl(${theme.hue} 70% 52%)` }} />
      {theme.name}
    </span>
  );
}
