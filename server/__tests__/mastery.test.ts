import { describe, it, expect } from 'vitest';
import { computeMonthlyMasteryStats, currentMonthRange, type UserMasteryCount } from '../mastery';

describe('computeMonthlyMasteryStats', () => {
  it('returns zeroed stats with no percentile when nobody has mastered anything', () => {
    const result = computeMonthlyMasteryStats([], 'user-1');
    expect(result).toEqual({ masteredThisMonth: 0, totalActiveLearners: 0, percentile: null });
  });

  it('never shows a percentile for a user who has mastered nothing this month, even if others have', () => {
    const counts: UserMasteryCount[] = [
      { userId: 'user-1', count: 0 },
      { userId: 'user-2', count: 4 },
      { userId: 'user-3', count: 2 },
      { userId: 'user-4', count: 1 },
      { userId: 'user-5', count: 6 },
    ];
    const result = computeMonthlyMasteryStats(counts, 'user-1');
    expect(result.masteredThisMonth).toBe(0);
    expect(result.percentile).toBeNull();
  });

  it('hides the percentile below the minimum cohort size, even for a real achiever', () => {
    // Only 3 active learners this month -- too small a cohort for a
    // percentile claim to mean anything ("ahead of 100%" when you're 1 of 3
    // reads as hollow, not motivating).
    const counts: UserMasteryCount[] = [
      { userId: 'user-1', count: 3 },
      { userId: 'user-2', count: 1 },
      { userId: 'user-3', count: 2 },
    ];
    const result = computeMonthlyMasteryStats(counts, 'user-1');
    expect(result.masteredThisMonth).toBe(3);
    expect(result.totalActiveLearners).toBe(3);
    expect(result.percentile).toBeNull();
  });

  it('computes a percentile once the cohort reaches the minimum size', () => {
    const counts: UserMasteryCount[] = [
      { userId: 'a', count: 5 },
      { userId: 'b', count: 3 },
      { userId: 'c', count: 3 },
      { userId: 'd', count: 1 },
      { userId: 'e', count: 2 },
    ];

    expect(computeMonthlyMasteryStats(counts, 'a').percentile).toBe(100); // top of the pack
    expect(computeMonthlyMasteryStats(counts, 'b').percentile).toBe(80); // tied with c, ahead of d and e
    expect(computeMonthlyMasteryStats(counts, 'd').percentile).toBe(20); // lowest of the five
  });

  it('counts ties correctly instead of only exact matches', () => {
    const counts: UserMasteryCount[] = [
      { userId: 'a', count: 2 },
      { userId: 'b', count: 2 },
      { userId: 'c', count: 2 },
      { userId: 'd', count: 2 },
      { userId: 'e', count: 2 },
    ];
    // Everyone tied -- everyone is "at or below" everyone else, so everyone
    // reads as 100th percentile. That's correct: nobody is behind anyone.
    expect(computeMonthlyMasteryStats(counts, 'c').percentile).toBe(100);
  });

  it('returns 0 mastered for a user with no row in the counts at all', () => {
    const counts: UserMasteryCount[] = [
      { userId: 'a', count: 5 },
      { userId: 'b', count: 3 },
      { userId: 'c', count: 3 },
      { userId: 'd', count: 1 },
      { userId: 'e', count: 2 },
    ];
    const result = computeMonthlyMasteryStats(counts, 'never-mastered-anything');
    expect(result.masteredThisMonth).toBe(0);
    expect(result.percentile).toBeNull();
    expect(result.totalActiveLearners).toBe(5);
  });
});

describe('currentMonthRange', () => {
  it('returns the first-of-month UTC boundaries for a mid-month date', () => {
    const { start, end } = currentMonthRange(new Date(Date.UTC(2026, 7, 15, 12, 30)));
    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('rolls over the year correctly for December', () => {
    const { start, end } = currentMonthRange(new Date(Date.UTC(2026, 11, 25)));
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
