import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { getStripePublishableKey } from "./stripeClient";
import { config, validateConfig, printConfigSummary } from "./config";
import { registerShutdownHandlers } from "./shutdown";
import { setupSecurity, apiLimiter } from "./security";

const app = express();
const httpServer = createServer(app);

// Security headers, CORS, and CSP (must run before routes).
setupSecurity(app);

// Canonical host redirect: www.basicstutor.com -> basicstutor.com. Keeps
// exactly one real domain in play -- avoids split SEO signals, and avoids
// needing a separate registered Google OAuth redirect URI for the www
// variant (it would otherwise send redirect_uri=https://www.basicstutor.com/...,
// which isn't registered, reproducing the exact redirect_uri_mismatch this
// app already fought through once for the bare Render domain).
app.use((req, res, next) => {
  if (req.hostname === "www.basicstutor.com") {
    return res.redirect(301, `https://basicstutor.com${req.originalUrl}`);
  }
  next();
});

// Use raw body for Stripe webhook (signature verification needs the raw bytes).
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe/webhook") {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json({ limit: "1mb" })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// General API rate limit (specific endpoints like AI generation and the
// tutor add their own, stricter limiters on top of this). Stripe's webhook
// is signature-verified, not user-driven, so it's exempt.
app.use('/api', (req, res, next) => {
  if (req.path === '/stripe/webhook') return next();
  return apiLimiter(req, res, next);
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate configuration
  try {
    validateConfig();
    if (!config.server.isProduction) {
      printConfigSummary();
    }
  } catch (error) {
    console.error('❌ Configuration Error:');
    console.error(error instanceof Error ? error.message : error);
    console.error('\nPlease check your .env file or environment configuration.');
    console.error('See .env.example for required variables.');
    process.exit(1);
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log server-side; never re-throw from an error handler (that would crash
    // the process / trigger shutdown after the response has already been sent).
    if (status >= 500) {
      console.error("[Unhandled Error]", err);
    }

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  if (config.server.isProduction) {
    serveStatic(app);
  } else {
    // Serve static files from client/public in development mode
    const path = await import("path");
    app.use(express.static(path.resolve(import.meta.dirname, "..", "client", "public")));

    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  httpServer.listen(
    {
      port: config.server.port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${config.server.port}`);

      // Register graceful shutdown handlers
      registerShutdownHandlers(httpServer);
    },
  );
})();
