import { describe, it, expect } from 'vitest';
import { adviceKind, ADVICE_NOTE } from '@shared/advice';
import { refreshPriority } from '../refresh-priority';

describe('adviceKind', () => {
  it('recognises health and money lessons by whole slug words', () => {
    expect(adviceKind('how-the-heart-works')).toBe('health');
    expect(adviceKind('how-blood-pressure-works')).toBe('health');
    expect(adviceKind('how-mortgages-work')).toBe('money');
    expect(adviceKind('how-index-funds-work')).toBe('money');
    expect(adviceKind('personal-finance-101')).toBe('money');
  });
  it('leaves other lessons alone', () => {
    for (const s of ['how-photosynthesis-works', 'how-bridges-stay-up', 'how-the-brain-works', 'what-is-an-index', 'how-painting-works', 'how-marketing-works']) {
      expect(adviceKind(s)).toBeNull();
    }
  });
  it('has a note for each kind', () => {
    expect(ADVICE_NOTE.health).toMatch(/isn't medical advice/);
    expect(ADVICE_NOTE.money).toMatch(/isn't financial advice/);
  });
});

describe('refreshPriority', () => {
  const now = Date.parse('2026-09-28T00:00:00Z');
  const day = 86_400_000;
  const t = (slug: string, daysAgo: number, sources = 0) => ({ slug, updatedAt: new Date(now - daysAgo * day), createdAt: null, validationData: sources ? { sources: Array(sources).fill({}) } : null });
  it('does unsourced health/money first, then unsourced, then oldest; skips recent', () => {
    const picked = refreshPriority([
      t('how-bridges-stay-up', 90, 3),
      t('how-tides-work', 60),
      t('how-mortgages-work', 50),
      t('how-the-heart-works', 100, 5),
      t('how-vaccines-work', 10),          // updated recently: skipped
      t('how-magnets-work', 200),
    ], 5, { now });
    expect(picked.map((x) => x.slug)).toEqual(['how-mortgages-work', 'how-magnets-work', 'how-tides-work', 'how-the-heart-works', 'how-bridges-stay-up']);
  });
  it('respects the batch size', () => {
    expect(refreshPriority([t('a', 100), t('b', 100), t('c', 100)], 2, { now })).toHaveLength(2);
  });
});
