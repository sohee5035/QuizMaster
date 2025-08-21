import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface HomeProps {
  onStart: () => void;
}

export default function Home({ onStart }: HomeProps) {
  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card className="mt-8 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">KB 외환 마스터</h1>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-8">
            <div className="text-lg font-semibold text-gray-900 mb-1">예선 25.08.27 (수) 17:00</div>
            <div className="text-lg font-semibold text-gray-900 mb-3">본선 25.09.12 (금) 16:00</div>
            <div className="text-gray-700">외환 마스터가 되는 그 날까지!</div>
          </div>

          <Button
            onClick={onStart}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-sm"
            data-testid="button-start-session"
          >
            게스트 – 문제풀이 시작
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
