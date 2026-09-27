import { describe, it, expect } from 'vitest';
import { selectHealCandidates, acceptRewrite, type HealThresholds } from '../self-heal';
import { parseTriage } from '../ai';
import { TopicFeedbackSchema } from '../validation';
import type { TopicFeedbackStats } from '../storage';

const T: HealThresholds = { minDownPeople: 3, minDownShare: 0.5, minFactReports: 2, cooldownDays: 7 };
const NOW = new Date('2026-09-27T12:00:00Z');

function stats(over: Partial<TopicFeedbackStats> = {}): TopicFeedbackStats {
  return {
    topicId: 't1', title: 'Topic', slug: 'topic', level: 'adult', isTrending: false,
    confidenceScore: 90, contentVersion: 1, up: 0, down: 0, downPeople: 0,
    reasons: { inaccurate: 0, outdated: 0, confusing: 0, too_basic: 0, too_advanced: 0 },
    comments: 0, views7d: 0, lastFeedbackAt: null, lastReplacedAt: null,
    ...over,
  };
}

describe('selectHealCandidates', () => {
  it('ignores lessons without enough complaints', () => {
    expect(selectHealCandidates([stats({ up: 10, down: 2, downPeople: 2 })], T, NOW)).toHaveLength(0);
  });

  it('picks a lesson when enough distinct people say not helpful and they are the majority', () => {
    const [c] = selectHealCandidates([stats({ up: 2, down: 4, downPeople: 3 })], T, NOW);
    expect(c.trigger).toContain('4 of 6 readers said not helpful');
  });

  it('does not let one person with many browsers force a review', () => {
    expect(selectHealCandidates([stats({ down: 6, downPeople: 1 })], T, NOW)).toHaveLength(0);
  });

  it('does not pick a well-liked lesson just because many people read it', () => {
    expect(selectHealCandidates([stats({ up: 40, down: 5, downPeople: 5 })], T, NOW)).toHaveLength(0);
  });

  it('picks repeated inaccurate/outdated reports even when most votes are positive', () => {
    const [c] = selectHealCandidates(
      [stats({ up: 30, down: 2, downPeople: 2, reasons: { inaccurate: 1, outdated: 1, confusing: 0, too_basic: 0, too_advanced: 0 } })],
      T, NOW,
    );
    expect(c.trigger).toContain('2 reported inaccurate/outdated');
  });

  it('respects the cooldown after a rewrite', () => {
    const recent = stats({ down: 5, downPeople: 5, lastReplacedAt: new Date('2026-09-24T12:00:00Z') });
    const old = stats({ down: 5, downPeople: 5, lastReplacedAt: new Date('2026-09-01T12:00:00Z') });
    expect(selectHealCandidates([recent], T, NOW)).toHaveLength(0);
    expect(selectHealCandidates([old], T, NOW)).toHaveLength(1);
  });

  it('puts factual problems on busy lessons first', () => {
    const facts = { inaccurate: 3, outdated: 0, confusing: 0, too_basic: 0, too_advanced: 0 };
    const out = selectHealCandidates([
      stats({ topicId: 'quiet', down: 3, downPeople: 3 }),
      stats({ topicId: 'wrong-facts', down: 3, downPeople: 3, reasons: facts, views7d: 500 }),
    ], T, NOW);
    expect(out.map((c) => c.stats.topicId)).toEqual(['wrong-facts', 'quiet']);
  });
});

describe('acceptRewrite', () => {
  it('keeps a rewrite that scores at least about as well', () => {
    expect(acceptRewrite(90, 92)).toBe(true);
    expect(acceptRewrite(90, 86)).toBe(true);
    expect(acceptRewrite(null, 80)).toBe(true);
  });
  it('rejects a rewrite that scores clearly worse or below the floor', () => {
    expect(acceptRewrite(90, 80)).toBe(false);
    expect(acceptRewrite(null, 60)).toBe(false);
  });
});

describe('parseTriage', () => {
  it('reads a regenerate decision with fixes', () => {
    const t = parseTriage(JSON.stringify({ decision: 'regenerate', reason: 'Launch date is wrong.', fixNotes: '- Launch was Sept 8, 2026' }));
    expect(t).toEqual({ decision: 'regenerate', reason: 'Launch date is wrong.', fixNotes: '- Launch was Sept 8, 2026' });
  });
  it('treats regenerate without concrete fixes as ignore', () => {
    expect(parseTriage(JSON.stringify({ decision: 'regenerate', reason: 'Readers unhappy', fixNotes: '' })).decision).toBe('ignore');
  });
  it('treats unknown or unreadable output as ignore (never churns content)', () => {
    expect(parseTriage('not json').decision).toBe('ignore');
    expect(parseTriage(JSON.stringify({ decision: 'delete everything' })).decision).toBe('ignore');
  });
});

describe('TopicFeedbackSchema', () => {
  it('accepts a vote with reasons and a comment', () => {
    expect(TopicFeedbackSchema.safeParse({ vote: -1, reasons: ['outdated'], comment: 'Date is wrong', visitorId: 'abc12345-xyz' }).success).toBe(true);
  });
  it('rejects anything but +1/-1, unknown reasons, long comments, and odd visitor ids', () => {
    expect(TopicFeedbackSchema.safeParse({ vote: 5, visitorId: 'abc12345' }).success).toBe(false);
    expect(TopicFeedbackSchema.safeParse({ vote: -1, reasons: ['spam'], visitorId: 'abc12345' }).success).toBe(false);
    expect(TopicFeedbackSchema.safeParse({ vote: -1, comment: 'x'.repeat(1001), visitorId: 'abc12345' }).success).toBe(false);
    expect(TopicFeedbackSchema.safeParse({ vote: 1, visitorId: '<script>' }).success).toBe(false);
  });
});
