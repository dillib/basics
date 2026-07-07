// Gemini assigns each generated topic a free-form category, which fragments
// into dozens of near-duplicates ("Biology", "Biology & Health", "Biology &
// Medicine", "Biology & Physiology", ...). This collapses any raw category
// string into one of a small set of canonical fields, used both to build the
// Topic Library filter and to filter topics by it. Purely a display-layer
// normalization — the stored category is left untouched.

type Rule = { name: string; match: string[] };

// Order matters: the first rule with a keyword found in the (lowercased) raw
// category wins, so more specific / higher-priority fields come first. Example:
// "Cognitive Science & Education" hits "cognitive" (Mind & Brain) before
// "education" (Society & Politics).
const RULES: Rule[] = [
  { name: "Mind & Brain", match: ["psycholog", "neuro", "cognitive", "behavioral", "mental health"] },
  { name: "Biology & Health", match: ["biolog", "health", "medicine", "medical", "nutrition", "physiolog", "anatomy", "genetic"] },
  { name: "Physics", match: ["physics", "quantum", "astrophys"] },
  { name: "Chemistry", match: ["chemi"] },
  { name: "Earth & Environment", match: ["earth", "environment", "climate", "geolog", "ecolog", "sustainab", "weather"] },
  { name: "Math & Statistics", match: ["math", "statistic", "probability"] },
  { name: "Business & Economics", match: ["business", "econom", "finance", "financial", "marketing", "management", "entrepreneur", "accounting", "trade", "money"] },
  { name: "Technology", match: ["technolog", "comput", "software", "engineer", "robotic", "data science", "information tech", "cyber"] },
  { name: "Philosophy & Thinking", match: ["philosoph", "critical thinking", "systems thinking", "logic", "reasoning", "ethic", "metaphys", "epistem"] },
  { name: "Personal Development", match: ["personal development", "self-improvement", "self improvement", "productivity", "mindfulness", "habit"] },
  { name: "Society & Politics", match: ["civic", "govern", "politic", "law", "legal", "international relation", "social science", "sociolog", "urban", "linguist", "communicat", "history", "histor", "geograph", "anthropolog", "education", "policy", "culture", "religion"] },
  { name: "Science", match: ["science", "scientific"] },
];

const FALLBACK = "Other";

// Preferred display order for the filter pills.
export const CANONICAL_ORDER: string[] = [...RULES.map((r) => r.name), FALLBACK];

export function canonicalCategory(raw: string | null | undefined): string {
  if (!raw) return FALLBACK;
  const s = raw.toLowerCase();
  for (const rule of RULES) {
    if (rule.match.some((k) => s.includes(k))) return rule.name;
  }
  return FALLBACK;
}
