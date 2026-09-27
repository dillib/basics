import type { Request } from "express";
import type { Topic, Principle } from "@shared/schema";
import { isLevel, LEVEL_LABELS } from "@shared/levels";
import { canonicalCategory, CANONICAL_ORDER } from "../client/src/lib/categories";

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
  /** e.g. "noindex" for private pages. */
  robots?: string;
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

/**
 * Google shows ~60 characters of a title. Keep the full phrase when it fits,
 * else a shorter suffix, else just the lesson name + brand -- the lesson name
 * (the search query) must never be the part that gets cut off.
 */
export function lessonTitleTag(name: string): string {
  const options = [
    `${name}, Explained from First Principles | ${SITE_NAME}`,
    `${name}, Explained Simply | ${SITE_NAME}`,
    `${name} | ${SITE_NAME}`,
  ];
  return options.find((t) => t.length <= 60) ?? options[options.length - 1];
}

/** Snippets over ~155 chars get cut mid-word; end on a word boundary instead. */
export function clampDescription(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\-–—]+$/, "") + "…";
}

export function buildTopicMeta(topic: Topic, baseUrl: string, principles: Principle[] = []): PageMeta {
  const url = `${baseUrl}/topic/${topic.slug}`;
  // Kid/Teen/Adult variants of the same title are separate indexable URLs --
  // without the level in the tag, they'd carry near-identical titles, which
  // reads to search engines as duplicate content rather than three distinct pages.
  const levelSuffix =
    isLevel(topic.level) && topic.level !== "adult" ? ` for ${LEVEL_LABELS[topic.level]}` : "";
  const title = lessonTitleTag(`${topic.title}${levelSuffix}`);
  const description = clampDescription(plain(
    topic.description ||
    `Learn ${topic.title} from first principles: clear explanations, real-world analogies, and a quiz to test your understanding.`,
  ));
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
    (image ? `\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />` : "") +
    `\n    <meta name="twitter:card" content="${cardType}" />` +
    `\n    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />` +
    `\n    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />` +
    (image ? `\n    <meta name="twitter:image" content="${image}" />` : "") +
    jsonLd +
    (meta.robots ? `\n    <meta name="robots" content="${escapeHtml(meta.robots)}" />` : "") +
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
/** A lesson linked from a snapshot. */
export interface LessonLink {
  title: string;
  slug: string;
  category?: string | null;
  description?: string | null;
}

const lessonAnchor = (t: LessonLink) => `<a href="/topic/${encodeURIComponent(t.slug)}">${escapeHtml(t.title)}</a>`;

export function renderContentSnapshot(topic: Topic, principles: Principle[], related: LessonLink[] = []): string {
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

  // Crawlable links: where this lesson sits, and where to go next. Without
  // them, crawlers that don't run JavaScript (and link equity) dead-end here.
  const field = canonicalCategory(topic.category);
  const crumbs = `<nav aria-label="Breadcrumb" class="mb-4 text-sm text-muted-foreground"><a href="/">Home</a> › <a href="/topics">Topic Library</a> › <span>${escapeHtml(field)}</span></nav>`;
  const relatedHtml = related.length
    ? `\n    <section class="mb-10">
      <h2 class="text-xl font-semibold mb-3">Keep learning</h2>
      <ul class="list-disc pl-5 space-y-1">${related.map((t) => `<li>${lessonAnchor(t)}</li>`).join("")}</ul>
      <p class="mt-3"><a href="/topics">Browse all lessons</a></p>
    </section>`
    : `\n    <p><a href="/topics">Browse all lessons</a></p>`;

  return `<main class="container mx-auto px-6 py-12">
    ${crumbs}
    <header class="mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold mb-3">${escapeHtml(topic.title)}</h1>
      ${topic.description ? `<p class="text-lg text-muted-foreground leading-relaxed mb-3">${escapeHtml(topic.description)}</p>` : ""}
      <div class="flex flex-wrap items-center gap-3">${badges}</div>
    </header>
${sections}${stepsHtml}${sourcesHtml}${relatedHtml}
  </main>`;
}

// -- Non-lesson pages -------------------------------------------------------

const DEFAULT_IMAGE = "/og-default.png";

/** Title/description per public page (each unique; titles ≤ 60 chars). */
export const PAGE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "BasicsTutor: Understand Anything from First Principles",
    description: "Type any topic and get a lesson that breaks it down to its fundamentals and rebuilds it until it clicks. Free, with quizzes and printable sheets.",
  },
  "/topics": {
    title: "Topic Library: Lessons Explained Simply | BasicsTutor",
    description: "Browse every BasicsTutor lesson by field: science, technology, money, health, the mind and more, each explained from first principles.",
  },
  "/why": {
    title: "The Method: Learning from First Principles | BasicsTutor",
    description: "Why BasicsTutor teaches the few truths a subject rests on, then builds back up, and how that differs from asking an AI chatbot.",
  },
  "/help": { title: "Help & FAQ | BasicsTutor", description: "Answers to common questions about BasicsTutor: lessons, levels, quizzes, reference sheets, accounts and privacy." },
  "/contact": { title: "Contact Us | BasicsTutor", description: "Get in touch with the BasicsTutor team. We read every message." },
  "/support": { title: "Support & Feedback | BasicsTutor", description: "Report a problem, request a topic or share feedback on BasicsTutor." },
  "/pricing": { title: "Pricing: Free During Early Access | BasicsTutor", description: "BasicsTutor is free while it's early. No credit card needed to start learning." },
  "/terms": { title: "Terms of Service | BasicsTutor", description: "The plain-language terms for using BasicsTutor." },
  "/privacy": { title: "Privacy Policy | BasicsTutor", description: "What BasicsTutor collects, why, and the choices you have." },
};

/** Signed-in or transactional pages: never index them. */
export const NOINDEX_PATHS = ["/dashboard", "/account", "/admin", "/checkout/success", "/checkout/cancel"];

/** Every client route; anything else is a real 404 (not a soft-404 200). */
export function isKnownPath(path: string): boolean {
  return path in PAGE_META || NOINDEX_PATHS.includes(path) || /^\/topic\/[^/]+$/.test(path);
}

export function buildPageMeta(path: string, baseUrl: string): PageMeta | null {
  const page = PAGE_META[path];
  if (!page) return null;
  return {
    title: page.title,
    description: page.description,
    url: `${baseUrl}${path === "/" ? "/" : path}`,
    image: `${baseUrl}${DEFAULT_IMAGE}`,
    type: "website",
    ...(path === "/topics"
      ? { jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: "Topic Library", url: `${baseUrl}/topics`, isPartOf: { "@id": `${baseUrl}/#website` } } }
      : {}),
  };
}

/** Group lessons by canonical field, in the library's display order. */
function byField(lessons: LessonLink[]): [string, LessonLink[]][] {
  const groups = new Map<string, LessonLink[]>();
  for (const t of lessons) {
    const f = canonicalCategory(t.category);
    if (!groups.has(f)) groups.set(f, []);
    groups.get(f)!.push(t);
  }
  return CANONICAL_ORDER.filter((f) => groups.has(f)).map((f) => [f, groups.get(f)!.sort((a, b) => a.title.localeCompare(b.title))]);
}

/** Crawlable Topic Library: every public lesson, linked, grouped by field. */
export function renderLibrarySnapshot(lessons: LessonLink[]): string {
  const groups = byField(lessons)
    .map(([field, ts]) => `    <section class="mb-8">
      <h2 class="text-xl font-semibold mb-2">${escapeHtml(field)}</h2>
      <ul class="list-disc pl-5 space-y-1">${ts.map((t) => `<li>${lessonAnchor(t)}</li>`).join("")}</ul>
    </section>`)
    .join("\n");
  return `<main class="container mx-auto px-6 py-12">
    <h1 class="text-3xl sm:text-4xl font-bold mb-3">Topic Library</h1>
    <p class="text-lg text-muted-foreground mb-8">${lessons.length} lessons, each explained from first principles.</p>
${groups}
  </main>`;
}

/** Crawlable home page: what BasicsTutor is, plus links into the library. */
export function renderHomeSnapshot(featured: LessonLink[]): string {
  return `<main class="container mx-auto px-6 py-12">
    <h1 class="text-4xl font-bold mb-4">Understand anything, explained from first principles</h1>
    <p class="text-lg text-muted-foreground mb-8">Type any topic and BasicsTutor breaks it down to the few truths it rests on, then rebuilds it step by step until it clicks, with quizzes and printable reference sheets. Free while it's early.</p>
    <nav class="mb-8"><a href="/topics">Browse the Topic Library</a> · <a href="/why">The Method</a> · <a href="/help">Help</a></nav>
    <section>
      <h2 class="text-xl font-semibold mb-3">Popular lessons</h2>
      <ul class="list-disc pl-5 space-y-1">${featured.map((t) => `<li>${lessonAnchor(t)}</li>`).join("")}</ul>
    </section>
  </main>`;
}

/** llms.txt: a plain map of the site for AI assistants (llmstxt.org). */
export function buildLlmsTxt(baseUrl: string, lessons: LessonLink[]): string {
  const sections = byField(lessons)
    .map(([field, ts]) => `## ${field}\n\n${ts.map((t) => `- [${t.title}](${baseUrl}/topic/${t.slug})${t.description ? `: ${clampDescription(plain(t.description), 140)}` : ""}`).join("\n")}`)
    .join("\n\n");
  return `# BasicsTutor

> Free lessons that explain any topic from first principles: the few fundamental truths it rests on, rebuilt step by step, with real-world analogies, practice steps and cited sources. Levels for kids, teens and adults.

- [Topic Library](${baseUrl}/topics): every lesson, grouped by field
- [The Method](${baseUrl}/why): how BasicsTutor teaches

${sections}
`;
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
