/**
 * Re-runs existing public topics through the upgraded generation pipeline
 * (sharper first-principles prompt + "Put it into practice"), refreshing their
 * content IN PLACE.
 *
 * Preserves each topic's id, title, slug, and isPublic/isSample/trending flags
 * — so indexed URLs and library placement are untouched. Only the lesson
 * content is regenerated (description, category, difficulty, mind map,
 * principles, and the new practicalSteps), at Adults level (the existing
 * library is all base-slug/adult).
 *
 * Safe to re-run (it just regenerates again). Bounded concurrency so the whole
 * library doesn't hammer the Gemini API. Validation (the second Gemini call
 * that produces the confidence score) is OFF by default to halve cost/time;
 * existing confidence scores are preserved when it's off.
 *
 * Usage:
 *   # test with 3 first, eyeball the new quality:
 *   DATABASE_URL="..." GOOGLE_API_KEY="..." npm run regenerate:topics -- 3
 *   # then the whole library:
 *   DATABASE_URL="..." GOOGLE_API_KEY="..." npm run regenerate:topics
 *
 *   # just specific topics (by slug, public or not), with a fresh confidence score:
 *   REGEN_SLUGS="how-the-meta-muse-works" REGEN_VALIDATE=true npm run regenerate:topics
 *
 * Env knobs:
 *   # the health & money lessons (web research, sources, not-advice note):
 *   REGEN_ADVICE=true REGEN_VALIDATE=true npm run regenerate:topics
 *   # the weekly refresh (render.yaml cron): the 15 most in need of it
 *   REGEN_OLDEST=15 REGEN_VALIDATE=true npm run regenerate:topics
 *
 *   REGEN_SLUGS        comma-separated slugs to regenerate instead of the library
 *   REGEN_ADVICE       "true": only health & money lessons (shared/advice.ts)
 *   REGEN_OLDEST       N: pick the N lessons most in need of a refresh --
 *                      unsourced health/money first, then other unsourced,
 *                      then least recently updated -- skipping any updated in
 *                      the last REGEN_MIN_AGE_DAYS (default 45)
 *   REGEN_CONCURRENCY  parallel generations (default 3)
 *   REGEN_VALIDATE     "true" to run the validation/confidence pass (default off)
 */
import { storage } from "./storage";
import { generateTopicContent, validateTopicContent } from "./ai";
import { pool } from "./db";
import { applyTopicContent } from "./topic-content";
import { adviceKind } from "@shared/advice";
import { refreshPriority } from "./refresh-priority";
import { overBudget } from "./ai-spend";
import { reviewLesson } from "./safety";
import type { Topic } from "@shared/schema";
import type { Level } from "@shared/levels";

const CONCURRENCY = Math.max(1, parseInt(process.env.REGEN_CONCURRENCY || "3", 10));
const RUN_VALIDATION = process.env.REGEN_VALIDATE === "true";
const SLUGS = (process.env.REGEN_SLUGS || "").split(",").map((s) => s.trim()).filter(Boolean);
const ADVICE_ONLY = process.env.REGEN_ADVICE === "true";
const OLDEST = Math.max(0, parseInt(process.env.REGEN_OLDEST || "0", 10));
const MIN_AGE_DAYS = Math.max(0, parseInt(process.env.REGEN_MIN_AGE_DAYS || "45", 10));



interface Result {
  title: string;
  status: "regenerated" | "failed";
  detail?: string;
}

async function regenerateOne(topic: Topic): Promise<Result> {
  // Keep the original title/slug/level — never change indexed URLs.
  const level = ((topic.level as Level | null) || "adult") as Level;
  const content = await generateTopicContent(topic.title, level);

  // Preserve the current confidence/validation unless we re-run validation.
  let confidenceScore: number | null = topic.confidenceScore ?? null;
  let validationResult: any = topic.validationData ?? null;
  if (RUN_VALIDATION) {
    try {
      const validation = await validateTopicContent(topic.title, content);
      confidenceScore = validation.overallConfidence;
      validationResult = validation;
    } catch {
      // Non-fatal — a topic without a fresh score still ships.
    }
  }
  // Web-research sources (shown on the lesson page) live in validationData.
  // Always reflect THIS run: new sources if research ran, none if it didn't
  // (old ones described the old content).
  if (!RUN_VALIDATION || !content.research) {
    const { sources: _old, ...rest } = validationResult ?? {};
    validationResult = content.research?.sources.length ? { ...rest, sources: content.research.sources } : rest;
  }

  // Same publish gate as a new lesson: never replace a lesson with one that fails it.
  const review = await reviewLesson({ title: topic.title, level, description: content.description, shortAnswer: content.shortAnswer, principles: content.principles, practicalSteps: content.practicalSteps, confidenceScore, research: content.research });
  if (!review.publish) {
    return { title: topic.title, status: "failed", detail: `rewrite failed the publish gate: ${review.reasons.join("; ")} (kept the current version)` };
  }

  // Snapshot + in-place principle swap: learners' progress survives, and the
  // old version can be restored from Admin > Feedback.
  await applyTopicContent(topic, content, {
    reason: "regenerate",
    confidenceScore,
    validationData: validationResult,
  });

  const steps = content.practicalSteps?.length ? `, ${content.practicalSteps.length} practice steps` : "";
  return { title: topic.title, status: "regenerated", detail: `${content.principles.length} principles${steps}` };
}

/** Run an async mapper over items with a fixed concurrency limit. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await mapper(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function main() {
  const limitArg = parseInt(process.argv[2] || "", 10);
  let all: Topic[];
  if (SLUGS.length) {
    all = [];
    for (const slug of SLUGS) {
      const topic = await storage.getTopicBySlug(slug);
      if (topic) all.push(topic);
      else console.warn(`[Regen] No topic with slug "${slug}" — skipped.`);
    }
  } else if (ADVICE_ONLY) {
    all = (await storage.getPublicTopics()).filter((t) => adviceKind(t.slug)).reverse();
  } else if (OLDEST > 0) {
    all = refreshPriority(await storage.getPublicTopics(), OLDEST, { minAgeDays: MIN_AGE_DAYS });
  } else {
    all = [...(await storage.getPublicTopics())].reverse(); // oldest first — deterministic
  }
  const topics =
    Number.isFinite(limitArg) && limitArg > 0 ? all.slice(0, limitArg) : all;

  console.log(
    `[Regen] Regenerating ${topics.length} of ${all.length} ${SLUGS.length || ADVICE_ONLY || OLDEST ? "selected" : "public"} topics ` +
    `(concurrency=${CONCURRENCY}, validation=${RUN_VALIDATION ? "on" : "off"}, ` +
    `research=${process.env.PERPLEXITY_API_KEY ? "on" : "OFF, PERPLEXITY_API_KEY not set"})...\n`,
  );

  let done = 0;
  const results = await mapWithConcurrency(topics, CONCURRENCY, async (topic) => {
    let result: Result;
    try {
      // Background job: stop once today's AI budget is spent (server/ai-spend.ts).
      result = await overBudget()
        ? { title: topic.title, status: "failed", detail: "skipped: daily AI budget reached" }
        : await regenerateOne(topic);
    } catch (err) {
      result = { title: topic.title, status: "failed", detail: err instanceof Error ? err.message : String(err) };
    }
    done++;
    const tag = result.status === "regenerated" ? "✓" : "✗";
    console.log(`[Regen] (${done}/${topics.length}) ${tag} ${topic.title}${result.detail ? ` — ${result.detail}` : ""}`);
    return result;
  });

  const ok = results.filter((r) => r.status === "regenerated").length;
  const failed = results.filter((r) => r.status === "failed");

  console.log(`\n[Regen] Done. Regenerated ${ok}, failed ${failed.length}.`);
  if (failed.length) {
    console.log(`[Regen] Failed (safe to re-run):`);
    failed.forEach((f) => console.log(`  - ${f.title}: ${f.detail}`));
  }
}

main()
  .catch((err) => {
    console.error("[Regen] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
