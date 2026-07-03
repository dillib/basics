/**
 * `google-trends-api` ships no types and there's no @types package for it.
 * Minimal ambient declaration covering only what refresh-trending-topics.ts
 * actually uses.
 */
declare module "google-trends-api" {
  interface DailyTrendsOptions {
    geo?: string;
    trendDate?: Date;
  }

  /** Resolves to a JSON string (already stripped of Google's XSSI prefix). */
  export function dailyTrends(options?: DailyTrendsOptions): Promise<string>;
}
