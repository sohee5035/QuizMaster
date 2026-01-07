import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface HomeProps {
  onStart: (questionCount?: number, difficulty?: number) => void;
  onStartTimer: () => void;
  onStartDifficult: () => void;
  onStartWangsohee: () => void;
}

export default function Home({ onStart, onStartTimer, onStartDifficult, onStartWangsohee }: HomeProps) {
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

            <div className="border-t border-blue-300 pt-4">
              <div className="text-sm text-gray-700 mb-2">📘 본 페이지는 ADsP 시험 대비 문제를 보기와 순서가 랜덤하게 나오도록 설정한 것입니다.</div>
              <div className="text-sm font-bold text-gray-800 mb-2">🏆 타이머모드는 정말 실전처럼 연습할 수 있어요! 추천드립니다 ^^</div>
              <div className="text-sm text-gray-700">😎 문제를 등록하면서 오류가 있을 수 있습니다. 발견 시 제보 부탁드려요!</div>
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
              onClick={onStartTimer}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-sm"
              data-testid="button-start-timer-mode"
            >
              ⚡ 타이머 모드 (문제당 60초) ⚡
            </Button>

            <Button
              onClick={onStartDifficult}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-sm"
              data-testid="button-start-difficult"
            >
              🤔 많이 틀린 문제 TOP 20
            </Button>

            <Button
              onClick={onStartWangsohee}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-sm"
              data-testid="button-start-wangsohee"
            >
              📝 직접 제작 문제 풀어보기
            </Button>
            
            <Button
              onClick={() => onStart(10)}
              className="w-full bg-gray-400 hover:bg-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-sm"
              data-testid="button-start-session-random"
            >
              랜덤 10문제 시작
            </Button>

            {/* 난이도별 문제풀이 */}
            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">난이도별 문제풀이</h3>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => onStart(undefined, 1)}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 shadow-sm"
                  data-testid="button-start-difficulty-1"
                >
                  😊 쉬움
                </Button>
                <Button
                  onClick={() => onStart(undefined, 2)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 shadow-sm"
                  data-testid="button-start-difficulty-2"
                >
                  😐 보통
                </Button>
                <Button
                  onClick={() => onStart(undefined, 3)}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 shadow-sm"
                  data-testid="button-start-difficulty-3"
                >
                  😰 어려움
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
