import { choice, noul, score } from "@typesafe-ai/sdk";
import { storage } from "./storage";
import { ask, tier, THRESHOLDS, type Tier } from "./jev";
import { suggestClarifications } from "./ai";
import { lint } from "./safety";
import type { Level } from "@shared/levels";

/**
 * Search intake: what did the reader mean, and what should happen next?
 * One fan-out Jev call answers every question about the query at once
 * (intent, clarity, ambiguity, audience, framing, best library match); a
 * second tiny call verifies a library match before we send someone there.
 * Confidence decides how assertive the UI is (see docs/JEV.md):
 *   high   -> act (open the lesson, preselect the level)
 *   medium -> suggest softly (reader confirms)
 *   low    -> don't act on it (clarify, or fall back to today's flow)
 * Any Jev failure returns { action: "create", source: "fallback" } --
 * exactly the pre-Jev behaviour.
 */

// -- The library, as Jev choice options ---------------------------------------

export interface LibraryLesson {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
}

/** A Choice question takes at most 255 options; one is reserved for "none". */
const MAX_OPTIONS = 254;
let libraryCache: { at: number; lessons: LibraryLesson[] } | null = null;

export async function getLibrary(): Promise<LibraryLesson[]> {
  if (libraryCache && Date.now() - libraryCache.at < 5 * 60_000) return libraryCache.lessons;
  const all = await storage.getPublicTopics();
  const lessons = all.map((t) => ({ slug: t.slug, title: t.title, description: t.description, category: t.category, level: t.level }));
  libraryCache = { at: Date.now(), lessons };
  return lessons;
}
/** Tests / after publishing: forget the cached library. */
export function invalidateLibrary() {
  libraryCache = null;
}

/**
 * Options for the "which lesson matches?" choice. Labels are slugs (they read
 * as words, which helps the model); descriptions are the titles. Past 254
 * lessons, keep ones whose title shares a word with the query first, then the
 * newest -- a two-pass (field, then lesson) search is the next step if the
 * library grows well beyond that.
 */
export function matchCriteria(lessons: LibraryLesson[], query: string, level?: Level): Record<string, string> {
  let pool = level ? lessons.filter((l) => (l.level || "adult") === level) : lessons;
  if (pool.length > MAX_OPTIONS) {
    const words = new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
    const overlaps = (t: string) => t.toLowerCase().split(/[^a-z0-9]+/).some((w) => words.has(w));
    pool = [...pool.filter((l) => overlaps(l.title)), ...pool.filter((l) => !overlaps(l.title))].slice(0, MAX_OPTIONS);
  }
  const criteria: Record<string, string> = { none: "None of these lessons is about what the person asked." };
  for (const l of pool) criteria[l.slug] = l.title;
  return criteria;
}

const MATCH_INSTRUCTIONS =
  "Which existing lesson teaches the subject the person is asking about? Pick a lesson only if it covers the same subject, not merely a related one. Otherwise pick none.";

// -- Semantic suggestions while typing ------------------------------------------

/** Lessons that match the query by meaning (not just shared words). Cheap: one choice. */
export async function semanticSuggestions(query: string, limit = 5): Promise<LibraryLesson[]> {
  const lessons = await getLibrary();
  if (!lessons.length) return [];
  const r = await ask("suggest", { query }, { match: choice(MATCH_INSTRUCTIONS, matchCriteria(lessons, query)) }, { timeoutMs: 1200, cacheKey: norm(query) });
  if (!r) return [];
  const probs = r.answers.match.probabilities as Record<string, number>;
  const bySlug = new Map(lessons.map((l) => [l.slug, l]));
  return Object.entries(probs)
    .filter(([slug, p]) => slug !== "none" && p >= 0.1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug]) => bySlug.get(slug)!)
    .filter(Boolean);
}

// -- Intake decision on submit -------------------------------------------------

export type Framing = "why_it_works" | "how_to" | "both";

export type IntakeDecision =
  | { action: "open_lesson"; lesson: LibraryLesson; confidence: number }
  | { action: "suggest_lesson"; lesson: LibraryLesson; confidence: number }
  | { action: "clarify"; kind: string; question: string; options: string[]; confidence: number }
  | { action: "create"; level?: Level; levelTier?: Tier; framing?: Framing; source: "jev" | "fallback" }
  | { action: "site_help"; href: string }
  | { action: "reject"; reason: "gibberish" | "harmful"; message: string };

function intakeQuestions(criteria: Record<string, string>) {
  return {
    intent: choice("What does the person want from a site that explains topics from first principles?", {
      learn_topic: "To understand a subject, concept, process or thing (e.g. 'how do vaccines work', 'inflation', 'why is the sky blue').",
      site_help: "Help with BasicsTutor itself: pricing, accounts, signing in, how the site works, contacting us.",
      specific_problem: "A direct answer to one specific problem or personal situation rather than a lesson (e.g. 'solve 2x+3=7', 'fix my wifi', 'should I buy Tesla stock').",
      gibberish: "Random characters, keyboard mashing, or text with no discernible subject.",
      harmful: "How to cause harm: weapons, violence, self-harm, serious crime, or sexual content involving minors.",
    }),
    clarity: score("How clearly does the query name ONE subject that can be taught as a single lesson?", [
      "Unclear: could mean several very different subjects, or has no clear subject (e.g. 'Mercury', 'cells', 'stuff').",
      "Too broad: a whole field that needs narrowing first (e.g. 'physics', 'history', 'money').",
      "Mostly clear: one subject, somewhat open-ended (e.g. 'black holes', 'the stock market').",
      "Clear: one specific subject or question (e.g. 'how vaccines train the immune system').",
    ]),
    ambiguity: choice("If the query is not perfectly clear, what is the main problem?", {
      clear: "Nothing: the subject is clear and specific.",
      ambiguous_name: "The words name several different things (e.g. 'Mercury' is a planet, an element and a god; 'Python' is a snake and a language).",
      too_broad: "It names a whole field or a very large topic.",
      unclear_goal: "The subject is clear, but not what they want to understand about it.",
    }),
    level: choice("Who is the lesson for? Judge only from explicit cues in the query.", {
      kid: "A child aged 6-12: mentions kids, children, 'my son/daughter', a young age, primary/elementary school, 'explain like I'm 5'.",
      teen: "A teenager aged 13-18: mentions high school, grades 7-12, GCSE, A-level, SAT, AP.",
      adult: "An adult: mentions work, career, university or a professional context.",
      unspecified: "No audience cue at all.",
    }),
    framing: choice("What kind of understanding does the person want?", {
      why_it_works: "Why or how something works, or what it is (e.g. 'how do...', 'why does...', 'what is...').",
      how_to: "Practical steps to do something themselves (e.g. 'how to budget', 'how to start running').",
      both: "Both, or it can't be told.",
    }),
    match: choice(MATCH_INSTRUCTIONS, criteria),
  };
}

/** Is `lesson` really about `query`? The gate before sending anyone to an existing page. */
async function verifyMatch(query: string, lesson: LibraryLesson): Promise<number | null> {
  const r = await ask("verify", { query, lesson: { title: lesson.title, description: lesson.description ?? "" } }, {
    same: noul("The lesson teaches the subject the person asked about: the same subject, not just a related or broader one."),
  }, { timeoutMs: 1500, cacheKey: `${norm(query)}|${lesson.slug}` });
  return r ? r.answers.same.noul : null;
}

const norm = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Decide what the search box does next. `clarified` = the reader already
 * picked one of our follow-up options, so never ask a second time.
 */
export async function decideIntake(query: string, opts: { clarified?: boolean } = {}): Promise<IntakeDecision> {
  const words = lint(query);
  if (words.explicit.length || words.profanity.length) {
    return { action: "reject", reason: "harmful", message: "BasicsTutor can't help with that. Try a topic you'd like to understand." };
  }
  const lessons = await getLibrary();
  const r = await ask("intake", { site: "BasicsTutor: free lessons that explain any topic from first principles", query },
    intakeQuestions(matchCriteria(lessons, query)), { timeoutMs: 2500, cacheKey: norm(query) });
  if (!r) return { action: "create", source: "fallback" };
  const a = r.answers;

  // 1. Hard stops. Only act when Jev is reasonably sure; otherwise let the
  //    normal flow (and Gemini's own safety settings) handle it.
  if (a.intent.choice === "harmful" && a.intent.confidence >= THRESHOLDS.medium) {
    return { action: "reject", reason: "harmful", message: "BasicsTutor can't help with that. Try a topic you'd like to understand." };
  }
  if (a.intent.choice === "gibberish" && a.intent.confidence >= THRESHOLDS.medium) {
    return { action: "reject", reason: "gibberish", message: "We couldn't find a topic in that. Try a few words, like “how do vaccines work”." };
  }
  if (a.intent.choice === "site_help" && tier(a.intent.confidence) === "high") {
    return { action: "site_help", href: "/help" };
  }

  // 2. An existing lesson that really covers it: send them there (don't make a
  //    duplicate) -- unless it's written for a different audience than the
  //    one the reader clearly asked for ("...to my 7 year old" + an adult
  //    lesson): then build the right level instead.
  const askedLevel = a.level.choice !== "unspecified" && tier(a.level.confidence) === "high" ? (a.level.choice as Level) : null;
  if (a.match.choice !== "none") {
    const matched = lessons.find((l) => l.slug === a.match.choice);
    const lesson = matched && askedLevel && (matched.level || "adult") !== askedLevel ? undefined : matched;
    const verified = lesson ? await verifyMatch(query, lesson) : null;
    if (lesson && verified != null) {
      if (verified >= THRESHOLDS.high) return { action: "open_lesson", lesson, confidence: verified };
      if (verified >= THRESHOLDS.medium) return { action: "suggest_lesson", lesson, confidence: verified };
    }
  }

  // 3. Not clear enough to write a good lesson: ask once, with concrete options.
  //    A specific problem ("solve 2x+3=7") becomes "which idea behind it?".
  const clarityNorm = a.clarity.score / 3; // 4 levels, 0-based score
  const kind = a.intent.choice === "specific_problem" && a.intent.confidence >= THRESHOLDS.medium ? "underlying_concept"
    : a.ambiguity.choice !== "clear" && a.ambiguity.confidence >= THRESHOLDS.medium ? a.ambiguity.choice
    : clarityNorm < 0.45 ? "too_broad" : null;
  if (!opts.clarified && kind && (clarityNorm < 0.6 || kind === "underlying_concept")) {
    const c = await suggestClarifications(query, kind);
    if (c && c.options.length >= 2) {
      return { action: "clarify", kind, question: c.question, options: c.options, confidence: a.clarity.confidence };
    }
  }

  // 4. Clear enough: build it. Pass on what Jev noticed about audience and framing.
  const levelTier = tier(a.level.confidence);
  return {
    action: "create",
    source: "jev",
    ...(a.level.choice !== "unspecified" && levelTier !== "low" ? { level: a.level.choice as Level, levelTier } : {}),
    ...(a.framing.confidence >= THRESHOLDS.medium && a.framing.choice !== "both" ? { framing: a.framing.choice as Framing } : {}),
  };
}

/**
 * Duplicate guard before generating: an existing lesson (same level) that
 * already teaches this subject. Stricter than the search box: this decides
 * whether a new page gets created at all.
 */
export async function findExistingLesson(title: string, level: Level): Promise<LibraryLesson | null> {
  const lessons = await getLibrary();
  const r = await ask("dedupe", { query: title }, { match: choice(MATCH_INSTRUCTIONS, matchCriteria(lessons, title, level)) }, { timeoutMs: 2000, cacheKey: `${level}|${norm(title)}` });
  if (!r || r.answers.match.choice === "none") return null;
  const lesson = lessons.find((l) => l.slug === r.answers.match.choice);
  if (!lesson) return null;
  const verified = await verifyMatch(title, lesson);
  return verified != null && verified >= 0.85 ? lesson : null;
}
