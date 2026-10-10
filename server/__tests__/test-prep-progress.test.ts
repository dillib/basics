import { describe, it, expect } from 'vitest';
import { readiness, type Progress } from '../../client/src/lib/testPrepProgress';
import type { ClientSet } from '@shared/test-prep';

const set: ClientSet = {
  id: 's', status: 'ready', level: 'teen', images: [], flagged: [], unavailable: [],
  questions: [
    { id: 'q1', n: 1, stem: 'a', type: 'numeric', options: [], conceptId: 'c1' },
    { id: 'q2', n: 2, stem: 'b', type: 'mc', options: ['x', 'y'], conceptId: 'c1' },
    { id: 'p1_1', n: 1, stem: 'c', type: 'numeric', options: [], conceptId: 'c1', practice: true },
    { id: 'q3', n: 3, stem: 'd', type: 'open', options: [], conceptId: 'c2' },
  ],
  concepts: [
    { id: 'c1', title: 'Fractions', questionIds: ['q1', 'q2'], practiceIds: ['p1_1'] },
    { id: 'c2', title: 'Explaining', questionIds: ['q3'], practiceIds: [] },
  ],
};
const right = { tries: 1, correct: true, revealed: false, hintsUsed: 0 };
const ready = (p: Progress) => Object.fromEntries(readiness(set, p).map((r) => [r.conceptId, r.ready]));

describe('readiness', () => {
  it('is ready when every own question is right without a reveal', () => {
    expect(ready({ q1: right, q2: right }).c1).toBe(true);
  });

  it('is not ready when an answer was revealed', () => {
    expect(ready({ q1: right, q2: { ...right, revealed: true } }).c1).toBe(false);
  });

  it('is not ready when an attempted practice question is wrong', () => {
    expect(ready({ q1: right, q2: right, p1_1: { ...right, correct: false } }).c1).toBe(false);
  });

  it('is not ready when a question has not been tried', () => {
    expect(ready({ q1: right }).c1).toBe(false);
  });

  it('counts an attempted open question as done', () => {
    expect(ready({ q3: { tries: 1, correct: null, revealed: false, hintsUsed: 0 } }).c2).toBe(true);
  });

  it('does not hold a concept back on a question we could not prepare', () => {
    expect(Object.fromEntries(readiness({ ...set, unavailable: ['q2'] }, { q1: right }).map((r) => [r.conceptId, r.ready])).c1).toBe(true);
  });

  it('keeps concept titles in order', () => {
    expect(readiness(set, {}).map((r) => r.title)).toEqual(['Fractions', 'Explaining']);
  });
});
