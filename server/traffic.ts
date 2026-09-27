import type { TrafficSource } from "@shared/schema";

/**
 * Classify how a lesson view arrived, from what the browser reports on the
 * landing page (document.referrer + utm tags). Only the referring domain is
 * kept -- never the full URL, query, or anything identifying the reader.
 *
 * Most sites send origin-only referrers, so the domain is all we get anyway.
 * Order matters: AI assistants before search (gemini.google.com is not Google
 * Search), and utm tags before the referrer (ChatGPT tags links with
 * utm_source=chatgpt.com, and in-app browsers often send no referrer at all).
 */

const RULES: [TrafficSource, RegExp][] = [
  ["ai", /(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|copilot\.com|you\.com|poe\.com|meta\.ai|grok\.com|deepseek\.com|phind\.com|kagi\.com)$/],
  ["classroom", /(^|\.)(classroom\.google\.com|instructure\.com|canvas\.[a-z.]+|schoology\.com|moodle[a-z0-9.-]*|blackboard\.com|edmodo\.com|seesaw\.me|clever\.com|brightspace\.com|d2l\.com|teams\.microsoft\.com)$/],
  ["email", /(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|outlook\.office365\.com|mail\.yahoo\.com|mail\.proton\.me|mail\.aol\.com|icloud\.com)$/],
  ["search", /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|yahoo\.[a-z.]+|ecosia\.org|search\.brave\.com|baidu\.com|yandex\.[a-z.]+|startpage\.com|qwant\.com|naver\.com|seznam\.cz|sogou\.com)$/],
  ["social", /(^|\.)(facebook\.com|fb\.com|t\.co|twitter\.com|x\.com|linkedin\.com|lnkd\.in|reddit\.com|youtube\.com|youtu\.be|instagram\.com|pinterest\.[a-z.]+|tiktok\.com|threads\.net|whatsapp\.com|wa\.me|telegram\.org|t\.me|discord\.com|discord\.gg|news\.ycombinator\.com|quora\.com|medium\.com|substack\.com|bsky\.app|mastodon\.social)$/],
];

export interface VisitSignal {
  /** document.referrer on the landing page ("" if none). */
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  /** True when the reader navigated here from another page on this site. */
  internal?: boolean;
}

export interface ClassifiedVisit {
  source: TrafficSource;
  /** Referring domain, "" for direct/internal. */
  refHost: string;
}

function hostOf(value: string): string {
  const v = value.trim().toLowerCase();
  if (!v) return "";
  try {
    return new URL(v.includes("://") ? v : `https://${v}`).hostname.replace(/^www\./, "").slice(0, 100);
  } catch {
    return "";
  }
}

function byHost(host: string): TrafficSource | null {
  for (const [source, re] of RULES) if (re.test(host)) return source;
  return null;
}

export function classifyVisit(signal: VisitSignal, ownHosts: string[] = []): ClassifiedVisit {
  if (signal.internal) return { source: "internal", refHost: "" };

  const medium = (signal.utmMedium || "").trim().toLowerCase();
  const utmHost = hostOf(signal.utmSource || "");
  if (utmHost) {
    if (/e-?mail|newsletter/.test(medium)) return { source: "email", refHost: utmHost };
    const known = byHost(utmHost);
    if (known) return { source: known, refHost: utmHost };
    if (/social/.test(medium)) return { source: "social", refHost: utmHost };
    return { source: "referral", refHost: utmHost };
  }

  const refHost = hostOf(signal.referrer || "");
  if (!refHost) return { source: "direct", refHost: "" };
  const own = ownHosts.map((h) => h.toLowerCase().replace(/^www\./, ""));
  if (own.includes(refHost) || refHost.endsWith(".onrender.com")) return { source: "internal", refHost: "" };
  return { source: byHost(refHost) ?? "referral", refHost };
}
