import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateTopicContent, generateQuizQuestions } from "./ai";
import { insertTopicSchema } from "@shared/schema";

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

  app.post('/api/topics/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title } = req.body;
      
      console.log(`[Topic Generate] Starting for "${title}" by user ${userId}`);

      if (!title) {
        return res.status(400).json({ message: "Topic title is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`[Topic Generate] User not found: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      if (user.plan === 'free' && (user.topicsUsed || 0) >= 1) {
        console.log(`[Topic Generate] Free tier limit reached for user ${userId}`);
        return res.status(403).json({ message: "Free tier limit reached. Please upgrade to Pro." });
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
        userId,
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

      // Update user's topics used count
      await storage.updateUser(userId, { topicsUsed: (user.topicsUsed || 0) + 1 });

      res.json(newTopic);
    } catch (error) {
      console.error("[Topic Generate] Error:", error);
      res.status(500).json({ message: "Failed to generate topic content" });
    }
  });

  app.post('/api/topics/:topicId/quiz', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { topicId } = req.params;

      const topic = await storage.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }

      const principles = await storage.getPrinciplesByTopic(topicId);
      if (principles.length === 0) {
        return res.status(400).json({ message: "No principles found for this topic" });
      }

      const questions = await generateQuizQuestions(topic.title, principles);

      const quiz = await storage.createQuiz({
        topicId,
        userId,
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

  app.post('/api/quiz/:quizId/answer', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/quiz/:quizId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  return httpServer;
}
