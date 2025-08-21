import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { api } from "./lib/api";
import Home from "./pages/home";
import Question from "./pages/question";
import Results from "./pages/results";
import type { SessionResponse, AnswerResponse, ResultsResponse } from "@shared/schema";

type AppState = "home" | "question" | "results";

function AppContent() {
  const [appState, setAppState] = useState<AppState>("home");
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const { toast } = useToast();

  const startSessionMutation = useMutation({
    mutationFn: () => api.startSession("study"),
    onSuccess: (data) => {
      setSessionData(data);
      setAnswerResult(null);
      setAppState("question");
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "세션을 시작할 수 없습니다.",
        variant: "destructive",
      });
      console.error("Failed to start session:", error);
    },
  });

  const submitAnswerMutation = useMutation({
    mutationFn: (answer: { selectedChoiceId?: string; selectedBoolean?: boolean }) => {
      if (!sessionData) throw new Error("No active session");
      return api.submitAnswer(sessionData.sessionId, answer);
    },
    onSuccess: (data) => {
      setAnswerResult(data);
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "답안을 제출할 수 없습니다.",
        variant: "destructive",
      });
      console.error("Failed to submit answer:", error);
    },
  });

  const nextQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!sessionData) throw new Error("No active session");
      
      try {
        // Try to get next question
        const nextData = await api.getNextQuestion(sessionData.sessionId);
        return { type: "next", data: nextData };
      } catch (error: any) {
        // If no more questions, finish session
        if (error.message.includes("404") || error.message.includes("No more questions")) {
          const resultsData = await api.finishSession(sessionData.sessionId);
          return { type: "finish", data: resultsData };
        }
        throw error;
      }
    },
    onSuccess: (response) => {
      if (response.type === "next") {
        setSessionData(response.data as SessionResponse);
        setAnswerResult(null);
      } else {
        setResults(response.data as ResultsResponse);
        setAppState("results");
      }
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "다음 문제를 불러올 수 없습니다.",
        variant: "destructive",
      });
      console.error("Failed to get next question:", error);
    },
  });

  const handleStart = () => {
    startSessionMutation.mutate();
  };

  const handleAnswer = (answer: { selectedChoiceId?: string; selectedBoolean?: boolean }) => {
    submitAnswerMutation.mutate(answer);
  };

  const handleNext = () => {
    nextQuestionMutation.mutate();
  };

  const handleRestart = () => {
    setSessionData(null);
    setAnswerResult(null);
    setResults(null);
    setAppState("home");
  };

  const handleHome = () => {
    setSessionData(null);
    setAnswerResult(null);
    setResults(null);
    setAppState("home");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {appState === "home" && (
        <Home onStart={handleStart} />
      )}
      
      {appState === "question" && sessionData && (
        <Question
          sessionData={sessionData}
          onAnswer={handleAnswer}
          onNext={handleNext}
          answerResult={answerResult || undefined}
          isLoading={nextQuestionMutation.isPending}
        />
      )}
      
      {appState === "results" && results && (
        <Results
          results={results}
          onRestart={handleRestart}
          onHome={handleHome}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
