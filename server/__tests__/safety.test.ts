import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import { lint } from '../safety';
import { moderationFromReview, isBlocked } from '../moderation';

/**
 * Guardrails (server/safety.ts): word lists always run; Jev checks run
 * against a local mock of TypeSafe's /v1/systemone.
 */

describe('lint', () => {
  it('catches explicit words, profanity and slang as whole words only', () => {
    const r = lint('This is gonna be sooo lit lol, no cap. Porn is banned. What the fuck.');
    expect(r.explicit).toEqual(['porn']);
    expect(r.profanity).toEqual(['fuck']);
    expect(r.slang).toEqual(expect.arrayContaining(['gonna', 'lol', 'no cap']));
  });
  it('does not flag innocent words that contain a listed word', () => {
    const r = lint('Scunthorpe assesses the classic grassland; a document on the Sussex coast, cockpit design, hello.');
    expect(r).toEqual({ explicit: [], profanity: [], slang: [], slop: [] });
  });
  it('flags AI-slop phrasing', () => {
    expect(lint('Unlock the secrets of flight as we delve into the fascinating world of lift.').slop)
      .toEqual(expect.arrayContaining(['unlock the', 'delve', 'fascinating world']));
  });
});

describe('moderation', () => {
  it('blocks unsafe content but only holds quality doubts', () => {
    const unsafe = moderationFromReview({ publish: false, reasons: ['adult content (0.91)'], lint: lint(''), checkedWithJev: true });
    const doubt = moderationFromReview({ publish: false, reasons: ['low fact-check score (48)'], lint: lint(''), checkedWithJev: true });
    expect(unsafe).toMatchObject({ held: true, status: 'blocked' });
    expect(doubt).toMatchObject({ held: true, status: 'held' });
    expect(isBlocked({ isPublic: false, validationData: { moderation: unsafe } })).toBe(true);
    expect(isBlocked({ isPublic: false, validationData: { moderation: doubt } })).toBe(false);
    expect(isBlocked({ isPublic: true, validationData: { moderation: unsafe } })).toBe(false); // an admin approved it
  });
});

// -- Jev-backed checks --------------------------------------------------------------

let server: http.Server;
let answer: (q: Record<string, any>, state: any) => Record<string, unknown> = () => ({});
let calls = 0;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = ''; req.on('data', (c) => (raw += c)); req.on('end', () => {
      calls++;
      const b = JSON.parse(raw);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ model: 'jev', answers: answer(b.questions, b.state), usage: { input_tokens: 10, output_tokens: 0 } }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.TYPESAFE_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => { server.close(); delete process.env.TYPESAFE_API_KEY; delete process.env.TYPESAFE_BASE_URL; });
beforeEach(async () => {
  process.env.TYPESAFE_API_KEY = 'k';
  calls = 0;
  (await import('../jev')).resetJevClient();
});
const cat = (choice: string, confidence = 0.9) => ({ category: { type: 'choice', choice, confidence, probabilities: { [choice]: confidence } } });
const n = (p: number) => ({ type: 'noul', noul: p });

describe('checkRequest', () => {
  it('blocks explicit words instantly, without calling Jev', async () => {
    const { checkRequest } = await import('../safety');
    expect(await checkRequest('free porn videos')).toMatchObject({ allowed: false, category: 'sexual' });
    expect(calls).toBe(0);
  });
  it('allows sensitive-but-educational subjects', async () => {
    answer = () => cat('safe', 0.95);
    const { checkRequest } = await import('../safety');
    expect(await checkRequest('how alcohol affects the body')).toEqual({ allowed: true });
  });
  it('blocks harmful requests when Jev is fairly sure, not on a guess', async () => {
    const { checkRequest } = await import('../safety');
    answer = () => cat('violence_howto', 0.85);
    expect(await checkRequest('how to build a pipe bomb')).toMatchObject({ allowed: false, category: 'violence_howto' });
    answer = () => cat('drugs_howto', 0.3);
    expect(await checkRequest('how caffeine works in energy drinks')).toEqual({ allowed: true });
  });
  it('adds a kids suitability check for Kids lessons', async () => {
    const { checkRequest } = await import('../safety');
    answer = (q) => { expect(q).toHaveProperty('kid_ok'); return { ...cat('safe'), kid_ok: n(0.1) }; };
    expect(await checkRequest('the history of torture devices', { level: 'kid' })).toMatchObject({ allowed: false, category: 'not_for_kids' });
  });
  it('fails open to the other layers when Jev is off', async () => {
    delete process.env.TYPESAFE_API_KEY;
    const { checkRequest } = await import('../safety');
    expect(await checkRequest('how volcanoes work')).toEqual({ allowed: true });
  });
});

describe('reviewLesson', () => {
  const lesson = {
    title: 'How Volcanoes Work', level: 'kid' as const, description: 'Why mountains can erupt.',
    principles: [{ title: 'Hot rock rises', explanation: 'Deep underground the rock is so hot it melts.', analogy: 'Like a shaken fizzy drink.', keyTakeaways: ['Magma rises'] }],
    practicalSteps: [], confidenceScore: 88,
  };
  const clean = { adult: n(0.01), graphic: n(0.02), crude: n(0.01), dangerous: n(0.02), kid_ok: n(0.95) };

  it('publishes a clean, well-checked lesson', async () => {
    answer = () => clean;
    const { reviewLesson } = await import('../safety');
    expect(await reviewLesson(lesson)).toMatchObject({ publish: true, reasons: [], checkedWithJev: true });
  });
  it('holds graphic content and names the reason', async () => {
    answer = () => ({ ...clean, graphic: n(0.8) });
    const { reviewLesson } = await import('../safety');
    const r = await reviewLesson(lesson);
    expect(r.publish).toBe(false);
    expect(r.reasons[0]).toMatch(/graphic or frightening detail/);
  });
  it('holds a Kids lesson that may not suit 6-12-year-olds', async () => {
    answer = () => ({ ...clean, kid_ok: n(0.3) });
    const { reviewLesson } = await import('../safety');
    expect((await reviewLesson(lesson)).reasons).toEqual([expect.stringMatching(/may not suit ages 6-12/)]);
  });
  it('holds a low fact-check score even without Jev', async () => {
    delete process.env.TYPESAFE_API_KEY;
    const { reviewLesson } = await import('../safety');
    expect(await reviewLesson({ ...lesson, confidenceScore: 45 })).toMatchObject({ publish: false, reasons: ['low fact-check score (45)'], checkedWithJev: false });
  });
  it('holds profanity found by the word list even if the model misses it', async () => {
    answer = () => clean;
    const { reviewLesson } = await import('../safety');
    const r = await reviewLesson({ ...lesson, principles: [{ ...lesson.principles[0], explanation: 'This shit is hot.' }] });
    expect(r.publish).toBe(false);
    expect(r.reasons).toContain('profanity: shit');
  });
});
