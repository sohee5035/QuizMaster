import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SignupProps {
  onLogin: () => void;
  onHome: () => void;
}

export default function Signup({ onLogin, onHome }: SignupProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !password || !name) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "비밀번호 불일치",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "비밀번호 오류",
        description: "비밀번호는 최소 6자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        email,
        password,
        name,
      });

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "회원가입 완료",
          description: "관리자 승인 후 로그인할 수 있습니다.",
        });
      } else {
        const data = await response.json();
        toast({
          title: "회원가입 실패",
          description: data.message || "회원가입 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "서버와의 통신 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto max-w-md p-6">
        <Card className="shadow-sm">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">회원가입 완료!</h2>
              <p className="text-gray-600 mb-6">
                관리자 승인 후 로그인하실 수 있습니다.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 mb-2">📧 이메일로 승인 알림을 받게 됩니다.</p>
                <p className="text-sm text-blue-700">승인까지 1-2일 정도 소요될 수 있습니다.</p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={onHome}
                  className="w-full bg-yellow-500 hover:bg-yellow-600"
                >
                  홈으로
                </Button>
                <Button
                  onClick={onLogin}
                  variant="outline"
                  className="w-full"
                >
                  로그인 페이지로
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md p-6">
      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">회원가입</h2>
            <p className="text-gray-600">ADsP 자격증 마스터에 오신 것을 환영합니다!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="최소 6자 이상"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
                required
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ 관리자 승인 후 로그인할 수 있습니다.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600"
              disabled={isLoading}
            >
              {isLoading ? "처리 중..." : "회원가입"}
            </Button>

            <div className="text-center space-y-2">
              <Button
                type="button"
                variant="link"
                onClick={onLogin}
                className="text-blue-600"
              >
                이미 계정이 있으신가요? 로그인
              </Button>
              <br />
              <Button
                type="button"
                variant="link"
                onClick={onHome}
                className="text-gray-600"
              >
                홈으로 돌아가기
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
