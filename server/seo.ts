import type { Request } from "express";
import type { Topic } from "@shared/schema";

const SITE_NAME = "BasicsTutor";
const DEFAULT_DESCRIPTION =
  "Understand anything, explained from first principles. Get instant AI-generated breakdowns with quizzes, mind maps, and printable reference sheets.";

/**
 * The public-facing base URL. Prefer an explicit PUBLIC_URL (correct behind
 * proxies / custom domains); otherwise derive it from the request.
 */
export function publicBaseUrl(req: Request): string {
  const fromEnv = process.env.PUBLIC_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

/** Escape a string for safe interpolation into an HTML attribute / text node. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string; // og:type
  jsonLd?: Record<string, unknown>;
}

export function buildTopicMeta(topic: Topic, baseUrl: string): PageMeta {
  const url = `${baseUrl}/topic/${topic.slug}`;
  const title = `${topic.title} — explained from first principles | ${SITE_NAME}`;
  const description =
    topic.description ||
    `Learn ${topic.title} from first principles: clear explanations, real-world analogies, and a quiz to test your understanding.`;

  return {
    title,
    description,
    url,
    image: topic.imageUrl || `${baseUrl}/android-chrome-512x512.png`,
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: topic.title,
      description,
      url,
      learningResourceType: "Concept explainer",
      ...(topic.difficulty ? { educationalLevel: topic.difficulty } : {}),
      ...(topic.category ? { about: topic.category } : {}),
      isAccessibleForFree: true,
      provider: { "@type": "Organization", name: SITE_NAME, url: baseUrl },
    },
  };
}

/**
 * Inject page metadata into an HTML document. Strips the existing title and
 * description/OG/Twitter/canonical tags, then writes a fresh block before
 * </head>. All dynamic values are HTML-escaped; JSON-LD is made script-safe.
 */
export function injectMeta(html: string, meta: PageMeta): string {
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");

  const image = meta.image ? escapeHtml(meta.image) : "";
  const cardType = meta.image ? "summary" : "summary";

  const jsonLd = meta.jsonLd
    ? `\n    <script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";

  const tags =
    `\n    <title>${escapeHtml(meta.title)}</title>` +
    `\n    <meta name="description" content="${escapeHtml(meta.description)}" />` +
    `\n    <link rel="canonical" href="${escapeHtml(meta.url)}" />` +
    `\n    <meta property="og:site_name" content="${SITE_NAME}" />` +
    `\n    <meta property="og:title" content="${escapeHtml(meta.title)}" />` +
    `\n    <meta property="og:description" content="${escapeHtml(meta.description)}" />` +
    `\n    <meta property="og:type" content="${meta.type || "website"}" />` +
    `\n    <meta property="og:url" content="${escapeHtml(meta.url)}" />` +
    (image ? `\n    <meta property="og:image" content="${image}" />` : "") +
    `\n    <meta name="twitter:card" content="${cardType}" />` +
    `\n    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />` +
    `\n    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />` +
    (image ? `\n    <meta name="twitter:image" content="${image}" />` : "") +
    jsonLd +
    "\n  ";

  return stripped.replace(/<\/head>/i, `${tags}</head>`);
}

/** Build a urlset sitemap from the given absolute URLs. */
export function buildSitemap(entries: { loc: string; lastmod?: Date | null }[]): string {
  const urls = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeHtml(e.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export { DEFAULT_DESCRIPTION, SITE_NAME };
