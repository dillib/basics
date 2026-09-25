import { z } from "zod";

/**
 * Concept animation "scenes": a small, validated vocabulary the AI writes and
 * the browser animates (client/src/components/visuals/). Deliberately NOT
 * generated video -- labels are real text so they're always spelled right,
 * nothing is stored but a few hundred bytes of JSON, and every scene works in
 * light and dark themes.
 *
 * Shared so the server validates exactly what the client knows how to draw.
 */

const label = z.string().trim().min(1).max(48);
const caption = z.string().trim().min(1).max(160);
const detail = z.string().trim().max(90).optional();

export const particlesScene = z.object({
  kind: z.literal("particles"),
  caption,
  // spread: starts packed on one side, disperses (diffusion, entropy, heat).
  // mix: two populations start separated and blend (mixing, markets, genes).
  // cluster: starts scattered, gathers into groups (gravity, network effects).
  mode: z.enum(["spread", "mix", "cluster"]),
  startLabel: label,
  endLabel: label,
});

export const flowScene = z.object({
  kind: z.literal("flow"),
  caption,
  steps: z.array(z.object({ label, detail })).min(2).max(6),
});

export const cycleScene = z.object({
  kind: z.literal("cycle"),
  caption,
  steps: z.array(z.object({ label })).min(3).max(6),
});

export const compareScene = z.object({
  kind: z.literal("compare"),
  caption,
  left: z.object({ title: label, points: z.array(label).min(1).max(4) }),
  right: z.object({ title: label, points: z.array(label).min(1).max(4) }),
});

export const timelineScene = z.object({
  kind: z.literal("timeline"),
  caption,
  events: z.array(z.object({ when: z.string().trim().min(1).max(20), label })).min(2).max(6),
});

export const scaleScene = z.object({
  kind: z.literal("scale"),
  caption,
  unit: z.string().trim().max(20).optional(),
  items: z.array(z.object({ label, value: z.number().positive().finite() })).min(2).max(6),
});

export const layersScene = z.object({
  kind: z.literal("layers"),
  caption,
  // Ordered foundation-first: layers[0] is the bedrock everything rests on.
  layers: z.array(z.object({ label, detail })).min(2).max(5),
});

export const visualSpecSchema = z.discriminatedUnion("kind", [
  particlesScene,
  flowScene,
  cycleScene,
  compareScene,
  timelineScene,
  scaleScene,
  layersScene,
]);

export type VisualSpec = z.infer<typeof visualSpecSchema>;
export type VisualKind = VisualSpec["kind"];
export const VISUAL_KINDS: VisualKind[] = ["particles", "flow", "cycle", "compare", "timeline", "scale", "layers"];

/** Validate untrusted (AI or DB) input; null if it isn't a drawable scene. */
export function parseVisualSpec(raw: unknown): VisualSpec | null {
  const result = visualSpecSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Stored shape in principles.visual_data once a scene exists. The original
 * AI "visual brief" (the {type, description} the topic generator writes) is
 * kept alongside so a scene can be regenerated later without losing intent.
 */
export interface StoredVisual {
  v: 2;
  spec: VisualSpec;
  brief?: string;
  /** The topic author's original visualType ("comparison", "flowchart"...). */
  authorType?: string;
  /** Scene-generator version; bumping it regenerates older scenes once. */
  gen?: number;
}

/** Returns the scene if visual_data already holds a valid v2 scene. */
export function readStoredVisual(visualData: unknown): VisualSpec | null {
  if (!visualData || typeof visualData !== "object") return null;
  const data = visualData as Partial<StoredVisual>;
  if (data.v !== 2) return null;
  return parseVisualSpec(data.spec);
}

/**
 * Bar widths (%) for the "scale" scene. Switches to a log scale when values
 * span 50x or more -- otherwise the small values render as invisible slivers.
 */
export function scaleWidths(values: number[]): { widths: number[]; log: boolean } {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const log = max / min >= 50;
  if (!log) return { widths: values.map((v) => Math.max(2, (100 * v) / max)), log };
  const span = Math.log(max) - Math.log(min) || 1;
  return { widths: values.map((v) => 8 + (92 * (Math.log(v) - Math.log(min))) / span), log };
}

/** The legacy text brief, from either a v1 {description} or a v2 {brief}. */
export function readVisualBrief(visualData: unknown): string | undefined {
  if (!visualData || typeof visualData !== "object") return undefined;
  const data = visualData as { description?: unknown; brief?: unknown };
  if (typeof data.brief === "string") return data.brief;
  if (typeof data.description === "string") return data.description;
  return undefined;
}
