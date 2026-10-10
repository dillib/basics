import { generateJSON } from "../llm";
import { sameAnswer } from "./answers";
import type { PrepKey, PrepQuestion } from "@shared/test-prep";

/** Right/wrong plus the explanation for one attempt. */
export async function gradeAttempt(q: PrepQuestion, key: PrepKey, answer: string): Promise<{ correct: boolean | null; explanation: string }> {
  if (q.type === "open") return { correct: null, explanation: `A strong answer covers: ${key.answer}` };
  if (q.type !== "short" || sameAnswer(q.type, answer, key.answer, q.options)) {
    return { correct: sameAnswer(q.type, answer, key.answer, q.options), explanation: key.explanation };
  }
  const judged = await generateJSON("test_prep_grade", {
    system: "You mark a school student's short answer. Be fair: accept the same meaning in other words, reject a different or incomplete idea.",
    prompt: `Question: ${q.stem}\nCorrect answer: ${key.answer}\nStudent's answer: ${answer}\n\nIs the student's answer correct? Give a one-sentence reason a student would understand.`,
    schema: {
      name: "grade",
      schema: { type: "object", properties: { correct: { type: "boolean" }, reason: { type: "string" } }, required: ["correct", "reason"], additionalProperties: false },
    },
    maxTokens: 150,
    temperature: 0,
    timeoutMs: 8000,
  }, (v) => {
    const r = v as { correct?: unknown; reason?: unknown };
    return typeof r?.correct === "boolean" ? { correct: r.correct, reason: typeof r.reason === "string" ? r.reason.slice(0, 300) : "" } : null;
  });
  if (!judged) return { correct: false, explanation: key.explanation };
  return { correct: judged.data.correct, explanation: [judged.data.reason, key.explanation].filter(Boolean).join(" ") };
}
