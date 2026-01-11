import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimerQuestionData, TimerResultsData } from "@shared/schema";

interface TimerResultsProps {
  results: TimerResultsData;
  onRestart: () => void;
  onHome: () => void;
}

export default function TimerResults({ results, onRestart, onHome }: TimerResultsProps) {
  const accuracy = ((results.correctAnswers / results.totalQuestions) * 100).toFixed(1);
  const incorrectCount = results.incorrectQuestions.length;

  const getScoreColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600";
    if (accuracy >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreMessage = (accuracy: number) => {
    if (accuracy === 100) return "🎉 완벽해요! 정말 대단합니다! 외환 마스터 확정! 🏆";
    if (accuracy >= 90) return "🏆 최고! 외환 마스터에 한걸음 더 가까워졌어요!";
    if (accuracy >= 80) return "🎉 훌륭해요! 조금만 더 연습하면 완벽해질 거예요!";
    if (accuracy >= 70) return "👍 잘했어요! 틀린 문제들을 다시 확인해보세요.";
    if (accuracy >= 60) return "💪 괜찮아요! 더 연습하면 실력이 늘 거예요.";
    return "📚 더 열심히 공부해야겠어요. 포기하지 마세요!";
  };

  const getCorrectAnswerText = (question: TimerQuestionData) => {
    if (question.question.type?.toUpperCase() === "MCQ") {
      const correctChoice = question.question.choices?.find(c => c.isCorrect);
      return correctChoice?.content || "정답 정보 없음";
    } else {
      return question.question.answer ? "⭕ 맞음" : "❌ 틀림";
    }
  };

  const getUserAnswerText = (question: TimerQuestionData) => {
    if (question.question.type?.toUpperCase() === "MCQ") {
      const userChoice = question.question.choices?.find(c => c.id === question.userAnswer);
      return userChoice?.content || "시간 초과 (답하지 않음)";
    } else {
      if (question.userAnswer === undefined) return "시간 초과 (답하지 않음)";
      return question.userAnswer ? "⭕ 맞음" : "❌ 틀림";
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* Overall Results */}
      <Card className="mb-8 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">⏰ 타이머 모드 결과</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mb-6">
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(Number(accuracy))}`}>
              {accuracy}%
            </div>
            <div className="text-lg text-gray-600">
              {results.correctAnswers}문제 맞음 / 총 {results.totalQuestions}문제
            </div>
            <div className="text-lg text-gray-600 mt-1">
              틀린 문제: {incorrectCount}개
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-lg font-semibold text-gray-800">
              {getScoreMessage(Number(accuracy))}
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <Button 
              onClick={onRestart}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3"
              data-testid="button-restart-timer"
            >
              ⏰ 타이머 모드 다시하기
            </Button>
            <Button 
              onClick={onHome}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3"
              data-testid="button-home"
            >
              🏠 홈으로
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Incorrect Questions Review */}
      {incorrectCount > 0 ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-red-600 flex items-center">
              ❌ 틀린 문제 복습 ({incorrectCount}개)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {results.incorrectQuestions.map((question, index) => (
                <div key={question.question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        문제 {question.currentQuestion} - {question.question.type?.toUpperCase() === "MCQ" ? "객관식" : "OX"}
                      </span>
                      <span className="text-sm font-medium text-red-600">
                        {question.userAnswer === undefined ? "시간 초과" : "오답"}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 whitespace-pre-wrap">
                      {question.question.stem}
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    {/* User Answer */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="font-semibold text-red-700 mb-2">내 답안</div>
                      <div className="text-red-800">
                        {getUserAnswerText(question)}
                      </div>
                    </div>

                    {/* Correct Answer */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="font-semibold text-green-700 mb-2">정답</div>
                      <div className="text-green-800">
                        {getCorrectAnswerText(question)}
                      </div>
                    </div>
                  </div>

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="font-semibold text-blue-700 mb-2">📖 해설</div>
                      <div className="text-blue-800 leading-relaxed whitespace-pre-wrap">
                        {question.explanation}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-green-600 flex items-center">
              🎉 모든 문제를 정답으로 맞혔습니다!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">완벽해요!</h3>
            <p className="text-lg text-gray-600">
              모든 문제를 맞췄습니다. 정말 대단해요!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}