import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import type { SessionResponse, AnswerResponse, ResultsResponse, QuestionWithChoices } from "@shared/schema";

// Fisher-Yates shuffle algorithm
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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

          const userAnswer = response.choiceId || response.selectedBoolean;
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

  const httpServer = createServer(app);
  return httpServer;
}
