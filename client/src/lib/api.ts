import { apiRequest } from "./queryClient";
import type { SessionResponse, AnswerResponse, ResultsResponse } from "@shared/schema";

export const api = {
  startSession: async (mode: string = "study", questionCount?: number, subject?: number, round?: number): Promise<SessionResponse> => {
    const body: any = { mode };
    if (questionCount) {
      body.questionCount = questionCount;
    }
    if (subject) {
      body.subject = subject;
    }
    if (round) {
      body.round = round;
    }
    const response = await apiRequest("POST", "/api/session/start", body);
    return response.json();
  },

  getNextQuestion: async (sessionId: string): Promise<SessionResponse> => {
    const response = await apiRequest("GET", `/api/session/${sessionId}/next`);
    return response.json();
  },

  submitAnswer: async (
    sessionId: string,
    answer: { selectedChoiceId?: string; selectedBoolean?: boolean }
  ): Promise<AnswerResponse> => {
    const response = await apiRequest("POST", `/api/session/${sessionId}/answer`, answer);
    return response.json();
  },

  finishSession: async (sessionId: string): Promise<ResultsResponse> => {
    const response = await apiRequest("POST", `/api/session/${sessionId}/finish`);
    return response.json();
  },
};
