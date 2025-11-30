import { 
  users, topics, principles, quizzes, questions, progress,
  type User, type InsertUser, 
  type Topic, type InsertTopic,
  type Principle, type InsertPrinciple,
  type Quiz, type InsertQuiz,
  type Question, type InsertQuestion,
  type Progress, type InsertProgress
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  getTopic(id: string): Promise<Topic | undefined>;
  getTopicBySlug(slug: string): Promise<Topic | undefined>;
  getTopicsByUser(userId: string): Promise<Topic[]>;
  getPublicTopics(): Promise<Topic[]>;
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

  async getPublicTopics(): Promise<Topic[]> {
    return db.select().from(topics).where(eq(topics.isPublic, true)).orderBy(desc(topics.createdAt));
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
}

export const storage = new DatabaseStorage();
