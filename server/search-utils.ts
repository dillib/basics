/**
 * Small pure helpers for the library search + quick-search cache. Kept
 * DB-free so they're unit testable (see __tests__/search-utils.test.ts).
 */

/**
 * Escape LIKE/ILIKE wildcards in user input so "100%" searches for a literal
 * percent sign instead of matching everything. Postgres's default LIKE escape
 * character is backslash.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * Normalize a search title for cache keys: "  Quantum   Computing " and
 * "quantum computing" should hit the same cached quick-search result.
 */
export function normalizeSearchTitle(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}
