import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import type { SessionResponse, AnswerResponse, ResultsResponse, QuestionWithChoices, Response } from "@shared/schema";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
import bcrypt from "bcrypt";
import session from "express-session";

// Fisher-Yates shuffle algorithm
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Configure multer for file upload
const upload = multer({ storage: multer.memoryStorage() });

// In-memory store for session question orders (simple implementation)
const sessionQuestionOrders: Map<string, string[]> = new Map();

// Extend Express Request to include session user
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'adsp-quiz-master-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
  }));

  // Authentication middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user || user.status !== 'approved') {
      return res.status(403).json({ message: "승인된 사용자만 접근 가능합니다." });
    }
    req.user = user;
    next();
  };

  // Questions count endpoint
  // Get all questions
  app.get("/api/questions", async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      res.json(questions);
    } catch (error) {
      console.error('Questions error:', error);
      res.status(500).json({ message: "문제 조회 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/questions/count", async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      res.json({ count: questions.length });
    } catch (error) {
      console.error('Questions count error:', error);
      res.status(500).json({ message: "문제 수 조회 중 오류가 발생했습니다." });
    }
  });

  // Get choices for a specific question
  app.get("/api/questions/:id/choices", async (req, res) => {
    try {
      const { id } = req.params;
      const choices = await storage.getChoicesForQuestion(id);
      res.json(choices);
    } catch (error) {
      console.error('Choices error:', error);
      res.status(500).json({ message: "선택지 조회 중 오류가 발생했습니다." });
    }
  });

  // Get available rounds
  app.get("/api/rounds", async (req, res) => {
    try {
      const questions = await storage.getQuestionsByAuthor("default");
      const rounds = [...new Set(questions
        .filter(q => q.round !== null && q.round !== undefined)
        .map(q => q.round)
      )].sort((a, b) => (b as number) - (a as number)); // Sort descending (newest first)

      res.json({ rounds });
    } catch (error) {
      console.error('Rounds error:', error);
      res.status(500).json({ message: "회차 조회 중 오류가 발생했습니다." });
    }
  });

  // Get session history (completed sessions only, for logged-in user)
  app.get("/api/sessions", async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      // If user is not logged in, return empty array
      if (!userId) {
        return res.json({ sessions: [] });
      }

      const allSessions = await storage.getAllSessions();
      // Filter to only completed sessions for this user and sort by endedAt (most recent first)
      const completedSessions = allSessions
        .filter(s => s.endedAt !== null && s.userId === userId)
        .sort((a, b) => {
          const dateA = a.endedAt ? new Date(a.endedAt).getTime() : 0;
          const dateB = b.endedAt ? new Date(b.endedAt).getTime() : 0;
          return dateB - dateA;
        });

      // Get statistics for each session
      const sessionsWithStats = await Promise.all(
        completedSessions.map(async (session) => {
          const responses = await storage.getResponsesForSession(session.id);
          const correctAnswers = responses.filter(r => r.isCorrect).length;
          const totalQuestions = responses.length;

          return {
            id: session.id,
            mode: session.mode,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            totalQuestions,
            correctAnswers,
            incorrectAnswers: totalQuestions - correctAnswers,
          };
        })
      );

      res.json({ sessions: sessionsWithStats });
    } catch (error) {
      console.error('Session history error:', error);
      res.status(500).json({ message: "세션 이력 조회 중 오류가 발생했습니다." });
    }
  });

  // Get session detail with full results (only for own sessions or anonymous sessions)
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const userId = (req.session as any).userId;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "세션을 찾을 수 없습니다." });
      }

      // Check authorization: user must be logged in and session must belong to them
      // OR session must have no userId (anonymous session - for backward compatibility)
      if (session.userId && session.userId !== userId) {
        return res.status(403).json({ message: "권한이 없습니다." });
      }

      const responses = await storage.getResponsesForSession(sessionId);
      const correctAnswers = responses.filter(r => r.isCorrect).length;
      const incorrectAnswers = responses.length - correctAnswers;

      const questionResults = [];
      for (const response of responses) {
        const question = await storage.getQuestion(response.questionId);
        if (question) {
          let questionWithChoices: QuestionWithChoices = question;
          if (question.type.toUpperCase() === "MCQ") {
            const choices = await storage.getChoicesForQuestion(question.id);
            questionWithChoices = { ...question, choices };
          }

          const userAnswer = response.choiceId || response.selectedBoolean || "";
          questionResults.push({
            question: questionWithChoices,
            userAnswer,
            isCorrect: response.isCorrect,
          });
        }
      }

      const results: ResultsResponse = {
        totalQuestions: responses.length,
        correctAnswers,
        incorrectAnswers,
        questions: questionResults,
      };

      res.json(results);
    } catch (error) {
      console.error('Session detail error:', error);
      res.status(500).json({ message: "세션 상세 조회 중 오류가 발생했습니다." });
    }
  });

  // Admin stats endpoint (before page view middleware)
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const [todayViews, totalViews, todayUniqueVisitors, totalUniqueVisitors] = await Promise.all([
        storage.getTodayPageViews(),
        storage.getTotalPageViews(),
        storage.getTodayUniqueVisitors(),
        storage.getTotalUniqueVisitors()
      ]);
      
      res.json({
        todayViews,
        totalViews,
        todayUniqueVisitors,
        totalUniqueVisitors
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ message: "통계 조회 중 오류가 발생했습니다." });
    }
  });

  // Mode usage statistics endpoint
  app.get("/api/admin/mode-stats", async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      const modeStats: { [key: string]: number } = {};

      // Count sessions by mode
      for (const session of sessions) {
        const mode = session.mode || 'unknown';
        modeStats[mode] = (modeStats[mode] || 0) + 1;
      }

      // Sort by count descending
      const sortedModeStats = Object.entries(modeStats)
        .map(([mode, count]) => ({ mode, count }))
        .sort((a, b) => b.count - a.count);

      res.json(sortedModeStats);
    } catch (error) {
      console.error('Mode stats error:', error);
      res.status(500).json({ message: "모드 통계 조회 중 오류가 발생했습니다." });
    }
  });

  // Question statistics endpoint - 문제별 정답률 통계
  app.get("/api/admin/question-stats", async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      const questionStats = [];

      for (const question of questions) {
        const responses = await storage.getResponsesForQuestion(question.id);
        const totalAttempts = responses.length;
        const correctAttempts = responses.filter(r => r.isCorrect).length;
        const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : 0;

        questionStats.push({
          questionId: question.id,
          questionStem: question.stem.substring(0, 100) + (question.stem.length > 100 ? '...' : ''), // 100자까지만
          type: question.type,
          difficulty: question.difficulty,
          totalAttempts,
          correctAttempts,
          accuracy: parseFloat(accuracy as string),
        });
      }

      // 정답률 낮은 순으로 정렬
      questionStats.sort((a, b) => a.accuracy - b.accuracy);

      res.json(questionStats);
    } catch (error) {
      console.error('Question stats error:', error);
      res.status(500).json({ message: "문제 통계 조회 중 오류가 발생했습니다." });
    }
  });

  // 어려운 문제 TOP 20 가져오기
  app.get("/api/questions/difficult-top20", async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      const questionStats = [];

      for (const question of questions) {
        const responses = await storage.getResponsesForQuestion(question.id);
        const totalAttempts = responses.length;
        
        // 최소 3번 이상 시도된 문제만 포함
        if (totalAttempts >= 3) {
          const correctAttempts = responses.filter(r => r.isCorrect).length;
          const accuracy = (correctAttempts / totalAttempts) * 100;

          questionStats.push({
            question,
            accuracy,
            totalAttempts,
          });
        }
      }

      // 정답률 낮은 순으로 정렬하고 상위 20개만 선택
      questionStats.sort((a, b) => a.accuracy - b.accuracy);
      const difficultQuestions = questionStats.slice(0, 20).map(stat => stat.question);

      res.json({ questions: difficultQuestions, count: difficultQuestions.length });
    } catch (error) {
      console.error('Difficult questions error:', error);
      res.status(500).json({ message: "어려운 문제 조회 중 오류가 발생했습니다." });
    }
  });

  // Detailed analytics endpoint
  app.get("/api/admin/analytics", async (req, res) => {
    try {
      // Get detailed page view analytics
      const pageViewsQuery = `
        SELECT 
          DATE(visited_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') as visit_date,
          COUNT(DISTINCT ip_address) as unique_visitors,
          COUNT(*) as total_views
        FROM page_views 
        GROUP BY DATE(visited_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')
        ORDER BY visit_date DESC
        LIMIT 30
      `;
      
      // Get session and response analytics
      const sessionQuery = `
        SELECT 
          COUNT(DISTINCT sessions.id) as total_sessions,
          COUNT(DISTINCT responses.session_id) as sessions_with_responses,
          COUNT(responses.id) as total_answers,
          COUNT(CASE WHEN responses.is_correct = true THEN 1 END) as correct_answers
        FROM sessions 
        LEFT JOIN responses ON sessions.id = responses.session_id
      `;

      const overallQuery = `
        SELECT 
          (SELECT COUNT(DISTINCT ip_address) FROM page_views) as total_unique_visitors,
          (SELECT COUNT(*) FROM page_views) as total_page_views,
          (SELECT COUNT(*) FROM questions) as total_questions,
          (SELECT MIN(visited_at) FROM page_views) as first_visit,
          (SELECT MAX(visited_at) FROM page_views) as last_visit
      `;

      // Execute queries using storage interface or direct db access
      // For now, return basic stats that we can get from storage
      const basicStats = {
        todayViews: await storage.getTodayPageViews(),
        totalViews: await storage.getTotalPageViews(),
        todayUniqueVisitors: await storage.getTodayUniqueVisitors(),
        totalUniqueVisitors: await storage.getTotalUniqueVisitors()
      };

      res.json({
        ...basicStats,
        message: "상세 분석 데이터는 데이터베이스 직접 쿼리가 필요합니다."
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: "분석 데이터 조회 중 오류가 발생했습니다." });
    }
  });

  // IP별 방문자 통계 조회 API
  app.get("/api/admin/visitor-stats", async (req, res) => {
    try {
      const visitorStats = await storage.getVisitorStatsByIP();
      
      res.json({
        visitors: visitorStats,
        totalIPs: visitorStats.length,
        message: "IP별 방문자 통계를 성공적으로 조회했습니다."
      });
    } catch (error) {
      console.error('Visitor stats error:', error);
      res.status(500).json({ message: "방문자 통계 조회 중 오류가 발생했습니다." });
    }
  });

  // Start a new session and return first question
  app.post("/api/session/start", async (req, res) => {
    try {
      const { mode = "study", questionCount, subject, round } = req.body;

      // Save userId if user is logged in
      const userId = (req.session as any).userId || null;
      const session = await storage.createSession({ mode, userId });
      
      // Get questions based on mode
      let questions;
      if (mode === "wangsohee") {
        questions = await storage.getQuestionsByAuthor("wangsohee");
      } else {
        // Only get default questions for non-wangsohee modes
        questions = await storage.getQuestionsByAuthor("default");
      }
      
      if (questions.length === 0) {
        if (mode === "wangsohee") {
          return res.status(404).json({ message: "아직 왕소희 제작 문제가 없습니다." });
        }
        return res.status(404).json({ message: "No questions available" });
      }

      // Special handling for difficult mode
      if (mode === "difficult") {
        const questionStats = [];
        
        for (const question of questions) {
          const responses = await storage.getResponsesForQuestion(question.id);
          const totalAttempts = responses.length;
          
          // Only include questions with at least 3 attempts
          if (totalAttempts >= 3) {
            const correctAttempts = responses.filter(r => r.isCorrect).length;
            const accuracy = (correctAttempts / totalAttempts) * 100;

            questionStats.push({
              question,
              accuracy,
              totalAttempts,
            });
          }
        }

        // Sort by accuracy (lowest first) and take top 20
        questionStats.sort((a, b) => a.accuracy - b.accuracy);
        questions = questionStats.slice(0, 20).map(stat => stat.question);

        if (questions.length === 0) {
          return res.status(404).json({ message: "Not enough data for difficult questions mode" });
        }
      } else {
        // Filter by subject if specified (only for non-difficult modes)
        if (subject && subject >= 1 && subject <= 3) {
          questions = questions.filter(q => q.subject === subject);
          if (questions.length === 0) {
            return res.status(404).json({ message: `No questions available for subject ${subject}` });
          }
        }

        // Filter by round if specified (only for non-difficult modes)
        if (round) {
          questions = questions.filter(q => q.round === round);
          if (questions.length === 0) {
            return res.status(404).json({ message: `${round}회차 문제가 없습니다.` });
          }
        }
      }

      // Always shuffle questions for randomized order
      questions = shuffle(questions);
      
      // If questionCount is specified, select only that many questions (except for difficult mode)
      if (questionCount && questionCount > 0 && mode !== "difficult") {
        questions = questions.slice(0, Math.min(questionCount, questions.length));
      }

      // Store the question order for this session
      sessionQuestionOrders.set(session.id, questions.map(q => q.id));

      const firstQuestion = questions[0];
      let questionWithChoices: QuestionWithChoices = firstQuestion;

      if (firstQuestion.type.toUpperCase() === "MCQ") {
        const choices = await storage.getChoicesForQuestion(firstQuestion.id);
        questionWithChoices = {
          ...firstQuestion,
          choices: shuffle(choices), // Randomize choice order
        };
      }

      const response: SessionResponse = {
        sessionId: session.id,
        question: questionWithChoices,
        currentQuestion: 1,
        totalQuestions: questions.length,
      };

      res.json(response);
    } catch (error) {
      console.error("Error starting session:", error);
      res.status(500).json({ message: "Failed to start session" });
    }
  });

  // Get next question in session
  app.get("/api/session/:id/next", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const responses = await storage.getResponsesForSession(sessionId);
      const currentQuestionIndex = responses.length;
      
      // Get the question order for this session
      const questionOrder = sessionQuestionOrders.get(sessionId);
      if (!questionOrder || currentQuestionIndex >= questionOrder.length) {
        return res.status(404).json({ message: "No more questions" });
      }

      const nextQuestionId = questionOrder[currentQuestionIndex];
      const nextQuestion = await storage.getQuestion(nextQuestionId);
      
      if (!nextQuestion) {
        return res.status(404).json({ message: "Question not found" });
      }

      let questionWithChoices: QuestionWithChoices = nextQuestion;

      if (nextQuestion.type.toUpperCase() === "MCQ") {
        const choices = await storage.getChoicesForQuestion(nextQuestion.id);
        questionWithChoices = {
          ...nextQuestion,
          choices: shuffle(choices), // Randomize choice order
        };
      }

      const response: SessionResponse = {
        sessionId: session.id,
        question: questionWithChoices,
        currentQuestion: currentQuestionIndex + 1,
        totalQuestions: questionOrder.length,
      };

      res.json(response);
    } catch (error) {
      console.error("Error getting next question:", error);
      res.status(500).json({ message: "Failed to get next question" });
    }
  });

  // Submit answer for current question
  app.post("/api/session/:id/answer", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const responses = await storage.getResponsesForSession(sessionId);
      const currentQuestionIndex = responses.length;

      // Get the question order for this session
      const questionOrder = sessionQuestionOrders.get(sessionId);
      if (!questionOrder || currentQuestionIndex >= questionOrder.length) {
        return res.status(400).json({ message: "No active question to answer" });
      }

      const currentQuestionId = questionOrder[currentQuestionIndex];
      const currentQuestion = await storage.getQuestion(currentQuestionId);
      
      if (!currentQuestion) {
        return res.status(404).json({ message: "Question not found" });
      }
      let isCorrect = false;

      if (currentQuestion.type.toUpperCase() === "MCQ") {
        const { selectedChoiceId } = req.body;
        
        // Handle empty answer (time out) - mark as incorrect
        if (!selectedChoiceId) {
          isCorrect = false;
          await storage.createResponse({
            sessionId,
            questionId: currentQuestion.id,
            choiceId: null,
            selectedBoolean: null,
            isCorrect: false,
          });
        } else {
          const choices = await storage.getChoicesForQuestion(currentQuestion.id);
          const selectedChoice = choices.find(c => c.id === selectedChoiceId);
          
          if (!selectedChoice) {
            return res.status(400).json({ message: "Invalid choice ID" });
          }

          isCorrect = selectedChoice.isCorrect;

          await storage.createResponse({
            sessionId,
            questionId: currentQuestion.id,
            choiceId: selectedChoiceId,
            selectedBoolean: null,
            isCorrect,
          });
        }
      } else if (currentQuestion.type.toUpperCase() === "OX") {
        const { selectedBoolean } = req.body;
        
        // Handle empty answer (time out) - mark as incorrect  
        if (typeof selectedBoolean !== "boolean") {
          isCorrect = false;
          await storage.createResponse({
            sessionId,
            questionId: currentQuestion.id,
            choiceId: null,
            selectedBoolean: null,
            isCorrect: false,
          });
        } else {
          isCorrect = selectedBoolean === currentQuestion.answer;

          await storage.createResponse({
            sessionId,
            questionId: currentQuestion.id,
            choiceId: null,
            selectedBoolean,
            isCorrect,
          });
        }
      }

      const response: AnswerResponse = {
        isCorrect,
        explanation: currentQuestion.explanation || "",
        nextReady: true,
      };

      res.json(response);
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  // Finish session and get results
  app.post("/api/session/:id/finish", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      await storage.endSession(sessionId);

      const responses = await storage.getResponsesForSession(sessionId);
      
      // Get the actual number of questions for this session
      const sessionQuestionOrder = sessionQuestionOrders.get(sessionId);
      const actualTotalQuestions = sessionQuestionOrder ? sessionQuestionOrder.length : responses.length;

      const correctAnswers = responses.filter(r => r.isCorrect).length;
      const incorrectAnswers = responses.length - correctAnswers;

      const questionResults = [];
      for (const response of responses) {
        const question = await storage.getQuestion(response.questionId);
        if (question) {
          let questionWithChoices: QuestionWithChoices = question;
          if (question.type.toUpperCase() === "MCQ") {
            const choices = await storage.getChoicesForQuestion(question.id);
            questionWithChoices = { ...question, choices };
          }

          const userAnswer = response.choiceId || response.selectedBoolean || "";
          questionResults.push({
            question: questionWithChoices,
            userAnswer,
            isCorrect: response.isCorrect,
          });
        }
      }

      const results: ResultsResponse = {
        totalQuestions: actualTotalQuestions,
        correctAnswers,
        incorrectAnswers,
        questions: questionResults,
      };

      res.json(results);
    } catch (error) {
      console.error("Error finishing session:", error);
      res.status(500).json({ message: "Failed to finish session" });
    }
  });

  // 관리자 API - 문제 등록
  app.post("/api/admin/questions", async (req, res) => {
    try {
      const { type, questionId, stem, explanation, tags, difficulty, subject, source, answer, choices, author } = req.body;

      if (!type || !questionId || !stem || !explanation) {
        return res.status(400).json({ message: "필수 필드가 누락되었습니다." });
      }

      // 문제 생성
      const question = await storage.createQuestion({
        id: questionId,
        type,
        stem,
        explanation,
        tags: tags || null,
        difficulty: difficulty || null,
        subject: subject || null,
        source: source || null,
        answer: type === "OX" ? answer : null,
        author: author || "default",
      });

      // 사지선다인 경우 선택지 생성
      if (type === "MCQ" && choices && Array.isArray(choices)) {
        for (let i = 0; i < choices.length; i++) {
          const choice = choices[i];
          await storage.createChoice({
            id: `${questionId}c${i + 1}`,
            questionId: questionId,
            content: choice.content,
            isCorrect: choice.isCorrect,
          });
        }
      }

      res.json({ message: "문제가 성공적으로 등록되었습니다.", question });
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(500).json({ message: "문제 등록에 실패했습니다." });
    }
  });

  // 관리자 API - 일괄 문제 등록
  app.post("/api/admin/questions/bulk", async (req, res) => {
    try {
      const { questions } = req.body;

      if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({ message: "문제 목록이 필요합니다." });
      }

      const results = [];

      for (const questionData of questions) {
        const { type, questionId, stem, explanation, tags, difficulty, subject, source, answer, choices, author } = questionData;

        if (!type || !questionId || !stem || !explanation) {
          results.push({ questionId, success: false, error: "필수 필드 누락" });
          continue;
        }

        try {
          // 문제 생성
          const question = await storage.createQuestion({
            id: questionId,
            type,
            stem,
            explanation,
            tags: tags || null,
            difficulty: difficulty || null,
            subject: subject || null,
            source: source || null,
            answer: type === "OX" ? answer : null,
            author: author || "default",
          });

          // 사지선다인 경우 선택지 생성
          if (type === "MCQ" && choices && Array.isArray(choices)) {
            for (let i = 0; i < choices.length; i++) {
              const choice = choices[i];
              await storage.createChoice({
                id: `${questionId}c${i + 1}`,
                questionId: questionId,
                content: choice.content,
                isCorrect: choice.isCorrect,
              });
            }
          }

          results.push({ questionId, success: true });
        } catch (error) {
          results.push({ questionId, success: false, error: error instanceof Error ? error.message : "알 수 없는 오류" });
        }
      }

      res.json({ message: "일괄 등록이 완료되었습니다.", results });
    } catch (error) {
      console.error("Error bulk creating questions:", error);
      res.status(500).json({ message: "일괄 등록에 실패했습니다." });
    }
  });

  // 관리자 API - CSV 파일 업로드
  app.post("/api/admin/questions/csv", upload.single("csv"), async (req, res) => {
    try {
      console.log('CSV 업로드 요청 받음. 파일:', req.file ? `크기 ${req.file.size}바이트` : '없음');
      
      if (!req.file) {
        console.error('CSV 파일이 업로드되지 않음');
        return res.status(400).json({ message: "CSV 파일이 필요합니다." });
      }

      const results: any[] = [];
      const csvData: any[] = [];
      
      // BOM 제거 및 문자열 정리
      let csvText = req.file.buffer.toString('utf8');
      
      // UTF-8 BOM 제거
      if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.slice(1);
      }
      
      const csvBuffer = Buffer.from(csvText, 'utf8');

      // CSV 파일을 스트림으로 처리
      const readable = new Readable();
      readable.push(csvBuffer);
      readable.push(null);

      readable
        .pipe(csv())
        .on("data", (row) => {
          csvData.push(row);
        })
        .on("end", async () => {
          try {
            for (let i = 0; i < csvData.length; i++) {
              const row = csvData[i];
              
              // 첫 번째 키부터 question_id 찾기 (BOM 문제 해결)
              const allKeys = Object.keys(row);
              const qIdKey = allKeys.find(key => key.endsWith('question_id')) || allKeys[0];
              
              const questionId = row[qIdKey] || row.questionId || row["문제ID"];
              const stem = row.stem || row["문제내용"];
              const explanation = row.explanation || row["해설"];
              const tags = row.tags || row["태그"] || null;
              const difficulty = (row.difficulty || row["난이도"]) ? parseInt(row.difficulty || row["난이도"]) : null;
              const subject = (row.subject || row["과목"]) ? parseInt(row.subject || row["과목"]) : null;
              const source = row.source || row["출처"] || null;

              if (!questionId || !stem || !explanation) {
                const missingFields = [];
                if (!questionId) missingFields.push('question_id');
                if (!stem) missingFields.push('stem');
                if (!explanation) missingFields.push('explanation');
                
                results.push({ 
                  questionId: questionId || "unknown", 
                  success: false, 
                  error: `필수 필드 누락: ${missingFields.join(', ')}` 
                });
                continue;
              }

              try {
                // 영어와 한국어 필드 모두 지원 (영어 우선)
                const answer = row.answer || row["정답"];
                const choice1 = row.choice1 || row["선택지1"];
                const choice2 = row.choice2 || row["선택지2"];
                const choice3 = row.choice3 || row["선택지3"];
                const choice4 = row.choice4 || row["선택지4"];
                const correctAnswer = parseInt(row.correct_answer || row.correctAnswer || row["정답번호"]);
                
                // OX 문제인지 사지선다인지 판단
                const hasAnswer = answer && answer.trim() !== "";
                const hasChoices = choice1 && choice1.trim() !== "" && 
                                  choice2 && choice2.trim() !== "" && 
                                  choice3 && choice3.trim() !== "" && 
                                  choice4 && choice4.trim() !== "";
                const isOX = hasAnswer && (answer.toUpperCase() === "O" || answer.toUpperCase() === "X" || 
                             answer === "true" || answer === "false");
                
                if (isOX) {
                  // OX 문제 처리
                  const answerBoolean = answer.toUpperCase() === "O" || answer === "true";

                  await storage.createQuestion({
                    id: questionId,
                    type: "OX",
                    stem,
                    explanation,
                    tags,
                    difficulty,
                    subject,
                    source,
                    answer: answerBoolean,
                  });
                } else if (hasChoices) {
                  // 사지선다 문제 처리
                  if (!choice1 || !choice2 || !choice3 || !choice4 || !correctAnswer) {
                    results.push({ questionId, success: false, error: "선택지 또는 정답 번호가 누락됨" });
                    continue;
                  }

                  // 문제 생성
                  await storage.createQuestion({
                    id: questionId,
                    type: "MCQ",
                    stem,
                    explanation,
                    tags,
                    difficulty,
                    subject,
                    source,
                    answer: null,
                  });

                  // 선택지 생성
                  const choicesArray = [choice1, choice2, choice3, choice4];
                  for (let i = 0; i < choicesArray.length; i++) {
                    await storage.createChoice({
                      id: `${questionId}c${i + 1}`,
                      questionId: questionId,
                      content: choicesArray[i],
                      isCorrect: (i + 1) === correctAnswer,
                    });
                  }
                } else {
                  // OX도 MCQ도 아닌 경우
                  results.push({ 
                    questionId, 
                    success: false, 
                    error: "문제 타입을 결정할 수 없음 (OX 문제는 answer 필드가, 사지선다는 choice1~4와 correct_answer 필드가 필요)" 
                  });
                  continue;
                }

                results.push({ questionId, success: true });
              } catch (error) {
                results.push({ 
                  questionId, 
                  success: false, 
                  error: error instanceof Error ? error.message : "알 수 없는 오류" 
                });
              }
            }

            const successCount = results.filter(r => r.success).length;
            const failedResults = results.filter(r => !r.success);
            
            res.json({ 
              message: `CSV 파일 처리 완료. 총 ${csvData.length}개 문제 중 ${successCount}개 성공`,
              results,
              errors: failedResults.length > 0 ? failedResults.slice(0, 5) : [] // 처음 5개 에러만 표시
            });
          } catch (error) {
            console.error("CSV 데이터 처리 중 심각한 오류:", error);
            res.status(500).json({ 
              message: "CSV 데이터 처리 중 오류가 발생했습니다.",
              error: error instanceof Error ? error.message : String(error)
            });
          }
        })
        .on("error", (error) => {
          console.error("CSV 파싱 오류:", error);
          res.status(500).json({ 
            message: "CSV 파일 파싱 중 오류가 발생했습니다.",
            error: error instanceof Error ? error.message : String(error)
          });
        });

    } catch (error) {
      console.error("CSV 업로드 전체 처리 오류:", error);
      res.status(500).json({ 
        message: "CSV 업로드에 실패했습니다.",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 관리자 API - 문제 수정
  app.put("/api/admin/questions/:id", async (req, res) => {
    try {
      const questionId = req.params.id;
      const { type, stem, explanation, choices: newChoices } = req.body;

      // 문제가 존재하는지 확인
      const existingQuestion = await storage.getQuestion(questionId);
      if (!existingQuestion) {
        return res.status(404).json({ message: "문제를 찾을 수 없습니다." });
      }

      // 문제 업데이트
      const updateData: any = { stem, explanation };
      if (type === "OX") {
        updateData.answer = req.body.answer;
      }

      const updatedQuestion = await storage.updateQuestion(questionId, updateData);

      // 사지선다인 경우 선택지 업데이트
      if (type === "MCQ" && newChoices && Array.isArray(newChoices)) {
        // 기존 선택지 삭제
        await storage.deleteChoicesForQuestion(questionId);

        // 새 선택지 생성
        for (let i = 0; i < newChoices.length; i++) {
          const choice = newChoices[i];
          await storage.createChoice({
            id: `${questionId}_${i + 1}`,
            questionId: questionId,
            content: choice.content,
            isCorrect: choice.isCorrect,
          });
        }
      }

      res.json({ message: "문제가 성공적으로 수정되었습니다.", question: updatedQuestion });
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ message: "문제 수정에 실패했습니다." });
    }
  });

  // 관리자 API - 모든 데이터 삭제 (위험한 기능)
  // ⚠️ 중요: 이 라우트는 /:id보다 먼저 정의되어야 합니다!
  app.delete("/api/admin/questions/clear", async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ message: "모든 문제와 선택지가 삭제되었습니다." });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ message: "데이터 삭제에 실패했습니다." });
    }
  });

  // 관리자 API - 개별 문제 삭제
  app.delete("/api/admin/questions/:id", async (req, res) => {
    try {
      const questionId = req.params.id;

      // 문제가 존재하는지 확인
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "문제를 찾을 수 없습니다." });
      }

      // 문제와 관련된 선택지, 응답 모두 삭제
      await storage.deleteQuestion(questionId);

      res.json({ message: "문제가 성공적으로 삭제되었습니다." });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "문제 삭제에 실패했습니다." });
    }
  });

  // 관리자 API - CSV 다운로드
  app.get("/api/admin/questions/download", async (req, res) => {
    try {
      const questions = await storage.getQuestions();

      if (questions.length === 0) {
        return res.status(404).json({ message: "다운로드할 문제가 없습니다." });
      }

      // 파일명 생성: adsp_questions_15_20260111.csv
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const filename = `adsp_questions_${questions.length}_${dateStr}.csv`;

      // CSV 헤더 설정
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // CSV 헤더 (BOM 제거)
      const header = 'question_id,type,stem,explanation,tags,difficulty,source,answer,choice1,choice2,choice3,choice4,correct_answer\n';
      res.write(header);

      // 각 문제를 CSV 형식으로 변환
      for (const question of questions) {
        let csvRow = '';
        
        // 기본 정보
        csvRow += `"${question.id}",`;
        csvRow += `"${question.type}",`;
        csvRow += `"${question.stem.replace(/"/g, '""')}",`;
        csvRow += `"${question.explanation?.replace(/"/g, '""') || ''}",`;
        csvRow += `"${question.tags || ''}",`;
        csvRow += `"${question.difficulty || ''}",`;
        csvRow += `"${question.source || ''}",`;

        if (question.type.toUpperCase() === "OX") {
          // OX 문제
          csvRow += `"${question.answer ? 'O' : 'X'}",`;
          csvRow += ',"","","",""'; // 빈 선택지들
        } else {
          // MCQ 문제
          csvRow += '"",'; // 빈 answer
          
          const choices = await storage.getChoicesForQuestion(question.id);
          const sortedChoices = choices.sort((a, b) => a.id.localeCompare(b.id));
          
          // 선택지 4개
          for (let i = 0; i < 4; i++) {
            if (i < sortedChoices.length) {
              csvRow += `"${sortedChoices[i].content.replace(/"/g, '""')}",`;
            } else {
              csvRow += '"",';
            }
          }
          
          // 정답 번호 찾기
          const correctChoiceIndex = sortedChoices.findIndex(choice => choice.isCorrect);
          csvRow += `"${correctChoiceIndex + 1}"`;
        }
        
        res.write(csvRow + '\n');
      }
      
      res.end();
    } catch (error) {
      console.error("Error downloading CSV:", error);
      res.status(500).json({ message: "CSV 다운로드에 실패했습니다." });
    }
  });

  // Page view tracking middleware (after all API routes)
  app.use(async (req, res, next) => {
    // 정적 파일과 API 경로는 제외
    if (!req.path.startsWith('/api') && !req.path.includes('.')) {
      try {
        const realIP = req.get('X-Real-IP') || 
                      req.get('X-Forwarded-For')?.split(',')[0] || 
                      req.ip || 
                      req.connection.remoteAddress || 
                      'unknown';
        
        const pageViewData = {
          ipAddress: realIP,
          userAgent: req.get('User-Agent') || '',
          page: req.path
        };
        
        console.log('📊 페이지뷰 기록:', {
          path: req.path,
          ip: realIP,
          userAgent: req.get('User-Agent'),
          headers: {
            'X-Real-IP': req.get('X-Real-IP'),
            'X-Forwarded-For': req.get('X-Forwarded-For')
          }
        });
        
        await storage.recordPageView(pageViewData);
      } catch (error) {
        console.error('페이지 조회수 기록 실패:', error);
      }
    }
    next();
  });

  // =====================
  // Authentication APIs
  // =====================

  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ message: "모든 필드를 입력해주세요." });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "이미 등록된 이메일입니다." });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user with pending status
      const user = await storage.createUser({
        email,
        passwordHash,
        name,
        status: 'pending'
      });

      res.json({
        message: "회원가입 완료! 관리자 승인 후 로그인할 수 있습니다.",
        user: { id: user.id, email: user.email, name: user.name, status: user.status }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "회원가입 중 오류가 발생했습니다." });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "이메일과 비밀번호를 입력해주세요." });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
      }

      // Check password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
      }

      // Check approval status
      if (user.status !== 'approved') {
        if (user.status === 'pending') {
          return res.status(403).json({ message: "관리자 승인 대기 중입니다." });
        } else if (user.status === 'rejected') {
          return res.status(403).json({ message: "가입이 거부되었습니다. 관리자에게 문의하세요." });
        }
      }

      // Create session
      req.session.userId = user.id;

      res.json({
        message: "로그인 성공",
        user: { id: user.id, email: user.email, name: user.name, status: user.status }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "로그인 중 오류가 발생했습니다." });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "로그아웃 실패" });
      }
      res.json({ message: "로그아웃 성공" });
    });
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "로그인되지 않음" });
    }

    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "사용자를 찾을 수 없음" });
      }

      res.json({
        user: { id: user.id, email: user.email, name: user.name, status: user.status }
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "사용자 정보 조회 실패" });
    }
  });

  // =====================
  // Bookmark APIs
  // =====================

  // Add bookmark
  app.post("/api/bookmarks", requireAuth, async (req: any, res) => {
    try {
      const { questionId } = req.body;
      const userId = req.session.userId;

      if (!questionId) {
        return res.status(400).json({ message: "문제 ID가 필요합니다." });
      }

      // Check if already bookmarked
      const isBookmarked = await storage.isBookmarked(userId, questionId);
      if (isBookmarked) {
        return res.status(400).json({ message: "이미 북마크된 문제입니다." });
      }

      const bookmark = await storage.createBookmark({ userId, questionId });
      res.json({ message: "북마크 추가 완료", bookmark });
    } catch (error) {
      console.error("Add bookmark error:", error);
      res.status(500).json({ message: "북마크 추가 실패" });
    }
  });

  // Remove bookmark
  app.delete("/api/bookmarks/:questionId", requireAuth, async (req: any, res) => {
    try {
      const { questionId } = req.params;
      const userId = req.session.userId;

      await storage.deleteBookmark(userId, questionId);
      res.json({ message: "북마크 제거 완료" });
    } catch (error) {
      console.error("Remove bookmark error:", error);
      res.status(500).json({ message: "북마크 제거 실패" });
    }
  });

  // Get user bookmarks
  app.get("/api/bookmarks", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const bookmarks = await storage.getUserBookmarks(userId);

      // Get full question details for each bookmark
      const bookmarkedQuestions = await Promise.all(
        bookmarks.map(async (bookmark) => {
          const question = await storage.getQuestion(bookmark.questionId);
          return { ...bookmark, question };
        })
      );

      res.json(bookmarkedQuestions);
    } catch (error) {
      console.error("Get bookmarks error:", error);
      res.status(500).json({ message: "북마크 조회 실패" });
    }
  });

  // Check if question is bookmarked
  app.get("/api/bookmarks/:questionId/check", requireAuth, async (req: any, res) => {
    try {
      const { questionId } = req.params;
      const userId = req.session.userId;

      const isBookmarked = await storage.isBookmarked(userId, questionId);
      res.json({ isBookmarked });
    } catch (error) {
      console.error("Check bookmark error:", error);
      res.status(500).json({ message: "북마크 확인 실패" });
    }
  });

  // =====================
  // Admin User Management APIs
  // =====================

  // Get all users (admin only - simplified without separate admin check)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          status: u.status,
          createdAt: u.createdAt
        }))
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "사용자 목록 조회 실패" });
    }
  });

  // Approve user
  app.put("/api/admin/users/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.updateUserStatus(id, 'approved');
      res.json({ message: "사용자 승인 완료" });
    } catch (error) {
      console.error("Approve user error:", error);
      res.status(500).json({ message: "사용자 승인 실패" });
    }
  });

  // Reject user
  app.put("/api/admin/users/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.updateUserStatus(id, 'rejected');
      res.json({ message: "사용자 거부 완료" });
    } catch (error) {
      console.error("Reject user error:", error);
      res.status(500).json({ message: "사용자 거부 실패" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
