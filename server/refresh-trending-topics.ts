/**
 * Refreshes the "Trending Now" homepage section from real daily search
 * trends. Intended to run on a schedule (a Render Cron Job — see
 * render.yaml) but safe to run manually/repeatedly at any time.
 *
 * Pipeline:
 *  1. Pull today's raw trending search terms (google-trends-api — unofficial,
 *     free, no API key; can break silently if Google changes the endpoint it
 *     scrapes, which is an acceptable risk for a "nice to have" feature).
 *  2. Ask Gemini to pick the handful worth turning into a first-principles
 *     lesson and rephrase them into clean topic titles (see
 *     filterTrendingTopics in ./ai — raw trends are mostly noise: sports
 *     scores, celebrity news, product drops).
 *  3. For each: reuse an existing topic if the slug already exists (just
 *     re-flag it trending, no wasted AI spend), otherwise generate it fresh
 *     through the same pipeline real users go through.
 *  4. Clear the previous batch's trending flags first, so the homepage only
 *     ever shows today's set — older auto-generated topics simply remain in
 *     the full Topic Library, which is good for SEO, just no longer featured.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." GOOGLE_API_KEY="..." npm run refresh:trending
 */
import googleTrends from "google-trends-api";
import { storage } from "./storage";
import { generateTopicContent, validateTopicContent, filterTrendingTopics } from "./ai";
import { pool } from "./db";

const MAX_TRENDING_TOPICS = 5;
const TRENDS_GEO = process.env.TRENDS_GEO || "US";

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface RawDailyTrendsResponse {
  default?: {
    trendingSearchesDays?: {
      trendingSearches?: { title?: { query?: string } }[];
    }[];
  };
}

async function fetchRawTrends(): Promise<string[]> {
  const raw = await googleTrends.dailyTrends({ geo: TRENDS_GEO });
  const parsed: RawDailyTrendsResponse = JSON.parse(raw);
  const searches = parsed.default?.trendingSearchesDays?.[0]?.trendingSearches || [];
  const queries = searches.map((s) => s.title?.query).filter((q): q is string => !!q);
  // Dedupe while preserving order.
  return Array.from(new Set(queries));
}

async function upsertTrendingTopic(title: string, rank: number): Promise<void> {
  const slug = slugify(title);
  const existing = await storage.getTopicBySlug(slug);

  if (existing) {
    await storage.updateTopic(existing.id, { isTrending: true, trendingRank: rank, isPublic: true });
    console.log(`[Trending] "${title}" already existed — re-flagged as trending (#${rank + 1}).`);
    return;
  }

  console.log(`[Trending] Generating "${title}"...`);
  const content = await generateTopicContent(title);
  const canonicalTitle = content.title?.trim() || title;

  let confidenceScore: number | null = null;
  let validationResult: any = null;
  try {
    const validation = await validateTopicContent(canonicalTitle, content);
    confidenceScore = validation.overallConfidence;
    validationResult = validation;
  } catch (err) {
    console.warn(`[Trending] Validation failed for "${title}" (continuing without it):`, err);
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
    isTrending: true,
    trendingRank: rank,
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

  console.log(`[Trending] Created "${title}" (#${rank + 1}, ${content.principles.length} principles).`);
}

async function main() {
  console.log(`[Trending] Fetching daily trends (geo=${TRENDS_GEO})...`);
  const rawTerms = await fetchRawTrends();
  console.log(`[Trending] Got ${rawTerms.length} raw trending terms.`);

  if (rawTerms.length === 0) {
    console.log("[Trending] No trends returned — leaving the current trending set untouched.");
    return;
  }

  const candidates = await filterTrendingTopics(rawTerms, MAX_TRENDING_TOPICS);
  console.log(`[Trending] Gemini selected ${candidates.length} educational candidate(s):`);
  candidates.forEach((c) => console.log(`  - ${c.title} (${c.reason})`));

  if (candidates.length === 0) {
    console.log("[Trending] Nothing qualified today — leaving the current trending set untouched.");
    return;
  }

  // Reset the previous batch only once we know today's replacement is ready,
  // so a mid-run failure doesn't leave the homepage with zero trending topics.
  await storage.clearTrendingFlags();

  for (let i = 0; i < candidates.length; i++) {
    try {
      await upsertTrendingTopic(candidates[i].title, i);
    } catch (err) {
      console.error(`[Trending] Failed to upsert "${candidates[i].title}":`, err);
    }
  }

  console.log("\n[Trending] Done.");
}

main()
  .catch((err) => {
    console.error("[Trending] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
