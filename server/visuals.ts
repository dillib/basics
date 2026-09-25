import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { Principle } from "@shared/schema";
import { parseVisualSpec, readStoredVisual, readVisualBrief, type StoredVisual, type VisualSpec } from "@shared/visuals";
import { storage } from "./storage";

const gemini = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
});

// Claude Opus 5.5 writes scenes when ANTHROPIC_API_KEY is set; otherwise (or
// on a refusal / invalid scene) Gemini Flash does. Each scene is generated
// once and saved, so this is roughly a one-time cost per principle.
const claude = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const CLAUDE_MODEL = "claude-opus-5-5";
// Scene picking is a small structured task; low effort keeps thinking (and
// output spend) minimal. Opus 5.5 can't disable thinking -- effort is the dial.
const CLAUDE_EFFORT = (process.env.SCENE_EFFORT as "low" | "medium" | "high" | undefined) ?? "low";
// $ per token, for the cost log line (Opus 5.5: $4 in / $20 out / $0.20 cache read per MTok).
const PRICE = { input: 4e-6, output: 20e-6, cacheRead: 0.2e-6, cacheWrite: 5e-6 };

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

/**
 * Identical for every request -- kept free of per-principle data so Claude
 * can serve it from the prompt cache (Opus 5.5 caches prefixes >= 512
 * tokens; this is comfortably above that).
 */
const SCENE_INSTRUCTIONS = `You design short concept animations for BasicsTutor, a site that teaches from first principles.
Given one principle from a lesson, pick the ONE scene kind below that best SHOWS its mechanism, then fill it in.

Scene kinds (return exactly one JSON object matching one of these):
- {"kind":"particles","caption":"...","mode":"spread"|"mix"|"cluster","startLabel":"...","endLabel":"..."}
  ONLY for physical or statistical things made of many units: spread = packed then dispersing (diffusion, entropy, heat); mix = two groups blending; cluster = scattered units gathering into groups (gravity, network effects).
- {"kind":"flow","caption":"...","steps":[{"label":"...","detail":"..."}]}  2-6 steps. A causal chain or process where each step produces the next.
- {"kind":"cycle","caption":"...","steps":[{"label":"..."}]}  3-6 steps. A feedback loop that feeds back into its own start.
- {"kind":"compare","caption":"...","left":{"title":"...","points":["..."]},"right":{"title":"...","points":["..."]}}  1-4 points per side. Two contrasting states, models, or misconception vs. reality.
- {"kind":"timeline","caption":"...","events":[{"when":"...","label":"..."}]}  2-6 events in chronological order. "when" is short (a year, "Step 1", "Day 30").
- {"kind":"scale","caption":"...","unit":"...","items":[{"label":"...","value":123}]}  2-6 items with positive numbers. ONLY if the explanation itself supports the magnitudes -- never invent statistics.
- {"kind":"layers","caption":"...","layers":[{"label":"...","detail":"..."}]}  2-5 layers ordered FOUNDATION FIRST: layers[0] is the most fundamental truth, each next layer is built on the one below.

How to choose:
- Ask what the learner should SEE change. Many units dispersing or gathering -> particles. One thing causing the next -> flow. An effect that loops back to amplify or stabilize its cause -> cycle. A common belief against the real mechanism, or two regimes side by side -> compare. Ideas that only make sense built on a more basic idea -> layers. Numbers whose sizes matter -> scale (only with real numbers from the text). Change over dated time -> timeline.
- If the lesson author's intended kind is given, use it unless it clearly can't show this principle.
- If other principles in the lesson already use some kinds, prefer a different one so the lesson isn't repetitive -- repeat only if nothing else genuinely fits.

Rules:
1. Accuracy beats flourish. Every label must be true to the principle's explanation.
2. Labels are short noun phrases (max 40 characters). "detail" max 80 characters.
3. caption is one plain sentence (max 140 characters) telling the learner what to watch for.
4. Never mention colors, shapes, or styling in any text -- the app decides how scenes look, so a caption like "the red dots" will be wrong.
5. Return only the JSON object.

Example. Principle: "Compound interest grows on past growth" (explanation: interest earned is added to the balance, so the next period's interest is computed on a larger base, which makes growth accelerate).
Good scene: {"kind":"cycle","caption":"Follow the loop: every pass adds interest, and a bigger balance earns bigger interest next time.","steps":[{"label":"Balance earns interest"},{"label":"Interest joins the balance"},{"label":"Bigger balance"}]}
Why it's good: the mechanism IS a loop that feeds itself; a flow would hide that the last step drives the first.`;

function buildPrincipleMessage(principle: Principle, ctx: SceneContext): string {
  const { topicTitle, brief, authorType, siblingKinds } = ctx;
  const hint = authorType ? AUTHOR_TYPE_HINT[authorType] : undefined;
  return [
    `Topic: ${topicTitle}`,
    `Principle: ${principle.title}`,
    `Explanation: ${(principle.explanation || "").slice(0, 1400)}`,
    principle.analogy ? `Analogy: ${principle.analogy}` : "",
    brief ? `Visual brief from the lesson author: ${brief}` : "",
    hint ? `The lesson author intended a "${hint}" scene.` : "",
    siblingKinds.length ? `Other principles in this lesson already use: ${siblingKinds.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// JSON schema for Claude's structured output. Length/count limits aren't
// expressible here (unsupported by structured outputs), so parseVisualSpec's
// zod schema still validates the result.
const str = { type: "string" };
const obj = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const kind = (k: string) => ({ type: "string", enum: [k] });
const SCENE_JSON_SCHEMA = {
  anyOf: [
    obj({ kind: kind("particles"), caption: str, mode: { type: "string", enum: ["spread", "mix", "cluster"] }, startLabel: str, endLabel: str },
      ["kind", "caption", "mode", "startLabel", "endLabel"]),
    obj({ kind: kind("flow"), caption: str, steps: { type: "array", items: obj({ label: str, detail: str }, ["label"]) } },
      ["kind", "caption", "steps"]),
    obj({ kind: kind("cycle"), caption: str, steps: { type: "array", items: obj({ label: str }, ["label"]) } },
      ["kind", "caption", "steps"]),
    obj({
      kind: kind("compare"), caption: str,
      left: obj({ title: str, points: { type: "array", items: str } }, ["title", "points"]),
      right: obj({ title: str, points: { type: "array", items: str } }, ["title", "points"]),
    }, ["kind", "caption", "left", "right"]),
    obj({ kind: kind("timeline"), caption: str, events: { type: "array", items: obj({ when: str, label: str }, ["when", "label"]) } },
      ["kind", "caption", "events"]),
    obj({ kind: kind("scale"), caption: str, unit: str, items: { type: "array", items: obj({ label: str, value: { type: "number" } }, ["label", "value"]) } },
      ["kind", "caption", "items"]),
    obj({ kind: kind("layers"), caption: str, layers: { type: "array", items: obj({ label: str, detail: str }, ["label"]) } },
      ["kind", "caption", "layers"]),
  ],
};

async function generateWithClaude(client: Anthropic, message: string, principleId: string): Promise<VisualSpec | null> {
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000, // a ceiling, not a spend -- only generated tokens bill
    system: [{ type: "text", text: SCENE_INSTRUCTIONS, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: message }],
    output_config: { effort: CLAUDE_EFFORT, format: { type: "json_schema", schema: SCENE_JSON_SCHEMA } },
  });

  const u = response.usage;
  const cost =
    (u.input_tokens ?? 0) * PRICE.input +
    (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
    (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
    (u.output_tokens ?? 0) * PRICE.output;
  console.log(
    `[Visuals] ${CLAUDE_MODEL} principle=${principleId} in=${u.input_tokens} cacheRead=${u.cache_read_input_tokens ?? 0} ` +
      `cacheWrite=${u.cache_creation_input_tokens ?? 0} out=${u.output_tokens} stop=${response.stop_reason} ~$${cost.toFixed(4)}`,
  );

  if (response.stop_reason !== "end_turn") return null; // refusal / max_tokens -> Gemini fallback
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
  try {
    return parseVisualSpec(JSON.parse(text));
  } catch {
    return null;
  }
}

async function generateWithGemini(principle: Principle, ctx: SceneContext): Promise<VisualSpec | null> {
  const prompt = `${SCENE_INSTRUCTIONS}\n\n${buildPrincipleMessage(principle, ctx)}`;
  // Two attempts: JSON mode makes malformed output rare, but a scene can
  // still fail validation (e.g. a label over the length limit).
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await gemini.models.generateContent({
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

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Who gets concept animations. Free launch mode (monetization off): everyone,
 * signed in or not. Once monetization is on they're a Pro feature, matching
 * the AI Tutor -- which also means only paying users can trigger generation.
 */
export function canAccessVisuals(
  monetizationEnabled: boolean,
  user: { plan?: string | null; proExpiresAt?: Date | string | null } | undefined,
): boolean {
  if (!monetizationEnabled) return true;
  if (!user || user.plan !== "pro") return false;
  return !user.proExpiresAt || new Date(user.proExpiresAt) >= new Date();
}

async function generateScene(
  principle: Principle,
  ctx: SceneContext,
): Promise<{ spec: VisualSpec; model: string; claudeFailed: boolean } | null> {
  if (claude) {
    try {
      // One Claude attempt only: structured output guarantees the JSON shape,
      // so a miss is a length-limit or refusal -- cheaper to hand to Gemini
      // than to pay Opus twice.
      const spec = await generateWithClaude(claude, buildPrincipleMessage(principle, ctx), principle.id);
      if (spec) return { spec, model: CLAUDE_MODEL, claudeFailed: false };
    } catch (err) {
      console.error(`[Visuals] Claude scene failed for ${principle.id}, falling back to Gemini:`, err);
    }
  }
  const spec = await generateWithGemini(principle, ctx);
  return spec ? { spec, model: GEMINI_MODEL, claudeFailed: !!claude } : null;
}

/**
 * A saved scene is current if it's from this generator version and -- when
 * Claude is configured -- was written by Claude. So adding ANTHROPIC_API_KEY
 * upgrades each Gemini-era scene exactly once, on its next view.
 */
function isCurrent(stored: Partial<StoredVisual> | null): boolean {
  if (stored?.gen !== SCENE_GENERATOR_VERSION) return false;
  // claudeFailed: Claude already had its one shot at this principle and
  // refused/failed -- retrying on every view would re-bill Opus forever.
  return !claude || stored.model === CLAUDE_MODEL || stored.claudeFailed === true;
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
  if (existing && isCurrent(stored)) return existing;
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
        .filter((s) => s.id !== principleId && isCurrent(s.visualData as Partial<StoredVisual> | null))
        .map((s) => readStoredVisual(s.visualData)?.kind)
        .filter((k): k is VisualSpec["kind"] => !!k);
      const brief = readVisualBrief(principle.visualData);

      const result = await generateScene(principle, {
        topicTitle: topic?.title ?? principle.title,
        brief,
        authorType,
        siblingKinds,
      });
      if (!result) {
        recentFailures.set(principleId, Date.now());
        return fallback;
      }
      const next: StoredVisual = {
        v: 2,
        spec: result.spec,
        brief,
        authorType,
        gen: SCENE_GENERATOR_VERSION,
        model: result.model,
        claudeFailed: result.claudeFailed,
      };
      await storage.updatePrincipleVisual(principleId, "animated", next);
      return result.spec;
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
