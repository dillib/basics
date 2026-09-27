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

/** Sources saved by the research step (validationData.sources), if any. */
function topicSources(topic: Topic): { title: string; url: string; date?: string }[] {
  const raw = (topic.validationData as { sources?: unknown } | null)?.sources;
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is { title: string; url: string; date?: string } =>
    !!s && typeof s.url === "string" && /^https?:\/\//i.test(s.url) && typeof s.title === "string").slice(0, 8);
}

function practicalSteps(topic: Topic): string[] {
  return Array.isArray(topic.practicalSteps) ? (topic.practicalSteps as unknown[]).filter((s): s is string => typeof s === "string") : [];
}

/** Lesson text may carry **bold** / *italic* (see client InlineText). Strip for plain-text fields. */
function plain(value: string): string {
  return value.replace(/\*\*([^*\n]+?)\*\*/g, "$1").replace(/\*([^*\s](?:[^*\n]*?[^*\s])?)\*/g, "$1");
}

/** Escape, then render **bold** / *italic* as real tags (for the crawler snapshot). */
function richText(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\s](?:[^*\n]*?[^*\s])?)\*/g, "<em>$1</em>");
}

export function buildTopicMeta(topic: Topic, baseUrl: string, principles: Principle[] = []): PageMeta {
  const url = `${baseUrl}/topic/${topic.slug}`;
  // Kid/Teen/Adult variants of the same title are separate indexable URLs --
  // without the level in the tag, they'd carry near-identical titles, which
  // reads to search engines as duplicate content rather than three distinct pages.
  const levelSuffix =
    isLevel(topic.level) && topic.level !== "adult" ? ` for ${LEVEL_LABELS[topic.level]}` : "";
  const title = `${topic.title}${levelSuffix} — explained from first principles | ${SITE_NAME}`;
  const description = plain(
    topic.description ||
    `Learn ${topic.title} from first principles: clear explanations, real-world analogies, and a quiz to test your understanding.`,
  );
  const image = `${baseUrl}/og/${topic.slug}`;
  const org = {
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: SITE_NAME,
    url: baseUrl,
    logo: { "@type": "ImageObject", url: `${baseUrl}/logo-512.png`, width: 512, height: 512 },
  };
  const level = isLevel(topic.level) ? topic.level : "adult";
  const sources = topicSources(topic);

  // One graph per page: the lesson (Article + LearningResource, so it's
  // eligible for article features AND described as learning material), the
  // breadcrumb trail shown in results, and the publisher. dateModified moves
  // when the content is rewritten (self-heal / regenerate), which tells
  // search engines the page was refreshed.
  const lesson: Record<string, unknown> = {
    "@type": ["Article", "LearningResource"],
    "@id": `${url}#lesson`,
    headline: topic.title.slice(0, 110),
    name: topic.title,
    description,
    url,
    mainEntityOfPage: url,
    image: [image],
    inLanguage: "en",
    isAccessibleForFree: true,
    learningResourceType: "Concept explainer",
    educationalLevel: LEVEL_LABELS[level],
    audience: { "@type": "EducationalAudience", educationalRole: "student", audienceType: LEVEL_LABELS[level] },
    ...(topic.category ? { about: topic.category, articleSection: topic.category } : {}),
    ...(topic.estimatedMinutes ? { timeRequired: `PT${topic.estimatedMinutes}M` } : {}),
    ...(topic.createdAt ? { datePublished: new Date(topic.createdAt).toISOString() } : {}),
    ...(topic.updatedAt || topic.createdAt ? { dateModified: new Date((topic.updatedAt || topic.createdAt)!).toISOString() } : {}),
    ...(principles.length ? { teaches: principles.map((p) => plain(p.title)) } : {}),
    ...(sources.length
      ? { citation: sources.map((s) => ({ "@type": "CreativeWork", name: s.title, url: s.url, ...(s.date ? { datePublished: s.date } : {}) })) }
      : {}),
    author: { "@id": org["@id"] },
    publisher: { "@id": org["@id"] },
  };
  const breadcrumbs = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Topic Library", item: `${baseUrl}/topics` },
      { "@type": "ListItem", position: 3, name: topic.title, item: url },
    ],
  };

  return {
    title,
    description,
    url,
    // Per-topic 1200x630 share card (server/og-image.ts via /og/:slug).
    image,
    type: "article",
    jsonLd: { "@context": "https://schema.org", "@graph": [lesson, breadcrumbs, org] },
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
        ? `\n      <p class="text-base italic text-muted-foreground mb-4">${richText(p.analogy)}</p>`
        : "";
      const takeaways =
        p.keyTakeaways && p.keyTakeaways.length > 0
          ? `\n      <ul class="list-disc pl-5 space-y-1 text-sm text-muted-foreground">${p.keyTakeaways
              .map((t) => `<li>${richText(t)}</li>`)
              .join("")}</ul>`
          : "";
      return `    <section class="mb-10 pb-10 border-b border-border">
      <h2 class="text-2xl font-semibold mb-3">${richText(p.title)}</h2>
      <p class="text-base leading-relaxed text-foreground/90 mb-4">${richText(p.explanation)}</p>${analogy}${takeaways}
    </section>`;
    })
    .join("\n");

  // Same extra sections the page shows, so crawlers index them too.
  const steps = practicalSteps(topic);
  const stepsHtml = steps.length
    ? `\n    <section class="mb-10">
      <h2 class="text-xl font-semibold mb-3">Put it into practice</h2>
      <ul class="list-disc pl-5 space-y-2">${steps.map((s) => `<li>${richText(s)}</li>`).join("")}</ul>
    </section>`
    : "";
  const sources = topicSources(topic);
  const sourcesHtml = sources.length
    ? `\n    <section class="mb-10">
      <h2 class="text-xl font-semibold mb-3">Sources</h2>
      <ol class="list-decimal pl-5 space-y-1 text-sm">${sources
        .map((s) => `<li><a href="${escapeHtml(s.url)}" rel="noopener nofollow">${escapeHtml(s.title)}</a>${s.date ? ` · ${escapeHtml(s.date)}` : ""}</li>`)
        .join("")}</ol>
    </section>`
    : "";

  return `<main class="container mx-auto px-6 py-12">
    <header class="mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold mb-3">${escapeHtml(topic.title)}</h1>
      ${topic.description ? `<p class="text-lg text-muted-foreground leading-relaxed mb-3">${escapeHtml(topic.description)}</p>` : ""}
      <div class="flex flex-wrap items-center gap-3">${badges}</div>
    </header>
${sections}${stepsHtml}${sourcesHtml}
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
