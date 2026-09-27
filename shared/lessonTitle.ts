/**
 * Lesson titles, shared by the server (the <title> in the HTML crawlers see)
 * and the client (document.title after navigation) so the two never disagree.
 */

const SITE_NAME = "BasicsTutor";

/**
 * "How the Meta Muse Works?" is a statement phrased like a heading, not a
 * question -- drop the stray "?". Real questions ("What Is Calculus?") keep it.
 */
export function cleanLessonTitle(title: string): string {
  const t = title.trim();
  return /^how\b/i.test(t) && /\?$/.test(t) ? t.replace(/\?+$/, "") : t;
}

/**
 * Google shows ~60 characters of a title. Keep the full phrase when it fits,
 * else a shorter suffix, else just the lesson name + brand -- the lesson name
 * (the search query) must never be the part that gets cut off.
 */
export function lessonTitleTag(name: string): string {
  const n = cleanLessonTitle(name);
  const options = [
    `${n}, Explained from First Principles | ${SITE_NAME}`,
    `${n}, Explained Simply | ${SITE_NAME}`,
    `${n} | ${SITE_NAME}`,
  ];
  return options.find((t) => t.length <= 60) ?? options[options.length - 1];
}

/**
 * "By BasicsTutor · Created with AI, researched and fact-checked · Updated
 * Sep 27, 2026". Honest about how the lesson was made: "researched" only when
 * it carries web sources, "fact-checked" only when it passed the validator.
 */
export function lessonByline(topic: {
  validationData?: unknown;
  confidenceScore?: number | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
}): string {
  const sources = (topic.validationData as { sources?: unknown } | null | undefined)?.sources;
  const researched = Array.isArray(sources) && sources.length > 0;
  const checked = topic.confidenceScore != null;
  const how = ["Created with AI", researched ? "researched" : "", checked ? "fact-checked" : ""].filter(Boolean);
  const made = how.length > 1 ? `${how.slice(0, -1).join(", ")} and ${how[how.length - 1]}` : how[0];
  const when = topic.updatedAt || topic.createdAt;
  const date = when ? new Date(when).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : "";
  return `By BasicsTutor · ${made}${date ? ` · Updated ${date}` : ""}`;
}
