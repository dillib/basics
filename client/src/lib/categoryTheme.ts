import { canonicalCategory } from "./categories";

/**
 * Visual identity per canonical field: a hue (spread around the wheel so
 * neighbouring fields stay distinguishable) and the cover-art motif that
 * suits the field's subject matter. Used by TopicCover and category badges.
 */

export type CoverMotif = "orbits" | "circuit" | "branches" | "growth" | "plot" | "constellation";

interface CategoryTheme {
  hue: number;
  motif: CoverMotif;
}

const THEMES: Record<string, CategoryTheme> = {
  "Personal Development": { hue: 8, motif: "constellation" },
  "Business & Economics": { hue: 36, motif: "growth" },
  "Earth & Environment": { hue: 78, motif: "branches" },
  "Biology & Health": { hue: 142, motif: "branches" },
  "Chemistry": { hue: 174, motif: "orbits" },
  "Science": { hue: 196, motif: "orbits" },
  "Physics": { hue: 216, motif: "orbits" },
  "Math & Statistics": { hue: 238, motif: "plot" },
  "Technology": { hue: 262, motif: "circuit" },
  "Mind & Brain": { hue: 290, motif: "constellation" },
  "Philosophy & Thinking": { hue: 318, motif: "constellation" },
  "Society & Politics": { hue: 344, motif: "constellation" },
};

const OTHER: CategoryTheme = { hue: 225, motif: "constellation" };

export function categoryTheme(rawCategory: string | null | undefined): CategoryTheme & { name: string } {
  // Accept an already-canonical name as-is ("Mind & Brain" contains none of
  // its own match keywords, so canonicalCategory alone would say "Other").
  const name = rawCategory && THEMES[rawCategory] ? rawCategory : canonicalCategory(rawCategory);
  return { name, ...(THEMES[name] ?? OTHER) };
}
