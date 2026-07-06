/**
 * SM-2 spaced-repetition scheduling (the algorithm behind Anki/SuperMemo).
 *
 * Given how well the learner recalled a principle (quality 0-5), it decides
 * when to show it again: get it right and the gap grows (1 day -> 6 days ->
 * weeks), get it wrong and it resets to tomorrow. This is what turns a
 * one-time read into durable memory, and gives people a reason to come back.
 *
 * Note on units: the DB stores easeFactor as an integer x100 (250 = 2.5) and
 * interval in whole days, matching the review_schedule schema.
 */

export interface Sm2State {
  easeFactor: number; // stored x100 (e.g. 250 = 2.5)
  interval: number; // days
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  dueAt: Date;
}

/** Quality grades surfaced in the UI: 0 Again, 3 Hard, 4 Good, 5 Easy. */
export function applySm2(current: Sm2State, quality: number): Sm2Result {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const ef = current.easeFactor / 100;

  // Ease factor moves with performance; never drops below 1.3 (SM-2 floor).
  const nextEf = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  let interval: number;
  let repetitions: number;

  if (q < 3) {
    // Lapse: forgot it. Reset the streak, show again tomorrow.
    repetitions = 0;
    interval = 1;
  } else {
    if (current.repetitions === 0) interval = 1;
    else if (current.repetitions === 1) interval = 6;
    else interval = Math.round(current.interval * nextEf);
    repetitions = current.repetitions + 1;
  }

  interval = Math.max(1, interval);
  const dueAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

  return { easeFactor: Math.round(nextEf * 100), interval, repetitions, dueAt };
}

/**
 * Updates a principle's 0-100 mastery score after a review. Correct recalls
 * push it up (Easy more than Hard), a lapse pulls it down. Used for the
 * "Avg. Mastery" and "Mastered" stats. Mastered = 80+.
 */
export function nextMasteryScore(current: number, quality: number): number {
  const delta = quality >= 5 ? 20 : quality === 4 ? 12 : quality === 3 ? 5 : -15;
  return Math.max(0, Math.min(100, current + delta));
}

export const MASTERED_THRESHOLD = 80;
