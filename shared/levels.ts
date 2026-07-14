// Audience levels for topic generation. The same title can be generated at
// different levels (Kids / Teens / Adults); each level is its own page/slug so
// they don't collide and each can rank on its own. Adults is the default and
// keeps the clean, un-suffixed slug (matching all pre-level topics).

export const LEVELS = ["kid", "teen", "adult"] as const;
export type Level = (typeof LEVELS)[number];

export const DEFAULT_LEVEL: Level = "adult";

export const LEVEL_LABELS: Record<Level, string> = {
  kid: "Kids",
  teen: "Teens",
  adult: "Adults",
};

// Short blurbs for the UI selector.
export const LEVEL_HINTS: Record<Level, string> = {
  kid: "Ages ~6–10 · simplest words",
  teen: "Middle & high school",
  adult: "General / college+",
};

export function isLevel(v: unknown): v is Level {
  return typeof v === "string" && (LEVELS as readonly string[]).includes(v);
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Adults keeps the base slug; other levels get a suffix so the same title can
// exist at multiple levels without clobbering each other.
export function buildTopicSlug(title: string, level: Level): string {
  const base = slugifyTitle(title);
  return level === "adult" ? base : `${base}-${level}`;
}
