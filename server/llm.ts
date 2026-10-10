import { GoogleGenAI, type HarmCategory, type HarmBlockThreshold } from "@google/genai";
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
export type LlmTask =
  | "clarify" | "quick_preview" | "source_check"
  | "test_prep_parse" | "test_prep_group" | "test_prep_prepare" | "test_prep_verify" | "test_prep_grade";

const ROUTES: Record<LlmTask, Provider[]> = {
  clarify: ["mercury", "gemini"],
  quick_preview: ["mercury", "gemini"],
  // A different company's model than the lesson writer (Gemini): an
  // independent second opinion. Gemini only if Mercury is down.
  source_check: ["mercury", "gemini"],
  // Test prep (server/test-prep): Gemini reads images and writes the study
  // material; Mercury does the fast checks and grading.
  test_prep_parse: ["gemini"],
  test_prep_prepare: ["gemini"],
  test_prep_group: ["mercury", "gemini"],
  test_prep_verify: ["mercury", "gemini"],
  test_prep_grade: ["mercury", "gemini"],
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
  /** Images sent with the prompt (base64, no data-URL prefix). Mercury is text-only, so it's skipped. */
  images?: { mimeType: string; data: string }[];
  /** Gemini: allow thinking (e.g. maths); off by default for speed. */
  thinking?: boolean;
  /** Gemini: block at LOW and above (kid-facing input such as pasted images). */
  strictSafety?: boolean;
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

// String values of the SDK enums (type-only import: nothing extra loaded at runtime).
const STRICT_SAFETY = [
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
].map((category) => ({ category: category as HarmCategory, threshold: "BLOCK_LOW_AND_ABOVE" as HarmBlockThreshold }));

let gemini: GoogleGenAI | null = null;
async function callGemini(task: LlmTask, r: Request): Promise<string> {
  gemini ??= new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "" });
  const text = `${r.system}\n\n${r.prompt}\n\nReturn JSON matching this schema:\n${JSON.stringify(r.schema.schema)}`;
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: r.images?.length
      ? [{ role: "user", parts: [{ text }, ...r.images.map((inlineData) => ({ inlineData }))] }]
      : text,
    config: {
      temperature: r.temperature ?? 0.5,
      maxOutputTokens: r.maxTokens ?? 800,
      responseMimeType: "application/json",
      // Structured JSON: thinking only adds latency, except where asked (maths).
      thinkingConfig: { thinkingBudget: r.thinking ? 2048 : 0 },
      ...(r.strictSafety ? { safetySettings: STRICT_SAFETY } : {}),
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
    if (provider === "mercury" && r.images?.length) continue; // text-only model
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
