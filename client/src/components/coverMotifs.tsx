import type { CSSProperties, ReactNode } from "react";

/**
 * Topic-specific cover motifs (see lib/topicMotif.ts for which topic gets
 * which). Same rules as the category motifs in TopicCover: a 320x120 canvas
 * cropped to the card's shape (keep the subject near the vertical middle),
 * lines in Ink/Paper, points in Principle Gold, and every variation drawn
 * from the seeded rng so each topic's cover is unique but stable.
 */

export const W = 320;
export const H = 120;
export type Rng = () => number;

export const ink = (alpha = 1): CSSProperties => ({ stroke: `hsl(var(--foreground) / ${alpha * 0.8})` });
export const fill = (alpha = 1): CSSProperties => ({ fill: `hsl(var(--gold) / ${alpha})` });
export const between = (rng: Rng, a: number, b: number) => a + rng() * (b - a);
const line = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Sound, radio, light as a wave: stacked sine waves of varying frequency. */
function waves(rng: Rng): ReactNode {
  const n = 3 + Math.floor(rng() * 2);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const amp = between(rng, 8, 22), freq = between(rng, 1.5, 4), ph = rng() * 6.28, y0 = 60 + (i - (n - 1) / 2) * 10;
        const d = Array.from({ length: 81 }, (_, k) => { const x = (k / 80) * W; return `${k ? "L" : "M"}${x.toFixed(1)},${(y0 + amp * Math.sin((x / W) * 6.28 * freq + ph) * Math.sin((x / W) * 3.14)).toFixed(1)}`; }).join("");
        return <path key={i} d={d} {...line} style={ink(0.25 + (i / n) * 0.5)} strokeWidth={1.4} />;
      })}
      <circle cx={between(rng, 110, 210)} cy={60} r={4.5} style={fill(0.95)} />
    </g>
  );
}

/** Bridges and structures: an arch (or suspension cables) over a deck, with piers. */
function arch(rng: Rng): ReactNode {
  const spans = 1 + Math.floor(rng() * 2), deck = 78, span = 240 / spans, x0 = 40;
  const suspension = rng() < 0.5;
  return (
    <g>
      <line x1={10} y1={deck} x2={W - 10} y2={deck} style={ink(0.8)} strokeWidth={2.2} />
      {Array.from({ length: spans }, (_, i) => {
        const a = x0 + i * span, b = a + span, mid = (a + b) / 2, u = (x: number) => (x - mid) / (span / 2);
        // Arch: rises from the deck to `top` at mid-span. Suspension: a cable
        // hung between tower tops (`top`) sagging to just above the deck.
        const top = suspension ? 24 : 34, low = deck - 6;
        const curveY = (x: number) => (suspension ? low - (low - top) * u(x) ** 2 : deck - (deck - top) * (1 - u(x) ** 2));
        const hangers = Array.from({ length: 9 }, (_, k) => a + ((k + 1) * span) / 10);
        return (
          <g key={i}>
            <path
              d={suspension ? `M${a},${top} Q${mid},${2 * low - top} ${b},${top}` : `M${a},${deck} Q${mid},${2 * top - deck} ${b},${deck}`}
              {...line} style={ink(0.7)} strokeWidth={1.6}
            />
            {hangers.map((x, k) => <line key={k} x1={x} y1={deck} x2={x} y2={curveY(x)} style={ink(0.3)} strokeWidth={0.9} />)}
            {suspension && <><line x1={a} y1={top - 6} x2={a} y2={deck + 22} style={ink(0.8)} strokeWidth={2.4} /><line x1={b} y1={top - 6} x2={b} y2={deck + 22} style={ink(0.8)} strokeWidth={2.4} /></>}
          </g>
        );
      })}
      <circle cx={x0 + span / 2} cy={suspension ? deck - 6 : 34} r={4} style={fill(0.95)} />
    </g>
  );
}

/** The body: an ECG heartbeat trace. */
function pulse(rng: Rng): ReactNode {
  const beats = 2 + Math.floor(rng() * 2), base = 64;
  let d = `M0,${base}`, x = 0;
  const peaks: [number, number][] = [];
  const gap = W / (beats + 0.5);
  for (let b = 0; b < beats; b++) {
    x += between(rng, gap * 0.45, gap * 0.6);
    d += ` L${x},${base} L${x + 6},${base - 6} L${x + 11},${base} L${x + 15},${base + 8} L${x + 20},${base - 42} L${x + 25},${base + 16} L${x + 30},${base} L${x + 40},${base - 9} L${x + 50},${base}`;
    peaks.push([x + 20, base - 42]);
    x += 50;
  }
  d += ` L${W},${base}`;
  return (
    <g>
      <path d={d} {...line} style={ink(0.75)} strokeWidth={1.8} />
      {peaks.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={3.4} style={fill(0.95)} />)}
    </g>
  );
}

/** Genes and DNA: a double helix with base-pair rungs. */
function helix(rng: Rng): ReactNode {
  const amp = between(rng, 18, 26), turns = between(rng, 2.2, 3.2), ph = rng() * 6.28;
  const y = (x: number, s: number) => 60 + s * amp * Math.sin((x / W) * 6.28 * turns + ph);
  const path = (s: number) => Array.from({ length: 81 }, (_, k) => { const x = (k / 80) * W; return `${k ? "L" : "M"}${x.toFixed(1)},${y(x, s).toFixed(1)}`; }).join("");
  return (
    <g>
      {Array.from({ length: 22 }, (_, k) => { const x = 8 + k * 14; return <line key={k} x1={x} y1={y(x, 1)} x2={x} y2={y(x, -1)} style={ink(0.25)} strokeWidth={1.1} />; })}
      <path d={path(1)} {...line} style={ink(0.75)} strokeWidth={1.8} />
      <path d={path(-1)} {...line} style={ink(0.45)} strokeWidth={1.8} />
      {Array.from({ length: 4 }, (_, k) => { const x = 40 + k * 76 + between(rng, -10, 10); return <circle key={k} cx={x} cy={y(x, k % 2 ? 1 : -1)} r={3.4} style={fill(0.9)} />; })}
    </g>
  );
}

/** Minds and learning: neurons with branching dendrites, one firing. */
function neurons(rng: Rng): ReactNode {
  const count = 4 + Math.floor(rng() * 2);
  const cells: [number, number][] = Array.from({ length: count }, (_, i) => [30 + (i * (W - 60)) / (count - 1) + between(rng, -12, 12), between(rng, 32, 88)]);
  const firing = Math.floor(rng() * cells.length);
  return (
    <g>
      {cells.slice(1).map(([x, y], i) => {
        const [px, py] = cells[i];
        return <path key={`a${i}`} d={`M${px},${py} C${(px + x) / 2},${py - 30} ${(px + x) / 2},${y + 30} ${x},${y}`} {...line} style={ink(0.5)} strokeWidth={1.3} />;
      })}
      {cells.map(([x, y], i) => (
        <g key={i}>
          {Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * 6.28 + rng() * 0.8, l = between(rng, 14, 26), bx = x + Math.cos(a) * l, by = y + Math.sin(a) * l; return <g key={k}><line x1={x} y1={y} x2={bx} y2={by} style={ink(0.45)} strokeWidth={1.2} /><line x1={bx} y1={by} x2={bx + Math.cos(a + 0.6) * 8} y2={by + Math.sin(a + 0.6) * 8} style={ink(0.35)} strokeWidth={1} /><line x1={bx} y1={by} x2={bx + Math.cos(a - 0.6) * 8} y2={by + Math.sin(a - 0.6) * 8} style={ink(0.35)} strokeWidth={1} /></g>; })}
          {i === firing && <circle cx={x} cy={y} r={12} style={fill(0.15)} />}
          <circle cx={x} cy={y} r={i === firing ? 7 : 5.5} style={i === firing ? fill(0.95) : { fill: "hsl(var(--foreground) / 0.6)" }} />
        </g>
      ))}
    </g>
  );
}

/** Rockets and escape velocity: a launch arc from a planet's curve, dashed orbit. */
function trajectory(rng: Rng): ReactNode {
  const r = between(rng, 150, 190), cx = between(rng, 60, 110);
  const tipX = between(rng, 220, 280), tipY = between(rng, 24, 40);
  return (
    <g>
      <path d={`M${cx - r},${H + r - 40} A${r} ${r} 0 0 1 ${cx + r},${H + r - 40}`} {...line} style={ink(0.6)} strokeWidth={1.6} />
      <path d={`M${cx + 20},${H - 42} Q${cx + 70},${tipY - 10} ${tipX},${tipY}`} {...line} style={ink(0.75)} strokeWidth={1.8} strokeDasharray="4 5" />
      <ellipse cx={cx + 20} cy={H - 30} rx={r * 0.9} ry={34} {...line} style={ink(0.2)} strokeWidth={1} />
      <circle cx={tipX} cy={tipY} r={10} style={fill(0.15)} />
      <circle cx={tipX} cy={tipY} r={4.2} style={fill(0.95)} />
    </g>
  );
}

/** Flight, wind and weather: streamlines bending around an airfoil / flowing. */
function airflow(rng: Rng): ReactNode {
  const fx = between(rng, 110, 170);
  return (
    <g>
      <path d={`M${fx},60 C${fx + 20},46 ${fx + 70},48 ${fx + 110},60 C${fx + 70},64 ${fx + 20},66 ${fx},60 Z`} style={{ ...ink(0.8), fill: "hsl(var(--foreground) / 0.08)" }} strokeWidth={1.6} />
      {Array.from({ length: 7 }, (_, i) => {
        const y0 = 18 + i * 14, above = y0 < 60, k = Math.max(0, 1 - Math.abs(y0 - 60) / 50);
        const bend = (above ? -1 : 1) * 12 * k;
        return <path key={i} d={`M0,${y0} C${fx - 30},${y0} ${fx + 20},${y0 + bend} ${fx + 55},${y0 + bend} S${W - 40},${y0} ${W},${y0}`} {...line} style={ink(0.22 + k * 0.4)} strokeWidth={1.2} />;
      })}
      <circle cx={fx + 55} cy={33} r={3.6} style={fill(0.95)} />
    </g>
  );
}

/** Chemistry: a hexagonal ring molecule with side chains. */
function molecule(rng: Rng): ReactNode {
  const cx = between(rng, 120, 200), cy = 60, r = 20;
  const hex = Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos((i * Math.PI) / 3 + Math.PI / 6), cy + r * Math.sin((i * Math.PI) / 3 + Math.PI / 6)] as [number, number]);
  const chains = hex.filter(() => rng() < 0.6).map(([x, y]) => { const a = Math.atan2(y - cy, x - cx); return [x, y, x + Math.cos(a) * 26, y + Math.sin(a) * 26] as const; });
  return (
    <g>
      <polygon points={hex.map((p) => p.join(",")).join(" ")} {...line} style={ink(0.75)} strokeWidth={1.8} />
      <circle cx={cx} cy={cy} r={11} {...line} style={ink(0.35)} strokeWidth={1.2} />
      {chains.map(([x1, y1, x2, y2], i) => <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} style={ink(0.55)} strokeWidth={1.5} /><circle cx={x2} cy={y2} r={4.2} style={fill(0.9)} /></g>)}
      {Array.from({ length: 5 }, (_, i) => <circle key={`f${i}`} cx={between(rng, 12, W - 12)} cy={between(rng, 14, H - 14)} r={between(rng, 1.5, 2.8)} style={fill(0.35)} />)}
    </g>
  );
}

/** Gravity, black holes, the Big Bang: a grid warped into a well. */
function gravityWell(rng: Rng): ReactNode {
  const cx = between(rng, 120, 200), cy = 58;
  return (
    <g>
      {Array.from({ length: 7 }, (_, i) => {
        const rx = 16 + i * 22, ry = rx * 0.28;
        return <ellipse key={i} cx={cx} cy={cy + 10 - i * 2.2} rx={rx} ry={ry} {...line} style={ink(0.65 - i * 0.07)} strokeWidth={1.2} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 6.28;
        return <path key={`s${i}`} d={`M${cx + Math.cos(a) * 150},${cy + Math.sin(a) * 42} Q${cx + Math.cos(a) * 30},${cy + Math.sin(a) * 8} ${cx},${cy + 12}`} {...line} style={ink(0.18)} strokeWidth={1} />;
      })}
      <circle cx={cx} cy={cy + 10} r={7} style={{ fill: "hsl(var(--foreground) / 0.85)" }} />
      <circle cx={cx + 74} cy={cy - 10} r={3.6} style={fill(0.95)} />
    </g>
  );
}

/** Solar, light and lasers: a sun (the Point) radiating rays onto a panel or prism. */
function rays(rng: Rng): ReactNode {
  const sx = between(rng, 50, 90), sy = 44;
  const panels = rng() < 0.5;
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.28; return <line key={i} x1={sx + Math.cos(a) * 14} y1={sy + Math.sin(a) * 14} x2={sx + Math.cos(a) * 24} y2={sy + Math.sin(a) * 24} style={ink(0.5)} strokeWidth={1.4} />; })}
      <circle cx={sx} cy={sy} r={9} style={fill(0.95)} />
      {Array.from({ length: 4 }, (_, i) => <line key={`r${i}`} x1={sx + 26} y1={sy + 6 + i * 6} x2={200 + i * 10} y2={82} style={ink(0.25)} strokeWidth={1} strokeDasharray="3 4" />)}
      {panels
        ? Array.from({ length: 3 }, (_, i) => <polygon key={`p${i}`} points={`${190 + i * 38},${92} ${216 + i * 38},${70} ${246 + i * 38},${70} ${220 + i * 38},${92}`} {...line} style={ink(0.7)} strokeWidth={1.4} />)
        : <polygon points="230,92 262,40 294,92" {...line} style={ink(0.7)} strokeWidth={1.6} />}
    </g>
  );
}

/** Batteries, charging, EVs: cells filling up. */
function battery(rng: Rng): ReactNode {
  const level = 2 + Math.floor(rng() * 3), x0 = between(rng, 80, 140);
  return (
    <g>
      <rect x={x0} y={38} width={132} height={46} rx={8} {...line} style={ink(0.75)} strokeWidth={1.8} />
      <rect x={x0 + 132} y={52} width={8} height={18} rx={2} style={{ fill: "hsl(var(--foreground) / 0.6)" }} />
      {Array.from({ length: 5 }, (_, i) => <rect key={i} x={x0 + 8 + i * 25} y={46} width={19} height={30} rx={3} style={i < level ? fill(0.45 + i * 0.12) : { fill: "none", ...ink(0.25) }} strokeWidth={1} />)}
      <path d={`M${x0 - 34},48 L${x0 - 44},62 L${x0 - 36},62 L${x0 - 42},76`} {...line} style={ink(0.6)} strokeWidth={1.8} />
    </g>
  );
}

/** Electricity, thunder and lightning: a forking bolt over field lines. */
function bolt(rng: Rng): ReactNode {
  const x = between(rng, 120, 200);
  const pts: [number, number][] = [[x, 6]];
  while (pts[pts.length - 1][1] < H - 14) { const [px, py] = pts[pts.length - 1]; pts.push([px + between(rng, -16, 16), py + between(rng, 14, 22)]); }
  const fork = pts[Math.floor(pts.length / 2)];
  return (
    <g>
      {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M0,${22 + i * 19} Q${W / 2},${22 + i * 19 + between(rng, -8, 8)} ${W},${22 + i * 19}`} {...line} style={ink(0.12)} strokeWidth={1} />)}
      <polyline points={pts.map((p) => p.join(",")).join(" ")} {...line} style={ink(0.8)} strokeWidth={2} />
      <polyline points={`${fork[0]},${fork[1]} ${fork[0] + 22},${fork[1] + 16} ${fork[0] + 30},${fork[1] + 34}`} {...line} style={ink(0.45)} strokeWidth={1.4} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={4} style={fill(0.95)} />
    </g>
  );
}

function gearPath(cx: number, cy: number, r: number, teeth: number, rot: number): string {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = rot + (i * Math.PI) / teeth, rr = i % 2 ? r : r + 6;
    const a2 = a + Math.PI / teeth;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`, `${(cx + rr * Math.cos(a2)).toFixed(1)},${(cy + rr * Math.sin(a2)).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}

/** Engines, machines, systems: meshing gears. */
function gears(rng: Rng): ReactNode {
  const x = between(rng, 90, 150), rot = rng();
  const g = [[x, 58, 26, 12], [x + 55, 44, 16, 8], [x + 92, 72, 20, 10]] as const;
  return (
    <g>
      {g.map(([cx, cy, r, t], i) => <g key={i}><path d={gearPath(cx, cy, r, t, rot + i)} {...line} style={ink(0.7 - i * 0.12)} strokeWidth={1.5} /><circle cx={cx} cy={cy} r={r * 0.32} {...line} style={ink(0.45)} strokeWidth={1.2} /></g>)}
      <circle cx={g[0][0]} cy={g[0][1]} r={4.2} style={fill(0.95)} />
    </g>
  );
}

/** Money: stacks of coins rising, the last one gold. */
function coins(rng: Rng): ReactNode {
  const n = 5 + Math.floor(rng() * 3), x0 = between(rng, 40, 80);
  return (
    <g>
      <line x1={10} y1={96} x2={W - 10} y2={96} style={ink(0.35)} strokeWidth={1.2} />
      {Array.from({ length: n }, (_, i) => {
        const h = 1 + Math.round(i * between(rng, 0.8, 1.2)), x = x0 + i * 34;
        return (
          <g key={i}>
            {Array.from({ length: h }, (_, k) => <ellipse key={k} cx={x} cy={90 - k * 7} rx={13} ry={4} style={i === n - 1 && k === h - 1 ? { ...fill(0.95) } : { fill: "hsl(var(--muted))", ...ink(0.65) }} strokeWidth={1.2} />)}
          </g>
        );
      })}
    </g>
  );
}

/** Markets: candlesticks trending, the latest close marked. */
function candles(rng: Rng): ReactNode {
  const n = 12; let v = between(rng, 72, 82);
  const bars = Array.from({ length: n }, (_, i) => {
    const o = v; v = Math.max(34, Math.min(90, v - between(rng, -7, 9)));
    const c = v, hi = Math.min(o, c) - between(rng, 3, 9), lo = Math.max(o, c) + between(rng, 3, 9), x = 30 + i * 22, up = c < o;
    return <g key={i}><line x1={x} y1={hi} x2={x} y2={lo} style={ink(0.5)} strokeWidth={1} /><rect x={x - 5} y={Math.min(o, c)} width={10} height={Math.max(2, Math.abs(o - c))} rx={1.5} style={up ? { fill: "hsl(var(--foreground) / 0.7)" } : { fill: "none", ...ink(0.6) }} strokeWidth={1.2} /></g>;
  });
  return <g>{bars}<circle cx={30 + (n - 1) * 22} cy={v} r={4} style={fill(0.95)} /></g>;
}

/** Security and encryption: a padlock with a keyhole Point, over key bits. */
function lock(rng: Rng): ReactNode {
  const x = between(rng, 130, 190);
  return (
    <g>
      {Array.from({ length: 3 }, (_, r) => <text key={r} x={8} y={30 + r * 36} fontSize={11} fontFamily="ui-monospace, monospace" style={{ fill: "hsl(var(--foreground) / 0.16)" }}>{Array.from({ length: 48 }, () => (rng() < 0.5 ? "0" : "1")).join("")}</text>)}
      <path d={`M${x - 16},52 V40 A16 16 0 0 1 ${x + 16},40 V52`} {...line} style={ink(0.8)} strokeWidth={3} />
      <rect x={x - 26} y={52} width={52} height={40} rx={7} style={{ fill: "hsl(var(--muted))", ...ink(0.8) }} strokeWidth={2} />
      <circle cx={x} cy={68} r={5} style={fill(0.95)} />
      <line x1={x} y1={72} x2={x} y2={82} style={{ stroke: "hsl(var(--gold))" }} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

/** Blockchain and crypto: linked blocks, the newest one marked. */
function chain(rng: Rng): ReactNode {
  const n = 5, y = 60, off = between(rng, -10, 10);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = 34 + i * 60 + off;
        return (
          <g key={i}>
            {i > 0 && <line x1={x - 38} y1={y} x2={x - 22} y2={y} style={ink(0.55)} strokeWidth={1.6} strokeDasharray="3 3" />}
            <rect x={x - 22} y={y - 22} width={44} height={44} rx={6} {...line} style={ink(0.75)} strokeWidth={1.6} />
            {Array.from({ length: 3 }, (_, k) => <line key={k} x1={x - 13} y1={y - 10 + k * 9} x2={x - 13 + between(rng, 12, 26)} y2={y - 10 + k * 9} style={ink(0.35)} strokeWidth={1.2} />)}
            {i === n - 1 && <circle cx={x + 22} cy={y - 22} r={4.2} style={fill(0.95)} />}
          </g>
        );
      })}
    </g>
  );
}

/** Global systems, trade, the internet: a globe with routes between Points. */
function globe(rng: Rng): ReactNode {
  const cx = between(rng, 120, 200), cy = 60, r = 46;
  const pts = Array.from({ length: 4 }, () => { const a = rng() * 6.28, d = between(rng, 0.2, 0.85) * r; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9] as [number, number]; });
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...line} style={ink(0.7)} strokeWidth={1.6} />
      {[0.35, 0.7].map((k, i) => <ellipse key={`m${i}`} cx={cx} cy={cy} rx={r * k} ry={r} {...line} style={ink(0.3)} strokeWidth={1} />)}
      {[-0.5, 0, 0.5].map((k, i) => <ellipse key={`p${i}`} cx={cx} cy={cy + k * r} rx={r * Math.sqrt(1 - k * k)} ry={4} {...line} style={ink(0.25)} strokeWidth={1} />)}
      {pts.slice(1).map(([x, y], i) => <path key={`r${i}`} d={`M${pts[0][0]},${pts[0][1]} Q${(pts[0][0] + x) / 2},${Math.min(pts[0][1], y) - 30} ${x},${y}`} {...line} style={{ stroke: "hsl(var(--gold) / 0.8)" }} strokeWidth={1.3} strokeDasharray="3 3" />)}
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 0 ? 4.5 : 3} style={fill(i === 0 ? 0.95 : 0.8)} />)}
    </g>
  );
}

/** Earth science: rock strata under a volcano/mountain, with a fault. */
function strata(rng: Rng): ReactNode {
  const peak = between(rng, 120, 200);
  const layer = (y: number) => Array.from({ length: 17 }, (_, k) => { const x = k * 20; return `${k ? "L" : "M"}${x},${(y + Math.sin(k * 0.8 + y) * 3).toFixed(1)}`; }).join("");
  return (
    <g>
      <path d={`M${peak - 90},78 L${peak - 12},26 L${peak + 12},26 L${peak + 90},78`} {...line} style={ink(0.75)} strokeWidth={1.8} />
      {[82, 92, 102, 112].map((y, i) => <path key={i} d={layer(y)} {...line} style={ink(0.5 - i * 0.08)} strokeWidth={1.3} />)}
      <line x1={peak + 60} y1={78} x2={peak + 40} y2={H} style={ink(0.5)} strokeWidth={1.2} strokeDasharray="4 3" />
      <circle cx={peak} cy={18} r={5} style={fill(0.95)} />
      <circle cx={peak - 8} cy={8} r={3} style={fill(0.5)} />
    </g>
  );
}

/** Water: droplets falling into rippling layers. */
function drops(rng: Rng): ReactNode {
  const cx = between(rng, 110, 210);
  const drop = (x: number, y: number, s: number, st: CSSProperties) => <path d={`M${x},${y - 12 * s} C${x + 8 * s},${y - 2 * s} ${x + 8 * s},${y + 8 * s} ${x},${y + 8 * s} C${x - 8 * s},${y + 8 * s} ${x - 8 * s},${y - 2 * s} ${x},${y - 12 * s} Z`} style={st} strokeWidth={1.5} />;
  return (
    <g>
      {[0, 1, 2].map((i) => <ellipse key={i} cx={cx} cy={92} rx={20 + i * 24} ry={5 + i * 3} {...line} style={ink(0.55 - i * 0.14)} strokeWidth={1.3} />)}
      {drop(cx, 44, 1.6, fill(0.95))}
      {drop(cx - 70, 30, 0.9, { fill: "none", ...ink(0.55) })}
      {drop(cx + 64, 52, 1.1, { fill: "none", ...ink(0.55) })}
    </g>
  );
}

/** Law, justice, negotiation, supply & demand: a balance scale. */
function scales(rng: Rng): ReactNode {
  const cx = between(rng, 130, 190), tilt = between(rng, -8, 8);
  const lx = cx - 60, rx = cx + 60, ly = 34 + tilt, ry = 34 - tilt;
  const pan = (x: number, y: number, gold: boolean) => <g><line x1={x} y1={y} x2={x - 18} y2={y + 30} style={ink(0.5)} strokeWidth={1} /><line x1={x} y1={y} x2={x + 18} y2={y + 30} style={ink(0.5)} strokeWidth={1} /><path d={`M${x - 22},${y + 30} Q${x},${y + 44} ${x + 22},${y + 30} Z`} style={gold ? fill(0.9) : { fill: "none", ...ink(0.7) }} strokeWidth={1.4} /></g>;
  return (
    <g>
      <line x1={cx} y1={20} x2={cx} y2={98} style={ink(0.8)} strokeWidth={2.2} />
      <line x1={cx - 24} y1={100} x2={cx + 24} y2={100} style={ink(0.8)} strokeWidth={2.2} strokeLinecap="round" />
      <line x1={lx} y1={ly} x2={rx} y2={ry} style={ink(0.8)} strokeWidth={2} strokeLinecap="round" />
      {pan(lx, ly, false)}
      {pan(rx, ry, true)}
      <circle cx={cx} cy={20} r={4} style={fill(0.95)} />
    </g>
  );
}

/** Marketing, sales, growth: a funnel narrowing many points to one. */
function funnel(rng: Rng): ReactNode {
  const cx = between(rng, 130, 190);
  return (
    <g>
      <path d={`M${cx - 70},22 L${cx + 70},22 L${cx + 12},72 L${cx + 12},98 L${cx - 12},98 L${cx - 12},72 Z`} {...line} style={ink(0.75)} strokeWidth={1.8} />
      {[40, 56].map((y, i) => <line key={i} x1={cx - 70 + (y - 22) * 1.16} y1={y} x2={cx + 70 - (y - 22) * 1.16} y2={y} style={ink(0.3)} strokeWidth={1} />)}
      {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={cx + between(rng, -100, 100)} cy={between(rng, 4, 16)} r={2.2} style={{ fill: "hsl(var(--foreground) / 0.35)" }} />)}
      <circle cx={cx} cy={108} r={4.5} style={fill(0.95)} />
    </g>
  );
}

/** Cameras, vision, VR: an aperture iris opening on the Point. */
function aperture(rng: Rng): ReactNode {
  const cx = between(rng, 120, 200), cy = 60, r = 42, rot = rng() * 1;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...line} style={ink(0.75)} strokeWidth={1.8} />
      {Array.from({ length: 6 }, (_, i) => { const a = rot + (i * Math.PI) / 3; return <line key={i} x1={cx + Math.cos(a) * r} y1={cy + Math.sin(a) * r} x2={cx + Math.cos(a + 2.1) * 14} y2={cy + Math.sin(a + 2.1) * 14} style={ink(0.5)} strokeWidth={1.3} />; })}
      <circle cx={cx} cy={cy} r={6} style={fill(0.95)} />
      <rect x={cx - 78} y={cy - 36} width={156} height={72} rx={10} {...line} style={ink(0.18)} strokeWidth={1} />
    </g>
  );
}

/** QR codes, compression, screens, 3D printing: a pixel grid resolving. */
function pixels(rng: Rng): ReactNode {
  const cols = 18, rows = 6, s = 12, x0 = (W - cols * s) / 2, y0 = (H - rows * s) / 2;
  const hot = [Math.floor(rng() * cols), Math.floor(rng() * rows)];
  return (
    <g>
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols, r = Math.floor(i / cols), on = rng() < 0.35 + (c / cols) * 0.3;
        if (c === hot[0] && r === hot[1]) return <rect key={i} x={x0 + c * s + 1} y={y0 + r * s + 1} width={s - 2} height={s - 2} rx={2} style={fill(0.95)} />;
        return on ? <rect key={i} x={x0 + c * s + 1} y={y0 + r * s + 1} width={s - 2} height={s - 2} rx={2} style={{ fill: `hsl(var(--foreground) / ${0.2 + (c / cols) * 0.45})` }} /> : null;
      })}
    </g>
  );
}

/** Time, focus, repetition: a clock face with a sweep. */
function clock(rng: Rng): ReactNode {
  const cx = between(rng, 120, 200), cy = 60, r = 40, h = rng() * 6.28, m = rng() * 6.28;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...line} style={ink(0.75)} strokeWidth={1.8} />
      {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.28; return <line key={i} x1={cx + Math.cos(a) * (r - 6)} y1={cy + Math.sin(a) * (r - 6)} x2={cx + Math.cos(a) * (r - 2)} y2={cy + Math.sin(a) * (r - 2)} style={ink(0.45)} strokeWidth={1.2} />; })}
      <path d={`M${cx},${cy} L${cx + Math.cos(m) * (r + 18)},${cy + Math.sin(m) * (r + 18)} A${r + 18} ${r + 18} 0 0 1 ${cx + Math.cos(m + 0.9) * (r + 18)},${cy + Math.sin(m + 0.9) * (r + 18)} Z`} style={fill(0.12)} />
      <line x1={cx} y1={cy} x2={cx + Math.cos(h) * 20} y2={cy + Math.sin(h) * 20} style={ink(0.8)} strokeWidth={2.4} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx + Math.cos(m) * 32} y2={cy + Math.sin(m) * 32} style={ink(0.7)} strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4} style={fill(0.95)} />
    </g>
  );
}

/** Goals, focus, advantage: concentric rings with the Point at the centre. */
function target(rng: Rng): ReactNode {
  const cx = between(rng, 120, 200), cy = 60;
  return (
    <g>
      {[46, 32, 18].map((r, i) => <circle key={i} cx={cx} cy={cy} r={r} {...line} style={ink(0.35 + i * 0.2)} strokeWidth={1.5} />)}
      <line x1={cx - 110} y1={cy + between(rng, -20, 20)} x2={cx - 8} y2={cy} style={ink(0.6)} strokeWidth={1.4} strokeDasharray="5 4" />
      <circle cx={cx} cy={cy} r={6} style={fill(0.95)} />
    </g>
  );
}

/** Statistics and probability: a bell curve with sigma lines and samples. */
function bell(rng: Rng): ReactNode {
  const mu = between(rng, 140, 180), sd = between(rng, 30, 42), base = 96;
  const y = (x: number) => base - 70 * Math.exp(-((x - mu) ** 2) / (2 * sd * sd));
  const d = Array.from({ length: 81 }, (_, k) => { const x = (k / 80) * W; return `${k ? "L" : "M"}${x.toFixed(1)},${y(x).toFixed(1)}`; }).join("");
  return (
    <g>
      <line x1={0} y1={base} x2={W} y2={base} style={ink(0.35)} strokeWidth={1.2} />
      {[-2, -1, 1, 2].map((k) => <line key={k} x1={mu + k * sd} y1={base} x2={mu + k * sd} y2={y(mu + k * sd)} style={ink(0.25)} strokeWidth={1} strokeDasharray="3 3" />)}
      <path d={`${d} L${W},${base} L0,${base} Z`} style={fill(0.12)} />
      <path d={d} {...line} style={ink(0.8)} strokeWidth={1.8} />
      {Array.from({ length: 16 }, (_, i) => { const x = mu + sd * (rng() + rng() + rng() - 1.5) * 1.6; return <circle key={i} cx={x} cy={base + 8 + rng() * 8} r={1.8} style={{ fill: "hsl(var(--foreground) / 0.4)" }} />; })}
      <circle cx={mu} cy={y(mu)} r={4} style={fill(0.95)} />
    </g>
  );
}

/** Compounding, feedback, habits: a golden spiral built from arcs. */
function spiral(rng: Rng): ReactNode {
  const cx = between(rng, 130, 190), cy = 64, turns = 3.2, ph = rng() * 6.28;
  const d = Array.from({ length: 121 }, (_, k) => { const t = (k / 120) * turns * 6.28, r = 3 * Math.exp(0.1763 * t * 1.1); return `${k ? "L" : "M"}${(cx + r * Math.cos(t + ph)).toFixed(1)},${(cy + r * Math.sin(t + ph) * 0.9).toFixed(1)}`; }).join("");
  return (
    <g>
      <path d={d} {...line} style={ink(0.75)} strokeWidth={1.8} />
      <circle cx={cx + 3 * Math.cos(ph)} cy={cy + 3 * Math.sin(ph) * 0.9} r={4.2} style={fill(0.95)} />
    </g>
  );
}

/** Language, AI chat, persuasion: speech bubbles in conversation. */
function chat(rng: Rng): ReactNode {
  const bubble = (x: number, y: number, w: number, left: boolean, st: CSSProperties) => <path d={`M${x},${y} h${w} a8 8 0 0 1 8 8 v16 a8 8 0 0 1 -8 8 h${-w + (left ? 18 : 0)} l${left ? -12 : -6},10 l${left ? 2 : -6},-10 h${left ? -8 : -12} a8 8 0 0 1 -8 -8 v-16 a8 8 0 0 1 8 -8 z`} style={st} strokeWidth={1.5} />;
  const x = between(rng, 60, 110);
  return (
    <g>
      {bubble(x, 16, 120, true, { fill: "none", ...ink(0.7) })}
      {bubble(x + 70, 64, 110, false, { fill: "hsl(var(--foreground) / 0.08)", ...ink(0.55) })}
      {Array.from({ length: 3 }, (_, i) => <line key={i} x1={x + 8} y1={26 + i * 7} x2={x + 8 + between(rng, 50, 100)} y2={26 + i * 7} style={ink(0.3)} strokeWidth={1.4} strokeLinecap="round" />)}
      {Array.from({ length: 3 }, (_, i) => <circle key={`d${i}`} cx={x + 96 + i * 14} cy={82} r={3.4} style={fill(i === 2 ? 0.95 : 0.45)} />)}
    </g>
  );
}

/** Sleep and dreams: a crescent moon (the Point as a star) over slow waves. */
function moon(rng: Rng): ReactNode {
  const cx = between(rng, 110, 210), cy = 50;
  return (
    <g>
      <path d={`M${cx},${cy - 26} A26 26 0 1 0 ${cx + 20},${cy + 16} A20 20 0 1 1 ${cx},${cy - 26} Z`} style={{ fill: "hsl(var(--foreground) / 0.12)", ...ink(0.7) }} strokeWidth={1.5} />
      {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={between(rng, 12, W - 12)} cy={between(rng, 8, 60)} r={between(rng, 0.8, 1.8)} style={{ fill: "hsl(var(--foreground) / 0.4)" }} />)}
      <circle cx={cx + 46} cy={cy - 14} r={3.8} style={fill(0.95)} />
      {[88, 100].map((y, i) => <path key={i} d={`M0,${y} C80,${y - 10} 160,${y + 10} 240,${y} S${W},${y - 6} ${W},${y}`} {...line} style={ink(0.3 - i * 0.1)} strokeWidth={1.2} />)}
    </g>
  );
}

/** Infinity: a lemniscate traced once, the Point travelling it. */
function infinity(rng: Rng): ReactNode {
  const cx = 160, cy = 60, a = 70, t0 = rng() * 6.28;
  const pt = (t: number) => { const d = 1 + Math.sin(t) ** 2; return [cx + (a * Math.cos(t)) / d, cy + (a * Math.sin(t) * Math.cos(t)) / d] as const; };
  const d = Array.from({ length: 121 }, (_, k) => { const [x, y] = pt((k / 120) * 6.28); return `${k ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`; }).join("") + "Z";
  const [px, py] = pt(t0);
  return <g><path d={d} {...line} style={ink(0.75)} strokeWidth={2} /><circle cx={px} cy={py} r={4.5} style={fill(0.95)} /></g>;
}

/** Magnets: a horseshoe magnet with its field lines looping pole to pole. */
function magnet(rng: Rng): ReactNode {
  const cx = between(rng, 130, 190), cy = 52;
  return (
    <g>
      {[1, 2, 3, 4].map((k) => <path key={k} d={`M${cx - 22},${cy + 34} C${cx - 22 - k * 26},${cy + 34 + k * 20} ${cx + 22 + k * 26},${cy + 34 + k * 20} ${cx + 22},${cy + 34}`} {...line} style={ink(0.4 - k * 0.06)} strokeWidth={1.1} strokeDasharray={k % 2 ? undefined : "3 3"} />)}
      <path d={`M${cx - 22},${cy + 34} V${cy} A22 22 0 0 1 ${cx + 22},${cy} V${cy + 34}`} {...line} style={ink(0.8)} strokeWidth={12} strokeLinecap="butt" />
      <rect x={cx - 28} y={cy + 24} width={12} height={12} style={{ fill: "hsl(var(--foreground) / 0.85)" }} />
      <rect x={cx + 16} y={cy + 24} width={12} height={12} style={fill(0.95)} />
    </g>
  );
}

/** Democracy and elections: a ballot going into a box. */
function ballot(rng: Rng): ReactNode {
  const cx = between(rng, 130, 190);
  return (
    <g>
      <rect x={cx - 44} y={50} width={88} height={52} rx={6} {...line} style={ink(0.8)} strokeWidth={1.8} />
      <line x1={cx - 22} y1={50} x2={cx + 22} y2={50} style={{ stroke: "hsl(var(--muted))" }} strokeWidth={4} />
      <rect x={cx - 16} y={18} width={32} height={42} rx={3} style={{ fill: "hsl(var(--card))", ...ink(0.7) }} strokeWidth={1.5} transform={`rotate(${between(rng, -8, 8)} ${cx} 40)`} />
      <path d={`M${cx - 8},${34} l6,6 l11,-12`} {...line} style={{ stroke: "hsl(var(--gold))" }} strokeWidth={3} />
      {[-90, 90].map((dx) => <circle key={dx} cx={cx + dx} cy={between(rng, 40, 80)} r={3} style={{ fill: "hsl(var(--foreground) / 0.3)" }} />)}
    </g>
  );
}

export const TOPIC_MOTIFS = {
  magnet, ballot,
  waves, arch, pulse, helix, neurons, trajectory, airflow, molecule, gravityWell, rays, battery, bolt,
  gears, coins, candles, lock, chain, globe, strata, drops, scales, funnel, aperture, pixels, clock,
  target, bell, spiral, chat, moon, infinity,
} satisfies Record<string, (rng: Rng) => ReactNode>;

export type TopicMotif = keyof typeof TOPIC_MOTIFS;
