import { GoogleGenAI } from "@google/genai";
import type { Principle } from "@shared/schema";
import { parseVisualSpec, readStoredVisual, readVisualBrief, type StoredVisual, type VisualSpec } from "@shared/visuals";
import { storage } from "./storage";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
});

// Bump to regenerate every saved scene once (e.g. after a prompt fix).
// 2: stop inventing colors, prefer author's type, vary kinds within a topic.
const SCENE_GENERATOR_VERSION = 2;

// Maps the topic generator's original visualType onto a scene kind.
const AUTHOR_TYPE_HINT: Record<string, string> = {
  comparison: "compare",
  flowchart: "flow",
  timeline: "timeline",
};

interface SceneContext {
  topicTitle: string;
  brief?: string;
  authorType?: string;
  /** Scene kinds already used by other principles in the same topic. */
  siblingKinds: string[];
}

function buildScenePrompt(principle: Principle, ctx: SceneContext): string {
  const { topicTitle, brief, authorType, siblingKinds } = ctx;
  const explanation = (principle.explanation || "").slice(0, 1400);
  const hint = authorType ? AUTHOR_TYPE_HINT[authorType] : undefined;
  return `You design short concept animations for BasicsTutor, a site that teaches from first principles.
Pick the ONE scene kind below that best SHOWS the mechanism of this principle, then fill it in.

Topic: ${topicTitle}
Principle: ${principle.title}
Explanation: ${explanation}
${principle.analogy ? `Analogy: ${principle.analogy}` : ""}
${brief ? `Visual brief from the lesson author: ${brief}` : ""}
${hint ? `The lesson author intended a "${hint}" scene. Use it unless it clearly can't show this principle.` : ""}
${siblingKinds.length ? `Other principles in this lesson already use: ${siblingKinds.join(", ")}. Prefer a different kind so the lesson isn't repetitive -- repeat one only if nothing else genuinely fits.` : ""}

Scene kinds (return exactly one JSON object matching one of these):
- {"kind":"particles","caption":"...","mode":"spread"|"mix"|"cluster","startLabel":"...","endLabel":"..."}
  ONLY for physical or statistical things made of many units: spread = packed then dispersing (diffusion, entropy, heat); mix = two groups blending; cluster = scattered units gathering into groups (gravity, network effects).
- {"kind":"flow","caption":"...","steps":[{"label":"...","detail":"..."}]}  2-6 steps. A causal chain or process where each step produces the next.
- {"kind":"cycle","caption":"...","steps":[{"label":"..."}]}  3-6 steps. A feedback loop that feeds back into its own start.
- {"kind":"compare","caption":"...","left":{"title":"...","points":["..."]},"right":{"title":"...","points":["..."]}}  1-4 points per side. Two contrasting states, models, or misconception vs. reality.
- {"kind":"timeline","caption":"...","events":[{"when":"...","label":"..."}]}  2-6 events in chronological order. "when" is short (a year, "Step 1", "Day 30").
- {"kind":"scale","caption":"...","unit":"...","items":[{"label":"...","value":123}]}  2-6 items with positive numbers. ONLY if the explanation itself supports the magnitudes -- never invent statistics.
- {"kind":"layers","caption":"...","layers":[{"label":"...","detail":"..."}]}  2-5 layers ordered FOUNDATION FIRST: layers[0] is the most fundamental truth, each next layer is built on the one below.

Rules:
1. Accuracy beats flourish. Every label must be true to the explanation above.
2. Labels are short noun phrases (max 40 characters). "detail" max 80 characters.
3. caption is one plain sentence (max 140 characters) telling the learner what to watch for.
4. Never mention colors, shapes, or styling in any text -- the app decides how scenes look, so a caption like "the red dots" will be wrong.
5. Return only the JSON object.`;
}

async function generateScene(principle: Principle, ctx: SceneContext): Promise<VisualSpec | null> {
  const prompt = buildScenePrompt(principle, ctx);

  // Two attempts: JSON mode makes malformed output rare, but a scene can
  // still fail validation (e.g. a label over the length limit).
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    try {
      const spec = parseVisualSpec(JSON.parse(response.text ?? ""));
      if (spec) return spec;
    } catch {
      // fall through to retry
    }
  }
  return null;
}

// Dedupe concurrent requests for the same principle (a page renders several
// visuals at once, and two visitors can open the same fresh topic together),
// and remember recent failures so a principle the model can't draw doesn't
// re-bill on every view.
const inFlight = new Map<string, Promise<VisualSpec | null>>();
const recentFailures = new Map<string, number>();
const FAILURE_TTL_MS = 60 * 60 * 1000;

/**
 * Return a principle's concept scene, generating and saving it on first
 * request. Self-backfilling: existing topics get scenes the first time
 * someone opens each principle, so total generation cost is bounded by the
 * number of principles, not by traffic.
 */
export async function getOrCreateScene(principleId: string): Promise<VisualSpec | null> {
  const [principle] = await storage.getPrinciplesByIds([principleId]);
  if (!principle) return null;

  const stored = principle.visualData as Partial<StoredVisual> | null;
  const existing = readStoredVisual(principle.visualData);
  if (existing && stored?.gen === SCENE_GENERATOR_VERSION) return existing;
  // An older-generation scene still beats nothing: serve it if regeneration
  // is failing or throttled, rather than dropping a working visual.
  const fallback = existing ?? null;

  const failedAt = recentFailures.get(principleId);
  if (failedAt && Date.now() - failedAt < FAILURE_TTL_MS) return fallback;

  const pending = inFlight.get(principleId);
  if (pending) return pending;

  const job = (async () => {
    try {
      const [topic, siblings] = await Promise.all([
        storage.getTopic(principle.topicId),
        storage.getPrinciplesByTopic(principle.topicId),
      ]);
      // Before the first scene is saved, visualType holds the topic author's
      // intent ("comparison"...); afterwards it's "animated" and the intent
      // lives in the stored object.
      const authorType = principle.visualType && principle.visualType !== "animated"
        ? principle.visualType
        : stored?.authorType;
      const siblingKinds = siblings
        .filter((s) => s.id !== principleId && (s.visualData as Partial<StoredVisual> | null)?.gen === SCENE_GENERATOR_VERSION)
        .map((s) => readStoredVisual(s.visualData)?.kind)
        .filter((k): k is VisualSpec["kind"] => !!k);
      const brief = readVisualBrief(principle.visualData);

      const spec = await generateScene(principle, {
        topicTitle: topic?.title ?? principle.title,
        brief,
        authorType,
        siblingKinds,
      });
      if (!spec) {
        recentFailures.set(principleId, Date.now());
        return fallback;
      }
      const next: StoredVisual = { v: 2, spec, brief, authorType, gen: SCENE_GENERATOR_VERSION };
      await storage.updatePrincipleVisual(principleId, "animated", next);
      return spec;
    } catch (err) {
      console.error(`[Visuals] Scene generation failed for principle ${principleId}:`, err);
      recentFailures.set(principleId, Date.now());
      return fallback;
    } finally {
      inFlight.delete(principleId);
    }
  })();

  inFlight.set(principleId, job);
  return job;
}
