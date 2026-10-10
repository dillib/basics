import { randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import type { Level } from "@shared/levels";
import type { AttemptRecord, ClientSet, SetData, SetStatus } from "@shared/test-prep";

// Loaded lazily so the pure helpers (toClient, newSetId) work without a database.
const getDb = async () => (await import("../db")).db;

/** Sets are deleted this long after creation. */
export const SET_TTL_DAYS = 30;

export interface StoredSet {
  id: string;
  status: SetStatus;
  level: Level;
  subject: string | null;
  inputText: string;
  images: string[];
  data: SetData;
  attempts: Record<string, AttemptRecord>;
  createdAt: Date;
  updatedAt: Date;
}

/** 128 random bits, URL-safe: the set's only access control. */
export function newSetId(): string {
  return randomBytes(16).toString("base64url");
}

export function toClient(s: StoredSet): ClientSet {
  const { keys, questions, concepts, error } = s.data;
  return {
    id: s.id,
    status: s.status,
    level: s.level,
    ...(s.subject ? { subject: s.subject } : {}),
    questions,
    concepts,
    images: s.images,
    flagged: Object.entries(keys).filter(([, k]) => !k.verified).map(([qid]) => qid),
    // Once the set is ready, a readable question with no key couldn't be prepared.
    unavailable: s.status === "ready" ? questions.filter((q) => !q.unreadable && !keys[q.id]).map((q) => q.id) : [],
    ...(error ? { error } : {}),
  };
}

const EMPTY: SetData = { questions: [], concepts: [], keys: {} };

export async function createSet(input: { text: string; images: string[] }): Promise<string> {
  const id = newSetId();
  const db = await getDb();
  await db.execute(sql`
    INSERT INTO test_prep_sets (id, status, level, input_text, images, data)
    VALUES (${id}, 'parsing', 'teen', ${input.text}, ${JSON.stringify(input.images)}::jsonb, ${JSON.stringify(EMPTY)}::jsonb)`);
  return id;
}

export async function getSet(id: string): Promise<StoredSet | null> {
  const db = await getDb();
  const r = await db.execute(sql`
    SELECT * FROM test_prep_sets
    WHERE id = ${id} AND created_at > now() - make_interval(days => ${SET_TTL_DAYS})`);
  const row = r.rows[0] as Record<string, any> | undefined;
  if (!row) return null;
  return {
    id: row.id, status: row.status, level: row.level, subject: row.subject ?? null,
    inputText: row.input_text, images: row.images ?? [], data: row.data ?? EMPTY, attempts: row.attempts ?? {},
    createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
  };
}

export async function updateSet(id: string, patch: Partial<Pick<StoredSet, "status" | "level" | "subject" | "data">>): Promise<void> {
  const db = await getDb();
  await db.execute(sql`
    UPDATE test_prep_sets SET
      status = COALESCE(${patch.status ?? null}, status),
      level = COALESCE(${patch.level ?? null}, level),
      subject = COALESCE(${patch.subject ?? null}, subject),
      data = COALESCE(${patch.data ? JSON.stringify(patch.data) : null}::jsonb, data),
      updated_at = now()
    WHERE id = ${id}`);
}

async function patchAttempt(id: string, qid: string, f: (a: AttemptRecord) => AttemptRecord): Promise<void> {
  const s = await getSet(id);
  if (!s) return;
  const next = f(s.attempts[qid] ?? { tries: 0, correct: null, revealed: false });
  const db = await getDb();
  await db.execute(sql`
    UPDATE test_prep_sets SET attempts = attempts || jsonb_build_object(${qid}::text, ${JSON.stringify(next)}::jsonb)
    WHERE id = ${id}`);
}

export function recordAttempt(id: string, qid: string, correct: boolean | null): Promise<void> {
  return patchAttempt(id, qid, (a) => ({ ...a, tries: a.tries + 1, correct }));
}

export function markRevealed(id: string, qid: string): Promise<void> {
  return patchAttempt(id, qid, (a) => ({ ...a, revealed: true }));
}

export interface TestPrepSummary {
  sets: number;
  avgQuestions: number;
  /** % of pasted questions students tried. */
  attemptedPct: number;
  /** % of tried questions whose answer was then revealed. */
  revealedPct: number;
  /** % of concepts where every own question was right without a reveal. */
  readyPct: number;
}

export function summarizeSets(rows: Pick<StoredSet, "data" | "attempts">[]): TestPrepSummary {
  let questions = 0, attempted = 0, revealed = 0, concepts = 0, ready = 0;
  for (const { data, attempts } of rows) {
    const own = data.questions.filter((q) => !q.practice);
    questions += own.length;
    for (const q of own) {
      const a = attempts[q.id];
      if (a?.tries > 0) { attempted++; if (a.revealed) revealed++; }
    }
    for (const c of data.concepts) {
      concepts++;
      if (c.questionIds.length && c.questionIds.every((id) => attempts[id]?.tries > 0 && !attempts[id].revealed && attempts[id].correct !== false)) ready++;
    }
  }
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  return { sets: rows.length, avgQuestions: rows.length ? Math.round(questions / rows.length) : 0, attemptedPct: pct(attempted, questions), revealedPct: pct(revealed, attempted), readyPct: pct(ready, concepts) };
}

export async function testPrepSummary(days: number): Promise<TestPrepSummary> {
  const db = await getDb();
  const r = await db.execute(sql`
    SELECT data, attempts FROM test_prep_sets
    WHERE created_at > now() - make_interval(days => ${days}) AND status = 'ready'
    ORDER BY created_at DESC LIMIT 2000`);
  return summarizeSets((r.rows as { data: SetData; attempts: Record<string, AttemptRecord> }[]).map((x) => ({ data: x.data, attempts: x.attempts ?? {} })));
}

export async function purgeExpired(): Promise<number> {
  const db = await getDb();
  const r = await db.execute(sql`DELETE FROM test_prep_sets WHERE created_at < now() - make_interval(days => ${SET_TTL_DAYS})`);
  return r.rowCount ?? 0;
}
