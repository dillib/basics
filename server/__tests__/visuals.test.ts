import { describe, it, expect } from 'vitest';
import { parseVisualSpec, readStoredVisual, readVisualBrief, scaleWidths } from '@shared/visuals';
import { createParticles, makeRng, seedFromString, stepParticles, CLUSTER_CENTERS } from '@shared/particle-sim';

describe('parseVisualSpec', () => {
  it('accepts a valid scene of every kind', () => {
    const scenes = [
      { kind: 'particles', caption: 'Watch energy spread out.', mode: 'spread', startLabel: 'Concentrated', endLabel: 'Dispersed' },
      { kind: 'flow', caption: 'Each step causes the next.', steps: [{ label: 'Heat added' }, { label: 'Molecules speed up', detail: 'More kinetic energy' }] },
      { kind: 'cycle', caption: 'A loop that feeds itself.', steps: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] },
      { kind: 'compare', caption: 'Myth vs reality.', left: { title: 'Myth', points: ['Disorder'] }, right: { title: 'Reality', points: ['Probability'] } },
      { kind: 'timeline', caption: 'How it unfolded.', events: [{ when: '1850', label: 'Clausius' }, { when: '1877', label: 'Boltzmann' }] },
      { kind: 'scale', caption: 'Magnitudes compared.', unit: 'J', items: [{ label: 'Match', value: 1000 }, { label: 'Battery', value: 40000 }] },
      { kind: 'layers', caption: 'Built from the ground up.', layers: [{ label: 'Atoms' }, { label: 'Molecules' }] },
    ];
    for (const s of scenes) {
      expect(parseVisualSpec(s), `kind ${s.kind}`).not.toBeNull();
    }
  });

  it('rejects unknown kinds', () => {
    expect(parseVisualSpec({ kind: 'video', caption: 'nope' })).toBeNull();
  });

  it('rejects the legacy v1 brief shape the topic generator writes', () => {
    expect(parseVisualSpec({ type: 'diffusion', description: 'Particles diffusing' })).toBeNull();
  });

  it('rejects labels longer than the renderer can fit', () => {
    const long = 'x'.repeat(49);
    expect(parseVisualSpec({ kind: 'layers', caption: 'c', layers: [{ label: long }, { label: 'ok' }] })).toBeNull();
  });

  it('enforces step count bounds (a 1-step flow is not a flow)', () => {
    expect(parseVisualSpec({ kind: 'flow', caption: 'c', steps: [{ label: 'only' }] })).toBeNull();
    const seven = Array.from({ length: 7 }, (_, i) => ({ label: `s${i}` }));
    expect(parseVisualSpec({ kind: 'flow', caption: 'c', steps: seven })).toBeNull();
  });

  it('rejects non-positive values in a scale scene (log scale would break)', () => {
    expect(parseVisualSpec({ kind: 'scale', caption: 'c', items: [{ label: 'a', value: 0 }, { label: 'b', value: 5 }] })).toBeNull();
  });

  it('rejects an invalid particle mode', () => {
    expect(parseVisualSpec({ kind: 'particles', caption: 'c', mode: 'explode', startLabel: 'a', endLabel: 'b' })).toBeNull();
  });

  it('handles junk input without throwing', () => {
    for (const junk of [null, undefined, 42, 'string', [], {}]) {
      expect(parseVisualSpec(junk)).toBeNull();
    }
  });
});

describe('readStoredVisual / readVisualBrief', () => {
  const spec = { kind: 'cycle', caption: 'loop', steps: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] };

  it('reads a stored v2 scene', () => {
    expect(readStoredVisual({ v: 2, spec, brief: 'b' })?.kind).toBe('cycle');
  });

  it('treats legacy v1 data as "no scene yet" so it gets generated', () => {
    expect(readStoredVisual({ type: 'diffusion', description: 'd' })).toBeNull();
    expect(readStoredVisual(null)).toBeNull();
  });

  it('treats a corrupted v2 row as "no scene yet" rather than rendering garbage', () => {
    expect(readStoredVisual({ v: 2, spec: { kind: 'cycle', caption: 'x', steps: [] } })).toBeNull();
  });

  it('recovers the brief from both v1 and v2 shapes', () => {
    expect(readVisualBrief({ type: 't', description: 'from v1' })).toBe('from v1');
    expect(readVisualBrief({ v: 2, spec, brief: 'from v2' })).toBe('from v2');
    expect(readVisualBrief(null)).toBeUndefined();
  });
});

describe('scaleWidths', () => {
  it('uses a linear scale for similar magnitudes', () => {
    const { widths, log } = scaleWidths([10, 20, 40]);
    expect(log).toBe(false);
    expect(widths).toEqual([25, 50, 100]);
  });

  it('switches to log scale when values span 50x or more, so small bars stay visible', () => {
    const { widths, log } = scaleWidths([1, 1000, 1_000_000]);
    expect(log).toBe(true);
    expect(widths[0]).toBe(8);
    expect(widths[2]).toBe(100);
    expect(widths[1]).toBeCloseTo(54, 0); // log midpoint, not a 0.1% sliver
  });
});

describe('particle simulation', () => {
  const run = (mode: 'spread' | 'mix' | 'cluster', ticks: number, seed = 42) => {
    const rng = makeRng(seed);
    const ps = createParticles(mode, 120, rng);
    for (let i = 0; i < ticks; i++) stepParticles(ps, mode, rng);
    return ps;
  };
  const meanX = (ps: { x: number }[]) => ps.reduce((s, p) => s + p.x, 0) / ps.length;

  it('is deterministic for a given seed (same scene, same animation every visit)', () => {
    expect(run('spread', 200, 7)).toEqual(run('spread', 200, 7));
    expect(seedFromString('Energy spreads')).toBe(seedFromString('Energy spreads'));
    expect(seedFromString('a')).not.toBe(seedFromString('b'));
  });

  it('spread: starts packed on the left, disperses across the box by the end of the scene', () => {
    const start = run('spread', 0);
    expect(Math.max(...start.map((p) => p.x))).toBeLessThanOrEqual(0.2);
    // The end state is labeled "spread out", so it must actually be near
    // uniform (mean x ~0.5), not merely less bunched.
    const end = run('spread', 540);
    expect(meanX(end)).toBeGreaterThan(0.42);
    expect(end.filter((p) => p.x > 0.5).length).toBeGreaterThan(40);
  });

  it('mix: the two groups start on opposite sides and blend', () => {
    const start = run('mix', 0);
    expect(start.filter((p) => p.group === 0).every((p) => p.x < 0.5)).toBe(true);
    expect(start.filter((p) => p.group === 1).every((p) => p.x > 0.5)).toBe(true);
    // "Fully mixed" means close to half of each group on each side.
    const end = run('mix', 540);
    const group0 = end.filter((p) => p.group === 0);
    const crossed = group0.filter((p) => p.x > 0.5).length / group0.length;
    expect(crossed).toBeGreaterThan(0.35);
  });

  it('cluster: particles end much closer to a cluster center than they started', () => {
    const nearest = (p: { x: number; y: number }) =>
      Math.min(...CLUSTER_CENTERS.map((c) => Math.hypot(c.x - p.x, c.y - p.y)));
    const avg = (ps: { x: number; y: number }[]) => ps.reduce((s, p) => s + nearest(p), 0) / ps.length;
    expect(avg(run('cluster', 540))).toBeLessThan(avg(run('cluster', 0)) * 0.5);
  });

  it('never lets a particle escape the box', () => {
    for (const mode of ['spread', 'mix', 'cluster'] as const) {
      for (const p of run(mode, 2000)) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
    }
  });
});
