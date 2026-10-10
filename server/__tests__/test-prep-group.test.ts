import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateJSON = vi.fn();
const findExistingLesson = vi.fn();
vi.mock('../llm', () => ({ generateJSON: (...a: unknown[]) => generateJSON(...a) }));
vi.mock('../intake', () => ({ findExistingLesson: (...a: unknown[]) => findExistingLesson(...a) }));

import { assignAll, groupConcepts } from '../test-prep/group';
import type { PrepQuestion } from '@shared/test-prep';

const qs: PrepQuestion[] = ['q1', 'q2', 'q3', 'q4'].map((id, i) => ({ id, n: i + 1, stem: `Question ${i + 1}`, type: 'short', options: [] }));

describe('assignAll', () => {
  it('puts every real question in exactly one concept', () => {
    const out = assignAll([
      { id: 'c1', title: 'Ratios', questionIds: ['q1', 'q2', 'q2', 'q9'], practiceIds: [] },
      { id: 'c2', title: 'Percent', questionIds: ['q3', 'q1'], practiceIds: [] },
    ], ['q1', 'q2', 'q3', 'q4']);
    const all = out.flatMap((c) => c.questionIds).sort();
    expect(all).toEqual(['q1', 'q2', 'q3', 'q4']);
  });

  it('drops concepts left empty', () => {
    const out = assignAll([
      { id: 'c1', title: 'A', questionIds: ['q1'], practiceIds: [] },
      { id: 'c2', title: 'B', questionIds: ['q9'], practiceIds: [] },
    ], ['q1']);
    expect(out.map((c) => c.id)).toEqual(['c1']);
  });
});

describe('groupConcepts', () => {
  beforeEach(() => { generateJSON.mockReset(); findExistingLesson.mockReset(); findExistingLesson.mockResolvedValue(null); });

  it('falls back to one concept holding every question when no model answers', async () => {
    generateJSON.mockResolvedValue(null);
    const out = await groupConcepts(qs, 'teen', 'Math');
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Math');
    expect(out[0].questionIds).toEqual(['q1', 'q2', 'q3', 'q4']);
  });

  it('links a concept to a matching lesson', async () => {
    generateJSON.mockImplementation(async (_t: unknown, _r: unknown, parse: (v: unknown) => unknown) => ({
      data: parse({ concepts: [{ title: 'Ratios', questionIds: ['q1', 'q2'] }, { title: 'Percent change', questionIds: ['q3', 'q4'] }] }),
      provider: 'mercury', ms: 1,
    }));
    findExistingLesson.mockImplementation(async (title: string) => (title === 'Ratios' ? { slug: 'how-ratios-work-teens', title: 'How Ratios Work' } : null));
    const out = await groupConcepts(qs, 'teen');
    expect(out.map((c) => c.title)).toEqual(['Ratios', 'Percent change']);
    expect(out[0].lessonSlug).toBe('how-ratios-work-teens');
    expect(out[1].lessonSlug).toBeUndefined();
    expect(out.every((c) => c.practiceIds.length === 0)).toBe(true);
    expect(generateJSON.mock.calls[0][0]).toBe('test_prep_group');
  });
});
