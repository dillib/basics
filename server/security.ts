import type { Express, Request } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit, { type Options as RateLimitOptions } from "express-rate-limit";
import { config } from "./config";

/**
 * Security middleware: HTTP security headers (helmet), CORS, and a sensible
 * Content-Security-Policy that allows the resources this app actually loads
 * (Google Fonts, Google profile images, same-origin bundle).
 *
 * CSP is only enabled in production because the Vite dev server relies on
 * inline scripts / eval / websocket connections that a strict CSP would block.
 */
export function setupSecurity(app: Express): void {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      // No configured origins => same-origin only (the SPA is served by this
      // server), which is the safe default. Add ALLOWED_ORIGINS for any
      // external clients.
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: config.server.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              // Cloudflare Web Analytics beacon (client/index.html) -- DNS-only
              // mode means Cloudflare can't auto-inject it via proxy, so it's a
              // real <script> tag that needs an explicit CSP allowance.
              scriptSrc: ["'self'", "https://static.cloudflareinsights.com"],
              // Tailwind + framer-motion apply inline style attributes.
              styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
              fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'", "https://api.stripe.com", "https://cloudflareinsights.com", "https://static.cloudflareinsights.com"],
              frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'", "https://checkout.stripe.com"],
              frameAncestors: ["'self'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      // Allow cross-origin loading of static assets (images, fonts, PDFs).
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
}

/** Identify the client by authenticated user id when available, else by IP. */
function clientKey(req: Request): string {
  const userId = (req as any).user?.claims?.sub;
  return userId ? `user:${userId}` : `ip:${req.ip}`;
}

const sharedOptions: Partial<RateLimitOptions> = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  // Don't rate-limit in the test environment.
  skip: () => config.server.isTest,
};

/**
 * Broad limiter for the whole API surface. Generous enough not to affect normal
 * browsing, strict enough to blunt scraping / abuse.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { message: "Too many requests. Please slow down and try again shortly." },
  ...sharedOptions,
});

/**
 * Strict limiter for the expensive, AI-backed generation endpoints. These call
 * Gemini and write to the database, so unbounded access is both a cost and an
 * abuse risk. Keyed per user/IP.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || "20", 10),
  message: {
    message:
      "You've reached the hourly limit for generating new topics. Please try again later or sign in for higher limits.",
  },
  ...sharedOptions,
});

/** Lighter limiter for the instant "quick search" preview endpoint. */
export const quickSearchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.QUICK_SEARCH_RATE_LIMIT_PER_MIN || "15", 10),
  message: { message: "Too many searches. Please wait a moment and try again." },
  ...sharedOptions,
});

/** Limiter for public write endpoints like waitlist / support submissions. */
export const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: "Too many submissions. Please try again later." },
  ...sharedOptions,
});

/** Limiter for AI Tutor messages — each one is a Gemini call, so this is the
 * expensive endpoint; session lookup/creation itself is plain DB IO and
 * covered by the general apiLimiter instead. */
export const tutorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.TUTOR_RATE_LIMIT_PER_HOUR || "40", 10),
  message: { message: "You've reached the hourly limit for AI Tutor messages. Please try again later." },
  ...sharedOptions,
});
