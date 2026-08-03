import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { buildTopicMeta, injectMeta, injectContent, renderContentSnapshot, publicBaseUrl } from "./seo";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve hashed assets etc., but let the catch-all own index.html so we can
  // inject per-page metadata for crawlers and social unfurlers.
  app.use(express.static(distPath, { index: false }));

  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  // SPA fallback with server-side metadata injection for topic pages.
  app.use("*", async (req, res) => {
    const match = req.originalUrl.split("?")[0].match(/^\/topic\/([^/]+)$/);
    if (match) {
      try {
        const slug = decodeURIComponent(match[1]);
        const topic = await storage.getTopicBySlug(slug);
        if (topic) {
          const meta = buildTopicMeta(topic, publicBaseUrl(req));
          const principles = await storage.getPrinciplesByTopic(topic.id);
          const withMeta = injectMeta(indexHtml, meta);
          const withContent = injectContent(withMeta, renderContentSnapshot(topic, principles));
          return res.status(200).set("Content-Type", "text/html").send(withContent);
        }
        // /topic/:slug shape but no such topic -- a real 404, not a 200 with
        // an empty shell. Serving 200 here is what Search Console flags as a
        // soft 404: it looks fine to the server, empty to everyone else.
        return res.status(404).set("Content-Type", "text/html").send(indexHtml);
      } catch (err) {
        // A lookup failure isn't the same as "doesn't exist" -- fall back to
        // the plain SPA shell rather than wrongly 404-ing a real page.
        console.error("[SEO] Meta injection failed:", err);
        return res.status(200).set("Content-Type", "text/html").send(indexHtml);
      }
    }
    res.status(200).set("Content-Type", "text/html").send(indexHtml);
  });
}
