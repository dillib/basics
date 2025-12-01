import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  plan: text("plan").default("free"),
  topicsUsed: integer("topics_used").default(0),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  topics: many(topics),
  progress: many(progress),
}));

export const topics = pgTable("topics", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  category: text("category"),
  difficulty: text("difficulty").default("beginner"),
  estimatedMinutes: integer("estimated_minutes").default(30),
  imageUrl: text("image_url"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const topicsRelations = relations(topics, ({ one, many }) => ({
  user: one(users, { fields: [topics.userId], references: [users.id] }),
  principles: many(principles),
  quizzes: many(quizzes),
}));

export const principles = pgTable("principles", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id", { length: 255 }).references(() => topics.id).notNull(),
  orderIndex: integer("order_index").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  analogy: text("analogy"),
  visualType: text("visual_type"),
  visualData: jsonb("visual_data"),
  keyTakeaways: text("key_takeaways").array(),
});

export const principlesRelations = relations(principles, ({ one }) => ({
  topic: one(topics, { fields: [principles.topicId], references: [topics.id] }),
}));

export const quizzes = pgTable("quizzes", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id", { length: 255 }).references(() => topics.id).notNull(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  topic: one(topics, { fields: [quizzes.topicId], references: [topics.id] }),
  user: one(users, { fields: [quizzes.userId], references: [users.id] }),
  questions: many(questions),
}));

export const questions = pgTable("questions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id", { length: 255 }).references(() => quizzes.id).notNull(),
  principleId: varchar("principle_id", { length: 255 }).references(() => principles.id),
  questionText: text("question_text").notNull(),
  options: text("options").array().notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  explanation: text("explanation"),
  userAnswer: integer("user_answer"),
  isCorrect: boolean("is_correct"),
});

export const questionsRelations = relations(questions, ({ one }) => ({
  quiz: one(quizzes, { fields: [questions.quizId], references: [quizzes.id] }),
  principle: one(principles, { fields: [questions.principleId], references: [principles.id] }),
}));

export const progress = pgTable("progress", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  topicId: varchar("topic_id", { length: 255 }).references(() => topics.id).notNull(),
  principlesCompleted: integer("principles_completed").default(0),
  totalPrinciples: integer("total_principles").default(0),
  quizzesTaken: integer("quizzes_taken").default(0),
  bestScore: integer("best_score"),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  uniqueIndex("progress_user_topic_unique").on(table.userId, table.topicId),
]);

export const progressRelations = relations(progress, ({ one }) => ({
  user: one(users, { fields: [progress.userId], references: [users.id] }),
  topic: one(topics, { fields: [progress.topicId], references: [topics.id] }),
}));

export const topicPurchases = pgTable("topic_purchases", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  topicId: varchar("topic_id", { length: 255 }).references(() => topics.id).notNull(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("usd"),
  status: varchar("status", { length: 50 }).default("pending"),
  purchasedAt: timestamp("purchased_at").defaultNow(),
}, (table) => [
  uniqueIndex("topic_purchases_user_topic_unique").on(table.userId, table.topicId),
]);

export const topicPurchasesRelations = relations(topicPurchases, ({ one }) => ({
  user: one(users, { fields: [topicPurchases.userId], references: [users.id] }),
  topic: one(topics, { fields: [topicPurchases.topicId], references: [topics.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
export const insertTopicSchema = createInsertSchema(topics).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPrincipleSchema = createInsertSchema(principles).omit({ id: true });
export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertProgressSchema = createInsertSchema(progress).omit({ id: true });
export const insertTopicPurchaseSchema = createInsertSchema(topicPurchases).omit({ id: true, purchasedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;
export type InsertPrinciple = z.infer<typeof insertPrincipleSchema>;
export type Principle = typeof principles.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type Progress = typeof progress.$inferSelect;
export type InsertTopicPurchase = z.infer<typeof insertTopicPurchaseSchema>;
export type TopicPurchase = typeof topicPurchases.$inferSelect;
