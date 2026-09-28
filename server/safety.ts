import { choice, noul } from "@typesafe-ai/sdk";
import { ask, THRESHOLDS } from "./jev";
import type { Level } from "@shared/levels";

/**
 * Content guardrails. Kids use BasicsTutor, so every lesson must be clean,
 * accurate and plain-spoken. Layers (each covers the others' blind spots):
 *
 *   1. Request gate (checkRequest)  -- before anything is generated: search,
 *      preview, lesson creation, tutor messages, trending topics.
 *   2. Writer rules                 -- style + content limits in the Gemini
 *      prompts (server/ai.ts), stricter Gemini safety filters for Kids/Teens.
 *   3. Publish gate (reviewLesson)  -- before a lesson is listed: adult /
 *      graphic / crude / dangerous content, kid suitability, fact-check score.
 *      Failing lessons are HELD (unlisted + noindex, still reachable by the
 *      person who asked) for review in Admin -> Feedback, never silently shown.
 *
 * Deterministic word lists run always; Jev (typed decisions, ~$0.0001 a
 * check) runs when TYPESAFE_API_KEY is set. Sensitive-but-educational
 * subjects (health, puberty, drugs' effects on the body, wars, crime and law)
 * are allowed: the gates look for harm, not topics.
 */

// -- Word lists -----------------------------------------------------------------
// Deliberately short and unambiguous: whole words that have no place in a
// lesson or a lesson request. Nuance belongs to the model checks, not here.

const EXPLICIT = ["porn", "porno", "pornography", "pornographic", "xxx", "nsfw", "hentai", "onlyfans", "blowjob", "handjob", "orgasm", "masturbat*", "fetish*", "erotic*", "nudes", "sexting", "stripper*", "camgirl*"];
const PROFANITY = ["fuck*", "motherfuck*", "shit*", "bullshit", "bitch*", "bastard*", "asshole*", "dickhead*", "wanker*", "twat*", "cunt*", "piss", "pissed", "crap", "crappy", "wtf", "stfu", "lmao", "lmfao"];
/** Internet slang: fine in chat, wrong in a lesson (and confusing for kids and non-native readers). */
const SLANG = ["gonna", "wanna", "gotta", "kinda", "sorta", "ain't", "y'all", "lol", "omg", "tbh", "imo", "ngl", "bruh", "dude", "no cap", "sus", "rizz", "slay", "vibes", "lowkey", "highkey", "yeet", "goated"];
/** AI-slop phrasing: hype and filler instead of explanation. Flagged, not blocked. */
const SLOP = ["unlock the", "unlocks the", "delve", "delves", "dive into", "deep dive", "embark", "journey into", "tapestry", "realm of", "unleash", "game-changer", "game changer", "fast-paced world", "it's important to note", "it is important to note", "meticulous*", "testament to", "navigate the complexities", "harness the power", "the secrets of", "demystif*", "ever-evolving", "plays a pivotal role", "pivotal role", "in conclusion", "fascinating world"];

function wordsRegex(words: string[]): RegExp {
  const alts = words.map((w) => w.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*$/, "[a-z]*").replace(/ /g, "\\s+"));
  return new RegExp(`(?<![a-z])(?:${alts.join("|")})(?![a-z])`, "gi");
}
const RE = { explicit: wordsRegex(EXPLICIT), profanity: wordsRegex(PROFANITY), slang: wordsRegex(SLANG), slop: wordsRegex(SLOP) };

export interface LintResult {
  explicit: string[];
  profanity: string[];
  slang: string[];
  slop: string[];
}

/** Word-list scan of any text (unique, lowercased hits per list). */
export function lint(text: string): LintResult {
  const hits = (re: RegExp) => Array.from(new Set((text.match(re) || []).map((m) => m.toLowerCase().replace(/\s+/g, " "))));
  return { explicit: hits(RE.explicit), profanity: hits(RE.profanity), slang: hits(RE.slang), slop: hits(RE.slop) };
}

// -- 1. Request gate -------------------------------------------------------------

export type RequestVerdict =
  | { allowed: true }
  | { allowed: false; category: string; message: string };

const BLOCKED_MESSAGE = "BasicsTutor can't help with that. Try a topic you'd like to understand, like “how vaccines work”.";

const REQUEST_CATEGORIES = {
  safe: "An ordinary thing to learn about, including sensitive subjects asked about factually: health, the human body, puberty and reproduction, how drugs or alcohol affect the body, wars, crime and the law, history, religion, politics.",
  sexual: "Sexual acts, pornography, nudity or sexualised content (not basic reproduction or puberty biology).",
  violence_howto: "How to hurt people or animals, make weapons or explosives, or commit crimes.",
  self_harm: "Methods of self-harm or suicide, or tips for disordered eating.",
  drugs_howto: "How to get, make or use illegal drugs, or how to get drunk or high.",
  hate: "Hateful, demeaning or harassing content about a group or a person.",
  crude: "Crude or rude jokes, insults or profanity with no real learning intent.",
} as const;

/**
 * Should we generate anything for this request? `level` = the audience it
 * will be written for (Kids get an extra suitability check).
 */
export async function checkRequest(text: string, opts: { level?: Level; kind?: "topic" | "tutor" } = {}): Promise<RequestVerdict> {
  const l = lint(text);
  if (l.explicit.length || l.profanity.length) return { allowed: false, category: l.explicit.length ? "sexual" : "crude", message: BLOCKED_MESSAGE };

  const kids = opts.level === "kid";
  const r = await ask("safety", { request: text, audience: kids ? "children aged 6-12" : "general, including children", kind: opts.kind ?? "topic" }, {
    category: choice("What is this request, for a learning site that children use?", REQUEST_CATEGORIES),
    ...(kids ? { kid_ok: noul("This is a suitable subject for a lesson written for children aged 6-12 (sensitive subjects are fine if they can be explained gently and factually).") } : {}),
  }, { timeoutMs: 2000, cacheKey: `${opts.level ?? "any"}|${opts.kind ?? "topic"}|${text.trim().toLowerCase()}` });
  if (!r) return { allowed: true }; // Jev off: Gemini's safety filters + the publish gate still apply

  const cat = r.answers.category;
  if (cat.choice !== "safe" && cat.confidence >= THRESHOLDS.medium) return { allowed: false, category: cat.choice, message: BLOCKED_MESSAGE };
  const kidOk = (r.answers as { kid_ok?: { noul: number } }).kid_ok;
  if (kidOk && kidOk.noul < 0.25) {
    return { allowed: false, category: "not_for_kids", message: "That one isn't available at the Kids level. Try the Teens or Adults version, or another topic." };
  }
  return { allowed: true };
}

// -- 3. Publish gate -------------------------------------------------------------

export interface LessonForReview {
  title: string;
  level: Level;
  description: string | null | undefined;
  shortAnswer?: string | null;
  principles: { title: string; explanation: string; analogy?: string | null; keyTakeaways?: string[] | null }[];
  practicalSteps?: string[] | null;
  /** Fact-check score from validateTopicContent (0-100), if it ran. */
  confidenceScore?: number | null;
}

export interface LessonReview {
  /** false = hold (unlisted, noindex) for review. */
  publish: boolean;
  reasons: string[];
  lint: LintResult;
  checkedWithJev: boolean;
}

/** Below this fact-check score a lesson is held rather than published. */
export const MIN_CONFIDENCE = 60;

export function lessonText(l: LessonForReview): string {
  return [
    l.title, l.description, l.shortAnswer,
    ...l.principles.flatMap((p) => [p.title, p.explanation, p.analogy ?? "", ...(p.keyTakeaways ?? [])]),
    ...(l.practicalSteps ?? []),
  ].filter(Boolean).join("\n");
}

export async function reviewLesson(l: LessonForReview): Promise<LessonReview> {
  const text = lessonText(l);
  const found = lint(text);
  const reasons: string[] = [];
  if (found.explicit.length) reasons.push(`explicit words: ${found.explicit.join(", ")}`);
  if (found.profanity.length) reasons.push(`profanity: ${found.profanity.join(", ")}`);
  if (l.confidenceScore != null && l.confidenceScore < MIN_CONFIDENCE) reasons.push(`low fact-check score (${l.confidenceScore})`);

  // Compact state: Jev's accuracy drops as the state fills with text unrelated
  // to the decision, and these are judgements about tone and content.
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
  const state = {
    title: l.title,
    audience: l.level === "kid" ? "children aged 6-12" : l.level === "teen" ? "teenagers aged 13-17" : "adults",
    description: l.description ?? "",
    principles: l.principles.map((p) => ({ title: p.title, text: clip(p.explanation, 900), analogy: clip(p.analogy ?? "", 300) })),
    practical_steps: (l.practicalSteps ?? []).map((s) => clip(s, 200)),
  };
  const r = await ask("review", state, {
    adult: noul("The lesson contains sexual content, nudity, or romantic or sexual detail beyond basic, factual biology."),
    graphic: noul("The lesson describes violence, injury, death or gore in graphic or frightening detail."),
    crude: noul("The lesson uses profanity, slurs, crude jokes or internet slang."),
    dangerous: noul("The lesson tells the reader how to do something that could seriously hurt themselves or others (weapons, dangerous chemicals, risky stunts) without clear safety framing."),
    ...(l.level === "kid" ? { kid_ok: noul("Everything in this lesson is suitable, clear and not frightening for a 6-12-year-old reading it alone.") } : {}),
  }, { timeoutMs: 4000 });

  if (r) {
    const a = r.answers as Record<string, { noul: number }>;
    const labels: Record<string, string> = { adult: "adult content", graphic: "graphic or frightening detail", crude: "crude language or slang", dangerous: "dangerous instructions" };
    for (const [k, label] of Object.entries(labels)) if (a[k].noul >= THRESHOLDS.medium) reasons.push(`${label} (${a[k].noul.toFixed(2)})`);
    if (a.kid_ok && a.kid_ok.noul < THRESHOLDS.medium) reasons.push(`may not suit ages 6-12 (${a.kid_ok.noul.toFixed(2)})`);
  }
  return { publish: reasons.length === 0, reasons, lint: found, checkedWithJev: !!r };
}
