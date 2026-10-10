import type { ClientSet } from "@shared/test-prep";

/** The student's progress on a set, kept on this device only. */
export type Progress = Record<string, {
  tries: number;
  correct: boolean | null;
  revealed: boolean;
  hintsUsed: number;
  /** The student's last answer and the feedback they got. */
  lastAnswer?: string;
  explanation?: string;
  /** The key, once revealed (for the printable review sheet). */
  answer?: string;
}>;

const key = (setId: string) => `testprep:progress:${setId}`;

export function loadProgress(setId: string): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(key(setId)) || "{}");
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

export function saveProgress(setId: string, p: Progress): void {
  try {
    localStorage.setItem(key(setId), JSON.stringify(p));
  } catch {}
}

/**
 * Ready on a concept = every own question answered correctly without
 * revealing it (open questions: attempted), and every practice question
 * tried is correct.
 */
export function readiness(set: ClientSet, p: Progress): { conceptId: string; title: string; ready: boolean }[] {
  const byId = new Map(set.questions.map((q) => [q.id, q]));
  return set.concepts.map((c) => {
    const ownDone = c.questionIds.every((id) => {
      const a = p[id];
      if (!a || a.tries < 1 || a.revealed) return false;
      return byId.get(id)?.type === "open" ? true : a.correct === true;
    });
    const practiceOk = c.practiceIds.every((id) => !p[id] || p[id].tries < 1 || p[id].correct !== false);
    return { conceptId: c.id, title: c.title, ready: ownDone && practiceOk };
  });
}
