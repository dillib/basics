import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateJSON = vi.fn();
vi.mock('../llm', () => ({ generateJSON: (...a: unknown[]) => generateJSON(...a) }));

import { sameAnswer } from '../test-prep/answers';
import { gradeAttempt } from '../test-prep/grade';
import type { PrepKey, PrepQuestion } from '@shared/test-prep';

describe('sameAnswer: numeric', () => {
  it.each([
    ['3/4', '0.75'], ['.75', '0.75'], ['0.75', '3/4'], ['x = 4', '4'], ['4 cm', '4'], ['1,200', '1200'], ['-2.5', '-5/2'], ['50%', '50'],
  ])('%s equals %s', (a, b) => expect(sameAnswer('numeric', a, b)).toBe(true));

  it.each([['0.7', '0.75'], ['4', '-4'], ['', '0'], ['abc', '4']])('%s differs from %s', (a, b) => expect(sameAnswer('numeric', a, b)).toBe(false));

  // Review finding: real 8th-grade answers that were marked wrong.
  it.each([
    ['$4.50', '$4.50'], ['$4.50', '4.5'], ['4 cm²', '4'], ['12 cm^2', '12'], ['1 1/2', '1.5'], ['−5', '-5'], ['€3', '3'],
    ['2x+3', '2x + 3'], ['x = 3, y = 2', 'x=3, y=2'],
  ])('%s equals %s', (a, b) => expect(sameAnswer('numeric', a, b)).toBe(true));
  it('still tells different expressions apart', () => expect(sameAnswer('numeric', '2x+3', '2x+4')).toBe(false));
});

describe('sameAnswer: multiple choice', () => {
  const options = ['8 cm', '12 cm', '16 cm'];
  it.each(['b', 'B', 'B)', '(b)', 'b.', '12 cm', ' 12 CM '])('accepts %s for 12 cm', (a) => expect(sameAnswer('mc', a, '12 cm', options)).toBe(true));
  it.each(['c', 'a', '16 cm', ''])('rejects %s', (a) => expect(sameAnswer('mc', a, '12 cm', options)).toBe(false));
  it('accepts a key stored as a letter', () => expect(sameAnswer('mc', '12 cm', 'B', options)).toBe(true));
});

describe('sameAnswer: true/false, short, open', () => {
  it('maps T/yes to true', () => {
    expect(sameAnswer('tf', 'T', 'True')).toBe(true);
    expect(sameAnswer('tf', 'yes', 'true')).toBe(true);
    expect(sameAnswer('tf', 'F', 'True')).toBe(false);
  });
  it('matches short answers ignoring case, spaces and punctuation', () => {
    expect(sameAnswer('short', ' Photosynthesis. ', 'photosynthesis')).toBe(true);
    expect(sameAnswer('short', 'respiration', 'photosynthesis')).toBe(false);
  });
  it('never matches open answers', () => expect(sameAnswer('open', 'a', 'a')).toBe(false));
});

describe('gradeAttempt', () => {
  const key: PrepKey = { answer: 'Chlorophyll absorbs light', explanation: 'Because…', hints: ['h1', 'h2'], verified: true };
  const q = (type: PrepQuestion['type']): PrepQuestion => ({ id: 'q1', n: 1, stem: 's', type, options: type === 'mc' ? ['a', 'b'] : [] });
  beforeEach(() => { generateJSON.mockReset(); });

  it('gives open questions feedback, never right or wrong', async () => {
    const r = await gradeAttempt(q('open'), key, 'Plants use sunlight');
    expect(r.correct).toBeNull();
    expect(r.explanation).toContain('Chlorophyll absorbs light');
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it('grades numeric deterministically without a model call', async () => {
    const r = await gradeAttempt(q('numeric'), { ...key, answer: '0.75' }, '3/4');
    expect(r).toEqual({ correct: true, explanation: 'Because…' });
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it('asks the model only when a short answer is not an exact match', async () => {
    generateJSON.mockImplementation(async (_t: unknown, _r: unknown, parse: (v: unknown) => unknown) => ({ data: parse({ correct: true, reason: 'Same idea.' }), provider: 'mercury', ms: 1 }));
    const r = await gradeAttempt(q('short'), key, 'the green pigment takes in light');
    expect(r.correct).toBe(true);
    expect(generateJSON.mock.calls[0][0]).toBe('test_prep_grade');
  });

  it('asks the model when a numeric answer is an expression that does not match exactly', async () => {
    generateJSON.mockImplementation(async (_t: unknown, _r: unknown, parse: (v: unknown) => unknown) => ({ data: parse({ correct: true, reason: 'Same expression.' }), provider: 'mercury', ms: 1 }));
    const r = await gradeAttempt(q('numeric'), { ...key, answer: '3 + 2x' }, '2x + 3');
    expect(r.correct).toBe(true);
    expect(generateJSON.mock.calls[0][0]).toBe('test_prep_grade');
  });

  it('marks a short answer wrong when no model answers', async () => {
    generateJSON.mockResolvedValue(null);
    expect((await gradeAttempt(q('short'), key, 'mitochondria')).correct).toBe(false);
  });
});
