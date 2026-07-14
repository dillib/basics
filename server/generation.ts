import { storage } from "./storage";
import { generateTopicContent, validateTopicContent } from "./ai";
import { buildTopicSlug, isLevel } from "@shared/levels";

/**
 * Background processor for a topic-generation job.
 *
 * This is intentionally fire-and-forget: the HTTP route creates a job row,
 * returns immediately, and invokes this function without awaiting it. Progress
 * and the final result/error are persisted to the `generation_jobs` row so any
 * server instance can serve the status endpoint.
 *
 * It never throws — failures are recorded on the job so the client can react.
 */
export async function processGenerationJob(jobId: string): Promise<void> {
  try {
    const job = await storage.getGenerationJob(jobId);
    if (!job) {
      console.error(`[Generation] Job ${jobId} not found`);
      return;
    }

    const { title, slug, userId } = job;
    const level = isLevel(job.level) ? job.level : "adult";
    await storage.updateGenerationJob(jobId, { status: "processing", progress: 10 });

    // Guard against a race where the topic was created between enqueue and now
    // (e.g. two users searching the same title concurrently).
    const alreadyExists = await storage.getTopicBySlug(slug);
    if (alreadyExists) {
      await storage.updateGenerationJob(jobId, {
        status: "completed",
        progress: 100,
        topicId: alreadyExists.id,
        topicSlug: alreadyExists.slug,
      });
      return;
    }

    const content = await generateTopicContent(title, level);
    await storage.updateGenerationJob(jobId, { progress: 55 });

    // The AI corrects obvious typos (e.g. "Quantim" -> "Quantum") rather than
    // permanently saving whatever the user happened to type. If the corrected
    // title lands on a slug that already exists -- someone else already has
    // the correctly-spelled version -- link to that instead of creating a
    // near-duplicate topic.
    const canonicalTitle = content.title?.trim() || title;
    const canonicalSlug = buildTopicSlug(canonicalTitle, level);
    if (canonicalSlug !== slug) {
      const canonicalExisting = await storage.getTopicBySlug(canonicalSlug);
      if (canonicalExisting) {
        await storage.updateGenerationJob(jobId, {
          status: "completed",
          progress: 100,
          topicId: canonicalExisting.id,
          topicSlug: canonicalExisting.slug,
        });
        console.log(`[Generation] Job ${jobId}: "${title}" corrected to existing topic "${canonicalTitle}".`);
        return;
      }
    }

    // Validation is best-effort: a validation failure shouldn't fail the job.
    let validationResult: any = null;
    let confidenceScore: number | null = null;
    try {
      validationResult = await validateTopicContent(canonicalTitle, content);
      confidenceScore = validationResult?.overallConfidence ?? null;
    } catch (validationError) {
      console.error(`[Generation] Validation warning for job ${jobId}:`, validationError);
    }
    await storage.updateGenerationJob(jobId, { progress: 75 });

    const newTopic = await storage.createTopic({
      userId: userId || null,
      title: canonicalTitle,
      slug: canonicalSlug,
      description: content.description,
      category: content.category,
      difficulty: content.difficulty,
      level,
      practicalSteps: content.practicalSteps,
      estimatedMinutes: content.estimatedMinutes,
      isPublic: true,
      mindMapData: content.mindMap,
      confidenceScore,
      validationData: validationResult,
    });

    const principleData = content.principles.map((p: any, index: number) => ({
      topicId: newTopic.id,
      orderIndex: index,
      title: p.title,
      explanation: p.explanation,
      analogy: p.analogy,
      visualType: p.visualType,
      visualData: p.visualData,
      keyTakeaways: p.keyTakeaways,
    }));
    await storage.createPrinciples(principleData);
    await storage.updateGenerationJob(jobId, { progress: 95 });

    // Track usage for authenticated users only.
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUser(userId, { topicsUsed: (user.topicsUsed || 0) + 1 });
      }
    }

    await storage.updateGenerationJob(jobId, {
      status: "completed",
      progress: 100,
      topicId: newTopic.id,
      topicSlug: newTopic.slug,
    });
    console.log(`[Generation] Job ${jobId} completed -> topic ${newTopic.id}`);
  } catch (error) {
    console.error(`[Generation] Job ${jobId} failed:`, error);
    await storage
      .updateGenerationJob(jobId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Generation failed",
      })
      .catch((e) => console.error(`[Generation] Failed to record job failure for ${jobId}:`, e));
  }
}
