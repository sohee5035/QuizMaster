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
import Admin from "./pages/Admin";
import TimerMode from "./pages/TimerMode.tsx";
import TimerResults from "./pages/TimerResults.tsx";
import type { SessionResponse, AnswerResponse, ResultsResponse, TimerQuestionData, TimerResultsData } from "@shared/schema";

type AppState = "home" | "question" | "results" | "admin" | "timer" | "timer-results";

function AppContent() {
  const [appState, setAppState] = useState<AppState>("home");
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [timerQuestions, setTimerQuestions] = useState<TimerQuestionData[]>([]);
  const [currentTimerIndex, setCurrentTimerIndex] = useState(0);
  const [timerResults, setTimerResults] = useState<TimerResultsData | null>(null);
  const { toast } = useToast();

  const startSessionMutation = useMutation({
    mutationFn: ({ questionCount, difficulty, mode }: { questionCount?: number; difficulty?: number; mode?: string }) => 
      api.startSession(mode || "study", questionCount, difficulty),
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

  const startTimerMutation = useMutation({
    mutationFn: () => api.startSession("timer", 100), // 100문제 고정
    onSuccess: (data) => {
      // 첫 번째 문제로 타이머 세션 시작
      const initialQuestion: TimerQuestionData = {
        sessionId: data.sessionId,
        question: data.question,
        currentQuestion: data.currentQuestion,
        totalQuestions: data.totalQuestions,
        isAnswered: false,
      };
      setTimerQuestions([initialQuestion]);
      setCurrentTimerIndex(0);
      setAppState("timer");
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "타이머 모드를 시작할 수 없습니다.",
        variant: "destructive",
      });
      console.error("Failed to start timer mode:", error);
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

  const handleStart = (questionCount?: number, difficulty?: number) => {
    startSessionMutation.mutate({ questionCount, difficulty });
  };

  const handleStartTimer = () => {
    startTimerMutation.mutate();
  };

  const handleTimerAnswer = async (answer: { selectedChoiceId?: string; selectedBoolean?: boolean }) => {
    const currentQuestion = timerQuestions[currentTimerIndex];
    if (!currentQuestion || currentQuestion.isAnswered) return;

    try {
      // Submit answer
      const result = await api.submitAnswer(currentQuestion.sessionId, answer);
      
      // Update current question with answer
      const updatedQuestions = [...timerQuestions];
      updatedQuestions[currentTimerIndex] = {
        ...currentQuestion,
        isAnswered: true,
        userAnswer: answer.selectedChoiceId || answer.selectedBoolean,
        isCorrect: result.isCorrect,
        explanation: result.explanation,
      };
      setTimerQuestions(updatedQuestions);
      
    } catch (error) {
      console.error("Failed to submit timer answer:", error);
    }
  };

  const handleTimerNext = async () => {
    const currentQuestion = timerQuestions[currentTimerIndex];
    if (!currentQuestion) return;

    try {
      // Check if this is the last question
      if (currentTimerIndex + 1 >= currentQuestion.totalQuestions) {
        // Finish session and show results
        const results = await api.finishSession(currentQuestion.sessionId);
        
        // Prepare timer results with incorrect questions only
        const incorrectQuestions = timerQuestions.filter(q => q.isAnswered && !q.isCorrect);
        const correctCount = timerQuestions.filter(q => q.isAnswered && q.isCorrect).length;
        
        setTimerResults({
          totalQuestions: currentQuestion.totalQuestions,
          correctAnswers: correctCount,
          incorrectQuestions,
        });
        setAppState("timer-results");
        return;
      }

      // Get next question
      const nextData = await api.getNextQuestion(currentQuestion.sessionId);
      
      // Add next question to the list
      const nextQuestion: TimerQuestionData = {
        sessionId: nextData.sessionId,
        question: nextData.question,
        currentQuestion: nextData.currentQuestion,
        totalQuestions: nextData.totalQuestions,
        isAnswered: false,
      };
      
      setTimerQuestions(prev => [...prev, nextQuestion]);
      setCurrentTimerIndex(prev => prev + 1);
      
    } catch (error) {
      console.error("Failed to get next timer question:", error);
    }
  };

  const handleTimerSkip = async () => {
    // Skip current question (mark as unanswered/incorrect)
    const currentQuestion = timerQuestions[currentTimerIndex];
    if (!currentQuestion || currentQuestion.isAnswered) return;

    // Mark current question as incorrect with explanation
    const updatedQuestions = [...timerQuestions];
    updatedQuestions[currentTimerIndex] = {
      ...currentQuestion,
      isAnswered: true,
      isCorrect: false,
      explanation: "시간 초과로 건너뛴 문제입니다.",
    };
    setTimerQuestions(updatedQuestions);
    
    // Don't automatically call handleTimerNext here - let the explanation timer handle it
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
    setTimerQuestions([]);
    setCurrentTimerIndex(0);
    setTimerResults(null);
    setAppState("home");
  };

  const handleHome = () => {
    setSessionData(null);
    setAnswerResult(null);
    setResults(null);
    setTimerQuestions([]);
    setCurrentTimerIndex(0);
    setTimerResults(null);
    setAppState("home");
  };

  const handleAdmin = () => {
    setAppState("admin");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">🏆 KB 외환 마스터 👑</h1>
            <div className="space-x-4">
              <button
                onClick={handleHome}
                className="text-yellow-600 hover:text-yellow-800"
                data-testid="nav-home"
              >
                홈
              </button>
              <button
                onClick={handleAdmin}
                className="text-gray-600 hover:text-gray-800"
                data-testid="nav-admin"
              >
                관리자
              </button>
            </div>
          </div>
        </div>
      </nav>

      {appState === "home" && (
        <Home onStart={handleStart} onStartTimer={handleStartTimer} />
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

      {appState === "timer" && timerQuestions.length > 0 && (
        <TimerMode
          questionData={timerQuestions[currentTimerIndex]}
          onAnswer={handleTimerAnswer}
          onNext={handleTimerNext}
          onSkip={handleTimerSkip}
        />
      )}

      {appState === "timer-results" && timerResults && (
        <TimerResults
          results={timerResults}
          onRestart={handleRestart}
          onHome={handleHome}
        />
      )}

      {appState === "admin" && (
        <Admin />
      )}

      {/* 하단 크레딧 */}
      <footer className="bg-white border-t py-4 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">제작: 왕소희대리</p>
        </div>
      </footer>
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
