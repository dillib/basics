import { generateJSON } from "../llm";
import { sameAnswer, toNumber } from "./answers";
import type { PrepKey, PrepQuestion } from "@shared/test-prep";

/**
 * Independent check of every answer key before a student relies on it.
 * mc / tf / numeric: a second model solves the question without seeing the
 * key, and the answers must match. short: it can't match word for word, so
 * the checker judges whether the key is correct. open: nothing to check.
 * Any failure leaves the key unverified ("check this one with your teacher").
 */

const SCHEMA = {
  name: "independent_answers",
  schema: {
    type: "object",
    properties: {
      answers: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" }, answer: { type: "string" }, keyCorrect: { type: "boolean" } },
          required: ["id", "answer", "keyCorrect"],
          additionalProperties: false,
        },
      },
    },
    required: ["answers"],
    additionalProperties: false,
  },
};

function splitDataUrl(url: string): { mimeType: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(url);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

/** Keys that can't be compared mechanically: short answers and maths expressions. The checker judges these. */
const judged = (q: PrepQuestion, key?: PrepKey) => q.type === "short" || (q.type === "numeric" && !!key && Number.isNaN(toNumber(key.answer)));

async function verifyBatch(batch: PrepQuestion[], keys: Record<string, PrepKey>, images: string[]): Promise<Record<string, boolean>> {
  const used = Array.from(new Set(batch.map((q) => q.image).filter((i): i is number => i !== undefined)));
  const attached = used.map((i) => splitDataUrl(images[i] ?? "")).filter((x): x is { mimeType: string; data: string } => !!x);
  const result = await generateJSON("test_prep_verify", {
    system: "You are a careful teacher checking an answer key. Solve each question yourself.",
    prompt: `For each question give "answer": your own answer (mc: the exact option text; tf: True or False; numeric: just the number). Where a proposed key is shown, also judge it and set "keyCorrect"; otherwise set "keyCorrect" to true.

${batch.map((q) => `${q.id} [${q.type}]: ${q.stem}${q.options.length ? `\n  options: ${q.options.join(" | ")}` : ""}${q.image !== undefined ? `\n  (uses attached image ${used.indexOf(q.image)})` : ""}${judged(q, keys[q.id]) ? `\n  proposed key: ${keys[q.id]?.answer}` : ""}`).join("\n")}`,
    schema: SCHEMA,
    images: attached,
    thinking: batch.some((q) => q.type === "numeric"),
    // Gemini counts thinking tokens against the output budget.
    maxTokens: batch.some((q) => q.type === "numeric") ? 8000 : 2000,
    temperature: 0,
    effort: "medium",
    timeoutMs: 45_000,
  }, (v) => {
    const a = (v as { answers?: unknown })?.answers;
    return Array.isArray(a) ? (a as { id?: unknown; answer?: unknown; keyCorrect?: unknown }[]) : null;
  });
  const out: Record<string, boolean> = {};
  for (const r of result?.data ?? []) {
    const q = batch.find((x) => x.id === r.id);
    const key = q && keys[q.id];
    if (!q || !key || typeof r.answer !== "string") continue;
    out[q.id] = judged(q, key) ? r.keyCorrect === true : sameAnswer(q.type, r.answer, key.answer, q.options);
  }
  return out;
}

export async function verifyKeys(questions: PrepQuestion[], keys: Record<string, PrepKey>, images: string[]): Promise<Record<string, PrepKey>> {
  const out: Record<string, PrepKey> = {};
  for (const [id, k] of Object.entries(keys)) out[id] = { ...k, verified: false };
  const toCheck: PrepQuestion[] = [];
  for (const q of questions) {
    if (!out[q.id]) continue;
    if (q.type === "open") out[q.id].verified = true;
    else toCheck.push(q);
  }
  const batches: PrepQuestion[][] = [];
  for (let i = 0; i < toCheck.length; i += 10) batches.push(toCheck.slice(i, i + 10));
  const results = await Promise.all(batches.map((b) => verifyBatch(b, keys, images).catch(() => ({} as Record<string, boolean>))));
  for (const r of results) for (const [id, ok] of Object.entries(r)) out[id].verified = ok;
  return out;
}
