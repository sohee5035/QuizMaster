import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ResultsResponse } from "@shared/schema";
import { SUBJECTS } from "@shared/schema";

interface ResultsProps {
  results: ResultsResponse;
  onRestart: () => void;
  onHome: () => void;
}

export default function Results({ results, onRestart, onHome }: ResultsProps) {
  // Calculate subject-based statistics
  const subjectStats = results.questions.reduce((acc, result) => {
    const subject = result.question.subject;
    if (subject) {
      if (!acc[subject]) {
        acc[subject] = { total: 0, correct: 0 };
      }
      acc[subject].total++;
      if (result.isCorrect) {
        acc[subject].correct++;
      }
    }
    return acc;
  }, {} as Record<number, { total: number; correct: number }>);

  const hasSubjectData = Object.keys(subjectStats).length > 0;

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">학습 완료</h2>
            <p className="text-gray-600">수고하셨습니다!</p>
          </div>

          {/* Results Summary */}
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600" data-testid="text-correct-count">
                  {results.correctAnswers}
                </div>
                <div className="text-sm text-gray-600">정답</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600" data-testid="text-incorrect-count">
                  {results.incorrectAnswers}
                </div>
                <div className="text-sm text-gray-600">오답</div>
              </div>
            </div>
          </div>

          {/* Subject-based Statistics */}
          {hasSubjectData && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-center">과목별 통계</h3>
              <div className="space-y-3">
                {Object.entries(subjectStats)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([subject, stats]) => {
                    const percentage = Math.round((stats.correct / stats.total) * 100);
                    return (
                      <div key={subject} className="bg-white rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">
                            {SUBJECTS[Number(subject) as keyof typeof SUBJECTS]}
                          </span>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600">
                              {stats.correct}/{stats.total} 정답
                            </span>
                            <span className={`font-bold ${percentage >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Question Review */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-gray-900">문항별 해설</h3>
            
            {results.questions.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4" data-testid={`review-question-${index}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">문제 {index + 1}</span>
                  <span className={`text-sm font-medium ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {result.isCorrect ? '정답' : '오답'}
                  </span>
                </div>
                <p className="text-gray-900 mb-3 whitespace-pre-wrap" data-testid={`text-question-${index}`}>
                  {result.question.stem}
                </p>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-sm font-medium text-gray-600 mb-1">해설</div>
                  <div
                    className="text-sm text-gray-700 whitespace-pre-wrap"
                    data-testid={`text-explanation-${index}`}
                  >
                    {result.question.explanation}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={onRestart}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
              data-testid="button-restart"
            >
              다시 시작하기
            </Button>
            <Button 
              onClick={onHome}
              variant="secondary"
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
              data-testid="button-home"
            >
              홈으로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
