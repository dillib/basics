import { GoogleGenAI } from "@google/genai";
import { recordSpend } from "./ai-spend";

/**
 * One place that decides WHICH model writes a short structured answer, with
 * a fallback chain per task (see ROUTES). Long-form lesson writing stays in
 * server/ai.ts on Gemini; this layer is for fast, small JSON jobs where speed
 * decides the experience -- follow-up options, the search preview.
 *
 * Mercury (Inception Labs, diffusion LLM, ~1,000+ tokens/s, OpenAI-compatible
 * API, strict JSON-schema output) goes first when INCEPTION_API_KEY is set;
 * Gemini Flash is the fallback. Every call records its token usage and cost
 * (server/ai-spend.ts).
 */

export type Provider = "mercury" | "gemini";
export type LlmTask = "clarify" | "quick_preview" | "source_check";

const ROUTES: Record<LlmTask, Provider[]> = {
  clarify: ["mercury", "gemini"],
  quick_preview: ["mercury", "gemini"],
  // A different company's model than the lesson writer (Gemini): an
  // independent second opinion. Gemini only if Mercury is down.
  source_check: ["mercury", "gemini"],
};

export const MERCURY_MODEL = process.env.INCEPTION_MODEL || "mercury-2.5";
const MERCURY_URL = (process.env.INCEPTION_BASE_URL || "https://api.inceptionlabs.ai/v1").replace(/\/$/, "") + "/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

/** List prices, USD per 1M tokens (Mercury 2.5 launch discount ignored: budget conservatively). */
export const PRICES: Record<string, { input: number; output: number }> = {
  [MERCURY_MODEL]: { input: 0.2, output: 0.75 },
  [GEMINI_MODEL]: { input: 0.3, output: 2.5 },
};
export const costOf = (model: string, input: number, output: number) => {
  const p = PRICES[model] ?? PRICES[GEMINI_MODEL];
  return (input * p.input + output * p.output) / 1_000_000;
};

export interface JsonSchema {
  name: string;
  /** JSON Schema for the object (strict: all properties required, no extras). */
  schema: Record<string, unknown>;
}

interface Request {
  system: string;
  prompt: string;
  schema: JsonSchema;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Mercury reasoning effort; "instant" (default) for small, well-specified jobs. */
  effort?: "instant" | "low" | "medium" | "high";
}

const available: Record<Provider, () => boolean> = {
  mercury: () => !!process.env.INCEPTION_API_KEY && process.env.MERCURY_DISABLED !== "true",
  gemini: () => !!(process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY),
};

async function callMercury(task: LlmTask, r: Request): Promise<string> {
  const res = await fetch(MERCURY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.INCEPTION_API_KEY}` },
    body: JSON.stringify({
      model: MERCURY_MODEL,
      messages: [{ role: "system", content: r.system }, { role: "user", content: r.prompt }],
      response_format: { type: "json_schema", json_schema: { name: r.schema.name, strict: true, schema: r.schema.schema } },
      reasoning_effort: r.effort ?? "instant",
      max_tokens: r.maxTokens ?? 800,
      temperature: r.temperature ?? 0.5,
    }),
    signal: AbortSignal.timeout(r.timeoutMs ?? 6000),
  });
  if (!res.ok) throw new Error(`Mercury ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const finish = body.choices?.[0]?.finish_reason;
  if (finish && finish !== "stop") console.warn(`[LLM] ${task}: mercury finish_reason=${finish}`);
  const u = body.usage ?? {};
  recordSpend(task, "mercury", MERCURY_MODEL, u.prompt_tokens ?? 0, u.completion_tokens ?? 0, costOf(MERCURY_MODEL, u.prompt_tokens ?? 0, u.completion_tokens ?? 0));
  return body.choices?.[0]?.message?.content ?? "";
}

let gemini: GoogleGenAI | null = null;
async function callGemini(task: LlmTask, r: Request): Promise<string> {
  gemini ??= new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "" });
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: `${r.system}\n\n${r.prompt}\n\nReturn JSON matching this schema:\n${JSON.stringify(r.schema.schema)}`,
    config: {
      temperature: r.temperature ?? 0.5,
      maxOutputTokens: r.maxTokens ?? 800,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 }, // structured JSON: thinking only adds latency
      abortSignal: AbortSignal.timeout(r.timeoutMs ?? 8000),
    },
  });
  const u = response.usageMetadata;
  recordSpend(task, "gemini", GEMINI_MODEL, u?.promptTokenCount ?? 0, u?.candidatesTokenCount ?? 0, costOf(GEMINI_MODEL, u?.promptTokenCount ?? 0, u?.candidatesTokenCount ?? 0));
  return response.text ?? "";
}

const CALL: Record<Provider, (task: LlmTask, r: Request) => Promise<string>> = { mercury: callMercury, gemini: callGemini };

/**
 * Structured JSON from the first provider in the task's route that answers
 * with something `parse` accepts. Returns null when every provider fails.
 */
export async function generateJSON<T>(task: LlmTask, r: Request, parse: (value: unknown) => T | null): Promise<{ data: T; provider: Provider; ms: number } | null> {
  for (const provider of ROUTES[task]) {
    if (!available[provider]()) continue;
    const started = Date.now();
    try {
      const text = (await CALL[provider](task, r)).trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
      const data = parse(JSON.parse(text));
      if (data != null) {
        console.log(`[LLM] ${task}: ${provider} ${Date.now() - started}ms`);
        return { data, provider, ms: Date.now() - started };
      }
      // Model output only (no secrets): enough to see what shape came back.
      console.warn(`[LLM] ${task}: ${provider} returned an unusable answer (${text.length} chars: ${text.slice(0, 200)}); trying next.`);
    } catch (err) {
      console.warn(`[LLM] ${task}: ${provider} failed (${(err as Error)?.message}); trying next.`);
    }
  }
  return null;
}
