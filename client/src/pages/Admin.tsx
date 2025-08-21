import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const csvUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csv', file);
      
      const response = await fetch("/api/admin/questions/csv", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "성공",
        description: data.message || "CSV 파일이 성공적으로 업로드되었습니다.",
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



  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>문제 등록 관리</CardTitle>
            <CardDescription>새로운 문제를 등록하거나 일괄 등록할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ox" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ox">OX 문제</TabsTrigger>
                <TabsTrigger value="mcq">사지선다</TabsTrigger>
                <TabsTrigger value="csv">CSV 업로드</TabsTrigger>
              </TabsList>

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
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        선택된 파일: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleCsvUpload}
                    disabled={!csvFile || csvUploadMutation.isPending}
                    className="w-full"
                    data-testid="button-upload-csv"
                  >
                    {csvUploadMutation.isPending ? "업로드 중..." : "CSV 파일 업로드"}
                  </Button>
                </div>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}