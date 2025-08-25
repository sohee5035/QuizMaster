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
});

export const choices = pgTable("choices", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questions.id),
  content: text("content").notNull(),
  isCorrect: boolean("is_correct").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull(), // 'study', 'mock', 'review'
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

export const insertQuestionSchema = createInsertSchema(questions);
export const insertChoiceSchema = createInsertSchema(choices);
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, startedAt: true, endedAt: true });
export const insertResponseSchema = createInsertSchema(responses).omit({ id: true, createdAt: true });
export const insertPageViewSchema = createInsertSchema(pageViews).omit({ id: true, visitedAt: true });

export type Question = typeof questions.$inferSelect;
export type Choice = typeof choices.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type PageView = typeof pageViews.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertChoice = z.infer<typeof insertChoiceSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;

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
