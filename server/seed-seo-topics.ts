/**
 * Batch-generates the curated SEO topics (server/seo-topics-list.ts) into
 * real, indexable topic pages -- the organic-search growth engine.
 *
 * Each topic is flagged isPublic (shows in the Topic Library + sitemap +
 * gets its per-topic SEO meta/OG/JSON-LD) but NOT isSample, so the curated
 * homepage "sample topics" section stays hand-picked instead of ballooning
 * to 200 cards.
 *
 * Idempotent: skips any title whose slug already exists (from a prior run,
 * a user search, or the sample seed). Re-run any time -- only new titles
 * generate. Safe to resume after an interruption.
 *
 * Runs with bounded concurrency so ~200 topics take ~30 min instead of ~3
 * hours sequential, without hammering the Gemini API. Validation (the second
 * Gemini call per topic that produces the confidence score) is skipped by
 * default to halve cost/time on bulk runs -- set SEO_VALIDATE=true to include it.
 *
 * Usage:
 *   # test with 5 first, eyeball the quality:
 *   DATABASE_URL="..." GOOGLE_API_KEY="..." npm run seo:seed -- 5
 *   # then the full set:
 *   DATABASE_URL="..." GOOGLE_API_KEY="..." npm run seo:seed
 *
 * Env knobs:
 *   SEO_CONCURRENCY  parallel generations (default 4)
 *   SEO_VALIDATE     "true" to run the validation/confidence pass (default off)
 */
import { storage } from "./storage";
import { generateTopicContent, validateTopicContent } from "./ai";
import { SEO_TOPICS } from "./seo-topics-list";
import { pool } from "./db";

const CONCURRENCY = Math.max(1, parseInt(process.env.SEO_CONCURRENCY || "4", 10));
const RUN_VALIDATION = process.env.SEO_VALIDATE === "true";

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface Result {
  title: string;
  status: "created" | "skipped" | "failed";
  detail?: string;
}

async function seedOne(title: string): Promise<Result> {
  const slug = slugify(title);

  const existing = await storage.getTopicBySlug(slug);
  if (existing) {
    // Make sure it's publicly visible/indexable, but never downgrade a
    // curated sample topic that happens to share a title.
    if (!existing.isPublic) {
      await storage.updateTopic(existing.id, { isPublic: true });
    }
    return { title, status: "skipped", detail: "already exists" };
  }

  const content = await generateTopicContent(title);
  const canonicalTitle = content.title?.trim() || title;
  const canonicalSlug = slugify(canonicalTitle);

  // The AI may have corrected a title into one that already exists.
  if (canonicalSlug !== slug) {
    const canonicalExisting = await storage.getTopicBySlug(canonicalSlug);
    if (canonicalExisting) {
      if (!canonicalExisting.isPublic) {
        await storage.updateTopic(canonicalExisting.id, { isPublic: true });
      }
      return { title, status: "skipped", detail: `corrected to existing "${canonicalTitle}"` };
    }
  }

  let confidenceScore: number | null = null;
  let validationResult: any = null;
  if (RUN_VALIDATION) {
    try {
      const validation = await validateTopicContent(canonicalTitle, content);
      confidenceScore = validation.overallConfidence;
      validationResult = validation;
    } catch (err) {
      // Non-fatal -- a topic without a confidence score still ships.
    }
  }

  const topic = await storage.createTopic({
    userId: null,
    title: canonicalTitle,
    slug: canonicalSlug,
    description: content.description,
    category: content.category,
    difficulty: content.difficulty,
    estimatedMinutes: content.estimatedMinutes,
    isPublic: true,
    isSample: false,
    mindMapData: content.mindMap,
    confidenceScore,
    validationData: validationResult,
  });

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

  return { title, status: "created", detail: `${content.principles.length} principles, ${content.category}` };
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
  const titles = Number.isFinite(limitArg) && limitArg > 0 ? SEO_TOPICS.slice(0, limitArg) : SEO_TOPICS;

  console.log(
    `[SEO] Seeding ${titles.length} of ${SEO_TOPICS.length} topics ` +
    `(concurrency=${CONCURRENCY}, validation=${RUN_VALIDATION ? "on" : "off"})...\n`,
  );

  let done = 0;
  const results = await mapWithConcurrency(titles, CONCURRENCY, async (title) => {
    let result: Result;
    try {
      result = await seedOne(title);
    } catch (err) {
      result = { title, status: "failed", detail: err instanceof Error ? err.message : String(err) };
    }
    done++;
    const tag = result.status === "created" ? "✓" : result.status === "skipped" ? "–" : "✗";
    console.log(`[SEO] (${done}/${titles.length}) ${tag} ${title}${result.detail ? ` — ${result.detail}` : ""}`);
    return result;
  });

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed");

  console.log(`\n[SEO] Done. Created ${created}, skipped ${skipped}, failed ${failed.length}.`);
  if (failed.length) {
    console.log(`[SEO] Failed titles (safe to re-run, they'll retry):`);
    failed.forEach((f) => console.log(`  - ${f.title}: ${f.detail}`));
  }
}

main()
  .catch((err) => {
    console.error("[SEO] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
