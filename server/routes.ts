import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { generateTopicContent, generateQuizQuestions, validateTopicContent } from "./ai";
import { getUncachableStripeClient } from "./stripeClient";
import Stripe from "stripe";

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

const isAdmin = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Failed to verify admin status" });
  }
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // -- STRIPE WEBHOOK --
  app.post('/api/stripe/webhook', async (req: any, res) => {
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
    } catch (err: any) {
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

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/topics', async (_req, res) => {
    const topics = await storage.getPublicTopics();
    res.json(topics);
  });

  app.get('/api/sample-topics', async (_req, res) => {
    const sampleTopics = await storage.getSampleTopics();
    res.json(sampleTopics);
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

  // -- CONTENT GENERATION (User) --

  app.post('/api/topics/generate', async (req: any, res) => {
    try {
      // Temporarily allow anonymous topic generation for better UX
      const userId = req.user?.claims?.sub || 'anonymous-' + Date.now();
      const { title } = req.body;
      
      if (!title) return res.status(400).json({ message: "Topic title is required" });

      // Auth check temporarily disabled for testing
      // const user = await storage.getUser(userId);
      // if (!user) return res.status(404).json({ message: "User not found" });

      // Free tier check temporarily disabled
      // if (user.plan === 'free' && (user.topicsUsed || 0) >= 1) {
      //     return res.status(403).json({ message: "Free tier limit reached. Please purchase a topic or upgrade." });
      // }

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existingTopic = await storage.getTopicBySlug(slug);
      if (existingTopic) return res.json(existingTopic);

      const content = await generateTopicContent(title);
      const validationResult = await validateTopicContent(title, content);

      const newTopic = await storage.createTopic({
        userId: null, // Anonymous users don't have a user record
        title,
        slug,
        description: content.description,
        category: content.category,
        difficulty: content.difficulty,
        estimatedMinutes: content.estimatedMinutes,
        isPublic: true,
        mindMapData: content.mindMap,
        confidenceScore: validationResult.overallConfidence,
        validationData: validationResult,
      });

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
      await storage.updateUser(userId, { topicsUsed: (user.topicsUsed || 0) + 1 });

      res.json(newTopic);
    } catch (error: any) {
      console.error("[Topic Generate] Error:", error);
      res.status(500).json({ message: error.message || "Failed to generate topic content" });
    }
  });

  // -- QUIZZES & PROGRESS --

  app.post('/api/topics/:topicId/quiz', async (req: any, res) => {
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

  app.post('/api/quiz/:quizId/answer', async (req: any, res) => {
    const { quizId } = req.params;
    const { questionId, answer } = req.body;
    const questions = await storage.getQuestionsByQuiz(quizId);
    const question = questions.find(q => q.id === questionId);

    if (!question) return res.status(404).json({ message: "Question not found" });

    const isCorrect = answer === question.correctAnswer;
    await storage.updateQuestion(questionId, { userAnswer: answer, isCorrect });

    res.json({ isCorrect, correctAnswer: question.correctAnswer, explanation: question.explanation });
  });

  app.post('/api/quiz/:quizId/complete', async (req: any, res) => {
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
        completedAt: score >= 70 ? new Date() : null,
      });
    }
    res.json({ score, correctCount, totalQuestions: questions.length });
  });

  app.get('/api/user/progress', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const progressList = await storage.getProgressByUser(userId);
    res.json(progressList);
  });

  app.get('/api/user/topics', isAuthenticated, async (req: any, res) => {
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

  // -- CHECKOUT --

  app.post('/api/checkout/topic/:topicId', isAuthenticated, async (req: any, res) => {
    try {
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
             unit_amount: 199, // $1.99
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&topic_id=${topicId}`,
        cancel_url: `${baseUrl}/checkout/cancel?topic_id=${topicId}`,
        metadata: { userId, topicId, type: 'topic_purchase' },
      });

      await storage.createTopicPurchase({
        userId, topicId, stripeSessionId: session.id, amount: 199, currency: 'usd', status: 'pending',
      });

      res.json({ url: session.url });
    } catch (error) {
      res.status(500).json({ message: "Checkout failed" });
    }
  });

  app.get('/api/checkout/verify/:sessionId', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/user/can-access-topic/:topicId', isAuthenticated, async (req: any, res) => {
      const userId = req.user.claims.sub;
      const { topicId } = req.params;
      const user = await storage.getUser(userId);
      const topic = await storage.getTopic(topicId);

      if (topic?.isSample) return res.json({ canAccess: true });
      if (user?.plan === 'pro') return res.json({ canAccess: true });
      if (topic?.userId === userId) return res.json({ canAccess: true });
      if (await storage.hasUserPurchasedTopic(userId, topicId)) return res.json({ canAccess: true });

      res.json({ canAccess: false });
  });

  // -- SUPPORT --

  app.post('/api/support', async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { email, type, priority, subject, description } = req.body;
    const request = await storage.createSupportRequest({
      userId: userId || null, email, type, priority: priority || 'normal', subject, description
    });
    res.status(201).json(request);
  });

  app.get('/api/support/mine', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const requests = await storage.getSupportRequestsByUser(userId);
    res.json(requests);
  });

  app.get('/api/support/:id', isAuthenticated, async (req: any, res) => {
     const userId = req.user.claims.sub;
     const request = await storage.getSupportRequest(req.params.id);
     if (!request) return res.status(404).json({message: "Not found"});
     
     const user = await storage.getUser(userId);
     if (request.userId !== userId && !user?.isAdmin) {
         return res.status(403).json({message: "Unauthorized"});
     }
     res.json(request);
  });

  app.get('/api/support/:id/messages', isAuthenticated, async (req: any, res) => {
      const messages = await storage.getSupportMessagesByRequest(req.params.id);
      res.json(messages);
  });
  
  app.post('/api/support/:id/messages', isAuthenticated, async (req: any, res) => {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const request = await storage.getSupportRequest(req.params.id);
      
      if (!request) return res.status(404).json({message: "Request not found"});
      
      const isAuthor = request.userId === userId;
      const isAdmin = user?.isAdmin;
      
      if (!isAuthor && !isAdmin) return res.status(403).json({message: "Unauthorized"});

      const message = await storage.createSupportMessage({
          requestId: req.params.id,
          authorType: isAdmin ? 'admin' : 'user',
          authorId: userId,
          message: req.body.message
      });
      res.json(message);
  });

  // -- ADMIN ROUTES --

  app.get('/api/admin/check', isAuthenticated, async (req: any, res) => {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({ isAdmin: user?.isAdmin === true });
  });

  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (_req, res) => {
      const userCount = await storage.getUserCount();
      const topicCount = await storage.getTopicCount();
      const revenueStats = await storage.getRevenueStats();
      res.json({
          totalUsers: userCount,
          totalTopics: topicCount,
          totalRevenue: revenueStats.totalRevenue,
          topicPurchases: revenueStats.topicPurchases,
          proSubscriptions: revenueStats.proSubscriptions
      });
  });

  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const users = await storage.getAllUsers(limit, offset);
      const total = await storage.getUserCount();
      res.json({ users, total, limit, offset });
  });

  app.patch('/api/admin/users/:userId/admin', isAuthenticated, isAdmin, async (req: any, res) => {
      const user = await storage.setUserAdmin(req.params.userId, req.body.isAdmin);
      res.json(user);
  });

  app.patch('/api/admin/users/:userId/pro', isAuthenticated, isAdmin, async (req: any, res) => {
      const user = await storage.setUserPro(req.params.userId, req.body.isPro, req.body.expiresAt ? new Date(req.body.expiresAt) : undefined);
      res.json(user);
  });

  app.get('/api/admin/topics', isAuthenticated, isAdmin, async (req: any, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const topics = await storage.getAllTopics(limit, offset);
      const total = await storage.getTopicCount();
      res.json({ topics, total, limit, offset });
  });

  app.patch('/api/admin/topics/:topicId', isAuthenticated, isAdmin, async (req: any, res) => {
      const topic = await storage.updateTopic(req.params.topicId, req.body);
      res.json(topic);
  });

  app.delete('/api/admin/topics/:topicId', isAuthenticated, isAdmin, async (req: any, res) => {
      await storage.deleteTopicById(req.params.topicId);
      res.json({ success: true });
  });
  
  app.get('/api/admin/support', isAuthenticated, isAdmin, async (req: any, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      // Filters would be parsed here
      const requests = await storage.getAllSupportRequests({}, limit, offset);
      const total = await storage.getSupportRequestCount({});
      res.json({ requests, total, limit, offset });
  });
  
  app.patch('/api/admin/support/:id', isAuthenticated, isAdmin, async (req: any, res) => {
      const updated = await storage.updateSupportRequest(req.params.id, req.body);
      res.json(updated);
  });

  app.get('/api/admin/purchases', isAuthenticated, isAdmin, async (req: any, res) => {
      const purchases = await storage.getAllTopicPurchases();
      res.json({ purchases });
  });
  
  app.get('/api/admin/admins', isAuthenticated, isAdmin, async (req: any, res) => {
      const admins = await storage.getAdminUsers();
      res.json(admins);
  });

  return httpServer;
}
