/**
 * Tiny pub/sub between the hero search (ProgressiveSearch) and the galaxy
 * backdrop (HeroGalaxy). Kept outside React so a keystroke doesn't re-render
 * the canvas component -- the galaxy just reads the latest signal per frame.
 */

export type HeroSignal =
  | { type: "idle" }
  /** Library topics matching what's typed: their stars flare and get threads to the search box. */
  | { type: "matches"; slugs: string[] }
  /** AI is building a preview or lesson: the galaxy spirals inward. */
  | { type: "thinking"; intensity: number };

type Listener = (signal: HeroSignal) => void;
const listeners = new Set<Listener>();

export function emitHeroSignal(signal: HeroSignal): void {
  listeners.forEach((l) => l(signal));
}

export function onHeroSignal(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
