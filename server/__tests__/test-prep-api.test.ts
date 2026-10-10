import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';
import type { StoredSet } from '../test-prep/store';

// In-memory store with the real toClient.
const sets = new Map<string, StoredSet>();
vi.mock('../test-prep/store', async (orig) => {
  const real = await orig<typeof import('../test-prep/store')>();
  return {
    ...real,
    createSet: vi.fn(async ({ text, images }: { text: string; images: string[] }) => {
      const id = `set${sets.size + 1}`;
      sets.set(id, { id, status: 'parsing', level: 'teen', subject: null, inputText: text, images, data: { questions: [], concepts: [], keys: {} }, attempts: {}, createdAt: new Date(), updatedAt: new Date() });
      return id;
    }),
    getSet: vi.fn(async (id: string) => sets.get(id) ?? null),
    updateSet: vi.fn(async (id: string, patch: Partial<StoredSet>) => { const s = sets.get(id); if (s) sets.set(id, { ...s, ...patch, updatedAt: new Date() }); }),
    recordAttempt: vi.fn(async (id: string, qid: string, correct: boolean | null) => {
      const s = sets.get(id)!; const a = s.attempts[qid] ?? { tries: 0, correct: null, revealed: false };
      s.attempts[qid] = { ...a, tries: a.tries + 1, correct };
    }),
    markRevealed: vi.fn(async (id: string, qid: string) => { const s = sets.get(id)!; s.attempts[qid] = { ...(s.attempts[qid] ?? { tries: 0, correct: null }), revealed: true }; }),
  };
});

const parseQuestions = vi.fn();
const groupConcepts = vi.fn();
const prepareConcept = vi.fn();
const verifyKeys = vi.fn();
const checkRequest = vi.fn();
vi.mock('../test-prep/parse', () => ({ parseQuestions: (...a: unknown[]) => parseQuestions(...a) }));
vi.mock('../test-prep/group', () => ({ groupConcepts: (...a: unknown[]) => groupConcepts(...a) }));
vi.mock('../test-prep/prepare', () => ({ prepareConcept: (...a: unknown[]) => prepareConcept(...a) }));
vi.mock('../test-prep/verify', () => ({ verifyKeys: (...a: unknown[]) => verifyKeys(...a) }));
vi.mock('../safety', () => ({ checkRequest: (...a: unknown[]) => checkRequest(...a) }));
const fetchImageAsDataUrl = vi.fn();
vi.mock('../test-prep/images', async (orig) => ({
  ...(await orig<typeof import('../test-prep/images')>()),
  fetchImageAsDataUrl: (...a: unknown[]) => fetchImageAsDataUrl(...a),
}));

import { registerTestPrepRoutes } from '../test-prep/routes';
import { runPipeline, ensureRunning } from '../test-prep/pipeline';

let base = '';
let server: http.Server;
beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  registerTestPrepRoutes(app);
  server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const settle = () => new Promise((r) => setTimeout(r, 30));

const Q = { id: 'q1', n: 1, stem: 'What is 3/4 as a decimal?', type: 'numeric' as const, options: [] };
const readySet = (over: Partial<StoredSet> = {}): StoredSet => ({
  id: 'ready1', status: 'ready', level: 'teen', subject: 'math', inputText: 'x', images: [],
  data: { questions: [Q], concepts: [{ id: 'c1', title: 'Fractions', questionIds: ['q1'], practiceIds: [] }], keys: { q1: { answer: 'SECRET-0.75', explanation: 'SECRET-WHY', hints: ['SECRET-H1', 'SECRET-H2'], verified: true } } },
  attempts: {}, createdAt: new Date(), updatedAt: new Date(), ...over,
});

beforeEach(() => {
  sets.clear();
  for (const f of [parseQuestions, groupConcepts, prepareConcept, verifyKeys, checkRequest, fetchImageAsDataUrl]) f.mockReset();
  checkRequest.mockResolvedValue({ allowed: true });
  parseQuestions.mockResolvedValue({ questions: [Q], grade: 8, subject: 'math' });
  groupConcepts.mockResolvedValue([{ id: 'c1', title: 'Fractions', questionIds: ['q1'], practiceIds: [] }]);
  prepareConcept.mockResolvedValue({ card: { whatToKnow: 'w', workedExample: 'e' }, keys: { q1: { answer: '0.75', explanation: 'e', hints: ['a', 'b'], verified: false } }, practice: [], practiceKeys: {} });
  verifyKeys.mockImplementation(async (_q: unknown, keys: Record<string, any>) => Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, { ...v, verified: true }])));
});

describe('POST /api/test-prep', () => {
  it('rejects more than 10 images', async () => {
    const r = await post('/api/test-prep', { text: 'q', images: Array(11).fill('data:image/jpeg;base64,AAAA') });
    expect(r.status).toBe(422);
  });

  it('rejects more than 20,000 characters', async () => {
    const r = await post('/api/test-prep', { text: 'x'.repeat(20_001), images: [] });
    expect(r.status).toBe(422);
  });

  it('rejects an empty paste', async () => {
    expect((await post('/api/test-prep', { text: '  ', images: [] })).status).toBe(422);
  });

  it('rejects a paste the safety gate blocks', async () => {
    checkRequest.mockResolvedValue({ allowed: false, category: 'sexual', message: 'BasicsTutor can’t help with that.' });
    const r = await post('/api/test-prep', { text: 'bad', images: [] });
    expect(r.status).toBe(422);
    expect((await r.json()).message).toContain('can’t help');
  });

  it('rejects image links that are not Google Docs images', async () => {
    const r = await post('/api/test-prep', { text: 'q', images: [], imageUrls: ['https://169.254.169.254/latest'] });
    expect(r.status).toBe(422);
    expect(fetchImageAsDataUrl).not.toHaveBeenCalled();
  });

  it('downloads Google Docs image links into the set', async () => {
    fetchImageAsDataUrl.mockResolvedValue('data:image/png;base64,FETCHED');
    const r = await post('/api/test-prep', { text: '1. Look at the graph.', images: ['data:image/jpeg;base64,AAAA'], imageUrls: ['https://lh7-rt.googleusercontent.com/docsz/x'] });
    const { id } = await r.json();
    expect(sets.get(id)!.images).toEqual(['data:image/jpeg;base64,AAAA', 'data:image/png;base64,FETCHED']);
  });

  it('counts image links toward the 10-image limit', async () => {
    const r = await post('/api/test-prep', { text: 'q', images: Array(6).fill('data:image/jpeg;base64,AAAA'), imageUrls: Array(5).fill('https://lh3.googleusercontent.com/x') });
    expect(r.status).toBe(422);
  });

  it('creates a set and runs the pipeline to ready', async () => {
    const r = await post('/api/test-prep', { text: '1. What is 3/4 as a decimal?', images: [] });
    expect(r.status).toBe(200);
    const { id } = await r.json();
    await settle();
    expect(sets.get(id)!.status).toBe('ready');
    expect(sets.get(id)!.data.keys.q1.verified).toBe(true);
    expect(sets.get(id)!.level).toBe('teen');
    expect(sets.get(id)!.data.questions[0].conceptId).toBe('c1');
  });
});

describe('GET /api/test-prep/:id', () => {
  it('never sends keys, explanations or hints', async () => {
    sets.set('ready1', readySet());
    const r = await fetch(`${base}/api/test-prep/ready1`);
    expect(r.status).toBe(200);
    expect(await r.text()).not.toContain('SECRET');
  });

  it('returns a friendly 404 for an unknown or expired set', async () => {
    const r = await fetch(`${base}/api/test-prep/nope`);
    expect(r.status).toBe(404);
    expect((await r.json()).message).toBe("This set has expired or doesn't exist");
  });
});

describe('attempt, hint and reveal', () => {
  beforeEach(() => { sets.set('ready1', readySet()); });

  it('refuses to reveal before an attempt', async () => {
    const r = await post('/api/test-prep/ready1/reveal', { qid: 'q1' });
    expect(r.status).toBe(409);
    expect((await r.json()).message).toBe('Try it first, then you can see the answer.');
  });

  it('grades an attempt, then reveals the answer', async () => {
    const a = await (await post('/api/test-prep/ready1/attempt', { qid: 'q1', answer: '3/4' })).json();
    expect(a).toEqual({ correct: false, explanation: 'SECRET-WHY' }); // key is "SECRET-0.75", not a number
    const r = await post('/api/test-prep/ready1/reveal', { qid: 'q1' });
    expect(r.status).toBe(200);
    expect((await r.json()).answer).toBe('SECRET-0.75');
    expect(sets.get('ready1')!.attempts.q1.revealed).toBe(true);
  });

  it('gives hints by level', async () => {
    expect((await (await post('/api/test-prep/ready1/hint', { qid: 'q1', level: 2 })).json()).hint).toBe('SECRET-H2');
  });

  it('404s on an unknown question', async () => {
    expect((await post('/api/test-prep/ready1/attempt', { qid: 'q99', answer: '1' })).status).toBe(404);
  });
});

describe('pipeline', () => {
  it('fails with no_questions when nothing was found', async () => {
    parseQuestions.mockResolvedValue({ questions: [] });
    const r = await post('/api/test-prep', { text: 'hello there', images: [] });
    const { id } = await r.json();
    await settle();
    expect(sets.get(id)!.status).toBe('failed');
    expect(sets.get(id)!.data.error).toBe('no_questions');
  });

  it('resumes a set stuck mid-pipeline after a restart, once', async () => {
    const stuck = readySet({ id: 'stuck', status: 'preparing', updatedAt: new Date(Date.now() - 4 * 60_000) });
    stuck.data.keys = {};
    sets.set('stuck', stuck);
    ensureRunning(sets.get('stuck')!);
    ensureRunning(sets.get('stuck')!);
    await settle();
    expect(prepareConcept).toHaveBeenCalledTimes(1);
    expect(sets.get('stuck')!.status).toBe('ready');
  });

  it('leaves a recently updated set alone', async () => {
    sets.set('busy', readySet({ id: 'busy', status: 'preparing', updatedAt: new Date(Date.now() - 60_000) }));
    ensureRunning(sets.get('busy')!);
    await settle();
    expect(prepareConcept).not.toHaveBeenCalled();
  });

  it('marks the set failed when a stage throws', async () => {
    sets.set('boom', readySet({ id: 'boom', status: 'grouping' }));
    groupConcepts.mockRejectedValue(new Error('down'));
    await runPipeline('boom');
    expect(sets.get('boom')!.status).toBe('failed');
  });
});
