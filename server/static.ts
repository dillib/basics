import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { buildTopicMeta, injectMeta, publicBaseUrl } from "./seo";

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
    try {
      const match = req.originalUrl.split("?")[0].match(/^\/topic\/([^/]+)$/);
      if (match) {
        const slug = decodeURIComponent(match[1]);
        const topic = await storage.getTopicBySlug(slug);
        if (topic) {
          const meta = buildTopicMeta(topic, publicBaseUrl(req));
          return res
            .status(200)
            .set("Content-Type", "text/html")
            .send(injectMeta(indexHtml, meta));
        }
      }
    } catch (err) {
      // Never let a metadata lookup break page delivery — fall back to the SPA.
      console.error("[SEO] Meta injection failed:", err);
    }
    res.status(200).set("Content-Type", "text/html").send(indexHtml);
  });
}
