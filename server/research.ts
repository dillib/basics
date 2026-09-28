import Perplexity from "@perplexity-ai/perplexity_ai";
import { z } from "zod";
import { recordSpend } from "./ai-spend";

/**
 * Web-grounded research step that runs before a lesson is written, via the
 * Perplexity Agent API (`responses.create` in the SDK, which posts to /v1/responses).
 *
 * Why: lessons were written from the model's memory alone, so anything newer
 * than its training cutoff (e.g. Meta's Muse agent, launched Sept 2026) got
 * silently replaced by a generic stand-in -- and the fact-checker, same model
 * and also offline, couldn't catch it. This brief gives the writer (and the
 * fact-checker) verified, dated facts plus sources.
 *
 * Optional: without PERPLEXITY_API_KEY, or on any failure, it returns null and
 * generation continues ungrounded, exactly as before.
 */

// The SDK reads PERPLEXITY_API_KEY itself; we only check presence.
const client = process.env.PERPLEXITY_API_KEY
  ? new Perplexity({
      // A new JSON schema takes 10-30s to prepare on first use (per docs).
      timeout: 120_000,
      maxRetries: 1,
    })
  : null;

// "low" preset: openai/gpt-6-luna + web_search + fetch_url, up to 5 steps --
// light multi-step research at the lowest cost. Overridable without a deploy.
const PRESET = process.env.RESEARCH_PRESET || "low";

const INSTRUCTIONS = `You are the research assistant for BasicsTutor, which teaches topics from first principles.
Use web search to research the topic the user names, then return the requested JSON.

Rules:
1. Identify exactly what the subject is. If the name refers to a specific product, company, event, law, or person, research THAT specific thing -- never substitute a generic concept for a named entity.
2. Prefer primary and authoritative sources (official announcements, documentation, reputable reporting, textbooks, encyclopedias).
3. Include dates for anything recent or time-sensitive.
4. "fundamentals" are the underlying principles someone must understand for the topic to make sense, ordered foundation-first: each one should rest on the ones before it.
5. If you cannot confidently identify the subject, set "recognized" to false and explain why in "ambiguity_note". Do not guess.
6. Be concise and factual. No marketing language.`;

const SCHEMA = {
  type: "object",
  properties: {
    recognized: { type: "boolean", description: "True if the subject was confidently identified." },
    canonical_name: { type: "string", description: "The subject's precise, correctly-spelled name." },
    what_it_is: { type: "string", description: "One or two sentences: exactly what the subject is." },
    key_facts: { type: "array", items: { type: "string" }, description: "5-10 verified facts, with dates where relevant." },
    how_it_works: { type: "string", description: "The mechanism: how it actually works, step by step." },
    fundamentals: { type: "array", items: { type: "string" }, description: "3-6 underlying principles, foundation-first." },
    misconceptions: { type: "array", items: { type: "string" }, description: "Common misunderstandings, if any." },
    ambiguity_note: { type: "string", description: "Only if the name is ambiguous or could not be identified." },
  },
  required: ["recognized", "canonical_name", "what_it_is", "key_facts", "how_it_works", "fundamentals"],
};

const briefSchema = z.object({
  recognized: z.boolean(),
  canonical_name: z.string().min(1),
  what_it_is: z.string().min(1),
  key_facts: z.array(z.string()).default([]),
  how_it_works: z.string().default(""),
  fundamentals: z.array(z.string()).default([]),
  misconceptions: z.array(z.string()).nullish().transform((v) => v ?? []),
  ambiguity_note: z.string().nullish().transform((v) => v ?? null),
});

export interface ResearchSource {
  title: string;
  url: string;
  date?: string;
}

export type ResearchBrief = z.infer<typeof briefSchema> & { sources: ResearchSource[] };

/** Pull deduped source metadata out of the response's search_results items. */
export function extractSources(output: unknown, limit = 8): ResearchSource[] {
  const seen = new Set<string>();
  const sources: ResearchSource[] = [];
  if (!Array.isArray(output)) return sources;
  for (const item of output) {
    if (!item || typeof item !== "object" || (item as { type?: unknown }).type !== "search_results") continue;
    const results = (item as { results?: unknown }).results;
    if (!Array.isArray(results)) continue;
    for (const r of results) {
      const url = typeof r?.url === "string" ? r.url : "";
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({ url, title: typeof r.title === "string" && r.title ? r.title : url, ...(typeof r.date === "string" && r.date ? { date: r.date } : {}) });
      if (sources.length >= limit) return sources;
    }
  }
  return sources;
}

/** Parse + validate the model's JSON; null if it isn't a usable brief. */
export function parseBrief(outputText: string | undefined | null): z.infer<typeof briefSchema> | null {
  if (!outputText) return null;
  try {
    const parsed = briefSchema.safeParse(JSON.parse(outputText));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function researchTopic(topicTitle: string): Promise<ResearchBrief | null> {
  if (!client) return null;
  try {
    const response = await client.responses.create({
      preset: PRESET,
      instructions: INSTRUCTIONS,
      input: `Topic to research: ${topicTitle}`,
      response_format: { type: "json_schema", json_schema: { name: "topic_research", schema: SCHEMA } },
      max_output_tokens: 2500,
    });

    const usage = (response as { usage?: { input_tokens?: number; output_tokens?: number; cost?: { total_cost?: number } } }).usage;
    const cost = usage?.cost?.total_cost;
    recordSpend("research", "perplexity", PRESET, usage?.input_tokens ?? 0, usage?.output_tokens ?? 0, typeof cost === "number" ? cost : 0);
    console.log(`[Research] "${topicTitle}" status=${response.status} cost=$${typeof cost === "number" ? cost.toFixed(4) : "?"}`);

    const brief = parseBrief(response.output_text);
    if (!brief) {
      console.warn(`[Research] "${topicTitle}": unparseable brief; continuing without research.`);
      return null;
    }
    return { ...brief, sources: extractSources(response.output) };
  } catch (err) {
    // Never fail a lesson over research; log which kind of failure it was.
    if (err instanceof Perplexity.AuthenticationError) {
      console.error("[Research] Perplexity rejected the API key (401). Check PERPLEXITY_API_KEY; rotate it in the console if it was exposed.");
    } else if (err instanceof Perplexity.RateLimitError) {
      console.warn(`[Research] Rate limited (429) for "${topicTitle}"; continuing without research.`);
    } else if (err instanceof Perplexity.APIError) {
      console.error(`[Research] Perplexity API error ${err.status} for "${topicTitle}"; continuing without research.`);
    } else {
      console.error(`[Research] Failed for "${topicTitle}"; continuing without research:`, (err as Error)?.message);
    }
    return null;
  }
}

/** The brief as a prompt block for the lesson writer and the fact-checker. */
export function formatResearchForPrompt(brief: ResearchBrief): string {
  const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  return [
    `VERIFIED RESEARCH (from a web search just now; treat these facts as ground truth over your own memory):`,
    `Subject identified: ${brief.recognized ? "yes" : "NO"} -- ${brief.canonical_name}`,
    `What it is: ${brief.what_it_is}`,
    brief.key_facts.length ? `Key facts:\n${list(brief.key_facts)}` : "",
    brief.how_it_works ? `How it works: ${brief.how_it_works}` : "",
    brief.fundamentals.length ? `Underlying fundamentals (foundation-first):\n${list(brief.fundamentals)}` : "",
    brief.misconceptions.length ? `Common misconceptions:\n${list(brief.misconceptions)}` : "",
    brief.ambiguity_note ? `Ambiguity: ${brief.ambiguity_note}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
