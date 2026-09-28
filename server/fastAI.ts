import memoize from "memoizee";
import { normalizeSearchTitle } from "./search-utils";
import { generateJSON } from "./llm";

interface QuickTopicResult {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  keyPoints: string[];
}

/**
 * Quick generation for instant search previews.
 *
 * Routed through server/llm.ts: Mercury (fast diffusion model, strict JSON
 * schema) first, Gemini Flash with thinking off as the fallback. (History:
 * Gemini with thinking on took ~4.6-5.3s per preview.)
 */
async function generateQuickTopicUncached(topicTitle: string): Promise<QuickTopicResult> {
  const prompt = `You are BasicsTutor, an educational AI that explains topics using first principles.

The user wants to learn about: "${topicTitle}"

IMPORTANT: Your response must be SPECIFIC to "${topicTitle}". Do not generate generic content.

If "${topicTitle}" contains an obvious spelling mistake of a well-known term (e.g. "Quantim Computing"), correct it in the "title" field. Do NOT change the subject or rephrase a title that's already spelled correctly, even if unusual or niche -- only fix clear typos.

Provide a quick educational overview in this EXACT JSON format:
{
  "title": "The corrected, properly-capitalized topic title (same as input unless it has an obvious typo)",
  "description": "One compelling sentence specifically about what ${topicTitle} is and why it matters",
  "category": "Specific category like Marketing, Physics, Programming, Finance, Psychology",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimatedMinutes": number (15-45),
  "keyPoints": [
    "3-5 specific first principles about ${topicTitle} - be concrete and specific"
  ]
}

Rules:
1. Description must specifically mention ${topicTitle}
2. Key points must be about ${topicTitle}, not generic learning advice
3. Return ONLY valid JSON, no markdown, no explanation

Example for "Marketing":
{
  "title": "Marketing",
  "description": "Marketing is the strategic process of understanding customer needs and creating value propositions that connect products with the right audiences.",
  "category": "Business",
  "difficulty": "beginner",
  "estimatedMinutes": 25,
  "keyPoints": [
    "Customer segmentation identifies distinct groups with specific needs",
    "Value proposition communicates unique benefits better than alternatives",
    "Marketing channels are selected based on where target audiences spend attention",
    "Brand positioning creates mental associations that drive preference",
    "Metrics and analytics measure campaign effectiveness and ROI"
  ]
}`;

  const result = await generateJSON("quick_preview", {
    system: "You are BasicsTutor, an educational AI for all ages (including children) that explains topics using first principles. Plain words, no slang, no hype words like unlock or delve.",
    prompt,
    schema: {
      name: "quick_topic",
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
          estimatedMinutes: { type: "integer" },
          keyPoints: { type: "array", items: { type: "string" } },
        },
        required: ["title", "description", "category", "difficulty", "estimatedMinutes", "keyPoints"],
        additionalProperties: false,
      },
    },
    maxTokens: 1024,
    temperature: 0.7,
    timeoutMs: 8000,
  }, (v) => {
    const p = v as Partial<QuickTopicResult>;
    return p && typeof p.title === "string" && typeof p.description === "string" && Array.isArray(p.keyPoints) && p.keyPoints.length ? (p as QuickTopicResult) : null;
  });
  if (!result) throw new Error("Failed to generate quick topic preview");
  const parsed: QuickTopicResult = result.data;

  // Validate the response is about the right topic. Check against both the
  // raw input and whatever (possibly typo-corrected) title the model
  // returned -- a corrected "Quantim" -> "Quantum" response won't literally
  // contain the misspelled input anywhere, which is expected, not a failure.
  const lowerTitle = topicTitle.toLowerCase();
  const lowerReturnedTitle = (parsed.title || "").toLowerCase();
  const lowerDesc = (parsed.description || "").toLowerCase();
  const lowerPoints = (parsed.keyPoints || []).join(" ").toLowerCase();

  const isRelevant =
    lowerDesc.includes(lowerTitle) ||
    lowerPoints.includes(lowerTitle) ||
    lowerDesc.includes(lowerReturnedTitle) ||
    lowerPoints.includes(lowerReturnedTitle) ||
    lowerReturnedTitle === lowerTitle;

  if (!isRelevant) {
    // Force the title and regenerate key points
    parsed.title = topicTitle;
    parsed.keyPoints = [
      `Understanding the core concepts of ${topicTitle}`,
      `Key principles that define ${topicTitle}`,
      `Practical applications of ${topicTitle}`,
      `Common misconceptions about ${topicTitle}`,
      `How ${topicTitle} relates to real-world scenarios`,
    ];
  }

  return parsed;
}

/**
 * TTL-cached wrapper. Popular searches repeat; before this, every identical
 * query paid full AI latency + cost again (measured: 5.3s on an immediate
 * repeat). promise mode dedupes concurrent identical calls and drops
 * rejections from the cache, so a transient AI failure isn't cached.
 */
export const generateQuickTopic = memoize(generateQuickTopicUncached, {
  promise: true,
  maxAge: 60 * 60 * 1000, // 1 hour
  max: 500,
  normalizer: ([title]) => normalizeSearchTitle(title),
});
