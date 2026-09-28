/**
 * Run every public lesson through the publish gate (server/safety.ts): word
 * lists always, Jev content checks when TYPESAFE_API_KEY is set, and the
 * fact-check score. Prints what would be held and why.
 *
 *   npm run safety:audit            # report only
 *   npm run safety:audit -- --hold  # also unlist flagged lessons for review
 *                                   # (Admin -> Feedback -> Held for review)
 *
 * Cost with Jev: about $0.0001 per lesson.
 */
import { storage } from "./storage";
import { reviewLesson } from "./safety";
import { withModeration } from "./moderation";
import { jevEnabled } from "./jev";
import { pool } from "./db";
import type { Level } from "@shared/levels";

const HOLD = process.argv.includes("--hold");

async function main() {
  const topics = await storage.getPublicTopics();
  console.log(`[Audit] ${topics.length} public lessons; Jev ${jevEnabled() ? "on" : "OFF (word lists + fact-check score only)"}${HOLD ? "; flagged lessons WILL be held" : "; report only"}.\n`);
  let flagged = 0, slop = 0;
  for (const t of topics) {
    const principles = await storage.getPrinciplesByTopic(t.id);
    const review = await reviewLesson({
      title: t.title,
      level: ((t.level as Level | null) || "adult") as Level,
      description: t.description,
      shortAnswer: (t as { shortAnswer?: string | null }).shortAnswer,
      principles,
      practicalSteps: Array.isArray(t.practicalSteps) ? (t.practicalSteps as string[]) : [],
      confidenceScore: t.confidenceScore,
    });
    if (review.lint.slop.length) slop++;
    if (review.publish) continue;
    flagged++;
    console.log(`FLAG  ${t.slug}\n      ${review.reasons.join(" · ")}`);
    if (HOLD) {
      await storage.updateTopic(t.id, { isPublic: false, isTrending: false, validationData: withModeration(t.validationData, review) } as never);
      console.log("      -> held for review");
    }
  }
  console.log(`\n[Audit] ${flagged} flagged of ${topics.length}. ${slop} lessons use hype/filler phrasing (see npm run clean:descriptions and weekly regeneration).`);
}

main()
  .catch((err) => {
    console.error("[Audit] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
