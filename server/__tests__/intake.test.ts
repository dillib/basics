import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';

/**
 * Search intake (server/intake.ts) against a local mock of TypeSafe's
 * POST /v1/systemone -- the real SDK, real HTTP, no spend. Each test sets how
 * the fake Jev answers and checks the decision the search box receives.
 */

const lessons = [
  { slug: 'how-airplanes-fly', title: 'How Airplanes Fly', description: 'Lift, thrust, drag.', category: 'Physics', level: 'adult' },
  { slug: 'how-inflation-works', title: 'How Inflation Works', description: 'Why prices rise.', category: 'Finance', level: 'adult' },
  { slug: 'how-photosynthesis-works-kid', title: 'How Photosynthesis Works', description: 'Plants make food.', category: 'Biology', level: 'kid' },
];
const recorded: string[] = [];
vi.mock('../storage', () => ({
  storage: {
    getPublicTopics: async () => lessons,
    recordIntake: async (a: string) => { recorded.push(a); },
  },
}));
const clarifyMock = vi.fn(async () => ({ question: 'Which Mercury do you mean?', options: ['The planet Mercury', 'The element mercury', 'Mercury, the Roman god'] }));
vi.mock('../ai', () => ({ suggestClarifications: (...a: unknown[]) => clarifyMock(...(a as [])) }));

type Answers = Record<string, unknown>;
const ch = (choice: string, confidence = 0.95, extra: Record<string, number> = {}) =>
  ({ type: 'choice', choice, confidence, probabilities: { [choice]: confidence, ...extra } });
const sc = (score: number, confidence = 0.9) => ({ type: 'score', score, confidence, legend: {}, probabilities: {} });
const nl = (p: number) => ({ type: 'noul', noul: p });

let server: http.Server;
let requests: { body: any; auth?: string }[] = [];
let respond: (body: any) => { status?: number; answers?: Answers } = () => ({ answers: {} });

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = JSON.parse(raw || '{}');
      requests.push({ body, auth: req.headers.authorization });
      const r = respond(body);
      res.writeHead(r.status ?? 200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(r.status && r.status >= 400 ? { error: { message: 'nope' } } : { model: 'jev-1.13', answers: r.answers, usage: { input_tokens: 1234, output_tokens: 0 } }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.TYPESAFE_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => { server.close(); delete process.env.TYPESAFE_BASE_URL; delete process.env.TYPESAFE_API_KEY; });

async function load() {
  const jev = await import('../jev');
  jev.resetJevClient();
  const intake = await import('../intake');
  intake.invalidateLibrary();
  return intake;
}

/** A fake Jev: intake answers by default, verify answers for the second call. */
function jev(intake: Answers, verify?: number) {
  respond = (body) => (body.questions.same ? { answers: { same: nl(verify ?? 0) } } : { answers: intake });
}
const clearNew = { intent: ch('learn_topic'), clarity: sc(3), ambiguity: ch('clear'), level: ch('unspecified'), framing: ch('why_it_works'), match: ch('none') };

beforeEach(() => {
  requests = [];
  recorded.length = 0;
  clarifyMock.mockClear();
  process.env.TYPESAFE_API_KEY = 'test-key';
});

describe('decideIntake', () => {
  it('falls back to "create" with no key, without calling Jev', async () => {
    delete process.env.TYPESAFE_API_KEY;
    const { decideIntake } = await load();
    expect(await decideIntake('how do planes fly')).toEqual({ action: 'create', source: 'fallback' });
    expect(requests).toHaveLength(0);
  });

  it('asks every question in ONE call, with the library as choice options', async () => {
    jev({ ...clearNew });
    const { decideIntake } = await load();
    await decideIntake('how do vaccines work');
    expect(requests).toHaveLength(1);
    const { body, auth } = requests[0];
    expect(auth).toBe('Bearer test-key');
    expect(body.model).toBe('jev-latest');
    expect(body.state.query).toBe('how do vaccines work');
    expect(Object.keys(body.questions).sort()).toEqual(['ambiguity', 'clarity', 'framing', 'intent', 'level', 'match']);
    expect(body.questions.match.type).toBe('choice');
    expect(Object.keys(body.questions.match.criteria)).toEqual(['none', 'how-airplanes-fly', 'how-inflation-works', 'how-photosynthesis-works-kid']);
    expect(body.questions.clarity.type).toBe('score');
    expect(body.questions.clarity.criteria).toHaveLength(4);
  });

  it('sends the reader to an existing lesson only after a verified match', async () => {
    jev({ ...clearNew, match: ch('how-airplanes-fly', 0.7) }, 0.93);
    const { decideIntake } = await load();
    const d = await decideIntake('how do planes fly');
    expect(d).toMatchObject({ action: 'open_lesson', lesson: { slug: 'how-airplanes-fly' } });
    expect(requests).toHaveLength(2); // intake + verify
    expect(requests[1].body.state.lesson.title).toBe('How Airplanes Fly');
  });

  it('only suggests (reader confirms) when verification is medium', async () => {
    jev({ ...clearNew, match: ch('how-inflation-works') }, 0.62);
    const { decideIntake } = await load();
    expect(await decideIntake('why do prices go up')).toMatchObject({ action: 'suggest_lesson', lesson: { slug: 'how-inflation-works' } });
  });

  it('ignores a match that fails verification and creates instead', async () => {
    jev({ ...clearNew, match: ch('how-inflation-works') }, 0.2);
    const { decideIntake } = await load();
    expect(await decideIntake('how deflation works')).toMatchObject({ action: 'create', source: 'jev' });
  });

  it('asks a follow-up when the query is ambiguous, but never twice', async () => {
    jev({ ...clearNew, clarity: sc(0), ambiguity: ch('ambiguous_name', 0.9) });
    const { decideIntake } = await load();
    const d = await decideIntake('mercury');
    expect(d).toMatchObject({ action: 'clarify', kind: 'ambiguous_name', question: 'Which Mercury do you mean?' });
    expect((d as any).options).toHaveLength(3);
    expect(clarifyMock).toHaveBeenCalledWith('mercury', 'ambiguous_name');
    expect(await decideIntake('mercury ', { clarified: true })).toMatchObject({ action: 'create' });
  });

  it('turns a specific problem into "which idea behind it?"', async () => {
    jev({ ...clearNew, intent: ch('specific_problem', 0.85) });
    const { decideIntake } = await load();
    expect(await decideIntake('solve 2x+3=7')).toMatchObject({ action: 'clarify', kind: 'underlying_concept' });
  });

  it('proceeds as typed if the follow-up options cannot be written', async () => {
    clarifyMock.mockResolvedValueOnce(null as any);
    jev({ ...clearNew, clarity: sc(0), ambiguity: ch('too_broad', 0.9) });
    const { decideIntake } = await load();
    expect(await decideIntake('physics')).toMatchObject({ action: 'create', source: 'jev' });
  });

  it('rejects gibberish and harmful requests when Jev is fairly sure', async () => {
    jev({ ...clearNew, intent: ch('gibberish', 0.9) });
    let { decideIntake } = await load();
    expect(await decideIntake('asdkjh qwe')).toMatchObject({ action: 'reject', reason: 'gibberish' });
    jev({ ...clearNew, intent: ch('harmful', 0.8) });
    ({ decideIntake } = await load());
    expect(await decideIntake('how to hurt someone')).toMatchObject({ action: 'reject', reason: 'harmful' });
  });

  it('does not reject on low confidence', async () => {
    jev({ ...clearNew, intent: ch('gibberish', 0.3) });
    const { decideIntake } = await load();
    expect(await decideIntake('qubit')).toMatchObject({ action: 'create' });
  });

  it('points site questions to the Help Center only when confident', async () => {
    jev({ ...clearNew, intent: ch('site_help', 0.92) });
    const { decideIntake } = await load();
    expect(await decideIntake('how do i sign in')).toEqual({ action: 'site_help', href: '/help' });
  });

  it('passes on the audience level and practical framing it noticed', async () => {
    jev({ ...clearNew, level: ch('kid', 0.9), framing: ch('how_to', 0.8) });
    const { decideIntake } = await load();
    expect(await decideIntake('how to save money for my 8 year old')).toEqual({ action: 'create', source: 'jev', level: 'kid', levelTier: 'high', framing: 'how_to' });
  });

  it('falls back on a 401 without breaking the search', async () => {
    respond = () => ({ status: 401 });
    const { decideIntake } = await load();
    expect(await decideIntake('how do magnets work')).toEqual({ action: 'create', source: 'fallback' });
  });
});

describe('duplicate guard + suggestions', () => {
  it('finds the same subject at the same level only with strong verification', async () => {
    jev({ match: ch('how-airplanes-fly') }, 0.9);
    let { findExistingLesson } = await load();
    expect((await findExistingLesson('How Planes Stay in the Air', 'adult'))?.slug).toBe('how-airplanes-fly');
    expect(requests[0].body.questions.match.criteria).not.toHaveProperty('how-photosynthesis-works-kid'); // other level excluded
    jev({ match: ch('how-airplanes-fly') }, 0.7);
    ({ findExistingLesson } = await load());
    expect(await findExistingLesson('How Birds Fly', 'adult')).toBeNull();
  });

  it('ranks meaning matches above a probability floor', async () => {
    respond = () => ({ answers: { match: { type: 'choice', choice: 'how-inflation-works', confidence: 0.6, probabilities: { 'how-inflation-works': 0.62, 'how-airplanes-fly': 0.05, none: 0.33 } } } });
    const { semanticSuggestions } = await load();
    expect((await semanticSuggestions('why are things getting expensive')).map((l) => l.slug)).toEqual(['how-inflation-works']);
  });

  it('caps choice options at 254 lessons + none, preferring word overlaps', async () => {
    const { matchCriteria } = await load();
    const many = Array.from({ length: 300 }, (_, i) => ({ slug: `t${i}`, title: i === 299 ? 'How Magnets Work' : `Topic ${i}`, description: null, category: null, level: 'adult' }));
    const c = matchCriteria(many, 'magnets');
    expect(Object.keys(c)).toHaveLength(255);
    expect(c).toHaveProperty('t299');
  });
});
