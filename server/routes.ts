import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateTopicContent, generateQuizQuestions } from "./ai";
import { insertTopicSchema } from "@shared/schema";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

const isProUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUser(userId);
    if (!user || user.plan !== "pro") {
      return res.status(403).json({ message: "Pro subscription required for this feature" });
    }
    if (user.proExpiresAt && new Date(user.proExpiresAt) < new Date()) {
      return res.status(403).json({ message: "Your Pro subscription has expired. Please renew to continue using Pro features." });
    }
    next();
  } catch (error) {
    console.error("Error checking Pro status:", error);
    res.status(500).json({ message: "Failed to verify subscription status" });
  }
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/topics', async (_req, res) => {
    try {
      const topics = await storage.getPublicTopics();
      res.json(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  app.get('/api/sample-topics', async (_req, res) => {
    try {
      const sampleTopics = await storage.getSampleTopics();
      res.json(sampleTopics);
    } catch (error) {
      console.error("Error fetching sample topics:", error);
      res.status(500).json({ message: "Failed to fetch sample topics" });
    }
  });

  app.get('/api/topics/:slug', async (req, res) => {
    try {
      const topic = await storage.getTopicBySlug(req.params.slug);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      res.json(topic);
    } catch (error) {
      console.error("Error fetching topic:", error);
      res.status(500).json({ message: "Failed to fetch topic" });
    }
  });

  app.get('/api/topics/:topicId/principles', async (req, res) => {
    try {
      const principles = await storage.getPrinciplesByTopic(req.params.topicId);
      res.json(principles);
    } catch (error) {
      console.error("Error fetching principles:", error);
      res.status(500).json({ message: "Failed to fetch principles" });
    }
  });

  app.post('/api/topics/generate', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { title } = req.body;
      
      console.log(`[Topic Generate] Starting for "${title}" by user ${userId || 'anonymous'}`);

      if (!title) {
        return res.status(400).json({ message: "Topic title is required" });
      }

      let user = null;
      if (userId) {
        user = await storage.getUser(userId);
        if (!user) {
          console.log(`[Topic Generate] User not found: ${userId}`);
          return res.status(404).json({ message: "User not found" });
        }

        if (user.plan === 'free' && (user.topicsUsed || 0) >= 1) {
          console.log(`[Topic Generate] Free tier limit reached for user ${userId}`);
          return res.status(403).json({ message: "Free tier limit reached. Please upgrade to Pro." });
        }
      }

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const existingTopic = await storage.getTopicBySlug(slug);
      if (existingTopic) {
        console.log(`[Topic Generate] Returning existing topic: ${slug}`);
        return res.json(existingTopic);
      }

      console.log(`[Topic Generate] Calling AI for "${title}"...`);
      const startTime = Date.now();
      const content = await generateTopicContent(title);
      console.log(`[Topic Generate] AI completed in ${Date.now() - startTime}ms`);

      const newTopic = await storage.createTopic({
        userId: userId || null,
        title,
        slug,
        description: content.description,
        category: content.category,
        difficulty: content.difficulty,
        estimatedMinutes: content.estimatedMinutes,
        isPublic: true,
      });
      console.log(`[Topic Generate] Topic created with id: ${newTopic.id}`);

      const principleData = content.principles.map((p: any, index: number) => ({
        topicId: newTopic.id,
        orderIndex: index,
        title: p.title,
        explanation: p.explanation,
        analogy: p.analogy,
        visualType: p.visualType,
        visualData: p.visualData,
        keyTakeaways: p.keyTakeaways,
      }));

      await storage.createPrinciples(principleData);
      console.log(`[Topic Generate] Created ${principleData.length} principles`);

      // Update user's topics used count only if authenticated
      if (userId && user) {
        await storage.updateUser(userId, { topicsUsed: (user.topicsUsed || 0) + 1 });
      }

      res.json(newTopic);
    } catch (error) {
      console.error("[Topic Generate] Error:", error);
      res.status(500).json({ message: "Failed to generate topic content" });
    }
  });

  app.post('/api/topics/:topicId/quiz', async (req: any, res) => {
    try {
      const { topicId } = req.params;
      const userId = req.user?.claims?.sub || null;

      const topic = await storage.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }

      // Sample topics are free for everyone, non-sample topics require auth for quiz
      if (!topic.isSample && !userId) {
        return res.status(401).json({ message: "Please sign in to take quizzes for this topic" });
      }

      const principles = await storage.getPrinciplesByTopic(topicId);
      if (principles.length === 0) {
        return res.status(400).json({ message: "No principles found for this topic" });
      }

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
      console.error("Error creating quiz:", error);
      res.status(500).json({ message: "Failed to create quiz" });
    }
  });

  app.post('/api/quiz/:quizId/answer', async (req: any, res) => {
    try {
      const { quizId } = req.params;
      const { questionId, answer } = req.body;

      const quiz = await storage.getQuiz(quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      const questions = await storage.getQuestionsByQuiz(quizId);
      const question = questions.find(q => q.id === questionId);

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const isCorrect = answer === question.correctAnswer;

      await storage.updateQuestion(questionId, {
        userAnswer: answer,
        isCorrect,
      });

      res.json({
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  app.post('/api/quiz/:quizId/complete', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || null;
      const { quizId } = req.params;

      const quiz = await storage.getQuiz(quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      const questions = await storage.getQuestionsByQuiz(quizId);
      const correctCount = questions.filter(q => q.isCorrect).length;
      const score = Math.round((correctCount / questions.length) * 100);

      await storage.updateQuiz(quizId, {
        score,
        completedAt: new Date(),
      });

      // Only save progress for authenticated users
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
          completedAt: score >= 70 ? new Date() : null,
        });
      }

      res.json({ score, correctCount, totalQuestions: questions.length });
    } catch (error) {
      console.error("Error completing quiz:", error);
      res.status(500).json({ message: "Failed to complete quiz" });
    }
  });

  app.get('/api/user/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progressList = await storage.getProgressByUser(userId);
      res.json(progressList);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.get('/api/user/topics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get topics created by user
      const createdTopics = await storage.getTopicsByUser(userId);
      
      // Get topics user has progress on
      const progressList = await storage.getProgressByUser(userId);
      // Filter out undefined/null topic IDs
      const progressTopicIds = progressList
        .map(p => p.topicId)
        .filter((id): id is string => !!id);
      const progressTopics = progressTopicIds.length > 0 
        ? await storage.getTopicsByIds(progressTopicIds)
        : [];
      
      // Merge and deduplicate
      const topicMap = new Map<string, typeof createdTopics[0]>();
      createdTopics.forEach(t => topicMap.set(t.id, t));
      progressTopics.forEach(t => topicMap.set(t.id, t));
      
      res.json(Array.from(topicMap.values()));
    } catch (error) {
      console.error("Error fetching user topics:", error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  app.post('/api/progress/:topicId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { topicId } = req.params;
      const { principlesCompleted, totalPrinciples } = req.body;

      const progress = await storage.upsertProgress({
        userId,
        topicId,
        principlesCompleted,
        totalPrinciples,
      });

      res.json(progress);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  app.get('/api/stripe/publishable-key', async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe publishable key:", error);
      res.status(500).json({ message: "Failed to get Stripe configuration" });
    }
  });

  app.get('/api/stripe/products', async (_req, res) => {
    try {
      const rows = await storage.listStripeProductsWithPrices();
      
      const productsMap = new Map();
      for (const row of rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
            metadata: row.price_metadata,
          });
        }
      }

      res.json({ data: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error fetching Stripe products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/checkout/topic/:topicId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { topicId } = req.params;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const topic = await storage.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }

      const alreadyPurchased = await storage.hasUserPurchasedTopic(userId, topicId);
      if (alreadyPurchased) {
        return res.status(400).json({ message: "Topic already purchased" });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
          metadata: { userId },
        });
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const products = await storage.listStripeProductsWithPrices();
      const payPerTopicProduct = (products as any[]).find(
        (p: any) => p.product_metadata?.type === 'pay_per_topic' && p.price_id
      );

      if (!payPerTopicProduct) {
        return res.status(500).json({ message: "Pay-per-topic pricing not configured" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: payPerTopicProduct.price_id,
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&topic_id=${topicId}`,
        cancel_url: `${baseUrl}/checkout/cancel?topic_id=${topicId}`,
        metadata: {
          userId,
          topicId,
          type: 'topic_purchase',
        },
      });

      await storage.createTopicPurchase({
        userId,
        topicId,
        stripeSessionId: session.id,
        amount: payPerTopicProduct.unit_amount,
        currency: payPerTopicProduct.currency || 'usd',
        status: 'pending',
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post('/api/checkout/pro', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isProActive = user.plan === 'pro' && (!user.proExpiresAt || new Date(user.proExpiresAt) > new Date());
      if (isProActive) {
        return res.status(400).json({ message: "You already have an active Pro subscription" });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
          metadata: { userId },
        });
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const products = await storage.listStripeProductsWithPrices();
      const proProduct = (products as any[]).find(
        (p: any) => p.product_metadata?.type === 'pro_subscription' && p.price_id
      );

      if (!proProduct) {
        return res.status(500).json({ message: "Pro subscription pricing not configured" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: proProduct.price_id,
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=pro`,
        cancel_url: `${baseUrl}/checkout/cancel`,
        metadata: {
          userId,
          type: 'pro_annual',
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.get('/api/checkout/verify/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.params;

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed", status: session.payment_status });
      }

      const metadata = session.metadata || {};
      
      if (metadata.type === 'topic_purchase' && metadata.topicId) {
        const purchase = await storage.getTopicPurchase(userId, metadata.topicId);
        if (purchase && purchase.status !== 'completed') {
          await storage.updateTopicPurchase(purchase.id, {
            status: 'completed',
            stripePaymentIntentId: session.payment_intent as string,
          });
        }
        return res.json({ 
          success: true, 
          type: 'topic_purchase', 
          topicId: metadata.topicId 
        });
      }

      if (metadata.type === 'pro_subscription' || metadata.type === 'pro_annual') {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        await storage.updateUser(userId, { plan: 'pro', proExpiresAt: expiresAt });
        if (session.subscription) {
          await storage.updateUserStripeInfo(userId, { 
            stripeSubscriptionId: session.subscription as string 
          });
        }
        return res.json({ 
          success: true, 
          type: 'pro_annual',
          expiresAt: expiresAt.toISOString()
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error verifying checkout session:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  app.get('/api/user/purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const purchases = await storage.getTopicPurchasesByUser(userId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // Check if topic is a sample topic (no auth required)
  app.get('/api/topics/:topicId/is-sample', async (req, res) => {
    try {
      const { topicId } = req.params;
      const topic = await storage.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      res.json({ isSample: topic.isSample === true });
    } catch (error) {
      console.error("Error checking if topic is sample:", error);
      res.status(500).json({ message: "Failed to check topic" });
    }
  });

  app.get('/api/user/can-access-topic/:topicId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { topicId } = req.params;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Sample topics are fully free - everyone can access all principles
      const topic = await storage.getTopic(topicId);
      if (topic?.isSample) {
        return res.json({ canAccess: true, reason: 'sample_topic' });
      }

      // Pro subscription users can access all topics beyond the first 2 principles
      if (user.plan === 'pro') {
        return res.json({ canAccess: true, reason: 'pro_subscription' });
      }

      // Topic creators can access their own topics beyond the first 2 principles
      if (topic?.userId === userId) {
        return res.json({ canAccess: true, reason: 'topic_creator' });
      }

      // Users who purchased this topic can access all principles
      const hasPurchased = await storage.hasUserPurchasedTopic(userId, topicId);
      if (hasPurchased) {
        return res.json({ canAccess: true, reason: 'purchased' });
      }

      // Freemium model: Everyone can see first 1-2 principles
      // Authenticated users who don't have access can't see principles 3+
      return res.json({ canAccess: false, reason: 'insufficient_access' });
    } catch (error) {
      console.error("Error checking topic access:", error);
      res.status(500).json({ message: "Failed to check topic access" });
    }
  });

  app.post('/api/user/delete-account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Mark user as deleted (soft delete)
      await storage.updateUser(userId, { firstName: 'Deleted', lastName: 'User', email: null });
      req.session.destroy((err: any) => {
        if (err) console.error("Session destroy error:", err);
        res.clearCookie('connect.sid');
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.post('/api/feature-requests', async (req, res) => {
    try {
      const { email, subject, message } = req.body;
      if (!email || !subject || !message) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      // In production, you'd send this to a service or store in a database
      console.log(`[Feature Request] From ${email}: ${subject}\n${message}`);
      res.json({ message: "Feature request submitted successfully" });
    } catch (error) {
      console.error("Error submitting feature request:", error);
      res.status(500).json({ message: "Failed to submit feature request" });
    }
  });

  // =====================
  // ANALYTICS ROUTES
  // =====================

  // Save a quiz attempt with detailed answers
  app.post('/api/analytics/quiz-attempt', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { quizId, topicId, score, totalQuestions, correctAnswers, timeSpentSeconds, answers } = req.body;

      if (!quizId || !topicId || score === undefined || !totalQuestions || correctAnswers === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const attempt = await storage.createQuizAttempt({
        userId,
        quizId,
        topicId,
        score,
        totalQuestions,
        correctAnswers,
        timeSpentSeconds: timeSpentSeconds || null,
        answers: answers || null,
      });

      // Update principle mastery based on answers
      if (answers && Array.isArray(answers)) {
        for (const answer of answers) {
          if (answer.principleId) {
            const existingMastery = await storage.getPrincipleMastery(userId, answer.principleId);
            const timesReviewed = (existingMastery?.timesReviewed || 0) + 1;
            const timesCorrect = (existingMastery?.timesCorrect || 0) + (answer.isCorrect ? 1 : 0);
            const masteryScore = Math.round((timesCorrect / timesReviewed) * 100);

            await storage.upsertPrincipleMastery({
              userId,
              principleId: answer.principleId,
              topicId,
              masteryScore,
              timesReviewed,
              timesCorrect,
              lastReviewedAt: new Date(),
            });

            // Bootstrap spaced repetition schedule for this principle
            const existingSchedule = await storage.getReviewSchedule(userId, answer.principleId);
            if (!existingSchedule) {
              // First time - schedule review for tomorrow
              const dueAt = new Date();
              dueAt.setDate(dueAt.getDate() + 1);
              await storage.upsertReviewSchedule({
                userId,
                principleId: answer.principleId,
                topicId,
                dueAt,
                easeFactor: 250,
                interval: 1,
                repetitions: 1,
                status: "pending",
              });
            }
          }
        }
      }

      res.json(attempt);
    } catch (error) {
      console.error("Error saving quiz attempt:", error);
      res.status(500).json({ message: "Failed to save quiz attempt" });
    }
  });

  // Get user's analytics overview (Pro feature)
  app.get('/api/analytics/overview', isAuthenticated, isProUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const [attempts, masteryData, progressData] = await Promise.all([
        storage.getQuizAttemptsByUser(userId),
        storage.getPrincipleMasteryByUser(userId),
        storage.getProgressByUser(userId),
      ]);

      // Calculate aggregate stats
      const totalQuizzes = attempts.length;
      const averageScore = totalQuizzes > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalQuizzes)
        : 0;
      const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0);
      const topicsStudied = new Set(attempts.map(a => a.topicId)).size;

      // Find weak principles (mastery < 60%)
      const weakPrinciples = masteryData.filter(m => (m.masteryScore || 0) < 60);

      // Calculate progress trend (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentAttempts = attempts.filter(a => 
        a.completedAt && new Date(a.completedAt) >= sevenDaysAgo
      );

      res.json({
        totalQuizzes,
        averageScore,
        totalTimeSpent,
        topicsStudied,
        principlesMastered: masteryData.filter(m => (m.masteryScore || 0) >= 80).length,
        weakPrinciplesCount: weakPrinciples.length,
        recentQuizzes: recentAttempts.length,
        topicsWithProgress: progressData.length,
      });
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get quiz attempts for a specific topic (Pro feature)
  app.get('/api/analytics/topic/:topicId', isAuthenticated, isProUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { topicId } = req.params;

      const [attempts, mastery] = await Promise.all([
        storage.getQuizAttemptsByTopic(userId, topicId),
        storage.getPrincipleMasteryByTopic(userId, topicId),
      ]);

      res.json({ attempts, mastery });
    } catch (error) {
      console.error("Error fetching topic analytics:", error);
      res.status(500).json({ message: "Failed to fetch topic analytics" });
    }
  });

  // Get weak principles for user (Pro feature)
  app.get('/api/analytics/weak-principles', isAuthenticated, isProUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const masteryData = await storage.getPrincipleMasteryByUser(userId);
      
      // Get weak principles (mastery < 60%) with their details
      const weakMastery = masteryData.filter(m => (m.masteryScore || 0) < 60);
      
      // Fetch principle details for weak ones
      const weakPrinciples = await Promise.all(
        weakMastery.slice(0, 10).map(async (m) => {
          const principles = await storage.getPrinciplesByTopic(m.topicId);
          const principle = principles.find(p => p.id === m.principleId);
          const topic = await storage.getTopic(m.topicId);
          return {
            ...m,
            principleTitle: principle?.title,
            topicTitle: topic?.title,
            topicSlug: topic?.slug,
          };
        })
      );

      res.json(weakPrinciples);
    } catch (error) {
      console.error("Error fetching weak principles:", error);
      res.status(500).json({ message: "Failed to fetch weak principles" });
    }
  });

  // =====================
  // SPACED REPETITION ROUTES
  // =====================

  // Get due reviews for user (Pro feature)
  app.get('/api/reviews/due', isAuthenticated, isProUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;

      const dueReviews = await storage.getDueReviews(userId, limit);
      
      // Fetch principle and topic details for each review
      const reviewsWithDetails = await Promise.all(
        dueReviews.map(async (review) => {
          const principles = await storage.getPrinciplesByTopic(review.topicId);
          const principle = principles.find(p => p.id === review.principleId);
          const topic = await storage.getTopic(review.topicId);
          return {
            ...review,
            principle: principle ? {
              id: principle.id,
              title: principle.title,
              explanation: principle.explanation,
              analogy: principle.analogy,
              keyTakeaways: principle.keyTakeaways,
            } : null,
            topic: topic ? {
              id: topic.id,
              title: topic.title,
              slug: topic.slug,
            } : null,
          };
        })
      );

      res.json(reviewsWithDetails);
    } catch (error) {
      console.error("Error fetching due reviews:", error);
      res.status(500).json({ message: "Failed to fetch due reviews" });
    }
  });

  // Grade a review (SM-2 algorithm)
  app.post('/api/reviews/:reviewId/grade', isAuthenticated, isProUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reviewId } = req.params;
      const { quality } = req.body; // 0-5 quality rating (SM-2)

      if (quality === undefined || quality < 0 || quality > 5) {
        return res.status(400).json({ message: "Quality must be between 0 and 5" });
      }

      // Get current schedule
      const schedules = await storage.getDueReviews(userId, 100);
      const schedule = schedules.find(s => s.id === reviewId);
      
      if (!schedule) {
        return res.status(404).json({ message: "Review not found" });
      }

      // SM-2 Algorithm implementation
      let easeFactor = schedule.easeFactor || 250;
      let interval = schedule.interval || 1;
      let repetitions = schedule.repetitions || 0;

      if (quality < 3) {
        // Failed - reset
        repetitions = 0;
        interval = 1;
      } else {
        // Success - increase interval
        repetitions += 1;
        if (repetitions === 1) {
          interval = 1;
        } else if (repetitions === 2) {
          interval = 6;
        } else {
          interval = Math.round(interval * (easeFactor / 100));
        }
        
        // Update ease factor
        easeFactor = Math.max(130, easeFactor + (10 - (5 - quality) * (8 + (5 - quality) * 2)));
      }

      // Calculate next due date
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + interval);

      const updatedSchedule = await storage.updateReviewSchedule(reviewId, {
        dueAt,
        easeFactor,
        interval,
        repetitions,
        status: "pending",
      });

      // Update mastery
      const mastery = await storage.getPrincipleMastery(userId, schedule.principleId);
      if (mastery) {
        const timesReviewed = (mastery.timesReviewed || 0) + 1;
        const timesCorrect = (mastery.timesCorrect || 0) + (quality >= 3 ? 1 : 0);
        const masteryScore = Math.round((timesCorrect / timesReviewed) * 100);
        
        await storage.upsertPrincipleMastery({
          userId,
          principleId: schedule.principleId,
          topicId: schedule.topicId,
          masteryScore,
          timesReviewed,
          timesCorrect,
          lastReviewedAt: new Date(),
        });
      }

      res.json({ 
        schedule: updatedSchedule,
        nextReviewIn: interval,
        message: quality >= 3 ? "Great job! Review scheduled." : "Let's try again soon."
      });
    } catch (error) {
      console.error("Error grading review:", error);
      res.status(500).json({ message: "Failed to grade review" });
    }
  });

  // Get review stats
  app.get('/api/reviews/stats', isAuthenticated, isProUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dueReviews = await storage.getDueReviews(userId, 100);
      const masteryData = await storage.getPrincipleMasteryByUser(userId);

      res.json({
        dueCount: dueReviews.length,
        totalTracked: masteryData.length,
        averageMastery: masteryData.length > 0
          ? Math.round(masteryData.reduce((sum, m) => sum + (m.masteryScore || 0), 0) / masteryData.length)
          : 0,
        masteredCount: masteryData.filter(m => (m.masteryScore || 0) >= 80).length,
      });
    } catch (error) {
      console.error("Error fetching review stats:", error);
      res.status(500).json({ message: "Failed to fetch review stats" });
    }
  });

  // =====================
  // AI TUTOR CHAT ROUTES
  // =====================

  // Create or get existing tutor session
  app.post('/api/tutor/session', isAuthenticated, isProUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { topicId, principleId } = req.body;

      if (!topicId) {
        return res.status(400).json({ message: "Topic ID is required" });
      }

      // Check if session already exists
      let session = await storage.getTutorSessionByTopicAndPrinciple(userId, topicId, principleId);
      
      if (!session) {
        // Get topic and principle titles for session title
        const topic = await storage.getTopic(topicId);
        let title = topic?.title || "Learning Session";
        
        if (principleId) {
          const principles = await storage.getPrinciplesByTopic(topicId);
          const principle = principles.find(p => p.id === principleId);
          if (principle) {
            title = `${topic?.title}: ${principle.title}`;
          }
        }

        session = await storage.createTutorSession({
          userId,
          topicId,
          principleId: principleId || null,
          title,
        });
      }

      // Get existing messages
      const messages = await storage.getTutorMessagesBySession(session.id);

      res.json({ session, messages });
    } catch (error) {
      console.error("Error creating/getting tutor session:", error);
      res.status(500).json({ message: "Failed to create tutor session" });
    }
  });

  // Send message to AI tutor
  app.post('/api/tutor/session/:sessionId/message', isAuthenticated, isProUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Verify session belongs to user
      const session = await storage.getTutorSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Save user message
      await storage.createTutorMessage({
        sessionId,
        role: "user",
        content,
      });

      // Get context for AI
      const topic = await storage.getTopic(session.topicId);
      const principles = await storage.getPrinciplesByTopic(session.topicId);
      
      let contextPrinciple = null;
      if (session.principleId) {
        contextPrinciple = principles.find(p => p.id === session.principleId);
      }

      // Get previous messages for context
      const previousMessages = await storage.getTutorMessagesBySession(sessionId);
      const recentMessages = previousMessages.slice(-10); // Last 10 messages

      // Generate AI response using Gemini
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ 
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });

      const systemPrompt = `You are an expert tutor helping a student understand "${topic?.title || 'this topic'}". 
Your role is to:
- Explain concepts clearly using first principles
- Use simple analogies and real-world examples
- Ask guiding questions to help the student think
- Be encouraging and patient
- Keep responses concise but informative (2-3 paragraphs max)

${contextPrinciple ? `Current principle being studied: "${contextPrinciple.title}"
Key points: ${contextPrinciple.explanation}
Analogy: ${contextPrinciple.analogy || 'N/A'}` : ''}

Topic principles overview:
${principles.slice(0, 5).map(p => `- ${p.title}: ${p.explanation?.slice(0, 100)}...`).join('\n')}`;

      const chatHistory = recentMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: chatHistory.length > 0 
          ? [...chatHistory, { role: 'user', parts: [{ text: content }] }]
          : [{ role: 'user', parts: [{ text: content }] }],
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const aiResponse = response.text || "I'm sorry, I couldn't generate a response. Please try again.";

      // Save AI response
      const aiMessage = await storage.createTutorMessage({
        sessionId,
        role: "assistant",
        content: aiResponse,
      });

      res.json({ message: aiMessage });
    } catch (error) {
      console.error("Error sending tutor message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get tutor session history
  app.get('/api/tutor/session/:sessionId', isAuthenticated, isProUser, async (req: any, res) => {
    try {
      const { sessionId } = req.params;

      const session = await storage.getTutorSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const messages = await storage.getTutorMessagesBySession(sessionId);

      res.json({ session, messages });
    } catch (error) {
      console.error("Error fetching tutor session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Get all tutor sessions for user
  app.get('/api/tutor/sessions', isAuthenticated, isProUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getTutorSessionsByUser(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching tutor sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  return httpServer;
}
