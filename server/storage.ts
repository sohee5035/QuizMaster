import { type Question, type Choice, type Session, type Response, type InsertQuestion, type InsertChoice, type InsertSession, type InsertResponse } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Questions
  getQuestion(id: string): Promise<Question | undefined>;
  getQuestions(): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  getChoicesForQuestion(questionId: string): Promise<Choice[]>;
  createChoice(choice: InsertChoice): Promise<Choice>;
  
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  endSession(id: string): Promise<void>;
  
  // Responses
  createResponse(response: InsertResponse): Promise<Response>;
  getResponsesForSession(sessionId: string): Promise<Response[]>;
}

export class MemStorage implements IStorage {
  private questions: Map<string, Question>;
  private choices: Map<string, Choice>;
  private sessions: Map<string, Session>;
  private responses: Map<string, Response>;

  constructor() {
    this.questions = new Map();
    this.choices = new Map();
    this.sessions = new Map();
    this.responses = new Map();
    
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

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = insertQuestion.id || randomUUID();
    const question: Question = { ...insertQuestion, id };
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
}

export const storage = new MemStorage();
