import { type Question, type Choice, type Session, type Response, type PageView, type InsertQuestion, type InsertChoice, type InsertSession, type InsertResponse, type InsertPageView } from "@shared/schema";
import { database as db, isDbConnected } from "./db";
import { questions, choices, sessions, responses, pageViews } from "@shared/schema";
import { eq, sql, gte } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Questions
  getQuestion(id: string): Promise<Question | undefined>;
  getQuestions(): Promise<Question[]>;
  getQuestionsByAuthor(author: string): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  getChoicesForQuestion(questionId: string): Promise<Choice[]>;
  createChoice(choice: InsertChoice): Promise<Choice>;
  
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  endSession(id: string): Promise<void>;
  
  // Responses
  createResponse(response: InsertResponse): Promise<Response>;
  getResponsesForSession(sessionId: string): Promise<Response[]>;
  getResponsesForQuestion(questionId: string): Promise<Response[]>;
  
  // Page Views
  recordPageView(pageView: InsertPageView): Promise<PageView>;
  getTodayPageViews(): Promise<number>;
  getTotalPageViews(): Promise<number>;
  getTodayUniqueVisitors(): Promise<number>;
  getTotalUniqueVisitors(): Promise<number>;
  getVisitorStatsByIP(): Promise<{ipAddress: string; visitCount: number; lastVisitAt: Date}[]>;
  
  // Utility
  deleteQuestion(questionId: string): Promise<void>;
  clearAllData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize database with seed data
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    if (!isDbConnected) {
      console.warn("⚠️  Skipping database initialization - database not connected");
      return;
    }

    try {
      // Check if data already exists
      const existingQuestions = await db.select().from(questions);
      if (existingQuestions.length > 0) {
        return; // Data already exists
      }

      // Seed the test questions exactly as specified
      const q1 = {
        id: "q1",
        type: "MCQ",
        stem: "다음 중 외국통화매매 거래시 영업점장 전결 최대 환율 우대율이 80%가 아닌 통화는?",
        explanation: "CNY통화는 영업점장 전결로 최대 50%까지 환율우대율이 적용됩니다.",
        tags: "환율우대",
        difficulty: 2,
        source: "외환 규정집",
        answer: null,
      };

      const q2 = {
        id: "q2",
        type: "OX",
        stem: "외국통화 매입시 손상화폐의 경우 손상정도에 따라 일부 금액만 지불하고 매입이 가능하다.",
        explanation: "손상화폐나 위변조통화는 매매가 불가능합니다. (외환 > 외환공통 > 제1장 > 제1절 > 제1관 외국통화매입신청서 접수",
        tags: "외환공통",
        difficulty: 1,
        source: "외환 규정집",
        answer: false,
      };

      // Insert questions
      await db.insert(questions).values([q1, q2]);

      // Q1 choices
      const choices1 = [
        { id: "q1c1", questionId: "q1", content: "USD", isCorrect: false },
        { id: "q1c2", questionId: "q1", content: "JPY", isCorrect: false },
        { id: "q1c3", questionId: "q1", content: "CNY", isCorrect: true },
        { id: "q1c4", questionId: "q1", content: "EUR", isCorrect: false },
      ];

      await db.insert(choices).values(choices1);
      console.log("✅ Database initialized with seed data");
    } catch (error) {
      console.error("❌ Failed to initialize database with seed data:", error);
      console.warn("⚠️  Application will continue but database operations may fail");
    }
  }
  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question || undefined;
  }

  async getQuestions(): Promise<Question[]> {
    return await db.select().from(questions);
  }

  async getQuestionsByAuthor(author: string): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.author, author));
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = insertQuestion.id || randomUUID();
    const [question] = await db
      .insert(questions)
      .values({ ...insertQuestion, id })
      .returning();
    return question;
  }

  async getChoicesForQuestion(questionId: string): Promise<Choice[]> {
    return await db.select().from(choices).where(eq(choices.questionId, questionId));
  }

  async createChoice(insertChoice: InsertChoice): Promise<Choice> {
    const id = insertChoice.id || randomUUID();
    const [choice] = await db
      .insert(choices)
      .values({ ...insertChoice, id })
      .returning();
    return choice;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const [session] = await db
      .insert(sessions)
      .values({ ...insertSession, id })
      .returning();
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions);
  }

  async endSession(id: string): Promise<void> {
    await db
      .update(sessions)
      .set({ endedAt: new Date() })
      .where(eq(sessions.id, id));
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const id = randomUUID();
    const [response] = await db
      .insert(responses)
      .values({ ...insertResponse, id })
      .returning();
    return response;
  }

  async getResponsesForSession(sessionId: string): Promise<Response[]> {
    return await db.select().from(responses).where(eq(responses.sessionId, sessionId));
  }

  async getResponsesForQuestion(questionId: string): Promise<Response[]> {
    return await db.select().from(responses).where(eq(responses.questionId, questionId));
  }

  async recordPageView(insertPageView: InsertPageView): Promise<PageView> {
    const id = randomUUID();
    const [pageView] = await db
      .insert(pageViews)
      .values({ ...insertPageView, id })
      .returning();
    return pageView;
  }

  async getTodayPageViews(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(pageViews)
      .where(gte(pageViews.visitedAt, today));
    
    return Number(result[0]?.count || 0);
  }

  async getTotalPageViews(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(pageViews);
    
    return Number(result[0]?.count || 0);
  }

  async getTodayUniqueVisitors(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: sql<number>`count(distinct ip_address)` })
      .from(pageViews)
      .where(gte(pageViews.visitedAt, today));
    
    return Number(result[0]?.count || 0);
  }

  async getTotalUniqueVisitors(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(distinct ip_address)` })
      .from(pageViews);
    
    return Number(result[0]?.count || 0);
  }

  async getVisitorStatsByIP(): Promise<{ipAddress: string; visitCount: number; lastVisitAt: Date}[]> {
    const result = await db
      .select({
        ipAddress: pageViews.ipAddress,
        visitCount: sql<number>`count(*)`,
        lastVisitAt: sql<Date>`max(visited_at)`
      })
      .from(pageViews)
      .groupBy(pageViews.ipAddress)
      .orderBy(sql`count(*) desc`);
    
    return result.map((row: any) => ({
      ipAddress: row.ipAddress,
      visitCount: Number(row.visitCount),
      lastVisitAt: new Date(row.lastVisitAt)
    }));
  }

  async deleteQuestion(questionId: string): Promise<void> {
    // 외래키 제약으로 인해 순서대로 삭제
    await db.delete(responses).where(eq(responses.questionId, questionId));
    await db.delete(choices).where(eq(choices.questionId, questionId));
    await db.delete(questions).where(eq(questions.id, questionId));
  }

  async clearAllData(): Promise<void> {
    // 외래키 제약으로 인해 순서대로 삭제
    await db.delete(responses);
    await db.delete(sessions);
    await db.delete(choices);
    await db.delete(questions);
    await db.delete(pageViews);
  }
}

export class MemStorage implements IStorage {
  private questions: Map<string, Question>;
  private choices: Map<string, Choice>;
  private sessions: Map<string, Session>;
  private responses: Map<string, Response>;
  private pageViews: Map<string, PageView>;

  constructor() {
    this.questions = new Map();
    this.choices = new Map();
    this.sessions = new Map();
    this.responses = new Map();
    this.pageViews = new Map();
    
    this.seedData();
  }

  private seedData() {
    // Seed the test questions exactly as specified
    const q1: Question = {
      id: "q1",
      type: "MCQ",
      stem: "다음 중 외국통화매매 거래시 영업점장 전결 최대 환율 우대율이 80%가 아닌 통화는?",
      explanation: "CNY통화는 영업점장 전결로 최대 50%까지 환율우대율이 적용됩니다.",
      tags: "환율우대",
      difficulty: 2,
      source: "외환 규정집",
      answer: null,
      author: "default",
    };

    const q2: Question = {
      id: "q2",
      type: "OX",
      stem: "외국통화 매입시 손상화폐의 경우 손상정도에 따라 일부 금액만 지불하고 매입이 가능하다.",
      explanation: "손상화폐나 위변조통화는 매매가 불가능합니다. (외환 > 외환공통 > 제1장 > 제1절 > 제1관 외국통화매입신청서 접수",
      tags: "외환공통",
      difficulty: 1,
      source: "외환 규정집",
      answer: false,
      author: "default",
    };

    this.questions.set("q1", q1);
    this.questions.set("q2", q2);

    // Q1 choices
    const choices1 = [
      { id: "q1c1", questionId: "q1", content: "USD", isCorrect: false },
      { id: "q1c2", questionId: "q1", content: "JPY", isCorrect: false },
      { id: "q1c3", questionId: "q1", content: "CNY", isCorrect: true },
      { id: "q1c4", questionId: "q1", content: "EUR", isCorrect: false },
    ];

    choices1.forEach(choice => this.choices.set(choice.id, choice));
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async getQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }

  async getQuestionsByAuthor(author: string): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(q => q.author === author);
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = insertQuestion.id || randomUUID();
    const question: Question = {
      ...insertQuestion,
      id,
      explanation: insertQuestion.explanation ?? null,
      tags: insertQuestion.tags ?? null,
      difficulty: insertQuestion.difficulty ?? null,
      source: insertQuestion.source ?? null,
      answer: insertQuestion.answer ?? null,
      author: insertQuestion.author ?? "default",
    };
    this.questions.set(id, question);
    return question;
  }

  async getChoicesForQuestion(questionId: string): Promise<Choice[]> {
    return Array.from(this.choices.values()).filter(
      choice => choice.questionId === questionId
    );
  }

  async createChoice(insertChoice: InsertChoice): Promise<Choice> {
    const id = insertChoice.id || randomUUID();
    const choice: Choice = { ...insertChoice, id };
    this.choices.set(id, choice);
    return choice;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      ...insertSession,
      id,
      startedAt: new Date(),
      endedAt: null,
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async endSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.endedAt = new Date();
      this.sessions.set(id, session);
    }
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const id = randomUUID();
    const response: Response = {
      ...insertResponse,
      id,
      choiceId: insertResponse.choiceId ?? null,
      selectedBoolean: insertResponse.selectedBoolean ?? null,
      createdAt: new Date(),
    };
    this.responses.set(id, response);
    return response;
  }

  async getResponsesForSession(sessionId: string): Promise<Response[]> {
    return Array.from(this.responses.values()).filter(
      response => response.sessionId === sessionId
    );
  }

  async getResponsesForQuestion(questionId: string): Promise<Response[]> {
    return Array.from(this.responses.values()).filter(
      response => response.questionId === questionId
    );
  }

  async recordPageView(insertPageView: InsertPageView): Promise<PageView> {
    const id = randomUUID();
    const pageView: PageView = {
      ...insertPageView,
      id,
      userAgent: insertPageView.userAgent || null,
      visitedAt: new Date(),
    };
    this.pageViews.set(id, pageView);
    return pageView;
  }

  async getTodayPageViews(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return Array.from(this.pageViews.values()).filter(
      pv => pv.visitedAt && pv.visitedAt >= today
    ).length;
  }

  async getTotalPageViews(): Promise<number> {
    return this.pageViews.size;
  }

  async getTodayUniqueVisitors(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayViews = Array.from(this.pageViews.values()).filter(
      pv => pv.visitedAt && pv.visitedAt >= today
    );
    
    const uniqueIPs = new Set(todayViews.map(pv => pv.ipAddress));
    return uniqueIPs.size;
  }

  async getTotalUniqueVisitors(): Promise<number> {
    const uniqueIPs = new Set(Array.from(this.pageViews.values()).map(pv => pv.ipAddress));
    return uniqueIPs.size;
  }

  async getVisitorStatsByIP(): Promise<{ipAddress: string; visitCount: number; lastVisitAt: Date}[]> {
    const ipStats = new Map<string, {visitCount: number; lastVisitAt: Date}>();
    
    // Process all page views
    Array.from(this.pageViews.values()).forEach(pv => {
      const ip = pv.ipAddress;
      const existing = ipStats.get(ip);
      
      if (existing) {
        existing.visitCount++;
        if (pv.visitedAt && pv.visitedAt > existing.lastVisitAt) {
          existing.lastVisitAt = pv.visitedAt;
        }
      } else {
        ipStats.set(ip, {
          visitCount: 1,
          lastVisitAt: pv.visitedAt || new Date()
        });
      }
    });
    
    // Convert to array and sort by visit count (descending)
    return Array.from(ipStats.entries())
      .map(([ipAddress, stats]) => ({
        ipAddress,
        visitCount: stats.visitCount,
        lastVisitAt: stats.lastVisitAt
      }))
      .sort((a, b) => b.visitCount - a.visitCount);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    // Delete the question
    this.questions.delete(questionId);
    
    // Delete all choices for this question
    const choicesToDelete = Array.from(this.choices.values())
      .filter(choice => choice.questionId === questionId);
    choicesToDelete.forEach(choice => this.choices.delete(choice.id));
    
    // Delete all responses for this question
    const responsesToDelete = Array.from(this.responses.values())
      .filter(response => response.questionId === questionId);
    responsesToDelete.forEach(response => this.responses.delete(response.id));
  }

  async clearAllData(): Promise<void> {
    this.responses.clear();
    this.sessions.clear();
    this.choices.clear();
    this.questions.clear();
    this.pageViews.clear();
  }
}

// Initialize storage based on database availability
export const storage = (() => {
  if (isDbConnected) {
    console.log("✅ Using database storage");
    return new DatabaseStorage();
  } else {
    console.log("⚠️  Database unavailable - falling back to memory storage");
    return new MemStorage();
  }
})();
