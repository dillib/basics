import { generateJSON } from "../llm";
import { TEST_PREP_LIMITS, type PrepQuestion, type QType } from "@shared/test-prep";

/**
 * Pasted homework/test (text and images) -> numbered questions. The model
 * only transcribes: it never answers or rewrites a question.
 */

const TYPES: QType[] = ["mc", "tf", "numeric", "short", "open"];

const SCHEMA = {
  name: "parsed_questions",
  schema: {
    type: "object",
    properties: {
      grade: { type: "integer", description: "School grade 1-12 the questions are for; 0 if unclear." },
      subject: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            stem: { type: "string" },
            type: { type: "string", enum: TYPES },
            options: { type: "array", items: { type: "string" } },
            image: { type: "integer", description: "Index of the attached image this question uses, or -1." },
            unreadable: { type: "boolean" },
          },
          required: ["stem", "type", "options", "image", "unreadable"],
          additionalProperties: false,
        },
      },
    },
    required: ["grade", "subject", "questions"],
    additionalProperties: false,
  },
};

const PROMPT = `Below is what a student pasted: homework or test questions, possibly with images (numbered from 0 in the order attached).
Extract every question exactly as written. Do NOT answer any question and do NOT rewrite, simplify or correct it.
- "stem": the question text without its number. If the question relies on an image, say so in the stem's own words only if the stem already does.
- "type": "mc" (multiple choice), "tf" (true/false), "numeric" (the answer is a number or expression), "short" (a word or phrase), "open" (explain, describe, essay).
- "options": for mc, the choices without their letters; otherwise [].
- "image": index of the image the question uses, or -1. Questions that are only in an image: transcribe them from the image.
- "unreadable": true if you can see a question but cannot read it; leave its stem empty.
Also give the school grade (1-12, 0 if unclear) and the subject.`;

// "a) ", "A. ", "(a) ", "a: " at the start of an option.
const OPTION_LETTER = /^\s*\(?[a-hA-H][).:]\s+/;

export function normalizeParsed(raw: unknown, imageCount: number): { questions: PrepQuestion[]; grade?: number; subject?: string } | null {
  const r = raw as { grade?: unknown; subject?: unknown; questions?: unknown };
  if (!r || !Array.isArray(r.questions)) return null;
  const questions: PrepQuestion[] = [];
  for (const item of r.questions as Record<string, unknown>[]) {
    if (questions.length >= TEST_PREP_LIMITS.questions) break;
    const stem = typeof item?.stem === "string" ? item.stem.trim() : "";
    const unreadable = item?.unreadable === true;
    if (!stem && !unreadable) continue;
    const type: QType = TYPES.includes(item?.type as QType) ? (item.type as QType) : "short";
    let options: string[] = [];
    if (type === "mc" && Array.isArray(item.options)) {
      options = (item.options as unknown[]).filter((o): o is string => typeof o === "string" && !!o.trim())
        .map((o) => o.replace(OPTION_LETTER, "").trim()).slice(0, 8);
    }
    if (type === "tf") options = ["True", "False"];
    const image = Number.isInteger(item.image) && (item.image as number) >= 0 && (item.image as number) < imageCount ? (item.image as number) : undefined;
    const n = questions.length + 1;
    questions.push({ id: `q${n}`, n, stem: stem.slice(0, 2000), type: type === "mc" && options.length < 2 ? "short" : type, options, ...(image !== undefined ? { image } : {}), ...(unreadable ? { unreadable: true } : {}) });
  }
  const grade = Number.isInteger(r.grade) && (r.grade as number) >= 1 && (r.grade as number) <= 12 ? (r.grade as number) : undefined;
  const subject = typeof r.subject === "string" && r.subject.trim() ? r.subject.trim().slice(0, 60) : undefined;
  return { questions, ...(grade ? { grade } : {}), ...(subject ? { subject } : {}) };
}

function splitDataUrl(url: string): { mimeType: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(url);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

export async function parseQuestions(input: { text: string; images: string[] }): Promise<{ questions: PrepQuestion[]; grade?: number; subject?: string } | null> {
  const images = input.images.map(splitDataUrl).filter((x): x is { mimeType: string; data: string } => !!x);
  const result = await generateJSON("test_prep_parse", {
    system: "You transcribe school questions for a learning site that children use. You never answer them.",
    prompt: `${PROMPT}\n\nPASTED TEXT:\n${input.text || "(none: the questions are in the images)"}`,
    schema: SCHEMA,
    images,
    strictSafety: true,
    maxTokens: 8000,
    temperature: 0,
    timeoutMs: 45_000,
  }, (v) => normalizeParsed(v, images.length));
  return result?.data ?? null;
}
