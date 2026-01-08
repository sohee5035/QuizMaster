import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { LoadingOverlay } from "@/components/ui/spinner";
import { api } from "./lib/api";
import Home from "./pages/home";
import Question from "./pages/question";
import Results from "./pages/results";
import Admin from "./pages/Admin";
import TimerMode from "./pages/TimerMode.tsx";
import TimerResults from "./pages/TimerResults.tsx";
import TimerSetup from "./pages/TimerSetup";
import SessionHistory from "./pages/SessionHistory";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import type { SessionResponse, AnswerResponse, ResultsResponse, TimerQuestionData, TimerResultsData } from "@shared/schema";

type AppState = "home" | "question" | "results" | "admin" | "timer" | "timer-results" | "timer-setup" | "history" | "login" | "signup";

function AppContent() {
  const [appState, setAppState] = useState<AppState>("home");
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [timerQuestions, setTimerQuestions] = useState<TimerQuestionData[]>([]);
  const [currentTimerIndex, setCurrentTimerIndex] = useState(0);
  const [timerResults, setTimerResults] = useState<TimerResultsData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  // Check if user is logged in
  const { data: authData, refetch: refetchAuth } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return null;
        return response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  const isLoggedIn = authData && authData.user;
  const currentUser = authData?.user;

  const startSessionMutation = useMutation({
    mutationFn: ({ questionCount, subject, mode, round }: { questionCount?: number; subject?: number; mode?: string; round?: number }) =>
      api.startSession(mode || "study", questionCount, subject, round),
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

  // 어려운 문제 세션 시작
  const startDifficultMutation = useMutation({
    mutationFn: () => fetch("/api/questions/difficult-top20").then(res => res.json()),
    onSuccess: async (data: { questions: any[]; count: number }) => {
      if (data.questions.length === 0) {
        toast({
          title: "알림",
          description: "아직 충분한 데이터가 없습니다. 사람들이 더 많은 문제를 풀면 통계가 생성됩니다.",
        });
        return;
      }

      // 특별 세션 시작 (어려운 문제들로)
      try {
        const sessionData = await api.startSession("difficult", data.count);
        setSessionData(sessionData);
        setAnswerResult(null);
        setAppState("question");
        
        toast({
          title: "어려운 문제 도전!",
          description: `사람들이 가장 많이 틀린 ${data.count}개 문제로 도전합니다! 🔥`,
        });
      } catch (error) {
        console.error("Failed to start difficult session:", error);
        throw error;
      }
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "어려운 문제 모드를 시작할 수 없습니다.",
        variant: "destructive",
      });
      console.error("Failed to start difficult mode:", error);
    },
  });

  const startTimerMutation = useMutation({
    mutationFn: (questionCount: number) => api.startSession("timer", questionCount),
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

  // 왕소희 제작 문제 세션 시작
  const startWangsoheeMutation = useMutation({
    mutationFn: () => api.startSession("wangsohee"),
    onSuccess: (data) => {
      setSessionData(data);
      setAnswerResult(null);
      setAppState("question");
      
      toast({
        title: "왕소희 제작 문제 도전!",
        description: "왕소희님이 직접 만든 특별한 문제들을 풀어보세요! 👑",
      });
    },
    onError: (error) => {
      toast({
        title: "알림",
        description: "아직 왕소희 제작 문제가 없습니다. 관리자 페이지에서 문제를 등록해주세요.",
        variant: "destructive",
      });
      console.error("Failed to start wangsohee mode:", error);
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

  const handleStart = (questionCount?: number, subject?: number, round?: number) => {
    // Check if user is logged in
    if (!isLoggedIn) {
      toast({
        title: "로그인 필요",
        description: "문제를 풀려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setAppState("login");
      return;
    }
    startSessionMutation.mutate({ questionCount, subject, round });
  };

  const handleStartTimer = () => {
    setAppState("timer-setup");
  };

  const handleStartTimerWithCount = (questionCount: number) => {
    startTimerMutation.mutate(questionCount);
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
        
        // Use server results for accuracy, but filter client questions for incorrect list
        const incorrectQuestions = timerQuestions.filter(q => q.isAnswered && !q.isCorrect);
        
        setTimerResults({
          totalQuestions: results.totalQuestions,
          correctAnswers: results.correctAnswers,
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

    try {
      // Submit empty answer to server to mark as incorrect and move to next question
      let emptyAnswer;
      if (currentQuestion.question.type === "MCQ") {
        emptyAnswer = { selectedChoiceId: "" }; // Empty choice for MCQ
      } else {
        emptyAnswer = { selectedBoolean: false }; // Default false for OX
      }
      
      const result = await api.submitAnswer(currentQuestion.sessionId, emptyAnswer);
      
      // Mark current question as incorrect with actual explanation from server
      const updatedQuestions = [...timerQuestions];
      updatedQuestions[currentTimerIndex] = {
        ...currentQuestion,
        isAnswered: true,
        isCorrect: false,
        explanation: result.explanation || "해설이 없습니다.",
      };
      setTimerQuestions(updatedQuestions);
      
    } catch (error) {
      console.error("Failed to submit skip answer:", error);
      // Fallback: just mark as answered locally
      const updatedQuestions = [...timerQuestions];
      updatedQuestions[currentTimerIndex] = {
        ...currentQuestion,
        isAnswered: true,
        isCorrect: false,
        explanation: "시간 초과로 건너뛴 문제입니다.",
      };
      setTimerQuestions(updatedQuestions);
    }
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

  const handleHistory = () => {
    setAppState("history");
  };

  const handleViewHistoryResults = (historyResults: ResultsResponse) => {
    setResults(historyResults);
    setAppState("results");
  };

  const handleLogin = () => {
    setAppState("login");
  };

  const handleSignup = () => {
    setAppState("signup");
  };

  const handleLoginSuccess = () => {
    refetchAuth();
    setAppState("home");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      });
      refetchAuth();
      setAppState("home");
    } catch (error) {
      toast({
        title: "오류",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-white shadow-sm border-b relative">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1
              className="text-lg sm:text-xl font-bold cursor-pointer"
              onClick={handleHome}
            >
              📊 ADsP 마스터
            </h1>

            {/* 햄버거 버튼 */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="메뉴"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* 드롭다운 메뉴 */}
          {isMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-white border-b shadow-lg z-50">
              <div className="max-w-4xl mx-auto px-4 py-2">
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      handleHome();
                      setIsMenuOpen(false);
                    }}
                    className="text-left px-4 py-3 hover:bg-gray-50 rounded-lg text-blue-600 font-semibold"
                    data-testid="nav-home"
                  >
                    🏠 홈
                  </button>
                  <button
                    onClick={() => {
                      handleHistory();
                      setIsMenuOpen(false);
                    }}
                    className="text-left px-4 py-3 hover:bg-gray-50 rounded-lg text-green-600 font-semibold"
                    data-testid="nav-history"
                  >
                    📚 학습 이력
                  </button>
                  <button
                    onClick={() => {
                      handleAdmin();
                      setIsMenuOpen(false);
                    }}
                    className="text-left px-4 py-3 hover:bg-gray-50 rounded-lg text-gray-600 font-semibold"
                    data-testid="nav-admin"
                  >
                    ⚙️ 관리자
                  </button>

                  <div className="border-t border-gray-200 my-2"></div>

                  {isLoggedIn ? (
                    <>
                      <div className="px-4 py-2 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-700">
                          👤 {currentUser.name}님
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="text-left px-4 py-3 hover:bg-gray-50 rounded-lg text-red-600 font-semibold"
                        data-testid="nav-logout"
                      >
                        🚪 로그아웃
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          handleLogin();
                          setIsMenuOpen(false);
                        }}
                        className="text-left px-4 py-3 hover:bg-gray-50 rounded-lg text-blue-600 font-semibold"
                        data-testid="nav-login"
                      >
                        🔑 로그인
                      </button>
                      <button
                        onClick={() => {
                          handleSignup();
                          setIsMenuOpen(false);
                        }}
                        className="text-left px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold"
                        data-testid="nav-signup"
                      >
                        ✨ 회원가입
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {appState === "home" && (
        <Home
          onStart={handleStart}
          onStartDifficult={() => startDifficultMutation.mutate()}
        />
      )}

      {/* 로딩 오버레이 */}
      <LoadingOverlay
        isLoading={
          startSessionMutation.isPending ||
          startDifficultMutation.isPending ||
          startTimerMutation.isPending ||
          startWangsoheeMutation.isPending
        }
        text={
          startDifficultMutation.isPending
            ? "어려운 문제들을 찾는 중..."
            : startTimerMutation.isPending
            ? "타이머 모드를 준비하는 중..."
            : startWangsoheeMutation.isPending
            ? "왕소희 제작 문제를 준비하는 중..."
            : "문제를 준비하는 중..."
        }
      />
      
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

      {appState === "timer-setup" && (
        <TimerSetup
          onStart={handleStartTimerWithCount}
          onBack={handleHome}
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

      {appState === "history" && (
        <SessionHistory
          onViewResults={handleViewHistoryResults}
          onHome={handleHome}
        />
      )}

      {appState === "login" && (
        <Login
          onSignup={handleSignup}
          onHome={handleHome}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {appState === "signup" && (
        <Signup
          onLogin={handleLogin}
          onHome={handleHome}
        />
      )}

      {appState === "admin" && (
        <Admin />
      )}

      {/* 하단 크레딧 */}
      <footer className="bg-white border-t py-4 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">ADsP 자격증 대비 학습 플랫폼</p>
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
