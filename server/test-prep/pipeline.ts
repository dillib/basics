import { getSet, updateSet, type StoredSet } from "./store";
import { parseQuestions } from "./parse";
import { groupConcepts } from "./group";
import { prepareConcept } from "./prepare";
import { verifyKeys } from "./verify";
import type { Level } from "@shared/levels";
import type { SetData } from "@shared/test-prep";

/**
 * Builds a study set in stages, saving after each so the student sees
 * questions within seconds and the rest as it arrives:
 * parsing -> grouping -> preparing -> verifying -> ready.
 * Resumable: it continues from whatever status is stored.
 */

const inFlight = new Set<string>();
/** A non-terminal set untouched this long is assumed orphaned (e.g. by a deploy). */
const STALE_MS = 3 * 60_000;

export function levelForGrade(grade?: number): Level {
  if (grade && grade >= 1 && grade <= 5) return "kid";
  if (grade && grade >= 6 && grade <= 12) return "teen";
  return "adult";
}

async function stage(s: StoredSet): Promise<StoredSet | null> {
  const data: SetData = structuredClone(s.data);
  switch (s.status) {
    case "parsing": {
      const parsed = await parseQuestions({ text: s.inputText, images: s.images });
      if (!parsed) throw new Error("parse_failed");
      if (!parsed.questions.length) {
        await updateSet(s.id, { status: "failed", data: { ...data, error: "no_questions" } });
        return null;
      }
      const next: SetData = { ...data, questions: parsed.questions, grade: parsed.grade, subject: parsed.subject };
      await updateSet(s.id, { status: "grouping", level: levelForGrade(parsed.grade), subject: parsed.subject, data: next });
      break;
    }
    case "grouping": {
      const readable = data.questions.filter((q) => !q.unreadable && !q.practice);
      data.concepts = await groupConcepts(readable, s.level, data.subject);
      for (const c of data.concepts) for (const id of c.questionIds) {
        const q = data.questions.find((x) => x.id === id);
        if (q) q.conceptId = c.id;
      }
      await updateSet(s.id, { status: "preparing", data });
      break;
    }
    case "preparing": {
      const own = data.questions.filter((q) => !q.practice);
      // One retry per concept; a concept that still fails shows its questions as
      // unavailable (toClient) rather than "still preparing" forever.
      const prep = (c: (typeof data.concepts)[number]) =>
        prepareConcept(c, own.filter((q) => c.questionIds.includes(q.id)), s.level, s.images).catch(() => null);
      const results = await Promise.all(data.concepts.map(async (c) => (await prep(c)) ?? prep(c)));
      data.questions = own; // practice is (re)written below
      data.concepts.forEach((c, i) => {
        const r = results[i];
        if (!r) return;
        c.card = r.card;
        c.practiceIds = r.practice.map((p) => p.id);
        data.questions.push(...r.practice);
        Object.assign(data.keys, r.keys, r.practiceKeys);
      });
      await updateSet(s.id, { status: "verifying", data });
      break;
    }
    case "verifying": {
      data.keys = await verifyKeys(data.questions, data.keys, s.images);
      await updateSet(s.id, { status: "ready", data });
      return null;
    }
    default:
      return null;
  }
  return getSet(s.id, { images: true });
}

/** Never throws; any crash marks the set failed. */
export async function runPipeline(id: string): Promise<void> {
  if (inFlight.has(id)) return;
  inFlight.add(id);
  try {
    let s = await getSet(id, { images: true });
    while (s) s = await stage(s);
  } catch (err) {
    console.error(`[TestPrep] ${id} failed:`, (err as Error)?.message);
    const s = await getSet(id).catch(() => null);
    await updateSet(id, { status: "failed", data: { ...(s?.data ?? { questions: [], concepts: [], keys: {} }), error: (err as Error)?.message || "failed" } }).catch(() => {});
  } finally {
    inFlight.delete(id);
  }
}

/** Resume a set whose pipeline died (server restart mid-run). */
export function ensureRunning(s: StoredSet): void {
  if (s.status === "ready" || s.status === "failed" || inFlight.has(s.id)) return;
  if (Date.now() - s.updatedAt.getTime() < STALE_MS) return;
  void runPipeline(s.id);
}
