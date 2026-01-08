import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface HomeProps {
  onStart: (questionCount?: number, subject?: number, round?: number) => void;
  onStartDifficult: () => void;
}

export default function Home({ onStart, onStartDifficult }: HomeProps) {
  const [selectedRound, setSelectedRound] = useState<string>("");

  // Fetch available rounds
  const { data: roundsData } = useQuery({
    queryKey: ['/api/rounds'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/rounds");
      return response.json();
    }
  });
  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card className="mt-8 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 ADsP 자격증 마스터 🎯</h1>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-8">
            <div className="text-center mb-4">
              <div className="text-lg font-bold text-gray-900 mb-4">📊 ADsP 시험 구성</div>

              <div className="text-left space-y-3 mb-4">
                <div className="bg-white rounded-lg p-3">
                  <div className="font-semibold text-gray-800">과목 구성:</div>
                  <div className="text-sm text-gray-700 mt-1">• 1과목: 데이터 이해 (10문항)</div>
                  <div className="text-sm text-gray-700">• 2과목: 데이터 분석 기획 (10문항)</div>
                  <div className="text-sm text-gray-700">• 3과목: 데이터 분석 (30문항)</div>
                </div>

                <div className="bg-white rounded-lg p-3">
                  <div className="font-semibold text-gray-800">시험 정보:</div>
                  <div className="text-sm text-gray-700 mt-1">• 총 문항 수: 50문항</div>
                  <div className="text-sm text-gray-700">• 시험 시간: 100분</div>
                  <div className="text-sm text-gray-700">• 문제 유형: 4지선다형 객관식</div>
                </div>

                <div className="bg-white rounded-lg p-3">
                  <div className="font-semibold text-gray-800">합격 기준:</div>
                  <div className="text-sm text-gray-700 mt-1">• 과목당 40점 이상 (과목별 과락 기준)</div>
                  <div className="text-sm text-gray-700">• 전체 평균 60점 이상</div>
                  <div className="text-sm font-bold text-blue-600 mt-2">• 각 문항당 2점! 총점 100점 만점</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => onStart()}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-sm"
              data-testid="button-start-session-all"
            >
              전체 문제풀이 시작
            </Button>

            <Button
              onClick={onStartDifficult}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-sm"
              data-testid="button-start-difficult"
            >
              🤔 많이 틀린 문제 TOP 20
            </Button>

            <Button
              onClick={() => onStart(10)}
              className="w-full bg-gray-400 hover:bg-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-sm"
              data-testid="button-start-session-random"
            >
              랜덤 10문제 시작
            </Button>

            {/* 과목별 문제풀이 */}
            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">과목별 문제풀이</h3>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => onStart(undefined, 1)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 shadow-sm"
                  data-testid="button-start-subject-1"
                >
                  📘 1과목
                </Button>
                <Button
                  onClick={() => onStart(undefined, 2)}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 shadow-sm"
                  data-testid="button-start-subject-2"
                >
                  📗 2과목
                </Button>
                <Button
                  onClick={() => onStart(undefined, 3)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 shadow-sm"
                  data-testid="button-start-subject-3"
                >
                  📙 3과목
                </Button>
              </div>
            </div>

            {/* 회차별 기출문제 */}
            {roundsData && roundsData.rounds && roundsData.rounds.length > 0 && (
              <div className="border-t pt-4 mt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">📝 기출 회차 풀어보기</h3>
                <div className="flex gap-3">
                  <Select value={selectedRound} onValueChange={setSelectedRound}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="회차 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {roundsData.rounds.map((round: number) => (
                        <SelectItem key={round} value={String(round)}>
                          {round}회차
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (selectedRound) {
                        onStart(undefined, undefined, parseInt(selectedRound));
                      }
                    }}
                    disabled={!selectedRound}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    시작하기
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
