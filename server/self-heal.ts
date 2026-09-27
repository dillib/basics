import type { TopicFeedbackStats } from "./storage";

/**
 * Which lessons have enough reader complaints to be worth a look. Pure, so the
 * thresholds are unit-tested; the nightly job (self-heal-topics.ts) then runs
 * each candidate through fresh research + an AI triage, and only rewrites the
 * ones whose complaints hold up.
 */

export interface HealThresholds {
  /** Distinct people voting "not helpful" on the current version. */
  minDownPeople: number;
  /** Share of votes that are "not helpful" (0-1). */
  minDownShare: number;
  /** "Inaccurate" + "outdated" reports that trigger a look on their own. */
  minFactReports: number;
  /** Don't touch a lesson again within this many days of its last rewrite. */
  cooldownDays: number;
}

const envNum = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const DEFAULT_THRESHOLDS: HealThresholds = {
  minDownPeople: envNum("HEAL_MIN_DOWN", 3),
  minDownShare: envNum("HEAL_MIN_DOWN_SHARE", 0.5),
  minFactReports: envNum("HEAL_MIN_FACT_REPORTS", 2),
  cooldownDays: envNum("HEAL_COOLDOWN_DAYS", 7),
};

export interface HealCandidate {
  stats: TopicFeedbackStats;
  /** Why it was picked, in words (for logs and the email). */
  trigger: string;
  priority: number;
}

export function selectHealCandidates(
  all: TopicFeedbackStats[],
  t: HealThresholds = DEFAULT_THRESHOLDS,
  now: Date = new Date(),
): HealCandidate[] {
  const cooldownMs = t.cooldownDays * 24 * 60 * 60 * 1000;
  const out: HealCandidate[] = [];

  for (const s of all) {
    if (s.lastReplacedAt && now.getTime() - s.lastReplacedAt.getTime() < cooldownMs) continue;

    const votes = s.up + s.down;
    const downShare = votes ? s.down / votes : 0;
    const factReports = s.reasons.inaccurate + s.reasons.outdated;

    const byVotes = s.downPeople >= t.minDownPeople && downShare >= t.minDownShare;
    const byFacts = factReports >= t.minFactReports;
    if (!byVotes && !byFacts) continue;

    const trigger = [
      byVotes ? `${s.down} of ${votes} readers said not helpful` : "",
      byFacts ? `${factReports} reported inaccurate/outdated` : "",
    ].filter(Boolean).join("; ");

    // Wrong facts first, then how many people are affected (7-day reads).
    const priority = factReports * 3 + s.downPeople * 2 + Math.log10(1 + s.views7d) + (s.isTrending ? 2 : 0);
    out.push({ stats: s, trigger, priority });
  }

  return out.sort((a, b) => b.priority - a.priority);
}

/**
 * Keep a rewrite only if the fact-checker rates it at least as trustworthy as
 * what it replaces (small tolerance for scoring noise) and above a floor.
 */
export function acceptRewrite(oldConfidence: number | null, newConfidence: number, floor = 70): boolean {
  if (newConfidence < floor) return false;
  return oldConfidence == null || newConfidence >= oldConfidence - 5;
}
