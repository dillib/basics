/**
 * Rewrite lesson descriptions that open with hype ("Unlock the fascinating
 * secrets of...") into one or two plain sentences, keeping the meaning.
 * Only the description changes; principles are untouched.
 *
 *   npm run clean:descriptions            # preview: prints before -> after
 *   npm run clean:descriptions -- --apply # save the rewrites
 *
 * Uses Gemini (about $0.0002 per description). A rewrite is only kept if it
 * passes the same word lists (no slop, slang or profanity) and isn't empty.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "./storage";
import { lint } from "./safety";
import { pool } from "./db";

const APPLY = process.argv.includes("--apply");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "");
const HYPE_OPENER = /^(unlock|uncover|discover|dive|embark|explore|journey|delve|step into|get ready)\b/i;

async function rewrite(title: string, description: string): Promise<string | null> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `Rewrite this description of a lesson titled "${title}" as one or two plain, clear sentences (max 30 words) saying what the reader will understand. Keep the meaning and every fact. No hype or filler words (unlock, uncover, discover, delve, dive, fascinating, journey, secrets, explore, meticulous). No slang. Suitable for all ages. Return only the sentence(s).

Description: ${description}`;
  const text = (await (await model.generateContent(prompt)).response).text().trim().replace(/^["']|["']$/g, "");
  const l = lint(text);
  if (!text || text.length > 300 || l.slop.length || l.slang.length || l.profanity.length || l.explicit.length || HYPE_OPENER.test(text)) return null;
  return text;
}

async function main() {
  const topics = (await storage.getPublicTopics()).filter((t) => t.description && (HYPE_OPENER.test(t.description) || lint(t.description).slop.length));
  console.log(`[Descriptions] ${topics.length} descriptions to rewrite${APPLY ? " (saving)" : " (preview only; add --apply to save)"}.\n`);
  let done = 0, skipped = 0;
  for (const t of topics) {
    try {
      const next = await rewrite(t.title, t.description!);
      if (!next) { skipped++; console.log(`SKIP  ${t.slug} (rewrite didn't pass the checks)`); continue; }
      console.log(`${t.slug}\n  - ${t.description}\n  + ${next}`);
      if (APPLY) await storage.updateTopic(t.id, { description: next });
      done++;
    } catch (err) {
      skipped++;
      console.warn(`FAIL  ${t.slug}: ${(err as Error).message}`);
    }
  }
  console.log(`\n[Descriptions] ${done} ${APPLY ? "rewritten" : "ready"}, ${skipped} skipped.`);
}

main()
  .catch((err) => {
    console.error("[Descriptions] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
