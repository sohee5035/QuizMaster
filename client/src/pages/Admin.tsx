import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, Calendar, BarChart3 } from "lucide-react";

// 조회수 통계 컴포넌트
function StatsCard() {
  const { data: stats, isLoading } = useQuery<{todayViews: number, totalViews: number}>({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 30000, // 30초마다 자동 새로고침
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            웹사이트 조회수
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            조회수 로딩 중...
          </div>
        </CardContent>
      </Card>
    );
  }

  const { todayViews = 0, totalViews = 0 } = stats || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          웹사이트 조회수
        </CardTitle>
        <CardDescription>실시간 방문자 통계</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">오늘</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="text-today-views">
              {todayViews.toLocaleString()}
            </p>
            <p className="text-xs text-blue-600">조회수</p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">총합</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="text-total-views">
              {totalViews.toLocaleString()}
            </p>
            <p className="text-xs text-green-600">누적 조회수</p>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          * 30초마다 자동 업데이트됩니다
        </div>
      </CardContent>
    </Card>
  );
}

// 관리자 로그인 컴포넌트
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 비밀번호 확인 (1122)
    setTimeout(() => {
      if (password === "1122") {
        toast({
          title: "로그인 성공",
          description: "관리자 페이지에 접근할 수 있습니다.",
        });
        onLogin();
      } else {
        toast({
          title: "로그인 실패",
          description: "올바른 비밀번호를 입력해주세요.",
          variant: "destructive",
        });
        setPassword("");
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🔐 관리자 로그인</CardTitle>
          <CardDescription>관리자 페이지에 접근하려면 비밀번호를 입력하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-password">비밀번호</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                data-testid="input-admin-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-admin-login"
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // OX 문제 상태
  const [oxForm, setOxForm] = useState({
    questionId: "",
    stem: "",
    answer: "",
    explanation: "",
    tags: "",
    difficulty: "",
    source: ""
  });

  // 사지선다 문제 상태
  const [mcqForm, setMcqForm] = useState({
    questionId: "",
    stem: "",
    choice1: "",
    choice2: "",
    choice3: "",
    choice4: "",
    correctAnswer: "",
    explanation: "",
    tags: "",
    difficulty: "",
    source: ""
  });



  const createQuestionMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/admin/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "문제가 성공적으로 등록되었습니다.",
      });
      // 폼 초기화
      setOxForm({
        questionId: "",
        stem: "",
        answer: "",
        explanation: "",
        tags: "",
        difficulty: "",
        source: ""
      });
      setMcqForm({
        questionId: "",
        stem: "",
        choice1: "",
        choice2: "",
        choice3: "",
        choice4: "",
        correctAnswer: "",
        explanation: "",
        tags: "",
        difficulty: "",
        source: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "문제 등록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // CSV 파일 상태와 참조
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV 다운로드 함수
  const handleCsvDownload = async () => {
    try {
      const response = await fetch("/api/admin/questions/download");
      if (!response.ok) {
        throw new Error("다운로드에 실패했습니다.");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kb_exam_questions.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "문제 데이터가 성공적으로 다운로드되었습니다.",
      });
    } catch (error) {
      toast({
        title: "오류", 
        description: "다운로드에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const csvUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        console.log('CSV 업로드 시작:', file.name, `크기: ${file.size}바이트`);
        
        const formData = new FormData();
        formData.append('csv', file);
        
        const response = await fetch("/api/admin/questions/csv", {
          method: "POST",
          body: formData,
        });
        
        console.log('서버 응답:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('서버 오류 응답:', errorText);
          throw new Error(`서버 오류 (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        console.log('업로드 성공 결과:', result);
        return result;
      } catch (networkError) {
        console.error('네트워크 또는 처리 오류:', networkError);
        
        if (networkError instanceof TypeError && networkError.message.includes('fetch')) {
          throw new Error('서버 연결 실패: 네트워크 문제 또는 서버가 응답하지 않습니다.');
        }
        
        throw networkError;
      }
    },
    onSuccess: (data) => {
      let description = data.message || "CSV 파일이 성공적으로 업로드되었습니다.";
      
      // 에러가 있으면 첫 번째 에러 메시지를 추가로 표시
      if (data.errors && data.errors.length > 0) {
        description += `\n첫 번째 오류: ${data.errors[0].error}`;
      }
      
      toast({
        title: data.errors && data.errors.length > 0 ? "부분 성공" : "성공",
        description,
        variant: data.errors && data.errors.length > 0 ? "destructive" : "default",
      });
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "CSV 업로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      toast({
        title: "오류",
        description: "CSV 파일만 업로드 가능합니다.",
        variant: "destructive",
      });
    }
  };

  const handleCsvUpload = () => {
    if (csvFile) {
      csvUploadMutation.mutate(csvFile);
    }
  };

  // 모든 데이터 삭제 mutation
  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/questions/clear", {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "삭제 완료",
        description: data.message || "모든 데이터가 삭제되었습니다.",
      });
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "데이터 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleClearData = () => {
    if (window.confirm("⚠️ 정말로 모든 문제와 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!")) {
      clearDataMutation.mutate();
    }
  };



  const handleOxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createQuestionMutation.mutate({
      type: "OX",
      ...oxForm,
      answer: oxForm.answer === "O",
      difficulty: oxForm.difficulty ? parseInt(oxForm.difficulty) : null,
    });
  };

  const handleMcqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createQuestionMutation.mutate({
      type: "MCQ",
      questionId: mcqForm.questionId,
      stem: mcqForm.stem,
      explanation: mcqForm.explanation,
      tags: mcqForm.tags,
      difficulty: mcqForm.difficulty ? parseInt(mcqForm.difficulty) : null,
      source: mcqForm.source,
      choices: [
        { content: mcqForm.choice1, isCorrect: mcqForm.correctAnswer === "1" },
        { content: mcqForm.choice2, isCorrect: mcqForm.correctAnswer === "2" },
        { content: mcqForm.choice3, isCorrect: mcqForm.correctAnswer === "3" },
        { content: mcqForm.choice4, isCorrect: mcqForm.correctAnswer === "4" },
      ]
    });
  };

  // 인증되지 않은 경우 로그인 화면 표시
  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>문제 등록 관리</CardTitle>
            <CardDescription>새로운 문제를 등록하거나 일괄 등록할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="stats" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="stats">조회수 통계</TabsTrigger>
                <TabsTrigger value="ox">OX 문제</TabsTrigger>
                <TabsTrigger value="mcq">사지선다</TabsTrigger>
                <TabsTrigger value="csv">CSV 업로드</TabsTrigger>
              </TabsList>

              <TabsContent value="stats" className="space-y-4">
                <StatsCard />
              </TabsContent>

              <TabsContent value="ox" className="space-y-4">
                <form onSubmit={handleOxSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ox-id">문제 ID</Label>
                      <Input
                        id="ox-id"
                        value={oxForm.questionId}
                        onChange={(e) => setOxForm({...oxForm, questionId: e.target.value})}
                        placeholder="예: q10"
                        required
                        data-testid="input-ox-question-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ox-answer">정답</Label>
                      <Select value={oxForm.answer} onValueChange={(value) => setOxForm({...oxForm, answer: value})}>
                        <SelectTrigger data-testid="select-ox-answer">
                          <SelectValue placeholder="O 또는 X 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="O">O (참)</SelectItem>
                          <SelectItem value="X">X (거짓)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ox-stem">문제 내용</Label>
                    <Textarea
                      id="ox-stem"
                      value={oxForm.stem}
                      onChange={(e) => setOxForm({...oxForm, stem: e.target.value})}
                      placeholder="문제 내용을 입력하세요"
                      required
                      data-testid="textarea-ox-stem"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ox-explanation">해설</Label>
                    <Textarea
                      id="ox-explanation"
                      value={oxForm.explanation}
                      onChange={(e) => setOxForm({...oxForm, explanation: e.target.value})}
                      placeholder="정답 해설을 입력하세요"
                      required
                      data-testid="textarea-ox-explanation"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="ox-tags">태그</Label>
                      <Input
                        id="ox-tags"
                        value={oxForm.tags}
                        onChange={(e) => setOxForm({...oxForm, tags: e.target.value})}
                        placeholder="예: 환율우대"
                        data-testid="input-ox-tags"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ox-difficulty">난이도</Label>
                      <Select value={oxForm.difficulty} onValueChange={(value) => setOxForm({...oxForm, difficulty: value})}>
                        <SelectTrigger data-testid="select-ox-difficulty">
                          <SelectValue placeholder="난이도 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 (쉬움)</SelectItem>
                          <SelectItem value="2">2 (보통)</SelectItem>
                          <SelectItem value="3">3 (어려움)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="ox-source">출처</Label>
                      <Input
                        id="ox-source"
                        value={oxForm.source}
                        onChange={(e) => setOxForm({...oxForm, source: e.target.value})}
                        placeholder="예: 외환 규정집"
                        data-testid="input-ox-source"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={createQuestionMutation.isPending}
                    data-testid="button-submit-ox"
                  >
                    {createQuestionMutation.isPending ? "등록 중..." : "OX 문제 등록"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="mcq" className="space-y-4">
                <form onSubmit={handleMcqSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mcq-id">문제 ID</Label>
                      <Input
                        id="mcq-id"
                        value={mcqForm.questionId}
                        onChange={(e) => setMcqForm({...mcqForm, questionId: e.target.value})}
                        placeholder="예: q11"
                        required
                        data-testid="input-mcq-question-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mcq-correct">정답 번호</Label>
                      <Select value={mcqForm.correctAnswer} onValueChange={(value) => setMcqForm({...mcqForm, correctAnswer: value})}>
                        <SelectTrigger data-testid="select-mcq-correct">
                          <SelectValue placeholder="정답 번호 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1번</SelectItem>
                          <SelectItem value="2">2번</SelectItem>
                          <SelectItem value="3">3번</SelectItem>
                          <SelectItem value="4">4번</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="mcq-stem">문제 내용</Label>
                    <Textarea
                      id="mcq-stem"
                      value={mcqForm.stem}
                      onChange={(e) => setMcqForm({...mcqForm, stem: e.target.value})}
                      placeholder="문제 내용을 입력하세요"
                      required
                      data-testid="textarea-mcq-stem"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mcq-choice1">선택지 1</Label>
                      <Input
                        id="mcq-choice1"
                        value={mcqForm.choice1}
                        onChange={(e) => setMcqForm({...mcqForm, choice1: e.target.value})}
                        placeholder="1번 선택지"
                        required
                        data-testid="input-mcq-choice1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mcq-choice2">선택지 2</Label>
                      <Input
                        id="mcq-choice2"
                        value={mcqForm.choice2}
                        onChange={(e) => setMcqForm({...mcqForm, choice2: e.target.value})}
                        placeholder="2번 선택지"
                        required
                        data-testid="input-mcq-choice2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mcq-choice3">선택지 3</Label>
                      <Input
                        id="mcq-choice3"
                        value={mcqForm.choice3}
                        onChange={(e) => setMcqForm({...mcqForm, choice3: e.target.value})}
                        placeholder="3번 선택지"
                        required
                        data-testid="input-mcq-choice3"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mcq-choice4">선택지 4</Label>
                      <Input
                        id="mcq-choice4"
                        value={mcqForm.choice4}
                        onChange={(e) => setMcqForm({...mcqForm, choice4: e.target.value})}
                        placeholder="4번 선택지"
                        required
                        data-testid="input-mcq-choice4"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="mcq-explanation">해설</Label>
                    <Textarea
                      id="mcq-explanation"
                      value={mcqForm.explanation}
                      onChange={(e) => setMcqForm({...mcqForm, explanation: e.target.value})}
                      placeholder="정답 해설을 입력하세요"
                      required
                      data-testid="textarea-mcq-explanation"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="mcq-tags">태그</Label>
                      <Input
                        id="mcq-tags"
                        value={mcqForm.tags}
                        onChange={(e) => setMcqForm({...mcqForm, tags: e.target.value})}
                        placeholder="예: 환율우대"
                        data-testid="input-mcq-tags"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mcq-difficulty">난이도</Label>
                      <Select value={mcqForm.difficulty} onValueChange={(value) => setMcqForm({...mcqForm, difficulty: value})}>
                        <SelectTrigger data-testid="select-mcq-difficulty">
                          <SelectValue placeholder="난이도 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 (쉬움)</SelectItem>
                          <SelectItem value="2">2 (보통)</SelectItem>
                          <SelectItem value="3">3 (어려움)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="mcq-source">출처</Label>
                      <Input
                        id="mcq-source"
                        value={mcqForm.source}
                        onChange={(e) => setMcqForm({...mcqForm, source: e.target.value})}
                        placeholder="예: 외환 규정집"
                        data-testid="input-mcq-source"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={createQuestionMutation.isPending}
                    data-testid="button-submit-mcq"
                  >
                    {createQuestionMutation.isPending ? "등록 중..." : "사지선다 문제 등록"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4">
                <div className="space-y-4">
                  {/* CSV 다운로드 섹션 */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">📥 현재 문제 데이터 다운로드</h3>
                    <p className="text-sm text-green-700 mb-3">
                      현재 데이터베이스에 저장된 모든 문제를 CSV 파일로 다운로드할 수 있습니다.
                    </p>
                    <Button
                      onClick={handleCsvDownload}
                      variant="outline"
                      className="w-full border-green-300 text-green-700 hover:bg-green-100"
                      data-testid="button-download-csv"
                    >
                      📁 CSV 파일 다운로드 (100개 문제)
                    </Button>
                  </div>

                  {/* CSV 업로드 섹션 */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">📤 CSV 파일 업로드</h3>
                    <div>
                      <Label htmlFor="csv-file">CSV 파일 선택</Label>
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="cursor-pointer"
                        data-testid="input-csv-file"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        CSV 파일 형식: question_id, stem, explanation, tags, difficulty, source, answer/choices
                      </p>
                    </div>
                    
                    {csvFile && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-3">
                        <p className="text-sm text-blue-700">
                          선택된 파일: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleCsvUpload}
                      disabled={!csvFile || csvUploadMutation.isPending}
                      className="w-full mt-3"
                      data-testid="button-upload-csv"
                    >
                      {csvUploadMutation.isPending ? "업로드 중..." : "CSV 파일 업로드"}
                    </Button>
                  </div>

                  {/* 데이터 삭제 섹션 */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-semibold text-red-800 mb-2">🗑️ 모든 데이터 삭제</h3>
                    <p className="text-sm text-red-700 mb-3">
                      ⚠️ 위험: 데이터베이스의 모든 문제와 선택지를 완전히 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                    </p>
                    <Button
                      onClick={handleClearData}
                      disabled={clearDataMutation.isPending}
                      variant="destructive"
                      className="w-full"
                      data-testid="button-clear-data"
                    >
                      {clearDataMutation.isPending ? "삭제 중..." : "⚠️ 모든 데이터 삭제"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
        
        {/* 로그아웃 버튼 */}
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => setIsAuthenticated(false)}
            data-testid="button-admin-logout"
          >
            🔓 로그아웃
          </Button>
        </div>
      </div>
    </div>
  );
}