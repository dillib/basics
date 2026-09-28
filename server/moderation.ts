import type { Topic } from "@shared/schema";
import type { LessonReview } from "./safety";

/**
 * Moderation state is stored with the lesson (validationData.moderation) so
 * it travels with every rewrite/restore snapshot and needs no new table.
 *
 *   held    -- failed the publish gate: unlisted + noindex until reviewed.
 *   status  -- "blocked": unsafe content (adult / graphic / crude / dangerous /
 *              explicit words): hidden from everyone but admins.
 *              "held": quality or suitability doubts (low fact-check score,
 *              may not suit ages 6-12): unlisted but still readable by link.
 *              "approved": an admin published it after review.
 */
export interface Moderation {
  held: boolean;
  status: "blocked" | "held" | "approved" | "passed";
  reasons: string[];
  checkedWithJev: boolean;
  checkedAt: string;
  reviewedAt?: string;
}

const UNSAFE = /adult content|graphic|crude|dangerous|explicit words|profanity/;

export function moderationFromReview(review: LessonReview): Moderation {
  const unsafe = review.reasons.some((r) => UNSAFE.test(r));
  return {
    held: !review.publish,
    status: review.publish ? "passed" : unsafe ? "blocked" : "held",
    reasons: review.reasons,
    checkedWithJev: review.checkedWithJev,
    checkedAt: new Date().toISOString(),
  };
}

/** validationData with the moderation record attached. */
export function withModeration(validationData: unknown, review: LessonReview): Record<string, unknown> {
  return { ...((validationData as Record<string, unknown>) ?? {}), moderation: moderationFromReview(review) };
}

export function moderationOf(topic: Pick<Topic, "validationData">): Moderation | null {
  const m = (topic.validationData as { moderation?: Moderation } | null)?.moderation;
  return m && typeof m === "object" ? m : null;
}

/** Unsafe and not yet approved: serve to admins only. */
export function isBlocked(topic: Pick<Topic, "validationData" | "isPublic">): boolean {
  const m = moderationOf(topic);
  return !topic.isPublic && !!m?.held && m.status === "blocked";
}
