/**
 * Tiny deterministic particle simulation behind the "particles" concept
 * scene. Pure math in a unit box ([0,1] x [0,1]) with a seeded RNG, so the
 * same scene animates identically on every visit and is unit testable
 * without a browser. The canvas renderer just maps these to pixels.
 */

export type ParticleMode = "spread" | "mix" | "cluster";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0 or 1 -- drives color in "mix" mode; always 0 otherwise. */
  group: 0 | 1;
}

/** mulberry32 -- small, fast, good-enough seeded PRNG. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit seed from a string (e.g. the scene caption). */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const CLUSTER_CENTERS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.25, y: 0.3 },
  { x: 0.72, y: 0.35 },
  { x: 0.48, y: 0.75 },
];

export function createParticles(mode: ParticleMode, count: number, rng: () => number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let group: 0 | 1 = 0;
    if (mode === "spread") {
      // Packed into the left fifth -- the low-entropy starting state.
      x = 0.03 + rng() * 0.17;
      y = 0.05 + rng() * 0.9;
    } else if (mode === "mix") {
      group = i % 2 === 0 ? 0 : 1;
      x = group === 0 ? 0.03 + rng() * 0.44 : 0.53 + rng() * 0.44;
      y = 0.05 + rng() * 0.9;
    } else {
      x = 0.05 + rng() * 0.9;
      y = 0.05 + rng() * 0.9;
    }
    particles.push({ x, y, vx: 0, vy: 0, group });
  }
  return particles;
}

// Tuned so spread/mix reach a genuinely uniform end state by the last tick
// (mean x ~0.49, ~49% crossover) while still visibly gradual at ~3s. Lower
// values ended the scene still lopsided, contradicting its "mixed" label.
const NOISE = 0.012;
const DAMPING = 0.9;
const PULL = 0.0016;

/** Advance one tick in place. */
export function stepParticles(particles: Particle[], mode: ParticleMode, rng: () => number): void {
  // Cluster mode runs at quarter jitter: stronger random motion fights the
  // pull and the groups read as loose fuzz, not clusters.
  const noise = mode === "cluster" ? NOISE * 0.25 : NOISE;
  for (const p of particles) {
    p.vx += (rng() - 0.5) * noise;
    p.vy += (rng() - 0.5) * noise;

    if (mode === "cluster") {
      let nearest = CLUSTER_CENTERS[0];
      let best = Infinity;
      for (const c of CLUSTER_CENTERS) {
        const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
        if (d < best) {
          best = d;
          nearest = c;
        }
      }
      p.vx += (nearest.x - p.x) * PULL;
      p.vy += (nearest.y - p.y) * PULL;
    }

    p.vx *= DAMPING;
    p.vy *= DAMPING;
    p.x += p.vx;
    p.y += p.vy;

    // Reflect off the walls so nothing escapes the box.
    if (p.x < 0) { p.x = -p.x; p.vx = -p.vx; }
    if (p.x > 1) { p.x = 2 - p.x; p.vx = -p.vx; }
    if (p.y < 0) { p.y = -p.y; p.vy = -p.vy; }
    if (p.y > 1) { p.y = 2 - p.y; p.vy = -p.vy; }
    p.x = Math.min(1, Math.max(0, p.x));
    p.y = Math.min(1, Math.max(0, p.y));
  }
}
