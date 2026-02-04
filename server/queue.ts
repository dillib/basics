import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { storage } from './storage';
import { generateTopicContent, validateTopicContent } from './ai';

// Initialize Redis connection
// Railway provides REDIS_URL environment variable
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const TOPIC_GENERATION_QUEUE = 'topic-generation';

// Create Queue
export const topicQueue = new Queue(TOPIC_GENERATION_QUEUE, { connection });

// Define Job Data Interface
interface TopicGenerationJob {
  userId: string;
  title: string;
  slug: string;
}

// Setup Worker
const worker = new Worker<TopicGenerationJob>(
  TOPIC_GENERATION_QUEUE,
  async (job) => {
    const { userId, title, slug } = job.data;
    console.log(`[Worker] Processing job ${job.id}: Generating topic "${title}" for user ${userId}`);

    try {
      // 1. Report progress: Started
      await job.updateProgress(10);

      // 2. Generate Content
      const content = await generateTopicContent(title);
      await job.updateProgress(50);

      // 3. Validate Content
      let validationResult = null;
      let confidenceScore = null;
      try {
        validationResult = await validateTopicContent(title, content);
        confidenceScore = validationResult.overallConfidence;
      } catch (validationError) {
        console.error(`[Worker] Validation warning for job ${job.id}:`, validationError);
      }
      await job.updateProgress(70);

      // 4. Save to Database
      const newTopic = await storage.createTopic({
        userId,
        title,
        slug, // Note: Slug might need uniqueness check if not pre-reserved, but we assume pre-check in route
        description: content.description,
        category: content.category,
        difficulty: content.difficulty,
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

      // 5. Update User Stats
      const user = await storage.getUser(userId);
      if (user) {
         await storage.updateUser(userId, { topicsUsed: (user.topicsUsed || 0) + 1 });
      }
      
      await job.updateProgress(100);
      console.log(`[Worker] Job ${job.id} completed. Topic created: ${newTopic.id}`);
      
      return { topicId: newTopic.id, slug: newTopic.slug };

    } catch (error: any) {
      console.error(`[Worker] Job ${job.id} failed:`, error);
      throw error; // Let BullMQ handle the failure state
    }
  },
  { connection }
);

// Worker Event Listeners
worker.on('completed', (job) => {
  console.log(`[Queue] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job?.id} has failed with ${err.message}`);
});

console.log('[Queue] Worker initialized for topic-generation');

export async function addTopicGenerationJob(data: TopicGenerationJob) {
    return topicQueue.add('generate', data, {
        attempts: 3, // Retry up to 3 times on failure
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true, // Keep DB clean
        removeOnFail: false // Keep failed jobs for inspection
    });
}
