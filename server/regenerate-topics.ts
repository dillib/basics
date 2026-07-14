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
 * Env knobs:
 *   REGEN_CONCURRENCY  parallel generations (default 3)
 *   REGEN_VALIDATE     "true" to run the validation/confidence pass (default off)
 */
import { storage } from "./storage";
import { generateTopicContent, validateTopicContent } from "./ai";
import { pool } from "./db";
import type { Topic } from "@shared/schema";

const CONCURRENCY = Math.max(1, parseInt(process.env.REGEN_CONCURRENCY || "3", 10));
const RUN_VALIDATION = process.env.REGEN_VALIDATE === "true";

interface Result {
  title: string;
  status: "regenerated" | "failed";
  detail?: string;
}

async function regenerateOne(topic: Topic): Promise<Result> {
  // Keep the original title/slug — never change indexed URLs. Regenerate at
  // Adults level to match the existing (pre-level) library.
  const content = await generateTopicContent(topic.title, "adult");

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

  await storage.updateTopic(topic.id, {
    description: content.description,
    category: content.category,
    difficulty: content.difficulty,
    level: "adult",
    practicalSteps: content.practicalSteps,
    estimatedMinutes: content.estimatedMinutes,
    mindMapData: content.mindMap,
    confidenceScore,
    validationData: validationResult,
  });

  // Replace principles wholesale (delete old, insert fresh).
  await storage.deletePrinciplesByTopic(topic.id);
  await storage.createPrinciples(
    content.principles.map((p, index) => ({
      topicId: topic.id,
      orderIndex: index,
      title: p.title,
      explanation: p.explanation,
      analogy: p.analogy,
      visualType: p.visualType,
      visualData: p.visualData,
      keyTakeaways: p.keyTakeaways,
    })),
  );

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
  const all = await storage.getPublicTopics(); // newest first
  const ordered = [...all].reverse(); // oldest first — deterministic ordering
  const topics =
    Number.isFinite(limitArg) && limitArg > 0 ? ordered.slice(0, limitArg) : ordered;

  console.log(
    `[Regen] Regenerating ${topics.length} of ${all.length} public topics ` +
    `(concurrency=${CONCURRENCY}, validation=${RUN_VALIDATION ? "on" : "off"})...\n`,
  );

  let done = 0;
  const results = await mapWithConcurrency(topics, CONCURRENCY, async (topic) => {
    let result: Result;
    try {
      result = await regenerateOne(topic);
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
