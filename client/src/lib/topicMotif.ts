import type { TopicMotif } from "@/components/coverMotifs";
import type { CoverMotif } from "./categoryTheme";

/** A topic can also use one of the category motifs (atom orbits, circuits...). */
export type AnyMotif = TopicMotif | CoverMotif;

/**
 * Pick a cover motif that shows what the topic is ABOUT (a bridge gets an
 * arch, rockets a launch arc, DNA a helix), from keywords in its slug.
 * First match wins, so specific rules sit above general ones. Returns null
 * when nothing fits and the cover falls back to the category's motif.
 *
 * Matching is on whole slug words ("heart" matches how-the-heart-works, not
 * "heartburn"); a trailing * allows a prefix ("encrypt*" = encryption).
 */
const RULES: [AnyMotif, string[]][] = [
  // Phrases that would otherwise hit a broader rule below ("time management"
  // is not a machine, "computer memory" is not a brain).
  ["clock", ["time-management", "time*", "deep-work", "spaced-repetition", "productivity", "schedule*"]],
  ["circuit", ["computer-memory", "compiler*", "cpu*", "processor*", "database*", "api*", "self-driving", "semiconductor*", "chip*", "transistor*", "code", "coding", "programming", "software"]],
  ["constellation", ["search-engine*", "network-effects", "recommendation*", "social-network*", "internet-of-things"]],
  ["candles", ["pegy", "pe-ratio", "p-e-ratio", "valuation"]],
  ["orbits", ["atom*", "nuclear", "radioactiv*", "quantum*", "electron*", "particle*"]],
  ["magnet", ["magnet*", "magnetism", "electromagnet*"]],
  ["ballot", ["election*", "electoral*", "democracy", "voting", "vote*"]],
  ["plot", ["calculus", "logarithm*", "prime-numbers", "algebra", "equation*", "scientific-method", "game-theory", "function*"]],
  // Specific technologies and phenomena.
  ["chain", ["blockchain", "bitcoin", "crypto*", "cryptocurrency", "ethereum", "nft*"]],
  ["lock", ["encrypt*", "https", "two-factor", "2fa", "digital-signatures", "password*", "cybersecurity", "security"]],
  ["chat", ["chatgpt", "large-language", "llm*", "language", "persuasion", "propaganda", "negotiation", "meta-muse", "muse", "conversation*"]],
  ["trajectory", ["rocket*", "escape-velocity", "satellite*", "orbit*", "space-travel"]],
  ["gravityWell", ["black-hole*", "gravity", "big-bang", "spacetime", "relativity"]],
  ["airflow", ["airplane*", "aircraft", "fly", "flight", "wind", "air-conditioning", "weather*", "hurricane*", "aerodynamic*"]],
  ["bolt", ["lightning", "thunder", "electricity", "static-electricity"]],
  ["battery", ["batter*", "electric-car*", "wireless-charging", "charging"]],
  ["rays", ["solar*", "photosynthesis", "light", "laser*", "rainbow*", "sunlight", "fiber-optic"]],
  ["waves", ["sound", "noise*", "cymatics", "wifi", "5g", "microwave*", "radio", "northern-lights", "aurora", "tides", "ocean*", "streaming", "music", "vibration*"]],
  ["drops", ["water*", "hydroelectric", "rain", "filtration"]],
  ["strata", ["volcano*", "earthquake*", "carbon-dating", "plate-tectonics", "fossil*", "geology", "mountain*"]],
  ["helix", ["dna", "gene*", "genetic*", "evolution", "crispr", "heredity"]],
  ["molecule", ["chemical*", "chemistry", "periodic-table", "caffeine", "alcohol", "vitamin*", "antibiotic*", "anesthesia", "hormone*", "molecule*", "drug*"]],
  ["pulse", ["heart", "blood*", "lungs", "kidney*", "liver", "metabolism", "digestion", "muscle*", "weight-loss", "fasting", "pain", "immune", "vaccine*", "body", "fitness", "exercise"]],
  ["moon", ["sleep", "dream*", "circadian"]],
  ["neurons", ["brain", "memory", "nervous", "neural", "neuron*", "dopamine", "learning", "attention", "emotion*", "anxiety", "motivation", "willpower", "empathy", "placebo", "mind", "bias*", "confirmation-bias", "cognitive*", "procrastination", "focus", "machine-learning"]],
  ["aperture", ["camera*", "facial-recognition", "virtual-reality", "vr", "vision", "eye*", "photograph*"]],
  ["pixels", ["entropy", "thermodynamic*", "qr", "compression", "touchscreen*", "3d-printing", "3d", "pixel*", "display*", "screen*", "image*"]],
  ["candles", ["stock-market", "stock*", "options-trading", "etf*", "index-funds", "bond-market", "dividend*", "investing", "trading"]],
  ["spiral", ["compound*", "compounding", "feedback-loops", "exponential", "habit*", "fibonacci", "golden-ratio"]],
  ["coins", ["money", "interest", "interest-rates", "debt", "budget*", "tax*", "bank*", "credit*", "mortgage*", "retirement", "insurance", "inflation", "federal-reserve", "central-banks", "finance", "personal-finance", "pricing*", "pegy", "venture-capital", "raise-money", "exchange-rates", "recession*", "economy", "dollar*"]],
  ["funnel", ["funnel*", "marketing", "advertising", "seo", "growth-hacking", "branding", "brand*", "sales"]],
  ["scales", ["justice", "legal", "law*", "constitution*", "supply-and-demand", "ethics", "court*", "rights"]],
  ["globe", ["global*", "globalization", "international-trade", "trade", "united-nations", "climate*", "internet", "gps", "dns", "cloud*", "supply-chain*", "geopolitic*", "world"]],
  ["gears", ["engine*", "combustion", "elevator*", "refrigerator*", "operating-system*", "compiler*", "franchising", "business-model*", "economies-of-scale", "management", "machine*", "mechanic*", "manufacturing", "robot*"]],
  ["target", ["goal*", "goal-setting", "competitive-advantage", "product-market-fit", "strategy", "decision*", "first-impressions"]],
  ["bell", ["statistic*", "probability", "standard-deviation", "bayes*", "correlation", "causation", "distribution*", "average*"]],
  ["infinity", ["infinity", "infinite"]],
  ["arch", ["bridge*", "cities", "city", "architecture", "construction", "building*", "skyscraper*", "dam*"]],
];

function toMatcher(words: string[]): RegExp {
  const alts = words.map((w) => w.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*$/, "[a-z0-9]*"));
  return new RegExp(`(?:^|-)(?:${alts.join("|")})(?:-|$)`);
}

const COMPILED = RULES.map(([motif, words]) => [motif, toMatcher(words)] as const);

export function topicMotif(slug: string | null | undefined): AnyMotif | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  for (const [motif, re] of COMPILED) if (re.test(s)) return motif;
  return null;
}
