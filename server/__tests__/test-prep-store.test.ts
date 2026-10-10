import { describe, it, expect } from 'vitest';
import { toClient, newSetId, summarizeSets, type StoredSet } from '../test-prep/store';

const stored: StoredSet = {
  id: 'abc', status: 'ready', level: 'teen', subject: 'math', inputText: 'q', images: ['data:image/jpeg;base64,AAAA'],
  data: {
    questions: [
      { id: 'q1', n: 1, stem: 'What is 3/4 as a decimal?', type: 'numeric', options: [] },
      { id: 'q2', n: 2, stem: 'Pick the prime', type: 'mc', options: ['4', '7', '9'] },
    ],
    concepts: [{ id: 'c1', title: 'Fractions', questionIds: ['q1', 'q2'], practiceIds: [], card: { whatToKnow: 'w', workedExample: 'e' } }],
    keys: {
      q1: { answer: 'SECRET-ANSWER-0.75', explanation: 'SECRET-EXPLANATION', hints: ['SECRET-HINT-1', 'SECRET-HINT-2'], verified: true },
      q2: { answer: 'SECRET-ANSWER-7', explanation: 'SECRET-EXPLANATION-2', hints: ['SECRET-HINT-3', 'SECRET-HINT-4'], verified: false },
    },
  },
  attempts: {}, createdAt: new Date(), updatedAt: new Date(),
};

describe('toClient', () => {
  it('never includes keys, answers, explanations or hints', () => {
    const json = JSON.stringify(toClient(stored));
    expect(json).not.toContain('SECRET');
    expect(toClient(stored)).not.toHaveProperty('keys');
  });

  it('flags questions whose key failed verification', () => {
    expect(toClient(stored).flagged).toEqual(['q2']);
  });

  it('carries questions, concepts and images', () => {
    const c = toClient(stored);
    expect(c.questions).toHaveLength(2);
    expect(c.concepts[0].title).toBe('Fractions');
    expect(c.images).toEqual(['data:image/jpeg;base64,AAAA']);
  });
});

describe('summarizeSets', () => {
  it('measures engagement, reveals and readiness', () => {
    const data = {
      questions: [
        { id: 'q1', n: 1, stem: 'a', type: 'numeric' as const, options: [], conceptId: 'c1' },
        { id: 'q2', n: 2, stem: 'b', type: 'numeric' as const, options: [], conceptId: 'c1' },
        { id: 'q3', n: 3, stem: 'c', type: 'numeric' as const, options: [], conceptId: 'c2' },
        { id: 'p1_1', n: 1, stem: 'p', type: 'numeric' as const, options: [], conceptId: 'c1', practice: true },
      ],
      concepts: [
        { id: 'c1', title: 'A', questionIds: ['q1', 'q2'], practiceIds: ['p1_1'] },
        { id: 'c2', title: 'B', questionIds: ['q3'], practiceIds: [] },
      ],
      keys: {},
    };
    const s = summarizeSets([
      { data, attempts: { q1: { tries: 1, correct: true, revealed: false }, q2: { tries: 2, correct: true, revealed: false }, q3: { tries: 1, correct: false, revealed: true } } },
      { data, attempts: {} },
    ]);
    expect(s).toEqual({ sets: 2, avgQuestions: 3, attemptedPct: 50, revealedPct: 33, readyPct: 25 });
  });

  it('handles no sets', () => {
    expect(summarizeSets([])).toEqual({ sets: 0, avgQuestions: 0, attemptedPct: 0, revealedPct: 0, readyPct: 0 });
  });
});

describe('newSetId', () => {
  it('is long, URL-safe and unique', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newSetId()));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{22,}$/);
  });
});
