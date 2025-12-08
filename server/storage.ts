import { 
  users, topics, principles, quizzes, questions, progress, topicPurchases,
  quizAttempts, principleMastery, reviewSchedule, tutorSessions, tutorMessages,
  type User, type InsertUser, 
  type Topic, type InsertTopic,
  type Principle, type InsertPrinciple,
  type Quiz, type InsertQuiz,
  type Question, type InsertQuestion,
  type Progress, type InsertProgress,
  type TopicPurchase, type InsertTopicPurchase,
  type QuizAttempt, type InsertQuizAttempt,
  type PrincipleMastery, type InsertPrincipleMastery,
  type ReviewSchedule, type InsertReviewSchedule,
  type TutorSession, type InsertTutorSession,
  type TutorMessage, type InsertTutorMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, sql, lte, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  getTopic(id: string): Promise<Topic | undefined>;
  getTopicBySlug(slug: string): Promise<Topic | undefined>;
  getTopicsByUser(userId: string): Promise<Topic[]>;
  getTopicsByIds(ids: string[]): Promise<Topic[]>;
  getPublicTopics(): Promise<Topic[]>;
  getSampleTopics(): Promise<Topic[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: string, updates: Partial<InsertTopic>): Promise<Topic | undefined>;
  
  getPrinciplesByTopic(topicId: string): Promise<Principle[]>;
  createPrinciple(principle: InsertPrinciple): Promise<Principle>;
  createPrinciples(principles: InsertPrinciple[]): Promise<Principle[]>;
  
  getQuiz(id: string): Promise<Quiz | undefined>;
  getQuizzesByTopic(topicId: string): Promise<Quiz[]>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: string, updates: Partial<Quiz>): Promise<Quiz | undefined>;
  
  getQuestionsByQuiz(quizId: string): Promise<Question[]>;
  createQuestions(questions: InsertQuestion[]): Promise<Question[]>;
  updateQuestion(id: string, updates: Partial<Question>): Promise<Question | undefined>;
  
  getProgress(userId: string, topicId: string): Promise<Progress | undefined>;
  getProgressByUser(userId: string): Promise<Progress[]>;
  upsertProgress(progress: InsertProgress): Promise<Progress>;
  
  getTopicPurchase(userId: string, topicId: string): Promise<TopicPurchase | undefined>;
  getTopicPurchasesByUser(userId: string): Promise<TopicPurchase[]>;
  createTopicPurchase(purchase: InsertTopicPurchase): Promise<TopicPurchase>;
  updateTopicPurchase(id: string, updates: Partial<TopicPurchase>): Promise<TopicPurchase | undefined>;
  hasUserPurchasedTopic(userId: string, topicId: string): Promise<boolean>;
  updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<User | undefined>;
  
  // Quiz Attempts & Analytics
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getQuizAttemptsByUser(userId: string): Promise<QuizAttempt[]>;
  getQuizAttemptsByTopic(userId: string, topicId: string): Promise<QuizAttempt[]>;
  
  // Principle Mastery
  getPrincipleMastery(userId: string, principleId: string): Promise<PrincipleMastery | undefined>;
  getPrincipleMasteryByUser(userId: string): Promise<PrincipleMastery[]>;
  getPrincipleMasteryByTopic(userId: string, topicId: string): Promise<PrincipleMastery[]>;
  upsertPrincipleMastery(mastery: InsertPrincipleMastery): Promise<PrincipleMastery>;
  
  // Spaced Repetition
  getReviewSchedule(userId: string, principleId: string): Promise<ReviewSchedule | undefined>;
  getDueReviews(userId: string, limit?: number): Promise<ReviewSchedule[]>;
  upsertReviewSchedule(schedule: InsertReviewSchedule): Promise<ReviewSchedule>;
  updateReviewSchedule(id: string, updates: Partial<ReviewSchedule>): Promise<ReviewSchedule | undefined>;
  
  // Tutor Sessions
  createTutorSession(session: InsertTutorSession): Promise<TutorSession>;
  getTutorSession(sessionId: string): Promise<TutorSession | undefined>;
  getTutorSessionsByUser(userId: string): Promise<TutorSession[]>;
  getTutorSessionByTopicAndPrinciple(userId: string, topicId: string, principleId?: string): Promise<TutorSession | undefined>;
  
  // Tutor Messages
  createTutorMessage(message: InsertTutorMessage): Promise<TutorMessage>;
  getTutorMessagesBySession(sessionId: string): Promise<TutorMessage[]>;
  
  // Admin Methods
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  getUserCount(): Promise<number>;
  getAllTopics(limit?: number, offset?: number): Promise<Topic[]>;
  getTopicCount(): Promise<number>;
  getAllTopicPurchases(limit?: number, offset?: number): Promise<TopicPurchase[]>;
  getRevenueStats(): Promise<{ totalRevenue: number; topicPurchases: number; proSubscriptions: number }>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined>;
  setUserPro(userId: string, isPro: boolean, expiresAt?: Date): Promise<User | undefined>;
  deleteTopicById(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: insertUser.email,
          firstName: insertUser.firstName,
          lastName: insertUser.lastName,
          profileImageUrl: insertUser.profileImageUrl,
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getTopic(id: string): Promise<Topic | undefined> {
    const [topic] = await db.select().from(topics).where(eq(topics.id, id));
    return topic || undefined;
  }

  async getTopicBySlug(slug: string): Promise<Topic | undefined> {
    const [topic] = await db.select().from(topics).where(eq(topics.slug, slug));
    return topic || undefined;
  }

  async getTopicsByUser(userId: string): Promise<Topic[]> {
    return db.select().from(topics).where(eq(topics.userId, userId)).orderBy(desc(topics.createdAt));
  }

  async getTopicsByIds(ids: string[]): Promise<Topic[]> {
    if (ids.length === 0) return [];
    return db.select().from(topics).where(inArray(topics.id, ids));
  }

  async getPublicTopics(): Promise<Topic[]> {
    return db.select().from(topics).where(eq(topics.isPublic, true)).orderBy(desc(topics.createdAt));
  }

  async getSampleTopics(): Promise<Topic[]> {
    return db.select().from(topics).where(eq(topics.isSample, true)).orderBy(desc(topics.createdAt));
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const [newTopic] = await db.insert(topics).values(topic).returning();
    return newTopic;
  }

  async updateTopic(id: string, updates: Partial<InsertTopic>): Promise<Topic | undefined> {
    const [topic] = await db.update(topics).set(updates).where(eq(topics.id, id)).returning();
    return topic || undefined;
  }

  async getPrinciplesByTopic(topicId: string): Promise<Principle[]> {
    return db.select().from(principles).where(eq(principles.topicId, topicId)).orderBy(principles.orderIndex);
  }

  async createPrinciple(principle: InsertPrinciple): Promise<Principle> {
    const [newPrinciple] = await db.insert(principles).values(principle).returning();
    return newPrinciple;
  }

  async createPrinciples(principleList: InsertPrinciple[]): Promise<Principle[]> {
    if (principleList.length === 0) return [];
    return db.insert(principles).values(principleList).returning();
  }

  async getQuiz(id: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz || undefined;
  }

  async getQuizzesByTopic(topicId: string): Promise<Quiz[]> {
    return db.select().from(quizzes).where(eq(quizzes.topicId, topicId)).orderBy(desc(quizzes.createdAt));
  }

  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [newQuiz] = await db.insert(quizzes).values(quiz).returning();
    return newQuiz;
  }

  async updateQuiz(id: string, updates: Partial<Quiz>): Promise<Quiz | undefined> {
    const [quiz] = await db.update(quizzes).set(updates).where(eq(quizzes.id, id)).returning();
    return quiz || undefined;
  }

  async getQuestionsByQuiz(quizId: string): Promise<Question[]> {
    return db.select().from(questions).where(eq(questions.quizId, quizId));
  }

  async createQuestions(questionList: InsertQuestion[]): Promise<Question[]> {
    if (questionList.length === 0) return [];
    return db.insert(questions).values(questionList).returning();
  }

  async updateQuestion(id: string, updates: Partial<Question>): Promise<Question | undefined> {
    const [question] = await db.update(questions).set(updates).where(eq(questions.id, id)).returning();
    return question || undefined;
  }

  async getProgress(userId: string, topicId: string): Promise<Progress | undefined> {
    const [prog] = await db.select().from(progress).where(
      and(eq(progress.userId, userId), eq(progress.topicId, topicId))
    );
    return prog || undefined;
  }

  async getProgressByUser(userId: string): Promise<Progress[]> {
    return db.select().from(progress).where(eq(progress.userId, userId)).orderBy(desc(progress.lastAccessedAt));
  }

  async upsertProgress(insertProgress: InsertProgress): Promise<Progress> {
    const [prog] = await db
      .insert(progress)
      .values(insertProgress)
      .onConflictDoUpdate({
        target: [progress.userId, progress.topicId],
        set: {
          principlesCompleted: insertProgress.principlesCompleted,
          totalPrinciples: insertProgress.totalPrinciples,
          quizzesTaken: insertProgress.quizzesTaken,
          bestScore: insertProgress.bestScore,
          lastAccessedAt: new Date(),
          completedAt: insertProgress.completedAt,
        },
      })
      .returning();
    return prog;
  }

  async getTopicPurchase(userId: string, topicId: string): Promise<TopicPurchase | undefined> {
    const [purchase] = await db.select().from(topicPurchases).where(
      and(eq(topicPurchases.userId, userId), eq(topicPurchases.topicId, topicId))
    );
    return purchase || undefined;
  }

  async getTopicPurchasesByUser(userId: string): Promise<TopicPurchase[]> {
    return db.select().from(topicPurchases)
      .where(eq(topicPurchases.userId, userId))
      .orderBy(desc(topicPurchases.purchasedAt));
  }

  async createTopicPurchase(purchase: InsertTopicPurchase): Promise<TopicPurchase> {
    const [newPurchase] = await db.insert(topicPurchases).values(purchase).returning();
    return newPurchase;
  }

  async updateTopicPurchase(id: string, updates: Partial<TopicPurchase>): Promise<TopicPurchase | undefined> {
    const [purchase] = await db.update(topicPurchases).set(updates).where(eq(topicPurchases.id, id)).returning();
    return purchase || undefined;
  }

  async hasUserPurchasedTopic(userId: string, topicId: string): Promise<boolean> {
    const [purchase] = await db.select().from(topicPurchases).where(
      and(
        eq(topicPurchases.userId, userId), 
        eq(topicPurchases.topicId, topicId),
        eq(topicPurchases.status, "completed")
      )
    );
    return !!purchase;
  }

  async updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<User | undefined> {
    const [user] = await db.update(users).set(stripeInfo).where(eq(users.id, userId)).returning();
    return user || undefined;
  }

  async getStripeProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listStripeProducts(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async listStripeProductsWithPrices(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`
        WITH paginated_products AS (
          SELECT id, name, description, metadata, active
          FROM stripe.products
          WHERE active = ${active}
          ORDER BY id
          LIMIT ${limit} OFFSET ${offset}
        )
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM paginated_products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getStripePrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async getStripeSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  // Quiz Attempts & Analytics
  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [newAttempt] = await db.insert(quizAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getQuizAttemptsByUser(userId: string): Promise<QuizAttempt[]> {
    return db.select().from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.completedAt));
  }

  async getQuizAttemptsByTopic(userId: string, topicId: string): Promise<QuizAttempt[]> {
    return db.select().from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.topicId, topicId)))
      .orderBy(desc(quizAttempts.completedAt));
  }

  // Principle Mastery
  async getPrincipleMastery(userId: string, principleId: string): Promise<PrincipleMastery | undefined> {
    const [mastery] = await db.select().from(principleMastery)
      .where(and(eq(principleMastery.userId, userId), eq(principleMastery.principleId, principleId)));
    return mastery || undefined;
  }

  async getPrincipleMasteryByUser(userId: string): Promise<PrincipleMastery[]> {
    return db.select().from(principleMastery)
      .where(eq(principleMastery.userId, userId))
      .orderBy(desc(principleMastery.updatedAt));
  }

  async getPrincipleMasteryByTopic(userId: string, topicId: string): Promise<PrincipleMastery[]> {
    return db.select().from(principleMastery)
      .where(and(eq(principleMastery.userId, userId), eq(principleMastery.topicId, topicId)))
      .orderBy(asc(principleMastery.masteryScore));
  }

  async upsertPrincipleMastery(insertMastery: InsertPrincipleMastery): Promise<PrincipleMastery> {
    const [mastery] = await db
      .insert(principleMastery)
      .values(insertMastery)
      .onConflictDoUpdate({
        target: [principleMastery.userId, principleMastery.principleId],
        set: {
          masteryScore: insertMastery.masteryScore,
          timesReviewed: insertMastery.timesReviewed,
          timesCorrect: insertMastery.timesCorrect,
          lastReviewedAt: insertMastery.lastReviewedAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    return mastery;
  }

  // Spaced Repetition
  async getReviewSchedule(userId: string, principleId: string): Promise<ReviewSchedule | undefined> {
    const [schedule] = await db.select().from(reviewSchedule)
      .where(and(eq(reviewSchedule.userId, userId), eq(reviewSchedule.principleId, principleId)));
    return schedule || undefined;
  }

  async getDueReviews(userId: string, limit = 20): Promise<ReviewSchedule[]> {
    return db.select().from(reviewSchedule)
      .where(and(
        eq(reviewSchedule.userId, userId),
        lte(reviewSchedule.dueAt, new Date()),
        eq(reviewSchedule.status, "pending")
      ))
      .orderBy(asc(reviewSchedule.dueAt))
      .limit(limit);
  }

  async upsertReviewSchedule(insertSchedule: InsertReviewSchedule): Promise<ReviewSchedule> {
    const [schedule] = await db
      .insert(reviewSchedule)
      .values(insertSchedule)
      .onConflictDoUpdate({
        target: [reviewSchedule.userId, reviewSchedule.principleId],
        set: {
          dueAt: insertSchedule.dueAt,
          easeFactor: insertSchedule.easeFactor,
          interval: insertSchedule.interval,
          repetitions: insertSchedule.repetitions,
          status: insertSchedule.status,
          updatedAt: new Date(),
        },
      })
      .returning();
    return schedule;
  }

  async updateReviewSchedule(id: string, updates: Partial<ReviewSchedule>): Promise<ReviewSchedule | undefined> {
    const [schedule] = await db.update(reviewSchedule)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reviewSchedule.id, id))
      .returning();
    return schedule || undefined;
  }

  // Tutor Sessions
  async createTutorSession(session: InsertTutorSession): Promise<TutorSession> {
    const [newSession] = await db.insert(tutorSessions).values(session).returning();
    return newSession;
  }

  async getTutorSession(sessionId: string): Promise<TutorSession | undefined> {
    const [session] = await db.select().from(tutorSessions).where(eq(tutorSessions.id, sessionId));
    return session || undefined;
  }

  async getTutorSessionsByUser(userId: string): Promise<TutorSession[]> {
    return db.select().from(tutorSessions)
      .where(eq(tutorSessions.userId, userId))
      .orderBy(desc(tutorSessions.updatedAt));
  }

  async getTutorSessionByTopicAndPrinciple(userId: string, topicId: string, principleId?: string): Promise<TutorSession | undefined> {
    const conditions = principleId
      ? and(eq(tutorSessions.userId, userId), eq(tutorSessions.topicId, topicId), eq(tutorSessions.principleId, principleId))
      : and(eq(tutorSessions.userId, userId), eq(tutorSessions.topicId, topicId));
    const [session] = await db.select().from(tutorSessions).where(conditions);
    return session || undefined;
  }

  // Tutor Messages
  async createTutorMessage(message: InsertTutorMessage): Promise<TutorMessage> {
    const [newMessage] = await db.insert(tutorMessages).values(message).returning();
    return newMessage;
  }

  async getTutorMessagesBySession(sessionId: string): Promise<TutorMessage[]> {
    return db.select().from(tutorMessages)
      .where(eq(tutorMessages.sessionId, sessionId))
      .orderBy(asc(tutorMessages.createdAt));
  }

  // Admin Methods
  async getAllUsers(limit = 50, offset = 0): Promise<User[]> {
    return db.select().from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result[0]?.count || 0);
  }

  async getAllTopics(limit = 50, offset = 0): Promise<Topic[]> {
    return db.select().from(topics)
      .orderBy(desc(topics.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getTopicCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(topics);
    return Number(result[0]?.count || 0);
  }

  async getAllTopicPurchases(limit = 50, offset = 0): Promise<TopicPurchase[]> {
    return db.select().from(topicPurchases)
      .orderBy(desc(topicPurchases.purchasedAt))
      .limit(limit)
      .offset(offset);
  }

  async getRevenueStats(): Promise<{ totalRevenue: number; topicPurchases: number; proSubscriptions: number }> {
    const completedPurchases = await db.select({ 
      sum: sql<number>`COALESCE(SUM(amount), 0)`,
      count: sql<number>`count(*)`
    }).from(topicPurchases).where(eq(topicPurchases.status, "completed"));
    
    const proUsers = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.plan, "pro"));
    
    const topicRevenue = Number(completedPurchases[0]?.sum || 0);
    const topicCount = Number(completedPurchases[0]?.count || 0);
    const proCount = Number(proUsers[0]?.count || 0);
    const proRevenue = proCount * 9900; // $99 per pro subscription
    
    return {
      totalRevenue: topicRevenue + proRevenue,
      topicPurchases: topicCount,
      proSubscriptions: proCount,
    };
  }

  async setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async setUserPro(userId: string, isPro: boolean, expiresAt?: Date): Promise<User | undefined> {
    const updates: Partial<User> = {
      plan: isPro ? "pro" : "free",
      proExpiresAt: isPro ? (expiresAt || null) : null,
    };
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async deleteTopicById(id: string): Promise<void> {
    await db.delete(principles).where(eq(principles.topicId, id));
    await db.delete(quizzes).where(eq(quizzes.topicId, id));
    await db.delete(progress).where(eq(progress.topicId, id));
    await db.delete(topicPurchases).where(eq(topicPurchases.topicId, id));
    await db.delete(topics).where(eq(topics.id, id));
  }
}

export const storage = new DatabaseStorage();
