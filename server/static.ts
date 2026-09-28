import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { isBlocked } from "./moderation";
import {
  buildTopicMeta, buildPageMeta, injectMeta, injectContent, renderContentSnapshot,
  renderLibrarySnapshot, renderHomeSnapshot, renderAboutSnapshot, renderHelpSnapshot, renderWhySnapshot,
  renderContactSnapshot, publicBaseUrl, isKnownPath, NOINDEX_PATHS,
  type LessonLink,
} from "./seo";

// The library/home snapshots list every public lesson; cache the list briefly
// so crawls don't hit the database on every page view.
let lessonCache: { at: number; lessons: LessonLink[]; featured: LessonLink[] } | null = null;
async function publicLessons() {
  if (lessonCache && Date.now() - lessonCache.at < 5 * 60_000) return lessonCache;
  const [all, trending] = await Promise.all([storage.getPublicTopics(), storage.getTrendingTopics()]);
  const link = (t: { title: string; slug: string; category: string | null; description: string | null }): LessonLink =>
    ({ title: t.title, slug: t.slug, category: t.category, description: t.description });
  const lessons = all.map(link);
  const seen = new Set(trending.map((t) => t.slug));
  const featured = [...trending.map(link), ...lessons.filter((t) => !seen.has(t.slug))].slice(0, 24);
  lessonCache = { at: Date.now(), lessons, featured };
  return lessonCache;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve hashed assets etc., but let the catch-all own index.html so we can
  // inject per-page metadata for crawlers and social unfurlers.
  // Vite's /assets files have a content hash in their name, so they never
  // change: browsers and Cloudflare keep them for a year. That also keeps a
  // cached page (below) working after a deploy removes the old build.
  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  }));

  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
  const html = (res: express.Response, status: number, body: string) =>
    res.status(status).set("Content-Type", "text/html").send(body);
  // Public pages are the same for every visitor (sign-in happens in the
  // browser), so Cloudflare may serve them for 2 minutes without asking the
  // server: a traffic spike hits the edge, not the one Starter instance.
  // Browsers always revalidate (max-age=0), so readers see updates quickly.
  const cacheable = (res: express.Response) => res.set("Cache-Control", "public, max-age=0, s-maxage=120");

  // SPA fallback with server-side metadata (and a crawlable content snapshot)
  // for every public page -- so each has its own title/description/canonical
  // and real links, even for crawlers that don't run JavaScript.
  app.use("*", async (req, res) => {
    const pathname = req.originalUrl.split("?")[0].replace(/\/+$/, "") || "/";
    const base = publicBaseUrl(req);
    try {
      const match = pathname.match(/^\/topic\/([^/]+)$/);
      if (match) {
        const slug = decodeURIComponent(match[1]);
        const topic = await storage.getTopicBySlug(slug);
        if (topic?.redirectTo) {
          return res.redirect(301, `/topic/${encodeURIComponent(topic.redirectTo)}`);
        }
        if (topic && isBlocked(topic)) {
          return html(res, 404, injectMeta(indexHtml, { title: "Lesson under review | BasicsTutor", description: "This lesson is being reviewed.", url: `${base}${pathname}`, robots: "noindex" }));
        }
        if (topic) {
          const [principles, related] = await Promise.all([
            storage.getPrinciplesByTopic(topic.id),
            storage.getRelatedTopics(topic.id, topic.category, 6),
          ]);
          // Held (unlisted) lessons stay reachable by link but out of search.
          const meta = { ...buildTopicMeta(topic, base, principles), ...(topic.isPublic ? {} : { robots: "noindex" }) };
          if (topic.isPublic) cacheable(res);
          return html(res, 200, injectContent(injectMeta(indexHtml, meta), renderContentSnapshot(topic, principles, related)));
        }
        // /topic/:slug shape but no such topic -- a real 404, not a 200 with
        // an empty shell. Serving 200 here is what Search Console flags as a
        // soft 404: it looks fine to the server, empty to everyone else.
        return html(res, 404, injectMeta(indexHtml, { title: "Lesson not found | BasicsTutor", description: "This lesson doesn't exist.", url: `${base}${pathname}`, robots: "noindex" }));
      }

      const pageMeta = buildPageMeta(pathname, base);
      if (pageMeta) {
        let body = injectMeta(indexHtml, pageMeta);
        if (pathname === "/topics") body = injectContent(body, renderLibrarySnapshot((await publicLessons()).lessons));
        if (pathname === "/") body = injectContent(body, renderHomeSnapshot((await publicLessons()).featured));
        const staticSnapshot = ({ "/about": renderAboutSnapshot, "/help": renderHelpSnapshot, "/why": renderWhySnapshot, "/contact": renderContactSnapshot } as Record<string, () => string>)[pathname];
        if (staticSnapshot) body = injectContent(body, staticSnapshot());
        cacheable(res);
        return html(res, 200, body);
      }

      if (NOINDEX_PATHS.includes(pathname)) {
        return html(res, 200, injectMeta(indexHtml, { title: "BasicsTutor", description: "", url: `${base}${pathname}`, robots: "noindex" }));
      }

      if (!isKnownPath(pathname)) {
        // Unknown URL: the app shows its Not Found page; tell crawlers too.
        return html(res, 404, injectMeta(indexHtml, { title: "Page not found | BasicsTutor", description: "This page doesn't exist.", url: `${base}${pathname}`, robots: "noindex" }));
      }
    } catch (err) {
      // A lookup failure isn't the same as "doesn't exist" -- fall back to
      // the plain SPA shell rather than wrongly 404-ing a real page.
      console.error("[SEO] Meta injection failed:", err);
    }
    html(res, 200, indexHtml);
  });
}
