import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import type { SessionResponse, AnswerResponse, ResultsResponse, QuestionWithChoices } from "@shared/schema";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Start a new session and return first question
  app.post("/api/session/start", async (req, res) => {
    try {
      const { mode = "study" } = req.body;
      
      const session = await storage.createSession({ mode });
      const questions = await storage.getQuestions();
      
      if (questions.length === 0) {
        return res.status(404).json({ message: "No questions available" });
      }

      const firstQuestion = questions[0];
      let questionWithChoices: QuestionWithChoices = firstQuestion;

      if (firstQuestion.type === "MCQ") {
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
      const questions = await storage.getQuestions();
      const currentQuestionIndex = responses.length;

      if (currentQuestionIndex >= questions.length) {
        return res.status(404).json({ message: "No more questions" });
      }

      const nextQuestion = questions[currentQuestionIndex];
      let questionWithChoices: QuestionWithChoices = nextQuestion;

      if (nextQuestion.type === "MCQ") {
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
        totalQuestions: questions.length,
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
      const questions = await storage.getQuestions();
      const currentQuestionIndex = responses.length;

      if (currentQuestionIndex >= questions.length) {
        return res.status(400).json({ message: "No active question to answer" });
      }

      const currentQuestion = questions[currentQuestionIndex];
      let isCorrect = false;

      if (currentQuestion.type === "MCQ") {
        const { selectedChoiceId } = req.body;
        if (!selectedChoiceId) {
          return res.status(400).json({ message: "Selected choice ID is required" });
        }

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
      } else if (currentQuestion.type === "OX") {
        const { selectedBoolean } = req.body;
        if (typeof selectedBoolean !== "boolean") {
          return res.status(400).json({ message: "Selected boolean is required" });
        }

        isCorrect = selectedBoolean === currentQuestion.answer;

        await storage.createResponse({
          sessionId,
          questionId: currentQuestion.id,
          choiceId: null,
          selectedBoolean,
          isCorrect,
        });
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
      const questions = await storage.getQuestions();

      const correctAnswers = responses.filter(r => r.isCorrect).length;
      const incorrectAnswers = responses.length - correctAnswers;

      const questionResults = [];
      for (const response of responses) {
        const question = await storage.getQuestion(response.questionId);
        if (question) {
          let questionWithChoices: QuestionWithChoices = question;
          if (question.type === "MCQ") {
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
        totalQuestions: questions.length,
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
      const { type, questionId, stem, explanation, tags, difficulty, source, answer, choices } = req.body;

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
        source: source || null,
        answer: type === "OX" ? answer : null,
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
        const { type, questionId, stem, explanation, tags, difficulty, source, answer, choices } = questionData;

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
            source: source || null,
            answer: type === "OX" ? answer : null,
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
      if (!req.file) {
        return res.status(400).json({ message: "CSV 파일이 필요합니다." });
      }

      const results: any[] = [];
      const csvData: any[] = [];

      // CSV 파일을 스트림으로 처리
      const readable = new Readable();
      readable.push(req.file.buffer);
      readable.push(null);

      readable
        .pipe(csv())
        .on("data", (row) => {
          csvData.push(row);
        })
        .on("end", async () => {
          try {
            for (const row of csvData) {
              const questionId = row.question_id || row.questionId;
              const stem = row.stem;
              const explanation = row.explanation;
              const tags = row.tags || null;
              const difficulty = row.difficulty ? parseInt(row.difficulty) : null;
              const source = row.source || null;

              if (!questionId || !stem || !explanation) {
                results.push({ questionId: questionId || "unknown", success: false, error: "필수 필드 누락" });
                continue;
              }

              try {
                // OX 문제인지 사지선다인지 판단
                const isOX = row.answer && (row.answer.toUpperCase() === "O" || row.answer.toUpperCase() === "X" || 
                             row.answer === "true" || row.answer === "false");
                
                if (isOX) {
                  // OX 문제 처리
                  const answer = row.answer.toUpperCase() === "O" || row.answer === "true";
                  
                  await storage.createQuestion({
                    id: questionId,
                    type: "OX",
                    stem,
                    explanation,
                    tags,
                    difficulty,
                    source,
                    answer,
                  });
                } else {
                  // 사지선다 문제 처리
                  const choice1 = row.choice1;
                  const choice2 = row.choice2;
                  const choice3 = row.choice3;
                  const choice4 = row.choice4;
                  const correctAnswer = parseInt(row.correct_answer || row.correctAnswer);

                  if (!choice1 || !choice2 || !choice3 || !choice4 || !correctAnswer) {
                    results.push({ questionId, success: false, error: "선택지 또는 정답이 누락됨" });
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
                    source,
                    answer: null,
                  });

                  // 선택지 생성
                  const choices = [choice1, choice2, choice3, choice4];
                  for (let i = 0; i < choices.length; i++) {
                    await storage.createChoice({
                      id: `${questionId}c${i + 1}`,
                      questionId: questionId,
                      content: choices[i],
                      isCorrect: (i + 1) === correctAnswer,
                    });
                  }
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

            res.json({ 
              message: `CSV 파일 처리 완료. 총 ${csvData.length}개 문제 중 ${results.filter(r => r.success).length}개 성공`,
              results 
            });
          } catch (error) {
            console.error("Error processing CSV data:", error);
            res.status(500).json({ message: "CSV 데이터 처리 중 오류가 발생했습니다." });
          }
        })
        .on("error", (error) => {
          console.error("Error parsing CSV:", error);
          res.status(500).json({ message: "CSV 파일 파싱 중 오류가 발생했습니다." });
        });

    } catch (error) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ message: "CSV 업로드에 실패했습니다." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
