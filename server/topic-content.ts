import { storage } from "./storage";
import type { TopicContent } from "./ai";
import type { Topic, TopicSnapshot, InsertTopic, InsertPrinciple } from "@shared/schema";

/**
 * The one place lesson content gets replaced (self-heal, regeneration,
 * rollback). Every replacement:
 *  1. snapshots the current content into topic_versions (so it can be undone),
 *  2. swaps in the new content, principles updated in place so learners'
 *     progress/quiz links survive (storage.replaceTopicPrinciples),
 *  3. bumps contentVersion, so feedback about the old content stops counting.
 * Title, slug and flags are never touched -- indexed URLs stay stable.
 */

async function snapshotTopic(topic: Topic): Promise<TopicSnapshot> {
  const principles = await storage.getPrinciplesByTopic(topic.id);
  return {
    topic: {
      description: topic.description,
      category: topic.category,
      difficulty: topic.difficulty,
      practicalSteps: topic.practicalSteps,
      estimatedMinutes: topic.estimatedMinutes,
      mindMapData: topic.mindMapData,
      confidenceScore: topic.confidenceScore,
      validationData: topic.validationData,
    },
    principles: principles.map((p) => ({
      orderIndex: p.orderIndex,
      title: p.title,
      explanation: p.explanation,
      analogy: p.analogy,
      visualType: p.visualType,
      visualData: p.visualData,
      keyTakeaways: p.keyTakeaways,
    })),
  };
}

export async function applyTopicContent(
  topic: Topic,
  content: TopicContent,
  opts: { reason: string; confidenceScore: number | null; validationData: unknown },
): Promise<{ versionId: string; contentVersion: number }> {
  const currentVersion = topic.contentVersion ?? 1;
  const version = await storage.createTopicVersion({
    topicId: topic.id,
    contentVersion: currentVersion,
    snapshot: await snapshotTopic(topic),
    reason: opts.reason,
  });

  await storage.updateTopic(topic.id, {
    description: content.description,
    category: content.category,
    difficulty: content.difficulty,
    practicalSteps: content.practicalSteps,
    estimatedMinutes: content.estimatedMinutes,
    mindMapData: content.mindMap,
    confidenceScore: opts.confidenceScore,
    validationData: opts.validationData as InsertTopic["validationData"],
    contentVersion: currentVersion + 1,
  });

  await storage.replaceTopicPrinciples(
    topic.id,
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

  return { versionId: version.id, contentVersion: currentVersion + 1 };
}

/** Put a snapshot back. The content it replaces is itself snapshotted first. */
export async function restoreTopicVersion(versionId: string): Promise<Topic> {
  const version = await storage.getTopicVersion(versionId);
  if (!version) throw new Error("Version not found");
  const topic = await storage.getTopic(version.topicId);
  if (!topic) throw new Error("Topic not found");

  const currentVersion = topic.contentVersion ?? 1;
  await storage.createTopicVersion({
    topicId: topic.id,
    contentVersion: currentVersion,
    snapshot: await snapshotTopic(topic),
    reason: `rollback: undid by restoring version ${version.contentVersion}`,
  });

  const { topic: saved, principles } = version.snapshot;
  const updated = await storage.updateTopic(topic.id, { ...saved, contentVersion: currentVersion + 1 } as Partial<InsertTopic>);
  await storage.replaceTopicPrinciples(
    topic.id,
    principles.map((p) => ({ ...p, topicId: topic.id }) as InsertPrinciple),
  );
  await storage.markTopicVersionRestored(version.id);
  return updated ?? topic;
}
