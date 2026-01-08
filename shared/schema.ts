import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // 'MCQ' or 'OX'
  stem: text("stem").notNull(),
  explanation: text("explanation"),
  tags: text("tags"),
  difficulty: integer("difficulty"),
  source: text("source"),
  answer: boolean("answer"), // for OX questions
  author: text("author").default("default").notNull(), // 'default' or 'wangsohee'
  category: text("category"), // ADsP 카테고리: 'data_understanding', 'data_planning', 'sql', 'statistics', 'programming'
  subject: integer("subject"), // ADsP 과목: 1 (데이터 이해), 2 (데이터 분석 기획), 3 (데이터 분석)
  round: integer("round"), // 시험 회차: 39, 40, 41 등
});

export const choices = pgTable("choices", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questions.id),
  content: text("content").notNull(),
  isCorrect: boolean("is_correct").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull(), // 'study', 'mock', 'review', 'wangsohee'
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const responses = pgTable("responses", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id),
  questionId: text("question_id").notNull().references(() => questions.id),
  choiceId: text("choice_id").references(() => choices.id),
  selectedBoolean: boolean("selected_boolean"),
  isCorrect: boolean("is_correct").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pageViews = pgTable("page_views", {
  id: text("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  page: text("page").notNull(),
  visitedAt: timestamp("visited_at").defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookmarks = pgTable("bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  questionId: text("question_id").notNull().references(() => questions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuestionSchema = createInsertSchema(questions);
export const insertChoiceSchema = createInsertSchema(choices);
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, startedAt: true, endedAt: true });
export const insertResponseSchema = createInsertSchema(responses).omit({ id: true, createdAt: true });
export const insertPageViewSchema = createInsertSchema(pageViews).omit({ id: true, visitedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({ id: true, createdAt: true });

export type Question = typeof questions.$inferSelect;
export type Choice = typeof choices.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type PageView = typeof pageViews.$inferSelect;
export type User = typeof users.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertChoice = z.infer<typeof insertChoiceSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;

// API response types
export type QuestionWithChoices = Question & {
  choices?: Choice[];
};

export type SessionResponse = {
  sessionId: string;
  question: QuestionWithChoices;
  currentQuestion: number;
  totalQuestions: number;
};

export type AnswerResponse = {
  isCorrect: boolean;
  explanation: string;
  nextReady: boolean;
};

export type ResultsResponse = {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  questions: Array<{
    question: QuestionWithChoices;
    userAnswer: string | boolean;
    isCorrect: boolean;
  }>;
};

// Timer mode types
export type TimerQuestionData = {
  sessionId: string;
  question: QuestionWithChoices;
  currentQuestion: number;
  totalQuestions: number;
  isAnswered: boolean;
  userAnswer?: string | boolean;
  isCorrect?: boolean;
  explanation?: string | null;
};

export type TimerResultsData = {
  totalQuestions: number;
  correctAnswers: number;
  incorrectQuestions: TimerQuestionData[];
};

// ADsP 카테고리 정의
export const CATEGORIES = {
  data_understanding: "데이터 이해",
  data_planning: "데이터 분석 기획",
  sql: "SQL",
  statistics: "통계분석",
  programming: "R/Python",
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

// ADsP 과목 정의
export const SUBJECTS = {
  1: "1과목: 데이터 이해",
  2: "2과목: 데이터 분석 기획",
  3: "3과목: 데이터 분석",
} as const;

export type SubjectKey = keyof typeof SUBJECTS;
