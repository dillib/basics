import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateJSON = vi.fn();
vi.mock('../llm', () => ({ generateJSON: (...a: unknown[]) => generateJSON(...a) }));
vi.mock('../ai', () => ({ SYSTEM_INSTRUCTION_HEADER: 'RULES', LEVEL_GUIDANCE: { kid: 'KID', teen: 'TEEN', adult: 'ADULT' } }));

import { prepareConcept } from '../test-prep/prepare';
import { verifyKeys } from '../test-prep/verify';
import type { PrepConcept, PrepKey, PrepQuestion } from '@shared/test-prep';

const answer = (data: unknown) => async (_t: unknown, _r: unknown, parse: (v: unknown) => unknown) => {
  const parsed = parse(data);
  return parsed == null ? null : { data: parsed, provider: 'mercury', ms: 1 };
};

const numericQ: PrepQuestion = { id: 'q1', n: 1, stem: 'Write 3/4 as a decimal.', type: 'numeric', options: [] };
const mcQ: PrepQuestion = { id: 'q2', n: 2, stem: 'Which is prime?', type: 'mc', options: ['4', '7', '9'] };
const openQ: PrepQuestion = { id: 'q3', n: 3, stem: 'Explain why.', type: 'open', options: [] };
const concept: PrepConcept = { id: 'c2', title: 'Fractions', questionIds: ['q1'], practiceIds: [] };
const key = (a: string): PrepKey => ({ answer: a, explanation: 'e', hints: ['h1', 'h2'], verified: false });

const prepared = {
  card: { whatToKnow: 'A fraction is a division.', workedExample: '1/2 = 0.5' },
  answers: [{ id: 'q1', answer: '0.75', explanation: '3 divided by 4.', hints: ['Divide.', 'Top by bottom.'] }],
  practice: [
    { stem: 'Write 1/4 as a decimal.', type: 'numeric', options: [], answer: '0.25', explanation: '1 divided by 4.', hints: ['Divide.', '1 by 4.'] },
    { stem: 'Write 1/2 as a decimal.', type: 'numeric', options: [], answer: '0.5', explanation: '1 divided by 2.', hints: ['Divide.', '1 by 2.'] },
  ],
};

describe('prepareConcept', () => {
  beforeEach(() => { generateJSON.mockReset(); });

  it('turns on thinking for numeric questions and numbers practice by concept', async () => {
    generateJSON.mockImplementation(answer(prepared));
    const r = await prepareConcept(concept, [numericQ], 'teen', []);
    expect(generateJSON.mock.calls[0][0]).toBe('test_prep_prepare');
    expect(generateJSON.mock.calls[0][1].thinking).toBe(true);
    expect(r!.card!.whatToKnow).toBe('A fraction is a division.');
    expect(r!.keys.q1.answer).toBe('0.75');
    expect(r!.practice.map((p) => p.id)).toEqual(['p2_1', 'p2_2']);
    expect(r!.practice.every((p) => p.practice && p.conceptId === 'c2')).toBe(true);
    expect(r!.practiceKeys.p2_1.answer).toBe('0.25');
  });

  it('writes at the concept level for the audience', async () => {
    generateJSON.mockImplementation(answer(prepared));
    await prepareConcept(concept, [numericQ], 'kid', []);
    expect(generateJSON.mock.calls[0][1].prompt).toContain('KID');
  });

  it('rejects generated text with profanity', async () => {
    generateJSON.mockImplementation(answer({ ...prepared, card: { whatToKnow: 'This shit is easy.', workedExample: 'x' } }));
    expect(await prepareConcept(concept, [numericQ], 'teen', [])).toBeNull();
  });
});

describe('verifyKeys', () => {
  beforeEach(() => { generateJSON.mockReset(); });

  it('flags a key the independent solve disagrees with', async () => {
    generateJSON.mockImplementation(answer({ answers: [{ id: 'q2', answer: '9', keyCorrect: true }] }));
    const out = await verifyKeys([mcQ], { q2: key('7') }, []);
    expect(out.q2.verified).toBe(false);
  });

  it('accepts an equal numeric answer in another form', async () => {
    generateJSON.mockImplementation(answer({ answers: [{ id: 'q1', answer: '3/4', keyCorrect: true }] }));
    const out = await verifyKeys([numericQ], { q1: key('0.75') }, []);
    expect(out.q1.verified).toBe(true);
  });

  it('marks every key unverified when no model answers', async () => {
    generateJSON.mockResolvedValue(null);
    const out = await verifyKeys([numericQ, mcQ], { q1: key('0.75'), q2: key('7') }, []);
    expect(out.q1.verified).toBe(false);
    expect(out.q2.verified).toBe(false);
  });

  it('judges an expression key directly instead of failing to compare', async () => {
    const exprQ: PrepQuestion = { id: 'q4', n: 4, stem: 'Simplify 2(x+1)+1', type: 'numeric', options: [] };
    generateJSON.mockImplementation(answer({ answers: [{ id: 'q4', answer: '3 + 2x', keyCorrect: true }] }));
    const out = await verifyKeys([exprQ], { q4: key('2x + 3') }, []);
    expect(out.q4.verified).toBe(true);
    expect(generateJSON.mock.calls[0][1].prompt).toContain('proposed key: 2x + 3');
  });

  it('leaves room for thinking in the output budget', async () => {
    generateJSON.mockImplementation(answer({ answers: [{ id: 'q1', answer: '0.75', keyCorrect: true }] }));
    await verifyKeys([numericQ], { q1: key('0.75') }, []);
    expect(generateJSON.mock.calls[0][1].thinking).toBe(true);
    expect(generateJSON.mock.calls[0][1].maxTokens).toBeGreaterThanOrEqual(6000);
  });

  it('treats open questions as verified without a model call', async () => {
    const out = await verifyKeys([openQ], { q3: key('covers X') }, []);
    expect(out.q3.verified).toBe(true);
    expect(generateJSON).not.toHaveBeenCalled();
  });
});
