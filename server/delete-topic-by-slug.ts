/**
 * One-off CLI utility to delete a topic by slug, bypassing the Admin
 * Dashboard entirely (useful when admin access itself is the thing blocking
 * you). Cascades principles/quizzes/progress/purchases via the same
 * storage.deleteTopicById the admin API route uses.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." npm run delete:topic -- quantim-computing
 */
import { storage } from "./storage";
import { pool } from "./db";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run delete:topic -- <slug>");
    process.exitCode = 1;
    return;
  }

  const topic = await storage.getTopicBySlug(slug);
  if (!topic) {
    console.log(`[Delete] No topic found with slug "${slug}". Nothing to do.`);
    return;
  }

  console.log(`[Delete] Found "${topic.title}" (id=${topic.id}). Deleting...`);
  await storage.deleteTopicById(topic.id);
  console.log(`[Delete] Done.`);
}

main()
  .catch((err) => {
    console.error("[Delete] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
