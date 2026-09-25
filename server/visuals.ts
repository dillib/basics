import { GoogleGenAI } from "@google/genai";
import type { Principle } from "@shared/schema";
import { parseVisualSpec, readStoredVisual, readVisualBrief, type StoredVisual, type VisualSpec } from "@shared/visuals";
import { storage } from "./storage";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
});

function buildScenePrompt(topicTitle: string, principle: Principle, brief?: string): string {
  const explanation = (principle.explanation || "").slice(0, 1400);
  return `You design short concept animations for BasicsTutor, a site that teaches from first principles.
Pick the ONE scene kind below that best SHOWS the mechanism of this principle, then fill it in.

Topic: ${topicTitle}
Principle: ${principle.title}
Explanation: ${explanation}
${principle.analogy ? `Analogy: ${principle.analogy}` : ""}
${brief ? `Visual brief from the lesson author: ${brief}` : ""}

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
4. Return only the JSON object.`;
}

async function generateScene(topicTitle: string, principle: Principle): Promise<VisualSpec | null> {
  const brief = readVisualBrief(principle.visualData);
  const prompt = buildScenePrompt(topicTitle, principle, brief);

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

  const existing = readStoredVisual(principle.visualData);
  if (existing) return existing;

  const failedAt = recentFailures.get(principleId);
  if (failedAt && Date.now() - failedAt < FAILURE_TTL_MS) return null;

  const pending = inFlight.get(principleId);
  if (pending) return pending;

  const job = (async () => {
    try {
      const topic = await storage.getTopic(principle.topicId);
      const spec = await generateScene(topic?.title ?? principle.title, principle);
      if (!spec) {
        recentFailures.set(principleId, Date.now());
        return null;
      }
      const stored: StoredVisual = { v: 2, spec, brief: readVisualBrief(principle.visualData) };
      await storage.updatePrincipleVisual(principleId, "animated", stored);
      return spec;
    } catch (err) {
      console.error(`[Visuals] Scene generation failed for principle ${principleId}:`, err);
      recentFailures.set(principleId, Date.now());
      return null;
    } finally {
      inFlight.delete(principleId);
    }
  })();

  inFlight.set(principleId, job);
  return job;
}
