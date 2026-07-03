/**
 * One-time / idempotent utility to populate a handful of curated "sample"
 * topics — the free, always-unlocked topics shown in the homepage's
 * "Explore free sample topics" section and used to seed the Topic Library.
 *
 * A brand-new database has zero topics, so that homepage section (and the
 * library) renders empty until an admin manually generates and flags a few
 * topics via the Admin Dashboard. This script does that in one shot, using
 * the same AI content pipeline real users go through.
 *
 * Usage (run once against a target database):
 *   DATABASE_URL="postgres://..." GOOGLE_API_KEY="..." npm run seed:samples
 *
 * Safe to re-run: topics that already exist are left alone (or re-flagged as
 * sample/public if they'd drifted), never duplicated or regenerated.
 */
import { storage } from "./storage";
import { generateTopicContent, validateTopicContent } from "./ai";
import { pool } from "./db";

// Matches the "Popular" suggestions on the homepage hero, plus a couple of
// broadly appealing, evergreen additions — so those hero shortcuts resolve
// instantly instead of triggering a fresh generation for a new visitor.
const SAMPLE_TOPICS = [
  "How ChatGPT Works",
  "Cryptocurrency Basics",
  "Personal Finance 101",
  "Climate Change Science",
  "How the Internet Works",
  "The Scientific Method",
];

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function seedTopic(title: string): Promise<void> {
  const slug = slugify(title);
  const existing = await storage.getTopicBySlug(slug);

  if (existing) {
    if (!existing.isSample || !existing.isPublic) {
      await storage.updateTopic(existing.id, { isSample: true, isPublic: true });
      console.log(`[Seed] "${title}" already existed — flagged as sample/public.`);
    } else {
      console.log(`[Seed] "${title}" already exists as a sample topic. Skipping.`);
    }
    return;
  }

  console.log(`[Seed] Generating "${title}"...`);
  const content = await generateTopicContent(title);
  const canonicalTitle = content.title?.trim() || title;

  let confidenceScore: number | null = null;
  let validationResult: any = null;
  try {
    const validation = await validateTopicContent(canonicalTitle, content);
    confidenceScore = validation.overallConfidence;
    validationResult = validation;
  } catch (err) {
    console.warn(`[Seed] Validation failed for "${title}" (continuing without it):`, err);
  }

  const topic = await storage.createTopic({
    userId: null,
    title: canonicalTitle,
    slug,
    description: content.description,
    category: content.category,
    difficulty: content.difficulty,
    estimatedMinutes: content.estimatedMinutes,
    isPublic: true,
    isSample: true,
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

  console.log(`[Seed] Created "${title}" (${content.principles.length} principles).`);
}

async function main() {
  console.log(`[Seed] Seeding ${SAMPLE_TOPICS.length} sample topics...\n`);

  for (const title of SAMPLE_TOPICS) {
    try {
      await seedTopic(title);
    } catch (err) {
      // One bad topic (e.g. a transient AI error) shouldn't abort the batch.
      console.error(`[Seed] Failed to seed "${title}":`, err);
    }
  }

  console.log("\n[Seed] Done.");
}

main()
  .catch((err) => {
    console.error("[Seed] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
