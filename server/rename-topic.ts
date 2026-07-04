/**
 * One-off CLI utility to fix a topic's title (and slug to match), bypassing
 * the Admin Dashboard entirely -- useful when admin access itself is the
 * thing blocking you. The Admin API's PATCH endpoint deliberately doesn't
 * allow changing slug (it's normally derived once at creation), so this
 * goes straight through storage instead. Preserves all existing content
 * (principles, mind map, quiz) rather than deleting and regenerating.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." npm run rename:topic -- quantim-computing "Quantum Computing"
 */
import { storage } from "./storage";
import { pool } from "./db";

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const [oldSlug, newTitle] = process.argv.slice(2);
  if (!oldSlug || !newTitle) {
    console.error('Usage: npm run rename:topic -- <old-slug> "<New Title>"');
    process.exitCode = 1;
    return;
  }

  const topic = await storage.getTopicBySlug(oldSlug);
  if (!topic) {
    console.error(`[Rename] No topic found with slug "${oldSlug}".`);
    process.exitCode = 1;
    return;
  }

  const newSlug = slugify(newTitle);
  const collision = newSlug !== oldSlug ? await storage.getTopicBySlug(newSlug) : null;
  if (collision) {
    console.error(`[Rename] A different topic already uses slug "${newSlug}" (id=${collision.id}). Aborting to avoid a collision.`);
    process.exitCode = 1;
    return;
  }

  console.log(`[Rename] "${topic.title}" (${oldSlug}) -> "${newTitle}" (${newSlug})`);
  await storage.updateTopic(topic.id, { title: newTitle, slug: newSlug });
  console.log(`[Rename] Done.`);
}

main()
  .catch((err) => {
    console.error("[Rename] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
