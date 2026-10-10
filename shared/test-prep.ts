import type { Level } from "./levels";

/**
 * Test Prep (docs/superpowers/specs/2026-10-09-test-prep-design.md): a
 * student pastes homework/test questions; we turn them into a study set.
 * Answer keys stay on the server (SetData.keys) and never appear in ClientSet.
 */

export type QType = "mc" | "tf" | "numeric" | "short" | "open";

export interface PrepQuestion {
  id: string;
  n: number;
  stem: string;
  type: QType;
  options: string[];
  /** Index into the set's images. */
  image?: number;
  /** The model couldn't read it; the student is asked to type it in. */
  unreadable?: boolean;
  conceptId?: string;
  /** A practice question we wrote (not one the student pasted). */
  practice?: boolean;
}

export interface PrepKey {
  answer: string;
  explanation: string;
  hints: [string, string];
  /** False when the independent check disagreed: shown as "check with your teacher". */
  verified: boolean;
}

export interface PrepConcept {
  id: string;
  title: string;
  questionIds: string[];
  lessonSlug?: string;
  card?: { whatToKnow: string; workedExample: string };
  practiceIds: string[];
}

export type SetStatus = "parsing" | "grouping" | "preparing" | "verifying" | "ready" | "failed";

export interface SetData {
  questions: PrepQuestion[];
  concepts: PrepConcept[];
  keys: Record<string, PrepKey>;
  grade?: number;
  subject?: string;
  /** Why the set failed, e.g. "no_questions". */
  error?: string;
}

export interface AttemptRecord {
  tries: number;
  correct: boolean | null;
  revealed: boolean;
}

/** What the browser gets: no keys, explanations or hints. */
export interface ClientSet {
  id: string;
  status: SetStatus;
  level: Level;
  subject?: string;
  questions: PrepQuestion[];
  concepts: PrepConcept[];
  /** Images are served from /api/test-prep/:id/images/:n (not in the polled payload). */
  imageCount: number;
  /** Question ids whose key failed verification. */
  flagged: string[];
  /** Question ids we couldn't prepare (no key): shown as unavailable, not "still preparing". */
  unavailable: string[];
  error?: string;
}

export const TEST_PREP_LIMITS = { questions: 30, images: 10, chars: 20_000, maxImageSide: 1600 } as const;
