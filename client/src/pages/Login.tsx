import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LoginProps {
  onSignup: () => void;
  onHome: () => void;
  onLoginSuccess: () => void;
}

export default function Login({ onSignup, onHome, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "입력 오류",
        description: "이메일과 비밀번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        email,
        password,
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "로그인 성공",
          description: `환영합니다, ${data.user.name}님!`,
        });
        onLoginSuccess();
      } else {
        const data = await response.json();
        toast({
          title: "로그인 실패",
          description: data.message || "이메일 또는 비밀번호가 올바르지 않습니다.",
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

  return (
    <div className="container mx-auto max-w-md p-6">
      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인</h2>
            <p className="text-gray-600">ADsP 자격증 마스터</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600"
              disabled={isLoading}
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-1">💡 승인된 사용자만 로그인할 수 있습니다.</p>
              <p className="text-sm text-blue-700">승인 상태는 관리자에게 문의해주세요.</p>
            </div>

            <div className="text-center space-y-2">
              <Button
                type="button"
                variant="link"
                onClick={onSignup}
                className="text-blue-600"
              >
                계정이 없으신가요? 회원가입
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
