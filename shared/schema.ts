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
  proExpiresAt: timestamp("pro_expires_at"),
  topicsUsed: integer("topics_used").default(0),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  isAdmin: boolean("is_admin").default(false),
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
  isSample: boolean("is_sample").default(false),
  mindMapData: jsonb("mind_map_data"),
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

// Quiz Attempts - Track each quiz attempt for analytics
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  quizId: varchar("quiz_id", { length: 255 }).references(() => quizzes.id).notNull(),
  topicId: varchar("topic_id", { length: 255 }).references(() => topics.id).notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  timeSpentSeconds: integer("time_spent_seconds"),
  answers: jsonb("answers"), // Array of { questionId, userAnswer, isCorrect }
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => [
  index("quiz_attempts_user_idx").on(table.userId),
  index("quiz_attempts_topic_idx").on(table.topicId),
]);

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  user: one(users, { fields: [quizAttempts.userId], references: [users.id] }),
  quiz: one(quizzes, { fields: [quizAttempts.quizId], references: [quizzes.id] }),
  topic: one(topics, { fields: [quizAttempts.topicId], references: [topics.id] }),
}));

// Principle Mastery - Track mastery level for each principle per user
export const principleMastery = pgTable("principle_mastery", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  principleId: varchar("principle_id", { length: 255 }).references(() => principles.id).notNull(),
  topicId: varchar("topic_id", { length: 255 }).references(() => topics.id).notNull(),
  masteryScore: integer("mastery_score").default(0), // 0-100 scale
  timesReviewed: integer("times_reviewed").default(0),
  timesCorrect: integer("times_correct").default(0),
  lastReviewedAt: timestamp("last_reviewed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("principle_mastery_user_principle_unique").on(table.userId, table.principleId),
  index("principle_mastery_user_idx").on(table.userId),
]);

export const principleMasteryRelations = relations(principleMastery, ({ one }) => ({
  user: one(users, { fields: [principleMastery.userId], references: [users.id] }),
  principle: one(principles, { fields: [principleMastery.principleId], references: [principles.id] }),
  topic: one(topics, { fields: [principleMastery.topicId], references: [topics.id] }),
}));

// Review Schedule - Spaced repetition scheduling
export const reviewSchedule = pgTable("review_schedule", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  principleId: varchar("principle_id", { length: 255 }).references(() => principles.id).notNull(),
  topicId: varchar("topic_id", { length: 255 }).references(() => topics.id).notNull(),
  dueAt: timestamp("due_at").notNull(),
  easeFactor: integer("ease_factor").default(250), // SM-2 algorithm ease factor (x100)
  interval: integer("interval").default(1), // Days until next review
  repetitions: integer("repetitions").default(0),
  status: varchar("status", { length: 50 }).default("pending"), // pending, reviewed, skipped
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("review_schedule_user_principle_unique").on(table.userId, table.principleId),
  index("review_schedule_due_idx").on(table.dueAt),
  index("review_schedule_user_idx").on(table.userId),
]);

export const reviewScheduleRelations = relations(reviewSchedule, ({ one }) => ({
  user: one(users, { fields: [reviewSchedule.userId], references: [users.id] }),
  principle: one(principles, { fields: [reviewSchedule.principleId], references: [principles.id] }),
  topic: one(topics, { fields: [reviewSchedule.topicId], references: [topics.id] }),
}));

// Tutor Sessions - AI tutor chat sessions
export const tutorSessions = pgTable("tutor_sessions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  topicId: varchar("topic_id", { length: 255 }).references(() => topics.id).notNull(),
  principleId: varchar("principle_id", { length: 255 }).references(() => principles.id),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("tutor_sessions_user_idx").on(table.userId),
  index("tutor_sessions_topic_idx").on(table.topicId),
]);

export const tutorSessionsRelations = relations(tutorSessions, ({ one, many }) => ({
  user: one(users, { fields: [tutorSessions.userId], references: [users.id] }),
  topic: one(topics, { fields: [tutorSessions.topicId], references: [topics.id] }),
  principle: one(principles, { fields: [tutorSessions.principleId], references: [principles.id] }),
  messages: many(tutorMessages),
}));

// Tutor Messages - Individual chat messages
export const tutorMessages = pgTable("tutor_messages", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id", { length: 255 }).references(() => tutorSessions.id).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // user, assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("tutor_messages_session_idx").on(table.sessionId),
]);

export const tutorMessagesRelations = relations(tutorMessages, ({ one }) => ({
  session: one(tutorSessions, { fields: [tutorMessages.sessionId], references: [tutorSessions.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
export const insertTopicSchema = createInsertSchema(topics).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPrincipleSchema = createInsertSchema(principles).omit({ id: true });
export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertProgressSchema = createInsertSchema(progress).omit({ id: true });
export const insertTopicPurchaseSchema = createInsertSchema(topicPurchases).omit({ id: true, purchasedAt: true });
export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({ id: true, completedAt: true });
export const insertPrincipleMasterySchema = createInsertSchema(principleMastery).omit({ id: true, updatedAt: true });
export const insertReviewScheduleSchema = createInsertSchema(reviewSchedule).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTutorSessionSchema = createInsertSchema(tutorSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTutorMessageSchema = createInsertSchema(tutorMessages).omit({ id: true, createdAt: true });

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
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertPrincipleMastery = z.infer<typeof insertPrincipleMasterySchema>;
export type PrincipleMastery = typeof principleMastery.$inferSelect;
export type InsertReviewSchedule = z.infer<typeof insertReviewScheduleSchema>;
export type ReviewSchedule = typeof reviewSchedule.$inferSelect;
export type InsertTutorSession = z.infer<typeof insertTutorSessionSchema>;
export type TutorSession = typeof tutorSessions.$inferSelect;
export type InsertTutorMessage = z.infer<typeof insertTutorMessageSchema>;
export type TutorMessage = typeof tutorMessages.$inferSelect;

// Support Requests - User feedback, bug reports, feature requests
export const supportRequests = pgTable("support_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  email: text("email").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // support, bug, feature, feedback
  priority: varchar("priority", { length: 50 }).default("normal"), // low, normal, high, critical
  status: varchar("status", { length: 50 }).default("open"), // open, in_progress, resolved, closed
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  assignedAdminId: varchar("assigned_admin_id", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("support_requests_user_idx").on(table.userId),
  index("support_requests_status_idx").on(table.status),
  index("support_requests_type_idx").on(table.type),
]);

export const supportRequestsRelations = relations(supportRequests, ({ one, many }) => ({
  user: one(users, { fields: [supportRequests.userId], references: [users.id] }),
  assignedAdmin: one(users, { fields: [supportRequests.assignedAdminId], references: [users.id] }),
  messages: many(supportMessages),
}));

// Support Messages - Threaded conversation on support requests
export const supportMessages = pgTable("support_messages", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id", { length: 255 }).references(() => supportRequests.id).notNull(),
  authorType: varchar("author_type", { length: 50 }).notNull(), // user, admin, system
  authorId: varchar("author_id", { length: 255 }).references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("support_messages_request_idx").on(table.requestId),
]);

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  request: one(supportRequests, { fields: [supportMessages.requestId], references: [supportRequests.id] }),
  author: one(users, { fields: [supportMessages.authorId], references: [users.id] }),
}));

export const insertSupportRequestSchema = createInsertSchema(supportRequests).omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true });
export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({ id: true, createdAt: true });

export type InsertSupportRequest = z.infer<typeof insertSupportRequestSchema>;
export type SupportRequest = typeof supportRequests.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;
