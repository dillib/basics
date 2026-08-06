/**
 * Private monthly mastery stats -- "you're ahead of X% of learners this
 * month," never a public leaderboard. A topic counts as mastered when its
 * progress row has completedAt set, which routes.ts already only does once
 * a quiz score clears config.quiz.passingScore (see /api/quiz/:quizId/complete).
 *
 * Kept as a pure function (no DB access) so the ranking math is unit
 * testable without a live database -- the storage layer only has to fetch
 * counts and hand them here.
 */

export interface UserMasteryCount {
  userId: string;
  count: number;
}

export interface MonthlyMasteryStats {
  masteredThisMonth: number;
  totalActiveLearners: number;
  /** null when there's no meaningful cohort to compare against yet. */
  percentile: number | null;
}

// Below this many active learners in the month, a percentile claim is more
// misleading than motivating (e.g. "ahead of 100% of learners" when you're
// the only one). Show the raw count instead until the cohort is real.
const MIN_COHORT_FOR_PERCENTILE = 5;

export function computeMonthlyMasteryStats(
  counts: UserMasteryCount[],
  userId: string,
): MonthlyMasteryStats {
  const totalActiveLearners = counts.length;
  const masteredThisMonth = counts.find((c) => c.userId === userId)?.count ?? 0;

  const eligibleForPercentile = masteredThisMonth > 0 && totalActiveLearners >= MIN_COHORT_FOR_PERCENTILE;

  if (!eligibleForPercentile) {
    return { masteredThisMonth, totalActiveLearners, percentile: null };
  }

  const atOrBelow = counts.filter((c) => c.count <= masteredThisMonth).length;
  const percentile = Math.round((atOrBelow / totalActiveLearners) * 100);

  return { masteredThisMonth, totalActiveLearners, percentile };
}

/** [monthStart, monthEnd) for the calendar month containing `now`. */
export function currentMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}
