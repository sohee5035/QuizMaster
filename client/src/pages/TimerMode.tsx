import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import type { TimerQuestionData } from "@shared/schema";
import { SUBJECTS } from "@shared/schema";

interface TimerModeProps {
  questionData: TimerQuestionData;
  onAnswer: (answer: { selectedChoiceId?: string; selectedBoolean?: boolean }) => void;
  onNext: () => void;
  onSkip: () => void;
}

export default function TimerMode({ questionData, onAnswer, onNext, onSkip }: TimerModeProps) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationTimeLeft, setExplanationTimeLeft] = useState(5);

  // Question timer (10 seconds)
  useEffect(() => {
    if (questionData.isAnswered || showExplanation) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - skip question
          onSkip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questionData.isAnswered, showExplanation, onSkip]);

  // Explanation timer (5 seconds)
  useEffect(() => {
    if (!showExplanation) return;

    const timer = setInterval(() => {
      setExplanationTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto advance to next question
          onNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showExplanation, onNext]);

  // Reset timers when question changes
  useEffect(() => {
    // Reset all states when moving to a new question
    setTimeLeft(10);
    setShowExplanation(false);
    setExplanationTimeLeft(5);
  }, [questionData.currentQuestion]);

  // Show explanation when question is answered
  useEffect(() => {
    if (questionData.isAnswered && !showExplanation) {
      // Immediately show explanation for 5 seconds
      setShowExplanation(true);
      setExplanationTimeLeft(5);
    }
  }, [questionData.isAnswered, showExplanation]);

  const handleAnswerSelect = (answer: string | boolean) => {
    if (questionData.isAnswered || showExplanation) return;

    if (questionData.question.type?.toUpperCase() === "MCQ") {
      onAnswer({ selectedChoiceId: answer as string });
    } else {
      onAnswer({ selectedBoolean: answer as boolean });
    }
  };

  const progressPercentage = (questionData.currentQuestion / questionData.totalQuestions) * 100;

  const getChoiceButtonClass = (choiceId: string, isCorrect: boolean) => {
    if (!questionData.isAnswered) {
      return "w-full text-left p-4 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-all duration-200 cursor-pointer";
    }

    // Show results after answering
    if (questionData.userAnswer === choiceId) {
      return questionData.isCorrect
        ? "w-full text-left p-4 rounded-lg border border-green-200 bg-green-50"
        : "w-full text-left p-4 rounded-lg border border-red-200 bg-red-50";
    }

    if (isCorrect) {
      return "w-full text-left p-4 rounded-lg border-4 border-green-500 bg-green-50";
    }

    return "w-full text-left p-4 rounded-lg border border-gray-200 opacity-50";
  };

  const getOXButtonClass = (value: boolean) => {
    if (!questionData.isAnswered) {
      return "w-full text-left p-4 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-all duration-200 cursor-pointer";
    }

    const isCorrect = value === questionData.question.answer;

    if (questionData.userAnswer === value) {
      return questionData.isCorrect
        ? "w-full text-left p-4 rounded-lg border border-green-200 bg-green-50"
        : "w-full text-left p-4 rounded-lg border border-red-200 bg-red-50";
    }

    if (isCorrect) {
      return "w-full text-left p-4 rounded-lg border-4 border-green-500 bg-green-50";
    }

    return "w-full text-left p-4 rounded-lg border border-gray-200 opacity-50";
  };

  const timerColor = timeLeft <= 3 ? "text-red-500" : timeLeft <= 5 ? "text-orange-500" : "text-green-500";

  return (
    <div className="container mx-auto max-w-2xl p-6">

      {/* Progress Bar */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">진행상황</span>
            <span className="text-sm font-medium text-gray-600">
              {questionData.currentQuestion} / {questionData.totalQuestions}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded">
                {questionData.question.type?.toUpperCase() === "MCQ" ? "객관식" : "OX"}
              </span>
              {/* Subject Badge */}
              {questionData.question.subject && (
                <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                  {SUBJECTS[questionData.question.subject as keyof typeof SUBJECTS]}
                </span>
              )}
            </div>
            {/* Timer inside question box */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {showExplanation ? (
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600 font-bold text-sm">해설</span>
                  <span className="text-blue-500 font-bold text-lg">{explanationTimeLeft}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600 font-medium text-sm">남은시간</span>
                  <span className={`font-bold text-xl ${timerColor}`}>{timeLeft}</span>
                </div>
              )}
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 leading-relaxed whitespace-pre-wrap">
            {questionData.question.stem}
          </h2>

          {/* Answer Options */}
          <div className="space-y-3">
            {questionData.question.type?.toUpperCase() === "MCQ" ? (
              questionData.question.choices?.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleAnswerSelect(choice.id)}
                  className={getChoiceButtonClass(choice.id, choice.isCorrect)}
                  disabled={questionData.isAnswered}
                  data-testid={`choice-${choice.id}`}
                >
                  <span className="whitespace-pre-wrap">{choice.content}</span>
                </button>
              ))
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleAnswerSelect(true)}
                  className={getOXButtonClass(true)}
                  disabled={questionData.isAnswered}
                  data-testid="choice-true"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">⭕</div>
                    <div className="font-semibold">맞음</div>
                  </div>
                </button>
                <button
                  onClick={() => handleAnswerSelect(false)}
                  className={getOXButtonClass(false)}
                  disabled={questionData.isAnswered}
                  data-testid="choice-false"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">❌</div>
                    <div className="font-semibold">틀림</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      {showExplanation && questionData.explanation && (
        <Card className="mb-6 shadow-sm border-l-4 border-blue-500 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <div className="text-2xl">
                  {questionData.isCorrect ? "✅" : "❌"}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  {questionData.isCorrect ? "정답입니다!" : "틀렸습니다."}
                </h3>
                <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">{questionData.explanation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Next Button (for testing) */}
      {showExplanation && (
        <Button
          onClick={onNext}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-sm"
          data-testid="button-manual-next"
        >
          다음 문제로 ({explanationTimeLeft}초 후 자동 진행)
        </Button>
      )}
    </div>
  );
}