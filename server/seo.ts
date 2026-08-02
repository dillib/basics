import type { Request } from "express";
import type { Topic, Principle } from "@shared/schema";
import { isLevel, LEVEL_LABELS } from "@shared/levels";

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
  // Kid/Teen/Adult variants of the same title are separate indexable URLs --
  // without the level in the tag, they'd carry near-identical titles, which
  // reads to search engines as duplicate content rather than three distinct pages.
  const levelSuffix =
    isLevel(topic.level) && topic.level !== "adult" ? ` for ${LEVEL_LABELS[topic.level]}` : "";
  const title = `${topic.title}${levelSuffix} — explained from first principles | ${SITE_NAME}`;
  const description =
    topic.description ||
    `Learn ${topic.title} from first principles: clear explanations, real-world analogies, and a quiz to test your understanding.`;

  return {
    title,
    description,
    url,
    // Per-topic 1200x630 share card (server/og-image.ts via /og/:slug).
    image: `${baseUrl}/og/${topic.slug}`,
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
  // We now generate a proper 1200x630 card per topic, so use the large card.
  const cardType = meta.image ? "summary_large_image" : "summary";

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

/**
 * Server-rendered content snapshot for a topic page, injected into #root so
 * crawlers that don't execute JavaScript (or delay their JS-render pass) get
 * the actual lesson -- not just the title and meta description. React's
 * createRoot().render() cleanly replaces this on mount for real visitors, so
 * there's no hydration to keep in sync; it's a pre-render shell, not SSR.
 * Classnames are reused verbatim from TopicLearningPage.tsx so the compiled
 * Tailwind CSS (already shipped in the stylesheet <link>) styles it before
 * any JS runs, instead of a flash of unstyled text.
 */
export function renderContentSnapshot(topic: Topic, principles: Principle[]): string {
  const badges = [
    topic.category,
    topic.difficulty,
    topic.estimatedMinutes ? `${topic.estimatedMinutes} min` : null,
  ]
    .filter(Boolean)
    .map((b) => `<span class="text-xs text-muted-foreground">${escapeHtml(b as string)}</span>`)
    .join('<span class="text-muted-foreground/30">&middot;</span>');

  const sections = principles
    .map((p) => {
      const analogy = p.analogy
        ? `\n      <p class="text-base italic text-muted-foreground mb-4">${escapeHtml(p.analogy)}</p>`
        : "";
      const takeaways =
        p.keyTakeaways && p.keyTakeaways.length > 0
          ? `\n      <ul class="list-disc pl-5 space-y-1 text-sm text-muted-foreground">${p.keyTakeaways
              .map((t) => `<li>${escapeHtml(t)}</li>`)
              .join("")}</ul>`
          : "";
      return `    <section class="mb-10 pb-10 border-b border-border">
      <h2 class="text-2xl font-semibold mb-3">${escapeHtml(p.title)}</h2>
      <p class="text-base leading-relaxed text-foreground/90 mb-4">${escapeHtml(p.explanation)}</p>${analogy}${takeaways}
    </section>`;
    })
    .join("\n");

  return `<main class="container mx-auto px-6 py-12">
    <header class="mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold mb-3">${escapeHtml(topic.title)}</h1>
      ${topic.description ? `<p class="text-lg text-muted-foreground leading-relaxed mb-3">${escapeHtml(topic.description)}</p>` : ""}
      <div class="flex flex-wrap items-center gap-3">${badges}</div>
    </header>
${sections}
  </main>`;
}

/**
 * Insert a pre-rendered content snapshot into the SPA's empty #root div.
 * See renderContentSnapshot() -- this is what makes the snapshot visible to
 * a crawler's initial HTML fetch instead of only living behind client JS.
 */
export function injectContent(html: string, contentHtml: string): string {
  return html.replace('<div id="root"></div>', `<div id="root">${contentHtml}</div>`);
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
