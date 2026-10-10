import { generateJSON } from "../llm";
import { LEVEL_GUIDANCE, SYSTEM_INSTRUCTION_HEADER } from "../ai";
import { lint } from "../safety";
import type { Level } from "@shared/levels";
import type { PrepConcept, PrepKey, PrepQuestion, QType } from "@shared/test-prep";

/**
 * One concept's study material: a card (what to know + a worked example),
 * the answer key, explanation and two hints for each of the student's
 * questions, and 2-3 new practice questions. Keys start unverified
 * (verify.ts decides).
 */

const TYPES: QType[] = ["mc", "tf", "numeric", "short", "open"];
const keyFields = {
  answer: { type: "string" },
  explanation: { type: "string" },
  hints: { type: "array", items: { type: "string" } },
};

const SCHEMA = {
  name: "concept_material",
  schema: {
    type: "object",
    properties: {
      card: {
        type: "object",
        properties: { whatToKnow: { type: "string" }, workedExample: { type: "string" } },
        required: ["whatToKnow", "workedExample"],
        additionalProperties: false,
      },
      answers: {
        type: "array",
        items: { type: "object", properties: { id: { type: "string" }, ...keyFields }, required: ["id", "answer", "explanation", "hints"], additionalProperties: false },
      },
      practice: {
        type: "array",
        items: {
          type: "object",
          properties: { stem: { type: "string" }, type: { type: "string", enum: TYPES }, options: { type: "array", items: { type: "string" } }, ...keyFields },
          required: ["stem", "type", "options", "answer", "explanation", "hints"],
          additionalProperties: false,
        },
      },
    },
    required: ["card", "answers", "practice"],
    additionalProperties: false,
  },
};

type Raw = { id?: string; stem?: string; type?: string; options?: unknown; answer?: unknown; explanation?: unknown; hints?: unknown };

function toKey(r: Raw): PrepKey | null {
  if (typeof r.answer !== "string" || !r.answer.trim() || typeof r.explanation !== "string") return null;
  const hints = Array.isArray(r.hints) ? r.hints.filter((h): h is string => typeof h === "string" && !!h.trim()) : [];
  return { answer: r.answer.trim(), explanation: r.explanation.trim(), hints: [hints[0] ?? "Re-read the question and the concept card.", hints[1] ?? hints[0] ?? "Work it out one step at a time."], verified: false };
}

function splitDataUrl(url: string): { mimeType: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(url);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

export async function prepareConcept(
  concept: PrepConcept,
  questions: PrepQuestion[],
  level: Level,
  images: string[],
): Promise<{ card: PrepConcept["card"]; keys: Record<string, PrepKey>; practice: PrepQuestion[]; practiceKeys: Record<string, PrepKey> } | null> {
  const used = Array.from(new Set(questions.map((q) => q.image).filter((i): i is number => i !== undefined)));
  const attached = used.map((i) => splitDataUrl(images[i] ?? "")).filter((x): x is { mimeType: string; data: string } => !!x);
  const result = await generateJSON("test_prep_prepare", {
    system: `${SYSTEM_INSTRUCTION_HEADER}\nYou are a patient teacher helping a student prepare for a test.`,
    prompt: `${LEVEL_GUIDANCE[level]}

Concept: "${concept.title}"
The student's questions on it:
${questions.map((q) => `${q.id} [${q.type}]: ${q.stem}${q.options.length ? `\n  options: ${q.options.join(" | ")}` : ""}${q.image !== undefined ? `\n  (uses attached image ${used.indexOf(q.image)})` : ""}`).join("\n")}

Write:
- "card": "whatToKnow" (the idea in 2-4 plain sentences) and "workedExample" (one similar example solved step by step, NOT one of the student's questions).
- "answers": for EVERY question id above: "answer" (for mc: the exact option text; for tf: "True" or "False"; for numeric: just the number or expression; for open: what a strong answer covers), "explanation" (why, in 1-3 sentences), "hints" (two hints that guide without giving the answer, the second more specific).
- "practice": 2 or 3 NEW questions on the same concept, similar difficulty, with the same fields.
Be certain every answer is correct.`,
    schema: SCHEMA,
    images: attached,
    thinking: questions.some((q) => q.type === "numeric"),
    maxTokens: 6000,
    temperature: 0.3,
    timeoutMs: 60_000,
  }, (v) => {
    const r = v as { card?: { whatToKnow?: unknown; workedExample?: unknown }; answers?: unknown; practice?: unknown };
    if (!r?.card || typeof r.card.whatToKnow !== "string" || typeof r.card.workedExample !== "string" || !Array.isArray(r.answers)) return null;
    return r as { card: { whatToKnow: string; workedExample: string }; answers: Raw[]; practice: Raw[] };
  });
  if (!result) return null;
  const raw = result.data;

  // Same word lists as the lesson publish gate: never show explicit words or profanity.
  const found = lint(JSON.stringify(raw));
  if (found.explicit.length || found.profanity.length) return null;

  const ids = new Set(questions.map((q) => q.id));
  const keys: Record<string, PrepKey> = {};
  for (const a of raw.answers) {
    const k = typeof a.id === "string" && ids.has(a.id) ? toKey(a) : null;
    if (k) keys[a.id as string] = k;
  }

  const practice: PrepQuestion[] = [];
  const practiceKeys: Record<string, PrepKey> = {};
  const n = concept.id.replace(/^c/, "");
  for (const p of (Array.isArray(raw.practice) ? raw.practice : []).slice(0, 3)) {
    const k = toKey(p);
    const type = TYPES.includes(p.type as QType) ? (p.type as QType) : "short";
    if (!k || typeof p.stem !== "string" || !p.stem.trim()) continue;
    const options = type === "mc" && Array.isArray(p.options) ? p.options.filter((o): o is string => typeof o === "string") : type === "tf" ? ["True", "False"] : [];
    const id = `p${n}_${practice.length + 1}`;
    practice.push({ id, n: practice.length + 1, stem: p.stem.trim(), type, options, conceptId: concept.id, practice: true });
    practiceKeys[id] = k;
  }
  return { card: { whatToKnow: raw.card.whatToKnow.trim(), workedExample: raw.card.workedExample.trim() }, keys, practice, practiceKeys };
}
