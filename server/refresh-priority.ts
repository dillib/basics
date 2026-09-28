import type { Topic } from "@shared/schema";
import { adviceKind } from "@shared/advice";

// "Verified" = written from web research, or (stable subjects, which skip
// research) passed the independent accuracy check (server/safety.ts).
const hasSources = (t: Pick<Topic, "validationData">) => {
  const v = t.validationData as { sources?: unknown[]; moderation?: { sourceCheck?: unknown } } | null;
  return (v?.sources?.length ?? 0) > 0 || !!v?.moderation?.sourceCheck;
};

/**
 * Weekly refresh order (npm run regenerate:topics with REGEN_OLDEST): who
 * benefits most from web research + a rewrite. Unverified health/money lessons
 * first, then other unverified lessons, then the least recently updated --
 * skipping anything updated in the last `minAgeDays`.
 */
export function refreshPriority<T extends Pick<Topic, "slug" | "validationData" | "updatedAt" | "createdAt">>(
  topics: T[],
  n: number,
  opts: { minAgeDays?: number; now?: number } = {},
): T[] {
  const cutoff = (opts.now ?? Date.now()) - (opts.minAgeDays ?? 45) * 86_400_000;
  const updated = (t: T) => new Date(t.updatedAt ?? t.createdAt ?? 0).getTime();
  const rank = (t: T) => (!hasSources(t) && adviceKind(t.slug) ? 0 : !hasSources(t) ? 1 : 2);
  return topics
    .filter((t) => updated(t) < cutoff)
    .sort((a, b) => rank(a) - rank(b) || updated(a) - updated(b))
    .slice(0, n);
}
