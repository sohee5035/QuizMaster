import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import mascotImage from "@assets/Adobe Express 2025-08-21 12시 40분 8초_1755747624195.png";

interface HomeProps {
  onStart: (questionCount?: number, difficulty?: number) => void;
  onStartTimer: () => void;
}

export default function Home({ onStart, onStartTimer }: HomeProps) {
  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card className="mt-8 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="mb-6">
              <img 
                src={mascotImage} 
                alt="KB 외환 마스터 캐릭터" 
                className="w-32 h-32 mx-auto rounded-full bg-orange-50 p-2"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 KB 외환 마스터 👑</h1>
          </div>

          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 mb-8">
            <div className="text-center mb-4">
              <div className="text-lg font-semibold text-gray-900 mb-3">외환 마스터가 되는 그 날까지✨</div>
              <div className="text-lg font-semibold text-gray-900 mb-1">📅 예선 25.08.27 (수) 17:00</div>
              <div className="text-lg font-semibold text-gray-900 mb-4">📅 본선 25.09.12 (금) 16:00</div>
            </div>
            <div className="border-t border-yellow-300 pt-4">
              <div className="text-sm text-gray-700 mb-2">📘 본 페이지는 외환사업부 410의 출제 예상 문제를 보기와 순서가 랜덤하게 나오도록 설정한 것입니다.</div>
              <div className="text-sm text-gray-700 mb-2">⚖️ 하단 난이도별 문제는 제작자인 제가 느끼는 난이도이니, 참고해주세요~!</div>
              <div className="text-sm font-bold text-gray-800 mb-2">🏆 타이머모드는 정말 실전처럼 연습할 수 있어요! 추천드립니다 ^^</div>
              <div className="text-sm text-gray-700">😎 참고로 저도 문제 풀다가 모바일로 보기 편하게 한 번 만들어봤어요. 문제를 수기로 등록한지라, 오류가 있을수도 있습니다 ㅎㅎ 오류 발견하시면 왕소희대리 앞으로 연락주세요!</div>
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
              ⚡ 타이머 모드 (10초 제한) ⚡
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
