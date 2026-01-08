import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Spinner } from "@/components/ui/spinner";
import type { ResultsResponse } from "@shared/schema";

interface SessionSummary {
  id: string;
  mode: string;
  startedAt: Date | null;
  endedAt: Date | null;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

interface SessionHistoryProps {
  onViewResults: (results: ResultsResponse) => void;
  onHome: () => void;
}

export default function SessionHistory({ onViewResults, onHome }: SessionHistoryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/sessions'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/sessions");
      return response.json();
    }
  });

  const handleViewSession = async (sessionId: string) => {
    try {
      const response = await apiRequest("GET", `/api/sessions/${sessionId}`);
      const results = await response.json();
      onViewResults(results);
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "study": return "일반 학습";
      case "difficult": return "어려운 문제";
      case "wangsohee": return "왕소희 문제";
      case "mock": return "모의고사";
      default: return mode;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card className="shadow-sm">
          <CardContent className="p-8 flex justify-center items-center min-h-[400px]">
            <Spinner />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card className="shadow-sm">
          <CardContent className="p-8">
            <div className="text-center text-red-600">
              세션 이력을 불러올 수 없습니다.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessions: SessionSummary[] = data?.sessions || [];

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">학습 이력</h2>
            <Button
              onClick={onHome}
              variant="outline"
              className="text-gray-700"
            >
              홈으로
            </Button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">아직 완료한 학습 세션이 없습니다.</p>
              <p className="text-sm">문제를 풀고 완료하면 여기에 기록이 남습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const percentage = Math.round((session.correctAnswers / session.totalQuestions) * 100);
                const isPassed = percentage >= 60;

                return (
                  <Card
                    key={session.id}
                    className="border border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => handleViewSession(session.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="inline-block px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-800 rounded-full">
                              {getModeLabel(session.mode)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(session.endedAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-700">
                            <span>총 {session.totalQuestions}문제</span>
                            <span className="text-green-600">정답 {session.correctAnswers}</span>
                            <span className="text-red-600">오답 {session.incorrectAnswers}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-bold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {percentage}%
                          </div>
                          <div className={`text-xs font-semibold mt-1 ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {isPassed ? '합격' : '불합격'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
