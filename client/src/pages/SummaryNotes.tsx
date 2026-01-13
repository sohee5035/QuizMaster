import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { SUBJECTS } from "@shared/schema";
import type { SummaryNote } from "@shared/schema";

interface SummaryNotesProps {
  onHome: () => void;
}

export default function SummaryNotes({ onHome }: SummaryNotesProps) {
  // Fetch all summary notes
  const { data: notesData, isLoading } = useQuery({
    queryKey: ['/api/summary-notes'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/summary-notes");
      return response.json() as Promise<{ notes: SummaryNote[] }>;
    }
  });

  // Group notes by subject
  const notesBySubject = notesData?.notes.reduce((acc, note) => {
    if (!acc[note.subject]) {
      acc[note.subject] = [];
    }
    acc[note.subject].push(note);
    return acc;
  }, {} as Record<number, SummaryNote[]>) || {};

  // Sort notes by order within each subject
  Object.keys(notesBySubject).forEach(subject => {
    notesBySubject[Number(subject)].sort((a, b) => a.order - b.order);
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="text-center py-12">
          <div className="text-lg text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📝 핵심 요약노트</h1>
            <p className="text-gray-600">과목별 핵심 내용을 정리했습니다</p>
          </div>

          {Object.keys(notesBySubject).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">아직 작성된 요약노트가 없습니다.</p>
            </div>
          ) : (
            <Tabs defaultValue="1" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="1" className="text-sm font-semibold">
                  📘 1과목
                </TabsTrigger>
                <TabsTrigger value="2" className="text-sm font-semibold">
                  📗 2과목
                </TabsTrigger>
                <TabsTrigger value="3" className="text-sm font-semibold">
                  📙 3과목
                </TabsTrigger>
              </TabsList>

              {[1, 2, 3].map(subject => (
                <TabsContent key={subject} value={String(subject)} className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {SUBJECTS[subject as keyof typeof SUBJECTS]}
                    </h2>
                  </div>

                  {!notesBySubject[subject] || notesBySubject[subject].length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      이 과목의 요약노트가 아직 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {notesBySubject[subject].map((note) => (
                        <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                            {note.title}
                          </h3>
                          <div className="prose prose-sm max-w-none">
                            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {note.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}

          <div className="mt-8">
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
