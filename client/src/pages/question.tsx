import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { SessionResponse, AnswerResponse, QuestionWithChoices } from "@shared/schema";
import { SUBJECTS } from "@shared/schema";

interface QuestionProps {
  sessionData: SessionResponse;
  onAnswer: (answer: { selectedChoiceId?: string; selectedBoolean?: boolean }) => void;
  onNext: () => void;
  answerResult?: AnswerResponse;
  isLoading?: boolean;
}

export default function Question({ sessionData, onAnswer, onNext, answerResult, isLoading }: QuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(null);
  const { question, currentQuestion, totalQuestions } = sessionData;

  const progressPercentage = (currentQuestion / totalQuestions) * 100;

  const handleAnswerSelect = (answer: string | boolean) => {
    if (answerResult) return; // Already answered

    setSelectedAnswer(answer);
    
    if (question.type?.toUpperCase() === "MCQ") {
      onAnswer({ selectedChoiceId: answer as string });
    } else {
      onAnswer({ selectedBoolean: answer as boolean });
    }
  };

  const getChoiceButtonClass = (choiceId: string, isCorrect: boolean) => {
    if (!answerResult) {
      return "w-full text-left p-4 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-all duration-200";
    }

    // 내가 선택한 답
    if (selectedAnswer === choiceId) {
      return isCorrect
        ? "w-full text-left p-4 rounded-lg border border-green-200 bg-green-50"
        : "w-full text-left p-4 rounded-lg border border-red-200 bg-red-50";
    }

    // 정답인 선택지는 항상 초록색으로 표시
    if (isCorrect) {
      return "w-full text-left p-4 rounded-lg border-4 border-green-500 bg-green-50";
    }

    return "w-full text-left p-4 rounded-lg border border-gray-200 opacity-50";
  };

  const getOXButtonClass = (value: boolean) => {
    if (!answerResult) {
      return "w-full text-left p-4 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-all duration-200";
    }

    const isCorrect = value === question.answer;

    // 내가 선택한 답
    if (selectedAnswer === value) {
      return isCorrect
        ? "w-full text-left p-4 rounded-lg border border-green-200 bg-green-50"
        : "w-full text-left p-4 rounded-lg border border-red-200 bg-red-50";
    }

    // 정답은 항상 초록색으로 표시
    if (isCorrect) {
      return "w-full text-left p-4 rounded-lg border-4 border-green-500 bg-green-50";
    }

    return "w-full text-left p-4 rounded-lg border border-gray-200 opacity-50";
  };

  return (
    <div className="container mx-auto max-w-2xl p-6">
      {/* Progress Bar */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">진행상황</span>
            <span className="text-sm font-medium text-gray-900" data-testid="text-progress">
              {currentQuestion} / {totalQuestions}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Feedback Banner */}
      {answerResult && (
        <div className="mb-6" data-testid="feedback-banner">
          {answerResult.isCorrect ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-green-800 font-medium">정답입니다</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-red-800 font-medium">오답입니다</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question Card */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-6">
          {/* Subject Badge */}
          {question.subject && (
            <div className="mb-4">
              <span className="inline-block px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-800 rounded-full">
                {SUBJECTS[question.subject as keyof typeof SUBJECTS]}
              </span>
            </div>
          )}

          <div className="mb-6">
            <p
              className="text-lg text-gray-900 leading-relaxed whitespace-pre-wrap"
              data-testid="text-question-stem"
            >
              {question.stem}
            </p>
          </div>

          {/* Box Content */}
          {question.boxContent && (
            <div className="mb-6">
              <div className="border border-gray-300 bg-gray-50 rounded-lg p-4">
                <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {question.boxContent}
                </p>
              </div>
            </div>
          )}

          {/* MCQ Options */}
          {question.type?.toUpperCase() === "MCQ" && question.choices && (
            <div className="space-y-3">
              {question.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleAnswerSelect(choice.id)}
                  disabled={!!answerResult}
                  className={getChoiceButtonClass(choice.id, choice.isCorrect)}
                  data-testid={`button-choice-${choice.id}`}
                >
                  <span className={`font-medium whitespace-pre-wrap ${
                    answerResult && selectedAnswer === choice.id && choice.isCorrect
                      ? "text-green-700"
                      : answerResult && selectedAnswer === choice.id && !choice.isCorrect
                      ? "text-red-700"
                      : "text-gray-900"
                  }`}>
                    {choice.content}
                  </span>
                  {answerResult && selectedAnswer === choice.id && choice.isCorrect && (
                    <span className="ml-2 text-green-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* OX Options */}
          {question.type?.toUpperCase() === "OX" && (
            <div className="space-y-3">
              <button
                onClick={() => handleAnswerSelect(true)}
                disabled={!!answerResult}
                className={getOXButtonClass(true)}
                data-testid="button-ox-true"
              >
                <span className={`font-medium text-xl ${
                  answerResult && selectedAnswer === true && question.answer === true
                    ? "text-green-700"
                    : answerResult && selectedAnswer === true && question.answer !== true
                    ? "text-red-700"
                    : "text-gray-900"
                }`}>
                  O (맞음)
                </span>
                {answerResult && selectedAnswer === true && question.answer === true && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
              </button>
              <button
                onClick={() => handleAnswerSelect(false)}
                disabled={!!answerResult}
                className={getOXButtonClass(false)}
                data-testid="button-ox-false"
              >
                <span className={`font-medium text-xl ${
                  answerResult && selectedAnswer === false && question.answer === false
                    ? "text-green-700"
                    : answerResult && selectedAnswer === false && question.answer !== false
                    ? "text-red-700"
                    : "text-gray-900"
                }`}>
                  X (틀림)
                </span>
                {answerResult && selectedAnswer === false && question.answer === false && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation Box */}
      {answerResult && (
        <Card className="mb-6 bg-gray-50 shadow-sm">
          <CardContent className="p-6">
            <div className="font-semibold text-gray-900 mb-3">해설</div>
            <div
              className="text-gray-700 leading-relaxed whitespace-pre-wrap"
              data-testid="text-explanation"
            >
              {answerResult.explanation}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Question Button */}
      {answerResult && (
        <Button
          onClick={onNext}
          disabled={isLoading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
          data-testid="button-next-question"
        >
          {isLoading && <Spinner size="sm" className="text-white" />}
          {isLoading ? "다음 문제 준비 중..." : "다음 문제"}
        </Button>
      )}
    </div>
  );
}
