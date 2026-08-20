import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { generateQuizQuestions, generateTutorResponse } from "./ai";
import { generateQuickTopic } from "./fastAI";
import { processGenerationJob } from "./generation";
import { getUncachableStripeClient } from "./stripeClient";
import { type AuthenticatedRequest, type StripeWebhookRequest } from "./types";
import { handleError, Errors } from "./errors";
import {
  validate,
  SupportRequestSchema,
  QuizAnswerSchema,
  TopicGenerateSchema,
  TopicUpdateSchema,
  MessageSchema,
  SupportRequestUpdateSchema,
  WaitlistSchema,
  TutorMessageSchema,
  ReviewGradeSchema,
  ProgressUpdateSchema,
} from "./validation";
import { applySm2, nextMasteryScore, MASTERED_THRESHOLD } from "./spaced-repetition";
import { verifyUnsubscribe } from "./email-unsubscribe";
import { buildTopicSlug } from "@shared/levels";
import { config } from "./config";
import { aiLimiter, quickSearchLimiter, formLimiter, tutorLimiter } from "./security";
import { publicBaseUrl, buildSitemap } from "./seo";
import { computeMonthlyMasteryStats, currentMonthRange } from "./mastery";
import { renderTopicOgImage } from "./og-image";
import Stripe from "stripe";

const isProUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) throw Errors.unauthorized();

    const user = await storage.getUser(userId);
    if (!user || user.plan !== "pro") {
      throw Errors.forbidden("Pro subscription required for this feature");
    }
    if (user.proExpiresAt && new Date(user.proExpiresAt) < new Date()) {
      throw Errors.forbidden("Your Pro subscription has expired. Please renew to continue using Pro features.");
    }
    next();
  } catch (error) {
    handleError(error, res, 'Pro User Check');
  }
};

// Gates the AI Tutor: during free/early-access mode (monetizationEnabled=false)
// any signed-in user gets it, matching the "sign-in for extras" model used for
// the mind map. Once monetization is turned on, it becomes Pro-only.
const requireTutorAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) throw Errors.unauthorized();

    if (!config.features.monetizationEnabled) return next();

    const user = await storage.getUser(userId);
    if (!user || user.plan !== "pro") {
      throw Errors.forbidden("Pro subscription required for the AI Tutor");
    }
    if (user.proExpiresAt && new Date(user.proExpiresAt) < new Date()) {
      throw Errors.forbidden("Your Pro subscription has expired. Please renew to continue using the AI Tutor.");
    }
    next();
  } catch (error) {
    handleError(error, res, 'Tutor Access Check');
  }
};

// Adds principles to a user's spaced-repetition queue, first review due
// tomorrow. Idempotent: ensureReviewsScheduled skips any principle already
// tracked, so re-learning never wipes an in-progress review streak.
async function scheduleReviews(userId: string, topicId: string, principleIds: string[]): Promise<void> {
  if (principleIds.length === 0) return;
  const dueTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await storage.ensureReviewsScheduled(
    principleIds.map((principleId) => ({
      userId,
      topicId,
      principleId,
      dueAt: dueTomorrow,
      easeFactor: 250,
      interval: 1,
      repetitions: 0,
      status: "pending",
    })),
  );
}

const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) throw Errors.unauthorized();

    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      throw Errors.forbidden("Admin access required");
    }
    next();
  } catch (error) {
    handleError(error, res, 'Admin Check');
  }
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // -- STRIPE WEBHOOK --
  app.post('/api/stripe/webhook', async (req: StripeWebhookRequest, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.error("Missing signature or webhook secret");
      return res.status(400).send(`Webhook Error: Missing config`);
    }

    let event: Stripe.Event;
    const stripe = await getUncachableStripeClient();

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutSessionCompleted(session);
      }
      res.json({ received: true });
    } catch (error) {
       console.error("Error processing webhook:", error);
       res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const metadata = session.metadata || {};
    const userId = metadata.userId;
    
    if (!userId) return;

    if (metadata.type === 'topic_purchase' && metadata.topicId) {
      const existing = await storage.getTopicPurchase(userId, metadata.topicId);
      
      if (existing) {
         await storage.updateTopicPurchase(existing.id, {
           status: 'completed',
           stripePaymentIntentId: session.payment_intent as string,
         });
      } else {
        await storage.createTopicPurchase({
           userId,
           topicId: metadata.topicId,
           stripeSessionId: session.id,
           amount: session.amount_total || 0,
           currency: session.currency || 'usd',
           status: 'completed',
           stripePaymentIntentId: session.payment_intent as string,
        });
      }
    } else if (metadata.type === 'pro_annual') {
       const expiresAt = new Date();
       expiresAt.setFullYear(expiresAt.getFullYear() + 1);
       
       await storage.updateUser(userId, { 
         plan: 'pro', 
         proExpiresAt: expiresAt,
         stripeSubscriptionId: session.subscription as string 
       });
    }
  }

  // -- PUBLIC & AUTH API --

  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) throw Errors.notFound('User');
      res.json(user);
    } catch (error) {
      return handleError(error, res, 'Fetch User');
    }
  });

  // Public runtime configuration for the client (feature flags, etc.)
  app.get('/api/config', (_req, res) => {
    res.json({ monetizationEnabled: config.features.monetizationEnabled });
  });

  // One-click email unsubscribe (HMAC-signed link from review-reminder emails).
  // No auth: the signature proves the link was issued for this exact user.
  app.get('/api/unsubscribe', async (req: Request, res) => {
    const userId = String(req.query.u || '');
    const sig = String(req.query.sig || '');
    const ok = verifyUnsubscribe(userId, sig);
    if (ok) {
      await storage.updateUser(userId, { emailOptOut: true }).catch(() => {});
    }
    res
      .status(ok ? 200 : 400)
      .type('html')
      .send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ok ? 'Unsubscribed' : 'Invalid link'} — BasicsTutor</title></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0b0d12;color:#f8fafc;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
          <div style="text-align:center;max-width:420px;padding:24px">
            <div style="font-size:22px;font-weight:700;margin-bottom:8px">${ok ? "You're unsubscribed" : "This link is invalid"}</div>
            <p style="color:#94a3b8;line-height:1.6">${ok ? "You won't get review-reminder emails anymore. You can still review anytime from your dashboard." : "The unsubscribe link is malformed or has expired."}</p>
            <a href="${publicBaseUrl(req)}" style="display:inline-block;margin-top:16px;color:#a78bfa;text-decoration:none;font-weight:600">Back to BasicsTutor</a>
          </div>
        </body></html>`);
  });

  // -- WAITLIST (Pro interest capture) --
  app.post('/api/waitlist', formLimiter, validate(WaitlistSchema), async (req: Request, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || null;
      const { email, source } = req.body;
      await storage.addToWaitlist({ email, source: source || 'pro', userId });
      // Idempotent: whether the email is new or already present, respond success.
      res.status(201).json({ success: true });
    } catch (error) {
      return handleError(error, res, 'Waitlist Signup');
    }
  });

  app.get('/api/topics', async (_req, res) => {
    const topics = await storage.getPublicTopics();
    res.json(topics);
  });

  // -- SEO: robots + sitemap --

  app.get('/robots.txt', (req, res) => {
    const base = publicBaseUrl(req);
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`,
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const base = publicBaseUrl(req);
      const staticPaths = ['', '/pricing', '/why', '/help', '/contact', '/terms', '/privacy'];
      const entries: { loc: string; lastmod?: Date | null }[] = staticPaths.map((p) => ({
        loc: `${base}${p}`,
      }));

      const topics = await storage.getPublicTopics();
      for (const t of topics) {
        entries.push({ loc: `${base}/topic/${t.slug}`, lastmod: t.updatedAt || t.createdAt });
      }

      res.type('application/xml').send(buildSitemap(entries));
    } catch (error) {
      console.error('[Sitemap] Error:', error);
      res.status(500).send('Failed to build sitemap');
    }
  });

  // Per-topic Open Graph share image (1200x630 PNG). Referenced by the
  // og:image / twitter:image meta tags injected in server/seo.ts. Cached hard
  // (topic titles rarely change) so social scrapers and the CDN don't
  // re-render on every hit. Falls back to the static logo on any failure.
  app.get('/og/:slug', async (req, res) => {
    try {
      const slug = req.params.slug.replace(/\.png$/, "");
      const topic = await storage.getTopicBySlug(slug);
      if (!topic) return res.redirect(302, '/android-chrome-512x512.png');

      const png = await renderTopicOgImage(topic);
      res
        .type('image/png')
        .set('Cache-Control', 'public, max-age=86400, s-maxage=604800')
        .send(png);
    } catch (error) {
      console.error('[OG Image] Error:', error);
      res.redirect(302, '/android-chrome-512x512.png');
    }
  });

  app.get('/api/sample-topics', async (_req, res) => {
    const sampleTopics = await storage.getSampleTopics();
    res.json(sampleTopics);
  });

  app.get('/api/topics/trending', async (_req, res) => {
    const trending = await storage.getTrendingTopics();
    res.json(trending);
  });

  app.get('/api/topics/:slug', async (req, res) => {
    const topic = await storage.getTopicBySlug(req.params.slug);
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    res.json(topic);
  });

  app.get('/api/topics/:topicId/principles', async (req, res) => {
    const principles = await storage.getPrinciplesByTopic(req.params.topicId);
    res.json(principles);
  });

  // Related topics for internal linking (crawlability + "next lesson"). Trimmed
  // payload — no mind-map/validation blobs.
  app.get('/api/topics/:slug/related', async (req, res) => {
    const topic = await storage.getTopicBySlug(req.params.slug);
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    const related = await storage.getRelatedTopics(topic.id, topic.category, 6);
    res.json(
      related.map((t) => ({
        slug: t.slug,
        title: t.title,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        estimatedMinutes: t.estimatedMinutes,
      }))
    );
  });

  // -- CONTENT GENERATION (User) --

  app.post('/api/topics/generate', aiLimiter, validate(TopicGenerateSchema), async (req: Request, res) => {
    try {
      const userId = req.user?.claims?.sub || null;
      const { title, level } = req.body; // level validated + defaulted by TopicGenerateSchema

      // Each level is its own page/slug (Adults keeps the clean base slug).
      const slug = buildTopicSlug(title, level);

      // Existing topics resolve instantly — no job needed. Checked per level, so
      // requesting the Kids version of an existing Adults topic still generates.
      const existingTopic = await storage.getTopicBySlug(slug);
      if (existingTopic) {
        return res.json({ existing: true, topic: existingTopic });
      }

      // No generation limits beyond rate limiting — paywall is on content
      // access, not generation. Generation runs in the background so the
      // request returns immediately and isn't subject to proxy timeouts.
      const job = await storage.createGenerationJob({ userId, title, slug, level, status: "pending", progress: 0 });

      // Fire-and-forget: do not await. The client polls the status endpoint.
      void processGenerationJob(job.id);

      res.status(202).json({ existing: false, jobId: job.id, status: "pending" });
    } catch (error: any) {
      console.error("[Topic Generate] Error:", error);
      res.status(500).json({ message: error?.message || "Failed to start topic generation" });
    }
  });

  // Poll the status of a background generation job.
  app.get('/api/topics/generate/status/:jobId', async (req: Request, res) => {
    try {
      const job = await storage.getGenerationJob(req.params.jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });

      res.json({
        state: job.status, // pending | processing | completed | failed
        progress: job.progress ?? 0,
        result: job.status === "completed" && job.topicSlug ? { slug: job.topicSlug } : null,
        error: job.error || null,
      });
    } catch (error: any) {
      console.error("[Generation Status] Error:", error);
      res.status(500).json({ message: "Failed to fetch job status" });
    }
  });

  // -- LIBRARY SEARCH (instant, no AI) --

  // Search-as-you-type over the existing public library. Cheap DB query so
  // it can fire on every keystroke; the paid AI quick-search below only runs
  // on an explicit user action. See ProgressiveSearch.tsx.
  app.get('/api/topics/search', async (req: Request, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (q.length < 2) return res.json([]);
      const matches = await storage.searchPublicTopics(q, 6);
      res.json(matches.map((t) => ({
        slug: t.slug,
        title: t.title,
        description: t.description,
        category: t.category,
        level: t.level,
        estimatedMinutes: t.estimatedMinutes,
      })));
    } catch (error) {
      console.error("[Library Search] Error:", error);
      // Suggestions are an enhancement -- an empty list degrades gracefully.
      res.json([]);
    }
  });

  // -- QUICK SEARCH (Fast AI) --

  app.post('/api/topics/quick-search', quickSearchLimiter, async (req: Request, res) => {
    try {
      const { title } = req.body;
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: "Title is required" });
      }

      // Check if topic already exists
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existingTopic = await storage.getTopicBySlug(slug);
      
      if (existingTopic) {
        // Return existing topic in quick format. Also report which audience
        // levels already exist so the client's level selector can say "Start
        // Learning" (navigate) instead of "Generate" for versions we have.
        const [principles, kidTopic, teenTopic] = await Promise.all([
          storage.getPrinciplesByTopic(existingTopic.id),
          storage.getTopicBySlug(`${slug}-kid`),
          storage.getTopicBySlug(`${slug}-teen`),
        ]);
        const existingLevels = ['adult'];
        if (kidTopic) existingLevels.push('kid');
        if (teenTopic) existingLevels.push('teen');
        return res.json({
          title: existingTopic.title,
          description: existingTopic.description,
          category: existingTopic.category,
          difficulty: existingTopic.difficulty,
          estimatedMinutes: existingTopic.estimatedMinutes,
          keyPoints: principles.slice(0, 5).map(p => p.title),
          existing: true,
          slug: existingTopic.slug,
          existingLevels,
        });
      }

      // Generate quick result (2-3 seconds)
      const quickResult = await generateQuickTopic(title);
      res.json(quickResult);
    } catch (error) {
      console.error("[Quick Search] Error:", error);
      res.status(500).json({ message: error.message || "Failed to generate quick search" });
    }
  });

  // -- QUIZZES & PROGRESS --

  app.post('/api/topics/:topicId/quiz', aiLimiter, async (req: Request, res) => {
    try {
      const { topicId } = req.params;
      const userId = req.user?.claims?.sub || null;
      const topic = await storage.getTopic(topicId);
      
      if (!topic) return res.status(404).json({ message: "Topic not found" });
      if (!topic.isSample && !userId) return res.status(401).json({ message: "Sign in required" });

      const principles = await storage.getPrinciplesByTopic(topicId);
      const questions = await generateQuizQuestions(topic.title, principles);

      const quiz = await storage.createQuiz({
        topicId,
        userId: userId || null,
        totalQuestions: questions.length,
      });

      const questionData = questions.map((q: any) => ({
        quizId: quiz.id,
        principleId: q.principleId,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));

      const createdQuestions = await storage.createQuestions(questionData);
      res.json({ quiz, questions: createdQuestions });
    } catch (error) {
      res.status(500).json({ message: "Failed to create quiz" });
    }
  });

  app.post('/api/quiz/:quizId/answer', validate(QuizAnswerSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const { quizId } = req.params;
      const { questionId, answer } = req.body;
      const questions = await storage.getQuestionsByQuiz(quizId);
      const question = questions.find(q => q.id === questionId);

      if (!question) throw Errors.notFound('Question');

      const isCorrect = answer === question.correctAnswer;
      await storage.updateQuestion(questionId, { userAnswer: answer, isCorrect });

      res.json({ isCorrect, correctAnswer: question.correctAnswer, explanation: question.explanation });
    } catch (error) {
      return handleError(error, res, 'Quiz Answer');
    }
  });

  app.post('/api/quiz/:quizId/complete', async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.claims?.sub || null;
    const { quizId } = req.params;
    const quiz = await storage.getQuiz(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const questions = await storage.getQuestionsByQuiz(quizId);
    const correctCount = questions.filter(q => q.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);

    await storage.updateQuiz(quizId, { score, completedAt: new Date() });

    if (userId) {
      const currentProgress = await storage.getProgress(userId, quiz.topicId);
      const principles = await storage.getPrinciplesByTopic(quiz.topicId);

      await storage.upsertProgress({
        userId,
        topicId: quiz.topicId,
        principlesCompleted: currentProgress?.principlesCompleted || principles.length,
        totalPrinciples: principles.length,
        quizzesTaken: (currentProgress?.quizzesTaken || 0) + 1,
        bestScore: Math.max(score, currentProgress?.bestScore || 0),
        completedAt: score >= config.quiz.passingScore ? new Date() : null,
      });

      // Completing a quiz means you've engaged with the whole topic -> add all
      // its principles to your spaced-repetition queue (no-op for any already
      // scheduled). This is what populates the "come back tomorrow" loop.
      await scheduleReviews(userId, quiz.topicId, principles.map(p => p.id));
    }
    res.json({ score, correctCount, totalQuestions: questions.length });
  });

  // Save learning progress for a topic and schedule the completed principles
  // for review. Previously this route didn't exist, so "Mark as Understood"
  // silently 404'd -- progress only advanced via quiz completion.
  app.post('/api/progress/:topicId', isAuthenticated, validate(ProgressUpdateSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { topicId } = req.params;
      const { principlesCompleted, totalPrinciples } = req.body;

      const existing = await storage.getProgress(userId, topicId);
      await storage.upsertProgress({
        userId,
        topicId,
        principlesCompleted,
        totalPrinciples,
        quizzesTaken: existing?.quizzesTaken || 0,
        bestScore: existing?.bestScore || null,
        completedAt: existing?.completedAt || null,
      });

      // Schedule the first N principles (the ones marked understood) for review.
      const principles = await storage.getPrinciplesByTopic(topicId);
      const learnedIds = principles.slice(0, principlesCompleted).map(p => p.id);
      await scheduleReviews(userId, topicId, learnedIds);

      res.json({ success: true });
    } catch (error) {
      return handleError(error, res, 'Progress Update');
    }
  });

  app.get('/api/user/progress', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    const userId = req.user.claims.sub;
    const progressList = await storage.getProgressByUser(userId);
    res.json(progressList);
  });

  // Private "ahead of X% of learners this month" stat -- never a public
  // leaderboard. See server/mastery.ts for why the percentile hides itself
  // until there's a real cohort to compare against.
  app.get('/api/user/monthly-mastery', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    const userId = req.user.claims.sub;
    const { start, end } = currentMonthRange();
    const counts = await storage.getMonthlyMasteryCounts(start, end);
    res.json(computeMonthlyMasteryStats(counts, userId));
  });

  app.get('/api/user/topics', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    const userId = req.user.claims.sub;
    const createdTopics = await storage.getTopicsByUser(userId);
    const progressList = await storage.getProgressByUser(userId);
    const progressTopicIds = progressList.map(p => p.topicId).filter((id): id is string => !!id);
    const progressTopics = progressTopicIds.length > 0 ? await storage.getTopicsByIds(progressTopicIds) : [];
    
    const topicMap = new Map();
    createdTopics.forEach(t => topicMap.set(t.id, t));
    progressTopics.forEach(t => topicMap.set(t.id, t));
    res.json(Array.from(topicMap.values()));
  });

  app.get('/api/user/purchases', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    const userId = req.user.claims.sub;
    const purchases = await storage.getTopicPurchasesByUser(userId);
    res.json(purchases);
  });

  // -- SPACED REPETITION REVIEW --

  app.get('/api/reviews/stats', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const [dueCount, totalTracked, mastery] = await Promise.all([
        storage.getDueReviewCount(userId),
        storage.getReviewCountByUser(userId),
        storage.getPrincipleMasteryByUser(userId),
      ]);
      const masteredCount = mastery.filter((m) => (m.masteryScore || 0) >= MASTERED_THRESHOLD).length;
      const averageMastery = mastery.length
        ? Math.round(mastery.reduce((sum, m) => sum + (m.masteryScore || 0), 0) / mastery.length)
        : 0;
      res.json({ dueCount, totalTracked, averageMastery, masteredCount });
    } catch (error) {
      return handleError(error, res, 'Review Stats');
    }
  });

  app.get('/api/reviews/due', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const due = await storage.getDueReviews(userId, 50);

      // Enrich each due review with its principle + topic for the flashcard UI.
      const principleIds = Array.from(new Set(due.map((d) => d.principleId)));
      const topicIds = Array.from(new Set(due.map((d) => d.topicId)));
      const [principles, topics] = await Promise.all([
        storage.getPrinciplesByIds(principleIds),
        storage.getTopicsByIds(topicIds),
      ]);
      const principleById = new Map(principles.map((p) => [p.id, p]));
      const topicById = new Map(topics.map((t) => [t.id, t]));

      res.json(
        due.map((d) => {
          const p = principleById.get(d.principleId);
          const t = topicById.get(d.topicId);
          return {
            ...d,
            principle: p
              ? { id: p.id, title: p.title, explanation: p.explanation, analogy: p.analogy, keyTakeaways: p.keyTakeaways }
              : null,
            topic: t ? { id: t.id, title: t.title, slug: t.slug } : null,
          };
        }),
      );
    } catch (error) {
      return handleError(error, res, 'Due Reviews');
    }
  });

  app.post('/api/reviews/:id/grade', isAuthenticated, validate(ReviewGradeSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { quality } = req.body;

      const review = await storage.getReviewScheduleById(id);
      if (!review) throw Errors.notFound('Review');
      if (review.userId !== userId) throw Errors.forbidden('Not your review');

      // SM-2: decide the next interval/ease from how well it was recalled.
      const next = applySm2(
        {
          easeFactor: review.easeFactor ?? 250,
          interval: review.interval ?? 1,
          repetitions: review.repetitions ?? 0,
        },
        quality,
      );
      await storage.updateReviewSchedule(id, {
        easeFactor: next.easeFactor,
        interval: next.interval,
        repetitions: next.repetitions,
        dueAt: next.dueAt,
        status: 'pending',
      });

      // Roll the principle's mastery score forward.
      const existingMastery = await storage.getPrincipleMastery(userId, review.principleId);
      await storage.upsertPrincipleMastery({
        userId,
        principleId: review.principleId,
        topicId: review.topicId,
        masteryScore: nextMasteryScore(existingMastery?.masteryScore ?? 0, quality),
        timesReviewed: (existingMastery?.timesReviewed ?? 0) + 1,
        timesCorrect: (existingMastery?.timesCorrect ?? 0) + (quality >= 3 ? 1 : 0),
        lastReviewedAt: new Date(),
      });

      res.json({
        message: quality < 3 ? "We'll show this again soon" : "Nice — scheduled further out",
        nextReviewIn: next.interval,
      });
    } catch (error) {
      return handleError(error, res, 'Review Grade');
    }
  });

  // -- AI TUTOR --

  // Idempotent: finds or creates the session for this (user, topic, principle)
  // combo and returns it with its full current message history. Called both
  // when the chat is first opened and again after every message send (the
  // client invalidates this query to refetch, rather than using a separate
  // GET), so it must always reflect the latest messages.
  app.post('/api/tutor/session', isAuthenticated, requireTutorAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { topicId, principleId } = req.body;
      if (!topicId) throw Errors.badRequest('topicId is required');

      let session = await storage.getTutorSessionByTopicAndPrinciple(userId, topicId, principleId || undefined);
      if (!session) {
        const topic = await storage.getTopic(topicId);
        if (!topic) throw Errors.notFound('Topic');
        session = await storage.createTutorSession({
          userId,
          topicId,
          principleId: principleId || null,
          title: topic.title,
        });
      }

      const messages = await storage.getTutorMessagesBySession(session.id);
      res.json({ session, messages });
    } catch (error) {
      return handleError(error, res, 'Tutor Session');
    }
  });

  app.post(
    '/api/tutor/session/:sessionId/message',
    isAuthenticated,
    requireTutorAccess,
    tutorLimiter,
    validate(TutorMessageSchema),
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user.claims.sub;
        const { sessionId } = req.params;
        const { content } = req.body;

        const session = await storage.getTutorSession(sessionId);
        if (!session) throw Errors.notFound('Tutor session');
        if (session.userId !== userId) throw Errors.forbidden('Not your session');

        const topic = await storage.getTopic(session.topicId);
        if (!topic) throw Errors.notFound('Topic');

        let principleContext: { title: string; explanation: string } | undefined;
        if (session.principleId) {
          const principles = await storage.getPrinciplesByTopic(session.topicId);
          const principle = principles.find((p) => p.id === session.principleId);
          if (principle) principleContext = { title: principle.title, explanation: principle.explanation };
        }

        // Prior turns only — the new user message is passed separately as the
        // live turn Gemini is responding to, not as part of the history.
        const priorMessages = await storage.getTutorMessagesBySession(sessionId);
        const history = priorMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        await storage.createTutorMessage({ sessionId, role: 'user', content });
        const replyText = await generateTutorResponse(topic.title, principleContext, history, content);
        const assistantMessage = await storage.createTutorMessage({ sessionId, role: 'assistant', content: replyText });

        res.json({ message: assistantMessage });
      } catch (error) {
        return handleError(error, res, 'Tutor Message');
      }
    },
  );

  // -- CHECKOUT --

  app.post('/api/checkout/topic/:topicId', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      if (!config.features.monetizationEnabled) {
        return res.status(503).json({ message: "Payments aren't available yet — everything is free during early access." });
      }
      const userId = req.user.claims.sub;
      const { topicId } = req.params;
      const user = await storage.getUser(userId);
      const topic = await storage.getTopic(topicId);
      
      if (!user || !topic) return res.status(404).json({ message: "User or Topic not found" });
      if (await storage.hasUserPurchasedTopic(userId, topicId)) return res.status(400).json({ message: "Already purchased" });

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
             currency: 'usd',
             product_data: { name: `Topic: ${topic.title}`, description: 'Lifetime access' },
             unit_amount: config.pricing.topicPurchase,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&topic_id=${topicId}`,
        cancel_url: `${baseUrl}/checkout/cancel?topic_id=${topicId}`,
        metadata: { userId, topicId, type: 'topic_purchase' },
      });

      await storage.createTopicPurchase({
        userId, topicId, stripeSessionId: session.id, amount: config.pricing.topicPurchase, currency: 'usd', status: 'pending',
      });

      res.json({ url: session.url });
    } catch (error) {
      res.status(500).json({ message: "Checkout failed" });
    }
  });

  app.get('/api/checkout/verify/:sessionId', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.params;
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // Logic for client-side verification is minimal; we rely on webhook for actual fulfillment
      res.json({ success: session.payment_status === 'paid' });
    } catch (error) {
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Check topic access - works for both authenticated and anonymous users
  app.get('/api/user/can-access-topic/:topicId', async (req: Request, res) => {
      const userId = req.user?.claims?.sub;
      const { topicId } = req.params;
      const topic = await storage.getTopic(topicId);

      if (!topic) {
        return res.status(404).json({ canAccess: false, reason: 'Topic not found' });
      }

      // Free / early-access launch mode: everything is unlocked for everyone.
      if (!config.features.monetizationEnabled) {
        return res.json({ canAccess: true, reason: 'free_launch' });
      }

      // Sample topics are free for everyone
      if (topic?.isSample) {
        return res.json({ canAccess: true, reason: 'sample' });
      }

      // Anonymous users get preview mode only
      if (!userId) {
        return res.json({
          canAccess: false,
          previewMode: true,
          previewPrinciples: 2, // Show first 2 principles
          reason: 'anonymous',
          unlockOptions: {
            payPerTopic: config.pricing.topicPurchase,
            proMonthly: config.pricing.proMonthly
          }
        });
      }

      // Authenticated users
      const user = await storage.getUser(userId);

      // Pro users get full access
      if (user?.plan === 'pro') {
        return res.json({ canAccess: true, reason: 'pro_subscription' });
      }

      // User owns this topic
      if (topic?.userId === userId) {
        return res.json({ canAccess: true, reason: 'owner' });
      }

      // User purchased this topic
      if (await storage.hasUserPurchasedTopic(userId, topicId)) {
        return res.json({ canAccess: true, reason: 'purchased' });
      }

      // Free users get preview mode
      res.json({
        canAccess: false,
        previewMode: true,
        previewPrinciples: 2,
        reason: 'free_tier',
        unlockOptions: {
          payPerTopic: config.pricing.topicPurchase,
          proMonthly: config.pricing.proMonthly
        }
      });
  });

  // -- SUPPORT --

  app.post('/api/support', validate(SupportRequestSchema), async (req: Request, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { email, type, priority, subject, description } = req.body;
      const request = await storage.createSupportRequest({
        userId: userId || null, email, type, priority, subject, description
      });
      res.status(201).json(request);
    } catch (error) {
      return handleError(error, res, 'Support Request Creation');
    }
  });

  app.get('/api/support/mine', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    const userId = req.user.claims.sub;
    const requests = await storage.getSupportRequestsByUser(userId);
    res.json(requests);
  });

  app.get('/api/support/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
     const userId = req.user.claims.sub;
     const request = await storage.getSupportRequest(req.params.id);
     if (!request) return res.status(404).json({message: "Not found"});
     
     const user = await storage.getUser(userId);
     if (request.userId !== userId && !user?.isAdmin) {
         return res.status(403).json({message: "Unauthorized"});
     }
     res.json(request);
  });

  app.get('/api/support/:id/messages', isAuthenticated, async (req: AuthenticatedRequest, res) => {
      const userId = req.user.claims.sub;
      const request = await storage.getSupportRequest(req.params.id);
      if (!request) return res.status(404).json({message: "Not found"});

      const user = await storage.getUser(userId);
      if (request.userId !== userId && !user?.isAdmin) {
          return res.status(403).json({message: "Unauthorized"});
      }

      const messages = await storage.getSupportMessagesByRequest(req.params.id);
      res.json(messages);
  });
  
  app.post('/api/support/:id/messages', isAuthenticated, validate(MessageSchema), async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        const request = await storage.getSupportRequest(req.params.id);

        if (!request) throw Errors.notFound('Support request');

        const isAuthor = request.userId === userId;
        const isAdmin = user?.isAdmin;

        if (!isAuthor && !isAdmin) throw Errors.forbidden('You can only reply to your own support requests');

        const message = await storage.createSupportMessage({
            requestId: req.params.id,
            authorType: isAdmin ? 'admin' : 'user',
            authorId: userId,
            message: req.body.message
        });
        res.json(message);
      } catch (error) {
        return handleError(error, res, 'Support Message');
      }
  });

  // -- ADMIN ROUTES --

  app.get('/api/admin/check', isAuthenticated, async (req: AuthenticatedRequest, res) => {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({ isAdmin: user?.isAdmin === true });
  });

  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (_req, res) => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [
        userCount, topicCount, revenueStats, waitlistCount,
        newUsersToday, newTopicsToday, newUsers7d, newTopics7d,
      ] = await Promise.all([
        storage.getUserCount(),
        storage.getTopicCount(),
        storage.getRevenueStats(),
        storage.getWaitlistCount(),
        storage.getUserCount(startOfToday),
        storage.getTopicCount(startOfToday),
        storage.getUserCount(sevenDaysAgo),
        storage.getTopicCount(sevenDaysAgo),
      ]);

      res.json({
          totalUsers: userCount,
          totalTopics: topicCount,
          totalRevenue: revenueStats.totalRevenue,
          topicPurchases: revenueStats.topicPurchases,
          proSubscriptions: revenueStats.proSubscriptions,
          waitlistCount,
          newUsersToday,
          newTopicsToday,
          newUsersLast7Days: newUsers7d,
          newTopicsLast7Days: newTopics7d,
      });
  });

  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const users = await storage.getAllUsers(limit, offset);
      const total = await storage.getUserCount();
      res.json({ users, total, limit, offset });
  });

  app.patch('/api/admin/users/:userId/admin', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
      const user = await storage.setUserAdmin(req.params.userId, req.body.isAdmin);
      res.json(user);
  });

  app.patch('/api/admin/users/:userId/pro', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
      const user = await storage.setUserPro(req.params.userId, req.body.isPro, req.body.expiresAt ? new Date(req.body.expiresAt) : undefined);
      res.json(user);
  });

  app.get('/api/admin/topics', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const topics = await storage.getAllTopics(limit, offset);
      const total = await storage.getTopicCount();
      res.json({ topics, total, limit, offset });
  });

  app.patch('/api/admin/topics/:topicId', isAuthenticated, isAdmin, validate(TopicUpdateSchema), async (req: AuthenticatedRequest, res) => {
      try {
        const topic = await storage.updateTopic(req.params.topicId, req.body);
        if (!topic) throw Errors.notFound('Topic');
        res.json(topic);
      } catch (error) {
        return handleError(error, res, 'Admin Topic Update');
      }
  });

  app.delete('/api/admin/topics/:topicId', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
      await storage.deleteTopicById(req.params.topicId);
      res.json({ success: true });
  });
  
  app.get('/api/admin/support', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      // Filters would be parsed here
      const requests = await storage.getAllSupportRequests({}, limit, offset);
      const total = await storage.getSupportRequestCount({});
      res.json({ requests, total, limit, offset });
  });
  
  app.patch('/api/admin/support/:id', isAuthenticated, isAdmin, validate(SupportRequestUpdateSchema), async (req: AuthenticatedRequest, res) => {
      try {
        const updated = await storage.updateSupportRequest(req.params.id, req.body);
        if (!updated) throw Errors.notFound('Support request');
        res.json(updated);
      } catch (error) {
        return handleError(error, res, 'Admin Support Update');
      }
  });

  app.get('/api/admin/purchases', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
      const purchases = await storage.getAllTopicPurchases();
      res.json({ purchases });
  });
  
  app.get('/api/admin/admins', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
      const admins = await storage.getAdminUsers();
      res.json(admins);
  });

  app.get('/api/admin/waitlist', isAuthenticated, isAdmin, async (req: Request, res) => {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const entries = await storage.getWaitlist(limit, offset);
      const total = await storage.getWaitlistCount();
      res.json({ entries, total, limit, offset });
  });

  return httpServer;
}
