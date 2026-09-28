import type { Topic } from "@shared/schema";
import { adviceKind } from "@shared/advice";

const hasSources = (t: Pick<Topic, "validationData">) =>
  ((t.validationData as { sources?: unknown[] } | null)?.sources?.length ?? 0) > 0;

/**
 * Weekly refresh order (npm run regenerate:topics with REGEN_OLDEST): who
 * benefits most from web research + a rewrite. Unsourced health/money lessons
 * first, then other unsourced lessons, then the least recently updated --
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
