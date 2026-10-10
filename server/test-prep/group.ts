import { generateJSON } from "../llm";
import { findExistingLesson } from "../intake";
import type { Level } from "@shared/levels";
import type { PrepConcept, PrepQuestion } from "@shared/test-prep";

/** Group the student's questions into the few concepts they test. */

const SCHEMA = {
  name: "concept_groups",
  schema: {
    type: "object",
    properties: {
      concepts: {
        type: "array",
        items: {
          type: "object",
          properties: { title: { type: "string" }, questionIds: { type: "array", items: { type: "string" } } },
          required: ["title", "questionIds"],
          additionalProperties: false,
        },
      },
    },
    required: ["concepts"],
    additionalProperties: false,
  },
};

/**
 * Every real question in exactly one concept: first claim wins, unknown ids
 * dropped, unassigned questions go to the smallest concept, empty concepts
 * removed.
 */
export function assignAll(concepts: PrepConcept[], questionIds: string[]): PrepConcept[] {
  const real = new Set(questionIds);
  const seen = new Set<string>();
  const out = concepts.map((c) => ({
    ...c,
    questionIds: c.questionIds.filter((id) => real.has(id) && !seen.has(id) && (seen.add(id), true)),
  }));
  for (const id of questionIds) {
    if (seen.has(id)) continue;
    const target = out.filter((c) => c.questionIds.length).sort((a, b) => a.questionIds.length - b.questionIds.length)[0] ?? out[0];
    if (target) target.questionIds.push(id);
    seen.add(id);
  }
  return out.filter((c) => c.questionIds.length);
}

export async function groupConcepts(questions: PrepQuestion[], level: Level, subject?: string): Promise<PrepConcept[]> {
  const ids = questions.map((q) => q.id);
  const want = questions.length >= 6 ? "3 to 5" : "1 to 3";
  const result = await generateJSON("test_prep_group", {
    system: "You are a teacher sorting a student's homework questions by the concept each one tests.",
    prompt: `Group these questions into ${want} concepts. Each concept title is a short, specific lesson name a student would recognise (max 6 words, e.g. "Unit rates", "Photosynthesis inputs"). Every question id goes in exactly one concept.

${questions.map((q) => `${q.id}: ${q.stem}${q.options.length ? ` (options: ${q.options.join(" | ")})` : ""}`).join("\n")}`,
    schema: SCHEMA,
    maxTokens: 800,
    temperature: 0.2,
    effort: "low",
    timeoutMs: 15_000,
  }, (v) => {
    const raw = (v as { concepts?: unknown })?.concepts;
    if (!Array.isArray(raw) || !raw.length) return null;
    return raw
      .filter((c): c is { title: string; questionIds: string[] } => typeof c?.title === "string" && Array.isArray(c.questionIds))
      .slice(0, 5)
      .map((c, i): PrepConcept => ({ id: `c${i + 1}`, title: c.title.trim().slice(0, 80), questionIds: c.questionIds.filter((x) => typeof x === "string"), practiceIds: [] }));
  });

  const concepts = result?.data.length
    ? assignAll(result.data, ids)
    : [{ id: "c1", title: subject?.trim() || "Your questions", questionIds: ids, practiceIds: [] }];

  // Link a full BasicsTutor lesson where one already covers the concept.
  await Promise.all(concepts.map(async (c) => {
    const lesson = await findExistingLesson(c.title, level).catch(() => null);
    if (lesson) c.lessonSlug = lesson.slug;
  }));
  return concepts;
}
