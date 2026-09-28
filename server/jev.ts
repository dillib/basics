import { recordSpend } from "./ai-spend";
import { TypeSafeClient, AuthenticationError, RateLimitError, APIError, APITimeoutError, type Questions, type SystemOneResult, type EntryType } from "@typesafe-ai/sdk";

/**
 * Jev (TypeSafe's System One model) as BasicsTutor's fast decision layer.
 * Jev never writes text: it answers typed questions -- choice (pick one of a
 * fixed set), score (place on an ordered rubric), noul (probability a
 * statement is true) -- each with calibrated probabilities and a confidence.
 * Gemini keeps writing lessons; Jev decides routing, matching and gates.
 *
 * Optional by design: without TYPESAFE_API_KEY, or on any error/timeout,
 * `ask` returns null and every caller falls back to the pre-Jev behaviour.
 * Docs: https://docs.typesafe.ai  (SDK reads TYPESAFE_API_KEY / TYPESAFE_BASE_URL).
 */

export const JEV_MODEL = process.env.TYPESAFE_DEFAULT_MODEL || "jev-latest";

/**
 * Confidence tiers (TypeSafe's guidance: <0.5 don't act, 0.5-0.9 act with
 * care, >0.9 act automatically). Our decisions are low-stakes and reversible
 * (a suggestion the reader can dismiss), so "high" starts at 0.8.
 */
export const THRESHOLDS = { high: 0.8, medium: 0.5 } as const;
export type Tier = "high" | "medium" | "low";
export const tier = (confidence: number): Tier =>
  confidence >= THRESHOLDS.high ? "high" : confidence >= THRESHOLDS.medium ? "medium" : "low";

export function jevEnabled(): boolean {
  return !!process.env.TYPESAFE_API_KEY && process.env.JEV_DISABLED !== "true";
}

let client: TypeSafeClient | null = null;
function getClient(): TypeSafeClient {
  // Created lazily so tests can set TYPESAFE_BASE_URL/KEY before first use.
  if (!client) client = new TypeSafeClient({ defaultModel: JEV_MODEL, logLevel: "off", retry: { maxRetries: 1 } });
  return client;
}
/** Tests only: drop the cached client so new env vars take effect. */
export function resetJevClient() {
  client = null;
  cache.clear();
}

// Small in-memory cache: the same query is often asked twice (typing pause,
// then Enter). Keyed by caller-supplied key; entries live 10 minutes.
const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_TTL = 10 * 60_000, CACHE_MAX = 500;

/**
 * One multi-question Jev call. Returns null (never throws) when Jev is off or
 * fails, so callers write `const r = await ask(...); if (!r) fallback()`.
 */
export async function ask<const Q extends Questions>(
  label: string,
  state: EntryType,
  questions: Q,
  opts: { timeoutMs?: number; cacheKey?: string } = {},
): Promise<SystemOneResult<Q> | null> {
  if (!jevEnabled()) return null;
  const key = opts.cacheKey ? `${label}:${opts.cacheKey}` : null;
  if (key) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value as SystemOneResult<Q>;
  }
  const started = Date.now();
  try {
    const result = await getClient().systemOne({ state, questions, model: JEV_MODEL }, { timeout: opts.timeoutMs ?? 2500 });
    console.log(`[Jev] ${label}: ${Date.now() - started}ms, ${result.usage.input_tokens} input tokens`);
    // $0.042 per 1M input tokens; output is free.
    recordSpend(`jev_${label}`, "typesafe", JEV_MODEL, result.usage.input_tokens, 0, (result.usage.input_tokens * 0.042) / 1_000_000);
    if (key) {
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
      cache.set(key, { at: Date.now(), value: result });
    }
    return result;
  } catch (err) {
    if (err instanceof AuthenticationError) console.error("[Jev] TypeSafe rejected the API key (401). Check TYPESAFE_API_KEY; rotate it in the TypeSafe dashboard if it was exposed.");
    else if (err instanceof RateLimitError) console.warn(`[Jev] ${label}: rate limited (429); using fallback.`);
    else if (err instanceof APITimeoutError) console.warn(`[Jev] ${label}: timed out after ${Date.now() - started}ms; using fallback.`);
    else if (err instanceof APIError) console.error(`[Jev] ${label}: API error ${err.status}; using fallback.`);
    else console.error(`[Jev] ${label}: failed; using fallback:`, (err as Error)?.message);
    return null;
  }
}
