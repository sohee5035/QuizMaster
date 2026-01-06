# ADsP 자격증 대비 퀴즈 시스템

이 문서는 현재 QuizMaster(KB 외환 마스터)를 기반으로 ADsP(데이터분석 준전문가) 자격증 대비용 퀴즈 시스템을 만들기 위한 완전한 가이드입니다.

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [설치 및 초기 설정](#설치-및-초기-설정)
3. [데이터베이스 스키마](#데이터베이스-스키마)
4. [백엔드 구조](#백엔드-구조)
5. [프론트엔드 구조](#프론트엔드-구조)
6. [주요 기능 구현](#주요-기능-구현)
7. [CSV 문제 등록 형식](#csv-문제-등록-형식)

---

## 📌 프로젝트 개요

### ADsP 자격증이란?
데이터분석 준전문가(ADsP, Advanced Data Analytics Semi-Professional)는 한국데이터산업진흥원에서 주관하는 국가공인 자격증입니다.

### 시험 구성
- **과목 1**: 데이터 이해 (20점)
- **과목 2**: 데이터 분석 기획 (25점)
- **과목 3**: 데이터 분석 (55점)
  - 3-1. SQL (15점)
  - 3-2. 통계분석 (15점)
  - 3-3. R/Python 기초 (25점)
- **시험 시간**: 100분
- **합격 기준**: 각 과목 40점 이상, 전체 평균 60점 이상

### 시스템 주요 기능
1. **영역별 학습 모드**: 데이터 이해, SQL, 통계, R/Python 등 영역별 문제 풀이
2. **실전 모의고사**: 100분 타이머 모드로 실전 연습
3. **오답 노트**: 틀린 문제만 모아서 복습
4. **취약점 분석**: 영역별 정답률 통계
5. **난이도별 학습**: 기본/심화 문제 구분

---

## 🚀 설치 및 초기 설정

### 1. 프로젝트 생성

```bash
# 새 디렉토리 생성
mkdir adsp-quiz-master
cd adsp-quiz-master

# package.json 생성
npm init -y
```

### 2. package.json

```json
{
  "name": "adsp-quiz-master",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@tanstack/react-query": "^5.60.5",
    "@types/multer": "^2.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "csv-parser": "^3.2.0",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "express": "^4.21.2",
    "lucide-react": "^0.453.0",
    "multer": "^2.0.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "recharts": "^2.15.2",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "wouter": "^3.3.5",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.3",
    "@types/express": "4.17.21",
    "@types/node": "20.16.11",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.30.4",
    "esbuild": "^0.25.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.1",
    "typescript": "5.6.3",
    "vite": "^5.4.19"
  }
}
```

### 3. 기본 설정 파일들

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@shared/*": ["./shared/*"],
      "@/*": ["./client/src/*"],
      "@assets/*": ["./attached_assets/*"]
    }
  },
  "include": ["client", "server", "shared"]
}
```

#### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
  root: "./client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
});
```

#### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## 💾 데이터베이스 스키마

### shared/schema.ts

```typescript
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 문제 테이블 - ADsP에 맞게 수정
export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // 'MCQ' or 'OX'
  stem: text("stem").notNull(),
  explanation: text("explanation"),
  tags: text("tags"), // 쉼표로 구분된 태그
  difficulty: integer("difficulty"), // 1: 기본, 2: 심화
  source: text("source"), // 출처 (기출, 예상문제 등)
  category: text("category").notNull(), // 'data_understanding', 'data_planning', 'sql', 'statistics', 'programming'
  subcategory: text("subcategory"), // 세부 분류 (예: SQL-DML, SQL-DDL 등)
  answer: boolean("answer"), // OX 문제용
  points: integer("points").default(1), // 배점 (실전 모의고사용)
});

// 선택지 테이블
export const choices = pgTable("choices", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questions.id),
  content: text("content").notNull(),
  isCorrect: boolean("is_correct").notNull(),
});

// 학습 세션 테이블
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull(), // 'study', 'mock_exam', 'category', 'review', 'weak_points'
  category: text("category"), // 특정 카테고리 학습 시 사용
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  timeLimit: integer("time_limit"), // 제한 시간 (초)
});

// 응답 테이블
export const responses = pgTable("responses", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id),
  questionId: text("question_id").notNull().references(() => questions.id),
  choiceId: text("choice_id").references(() => choices.id),
  selectedBoolean: boolean("selected_boolean"),
  isCorrect: boolean("is_correct").notNull(),
  timeSpent: integer("time_spent"), // 소요 시간 (초)
  createdAt: timestamp("created_at").defaultNow(),
});

// 페이지 조회수 테이블 (통계용)
export const pageViews = pgTable("page_views", {
  id: text("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  page: text("page").notNull(),
  visitedAt: timestamp("visited_at").defaultNow(),
});

// Schema 유효성 검사
export const insertQuestionSchema = createInsertSchema(questions);
export const insertChoiceSchema = createInsertSchema(choices);
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, startedAt: true, endedAt: true });
export const insertResponseSchema = createInsertSchema(responses).omit({ id: true, createdAt: true });
export const insertPageViewSchema = createInsertSchema(pageViews).omit({ id: true, visitedAt: true });

// TypeScript 타입
export type Question = typeof questions.$inferSelect;
export type Choice = typeof choices.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type PageView = typeof pageViews.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertChoice = z.infer<typeof insertChoiceSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;

// API 응답 타입
export type QuestionWithChoices = Question & {
  choices?: Choice[];
};

export type SessionResponse = {
  sessionId: string;
  question: QuestionWithChoices;
  currentQuestion: number;
  totalQuestions: number;
};

export type AnswerResponse = {
  isCorrect: boolean;
  explanation: string;
  nextReady: boolean;
};

export type ResultsResponse = {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  questions: Array<{
    question: QuestionWithChoices;
    userAnswer: string | boolean;
    isCorrect: boolean;
  }>;
  categoryStats?: {
    [category: string]: {
      total: number;
      correct: number;
      accuracy: number;
    };
  };
};

// 카테고리 정의
export const CATEGORIES = {
  data_understanding: "데이터 이해",
  data_planning: "데이터 분석 기획",
  sql: "SQL",
  statistics: "통계분석",
  programming: "R/Python",
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
```

### drizzle.config.ts

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

## 🔧 백엔드 구조

### server/index.ts

```typescript
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// 정적 파일 제공 (프로덕션)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(process.cwd(), "dist", "public")));
}

// API 라우트 등록
const server = await registerRoutes(app);

// SPA 라우팅 (프로덕션)
if (process.env.NODE_ENV === "production") {
  app.get("*", (_req, res) => {
    res.sendFile(path.join(process.cwd(), "dist", "public", "index.html"));
  });
}

// 서버 시작
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(\`🚀 ADsP Quiz Master 서버가 포트 \${PORT}에서 실행 중입니다.\`);
});
```

### server/db.ts

```typescript
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경 변수가 설정되지 않았습니다.");
}

export const db = drizzle({
  connection: process.env.DATABASE_URL,
  ws: ws,
});
```

### server/storage.ts

```typescript
import { db } from "./db";
import { questions, choices, sessions, responses, pageViews } from "@shared/schema";
import type {
  InsertQuestion,
  InsertChoice,
  InsertSession,
  InsertResponse,
  InsertPageView,
  Question,
  Choice,
  Session,
  Response
} from "@shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export const storage = {
  // 문제 관련 메서드
  async getQuestions(): Promise<Question[]> {
    return await db.select().from(questions);
  },

  async getQuestion(id: string): Promise<Question | undefined> {
    const result = await db.select().from(questions).where(eq(questions.id, id));
    return result[0];
  },

  async getQuestionsByCategory(category: string): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.category, category));
  },

  async getQuestionsByDifficulty(difficulty: number): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.difficulty, difficulty));
  },

  async createQuestion(data: InsertQuestion): Promise<Question> {
    const result = await db.insert(questions).values(data).returning();
    return result[0];
  },

  async deleteQuestion(id: string): Promise<void> {
    // 연관된 선택지와 응답도 함께 삭제
    await db.delete(choices).where(eq(choices.questionId, id));
    await db.delete(responses).where(eq(responses.questionId, id));
    await db.delete(questions).where(eq(questions.id, id));
  },

  // 선택지 관련 메서드
  async getChoicesForQuestion(questionId: string): Promise<Choice[]> {
    return await db.select().from(choices).where(eq(choices.questionId, questionId));
  },

  async createChoice(data: InsertChoice): Promise<Choice> {
    const result = await db.insert(choices).values(data).returning();
    return result[0];
  },

  // 세션 관련 메서드
  async createSession(data: InsertSession): Promise<Session> {
    const sessionId = \`session-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    const result = await db.insert(sessions).values({
      id: sessionId,
      ...data
    }).returning();
    return result[0];
  },

  async getSession(id: string): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id));
    return result[0];
  },

  async endSession(id: string): Promise<void> {
    await db.update(sessions)
      .set({ endedAt: new Date() })
      .where(eq(sessions.id, id));
  },

  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions).orderBy(desc(sessions.startedAt));
  },

  // 응답 관련 메서드
  async createResponse(data: InsertResponse): Promise<Response> {
    const responseId = \`response-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    const result = await db.insert(responses).values({
      id: responseId,
      ...data
    }).returning();
    return result[0];
  },

  async getResponsesForSession(sessionId: string): Promise<Response[]> {
    return await db.select().from(responses)
      .where(eq(responses.sessionId, sessionId))
      .orderBy(responses.createdAt);
  },

  async getResponsesForQuestion(questionId: string): Promise<Response[]> {
    return await db.select().from(responses).where(eq(responses.questionId, questionId));
  },

  // 통계 관련 메서드
  async recordPageView(data: InsertPageView): Promise<void> {
    const pageViewId = \`pv-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    await db.insert(pageViews).values({
      id: pageViewId,
      ...data
    });
  },

  async getTodayPageViews(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db.select({ count: sql<number>\`count(*)\` })
      .from(pageViews)
      .where(gte(pageViews.visitedAt, today));

    return Number(result[0]?.count || 0);
  },

  async getTotalPageViews(): Promise<number> {
    const result = await db.select({ count: sql<number>\`count(*)\` })
      .from(pageViews);

    return Number(result[0]?.count || 0);
  },

  async getTodayUniqueVisitors(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db.select({ count: sql<number>\`count(distinct ip_address)\` })
      .from(pageViews)
      .where(gte(pageViews.visitedAt, today));

    return Number(result[0]?.count || 0);
  },

  async getTotalUniqueVisitors(): Promise<number> {
    const result = await db.select({ count: sql<number>\`count(distinct ip_address)\` })
      .from(pageViews);

    return Number(result[0]?.count || 0);
  },

  // 데이터 초기화 (관리자용)
  async clearAllData(): Promise<void> {
    await db.delete(responses);
    await db.delete(choices);
    await db.delete(questions);
    await db.delete(sessions);
  },
};
```

---

## 🎨 프론트엔드 구조

### client/index.html

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ADsP 자격증 마스터 | 데이터분석 준전문가 시험 대비</title>
    <meta name="description" content="ADsP(데이터분석 준전문가) 자격증 시험을 완벽하게 대비하세요. SQL, 통계, R/Python 문제은행으로 실전 연습!">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### client/src/main.tsx

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### client/src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### client/src/App.tsx

```typescript
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import Home from "./pages/home";
import CategorySelect from "./pages/CategorySelect";
import Question from "./pages/question";
import Results from "./pages/results";
import Admin from "./pages/Admin";
import MockExam from "./pages/MockExam";

const queryClient = new QueryClient();

type AppState = "home" | "category-select" | "question" | "results" | "admin" | "mock-exam";

function AppContent() {
  const [appState, setAppState] = useState<AppState>("home");
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📊</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ADsP 자격증 마스터
                </h1>
                <p className="text-xs text-gray-500">데이터분석 준전문가 시험 대비</p>
              </div>
            </div>
            <div className="space-x-4">
              <button
                onClick={() => setAppState("home")}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                홈
              </button>
              <button
                onClick={() => setAppState("admin")}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                관리자
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      {appState === "home" && (
        <Home
          onStartByCategory={() => setAppState("category-select")}
          onStartMockExam={() => setAppState("mock-exam")}
        />
      )}

      {appState === "category-select" && (
        <CategorySelect onBack={() => setAppState("home")} />
      )}

      {appState === "admin" && (
        <Admin />
      )}

      {/* 하단 푸터 */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">
            ADsP 자격증 마스터 | 데이터분석 준전문가 시험 대비 플랫폼
          </p>
          <p className="text-xs text-gray-400 mt-2">
            © 2025 All rights reserved
          </p>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
```

### client/src/pages/home.tsx

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Timer, Target, BarChart3, TrendingUp } from "lucide-react";

interface HomeProps {
  onStartByCategory: () => void;
  onStartMockExam: () => void;
}

export default function Home({ onStartByCategory, onStartMockExam }: HomeProps) {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* 시험 정보 카드 */}
      <Card className="mt-8 border-blue-200 shadow-lg">
        <CardContent className="p-8">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl border border-blue-200 p-6 mb-8">
            <div className="text-center mb-4">
              <div className="text-4xl mb-3">🎯</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ADsP 자격증 완벽 대비
              </h2>
              <p className="text-gray-700 mb-4">
                데이터분석 준전문가 자격증을 취득하세요!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600">시험 시간</div>
                <div className="text-xl font-bold text-blue-600">100분</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600">합격 기준</div>
                <div className="text-xl font-bold text-purple-600">과목당 40점 이상</div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">시험 구성</div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>• 데이터 이해 (20점)</div>
                <div>• 데이터 분석 기획 (25점)</div>
                <div>• 데이터 분석 (55점): SQL, 통계, R/Python</div>
              </div>
            </div>
          </div>

          {/* 메인 기능 버튼들 */}
          <div className="space-y-3">
            <Button
              onClick={onStartMockExam}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-6 px-6 rounded-xl shadow-md transition-all duration-200"
            >
              <Timer className="mr-2 h-5 w-5" />
              🔥 실전 모의고사 (100분 제한)
            </Button>

            <Button
              onClick={onStartByCategory}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-6 px-6 rounded-xl shadow-md transition-all duration-200"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              📚 영역별 학습하기
            </Button>

            {/* 학습 모드들 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
              <Button
                className="bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl shadow-sm"
              >
                <Target className="mr-2 h-4 w-4" />
                오답 노트
              </Button>

              <Button
                className="bg-purple-500 hover:bg-purple-600 text-white py-4 rounded-xl shadow-sm"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                취약점 분석
              </Button>

              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl shadow-sm"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                학습 통계
              </Button>
            </div>
          </div>

          {/* 팁 섹션 */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="text-sm font-semibold text-yellow-800 mb-2">💡 학습 팁</div>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• 먼저 영역별로 기본 개념을 학습하세요</li>
              <li>• SQL 문제는 실제로 쿼리를 작성해보면서 연습하세요</li>
              <li>• 통계 공식은 이해하고 외우는 것이 중요합니다</li>
              <li>• 실전 모의고사로 시간 배분 연습을 하세요</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### client/src/pages/CategorySelect.tsx

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Database, TrendingUp, BarChart, Code, BookOpen } from "lucide-react";
import { CATEGORIES } from "@shared/schema";

interface CategorySelectProps {
  onBack: () => void;
}

export default function CategorySelect({ onBack }: CategorySelectProps) {
  const categoryInfo = [
    {
      key: "data_understanding",
      name: CATEGORIES.data_understanding,
      icon: BookOpen,
      color: "from-blue-500 to-blue-600",
      description: "데이터의 개념, 가치, 유형 등",
      points: 20,
    },
    {
      key: "data_planning",
      name: CATEGORIES.data_planning,
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
      description: "분석 방법론, 과제 발굴",
      points: 25,
    },
    {
      key: "sql",
      name: CATEGORIES.sql,
      icon: Database,
      color: "from-orange-500 to-orange-600",
      description: "SQL 쿼리, DML, DDL",
      points: 15,
    },
    {
      key: "statistics",
      name: CATEGORIES.statistics,
      icon: BarChart,
      color: "from-purple-500 to-purple-600",
      description: "기술통계, 추론통계",
      points: 15,
    },
    {
      key: "programming",
      name: CATEGORIES.programming,
      icon: Code,
      color: "from-pink-500 to-pink-600",
      description: "R/Python 기초",
      points: 25,
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <Button
        onClick={onBack}
        variant="ghost"
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        돌아가기
      </Button>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">영역별 학습</h1>
        <p className="text-gray-600">
          학습하고 싶은 영역을 선택하세요
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryInfo.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.key}
              className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            >
              <CardHeader>
                <div className={\`w-12 h-12 rounded-lg bg-gradient-to-br \${category.color} flex items-center justify-center mb-4\`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">{category.name}</CardTitle>
                <div className="text-sm text-gray-500">{category.description}</div>
                <div className="text-xs text-blue-600 font-semibold mt-2">
                  배점: {category.points}점
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className={\`w-full bg-gradient-to-r \${category.color} hover:opacity-90 text-white\`}
                >
                  시작하기
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 📊 CSV 문제 등록 형식

ADsP 문제를 CSV 파일로 일괄 등록할 수 있습니다.

### CSV 파일 형식

```csv
question_id,type,stem,explanation,tags,difficulty,source,category,subcategory,points,answer,choice1,choice2,choice3,choice4,correct_answer
Q001,MCQ,"데이터베이스에서 ACID 속성이 아닌 것은?","ACID는 Atomicity(원자성), Consistency(일관성), Isolation(고립성), Durability(지속성)을 의미합니다.","데이터베이스,ACID",1,"2024년 기출",data_understanding,database,1,,원자성,일관성,복잡성,지속성,3
Q002,OX,"빅데이터의 3V는 Volume, Variety, Velocity를 의미한다.","맞습니다. 빅데이터의 특징은 대용량(Volume), 다양성(Variety), 속도(Velocity)입니다.","빅데이터,3V",1,"2023년 기출",data_understanding,bigdata,1,O,,,,,
Q003,MCQ,"다음 SQL 문 중 DDL이 아닌 것은?","DDL은 CREATE, ALTER, DROP 등이고, SELECT는 DML입니다.","SQL,DDL,DML",1,"예상문제",sql,ddl,1,,CREATE,ALTER,SELECT,DROP,3
Q004,MCQ,"정규분포의 특징이 아닌 것은?","정규분포는 좌우 대칭이며, 평균=중앙값=최빈값입니다.","통계,정규분포",2,"심화문제",statistics,distribution,1,,좌우 대칭,평균과 중앙값이 같음,분산이 항상 1,종 모양의 곡선,3
Q005,MCQ,"R에서 데이터프레임을 생성하는 함수는?","data.frame() 함수를 사용하여 데이터프레임을 생성합니다.","R,데이터프레임",1,"기본문제",programming,r_basic,1,,data.frame(),create.df(),new.data(),make.frame(),1
```

### CSV 필드 설명

| 필드명 | 필수 | 설명 | 예시 |
|--------|------|------|------|
| question_id | O | 문제 고유 ID | Q001, Q002 |
| type | O | 문제 유형 (MCQ/OX) | MCQ, OX |
| stem | O | 문제 내용 | "데이터베이스에서..." |
| explanation | O | 해설 | "ACID는 ..." |
| tags | X | 태그 (쉼표 구분) | "SQL,DDL,DML" |
| difficulty | X | 난이도 (1:기본, 2:심화) | 1, 2 |
| source | X | 출처 | "2024년 기출" |
| category | O | 영역 | data_understanding, sql, statistics, programming, data_planning |
| subcategory | X | 세부 분류 | database, ddl, distribution |
| points | X | 배점 (기본값 1) | 1, 2 |
| answer | O (OX만) | OX 정답 | O, X |
| choice1 | O (MCQ만) | 선택지 1 | "원자성" |
| choice2 | O (MCQ만) | 선택지 2 | "일관성" |
| choice3 | O (MCQ만) | 선택지 3 | "복잡성" |
| choice4 | O (MCQ만) | 선택지 4 | "지속성" |
| correct_answer | O (MCQ만) | 정답 번호 (1~4) | 3 |

### 카테고리 종류

- `data_understanding`: 데이터 이해
- `data_planning`: 데이터 분석 기획
- `sql`: SQL
- `statistics`: 통계분석
- `programming`: R/Python

---

## 🎯 주요 기능 구현

### 1. 실전 모의고사 (100분 타이머)

```typescript
// client/src/pages/MockExam.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function MockExam() {
  const [timeLeft, setTimeLeft] = useState(100 * 60); // 100분 = 6000초
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // 시간 종료 처리
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* 타이머 표시 */}
      <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">
            남은 시간: {minutes}분 {seconds}초
          </div>
          <div className="text-sm text-gray-600">
            문제 {currentQuestion + 1} / 100
          </div>
        </div>
        <Progress
          value={(timeLeft / (100 * 60)) * 100}
          className="mt-2"
        />
      </div>

      {/* 문제 영역 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* 문제 내용 */}
      </div>
    </div>
  );
}
```

### 2. 영역별 정답률 통계

```typescript
// 결과 페이지에서 영역별 통계 표시
export function CategoryStats({ categoryStats }: { categoryStats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
      {Object.entries(categoryStats).map(([category, stats]: [string, any]) => (
        <div key={category} className="bg-white rounded-lg p-4 border">
          <div className="text-sm font-semibold text-gray-700">
            {CATEGORIES[category as CategoryKey]}
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {stats.accuracy.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.correct} / {stats.total} 정답
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3. 오답 노트

```typescript
// 틀린 문제만 다시 풀기
async function getIncorrectQuestions() {
  const allResponses = await storage.getAllResponses();
  const incorrectQuestionIds = allResponses
    .filter(r => !r.isCorrect)
    .map(r => r.questionId);

  // 중복 제거
  const uniqueIds = [...new Set(incorrectQuestionIds)];

  return await Promise.all(
    uniqueIds.map(id => storage.getQuestion(id))
  );
}
```

---

## 🚀 배포 및 실행

### 개발 환경 실행

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npm run db:push

# 개발 서버 실행
npm run dev
```

### 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=5000
NODE_ENV=production
```

---

## 📝 문제 등록 가이드

### 관리자 페이지에서 등록

1. 상단 네비게이션에서 "관리자" 클릭
2. "CSV 업로드" 탭 선택
3. 준비한 CSV 파일 업로드
4. 결과 확인

### CSV 파일 준비 팁

1. **Excel에서 작성**: Excel에서 작성 후 "CSV UTF-8" 형식으로 저장
2. **따옴표 처리**: 문제 내용에 쉼표나 따옴표가 있으면 큰따옴표로 감싸기
3. **줄바꿈**: 문제 내용에서 줄바꿈은 `\n`으로 표현
4. **인코딩**: 반드시 UTF-8 인코딩 사용

### 예제 문제 작성

```csv
question_id,type,stem,explanation,tags,difficulty,source,category,subcategory,points,answer,choice1,choice2,choice3,choice4,correct_answer
Q_SQL_001,MCQ,"SELECT 문에서 중복을 제거하는 키워드는?","DISTINCT 키워드를 사용하여 중복된 결과를 제거할 수 있습니다.","SQL,SELECT,DISTINCT",1,"기본문제",sql,dml,1,,UNIQUE,DISTINCT,REMOVE,DELETE,2
Q_STAT_001,OX,"표준편차는 분산의 제곱근이다.","맞습니다. 표준편차 = √분산 입니다.","통계,표준편차,분산",1,"기본개념",statistics,basic,1,O,,,,,
```

---

## 🎓 학습 로드맵 추천

### 1단계: 기본 개념 (1-2주)
- 데이터 이해 영역 기본 문제
- SQL 기본 문법 (SELECT, WHERE, JOIN)
- 기술통계 기본 개념

### 2단계: 심화 학습 (2-3주)
- 데이터 분석 기획 방법론
- SQL 서브쿼리, 집계함수
- 추론통계, 가설검정

### 3단계: 프로그래밍 (1-2주)
- R 기본 문법 및 데이터 처리
- Python 기초 (pandas, numpy)

### 4단계: 실전 연습 (1-2주)
- 실전 모의고사 반복
- 오답 노트 정리
- 취약 영역 집중 학습

---

## 💡 추가 기능 아이디어

1. **학습 진도 트래킹**: 각 영역별 학습 완료율 표시
2. **AI 추천 학습**: 취약 영역 자동 분석 및 학습 추천
3. **플래시카드 모드**: 빠른 암기를 위한 카드 넘기기 모드
4. **그룹 스터디**: 친구들과 함께 문제 풀고 순위 비교
5. **문제 북마크**: 나중에 다시 풀고 싶은 문제 저장
6. **학습 캘린더**: 매일 학습 시간 및 문제 수 기록
7. **성취 배지**: 학습 목표 달성 시 배지 획득
8. **모바일 앱**: React Native로 모바일 앱 개발

---

## 📞 지원 및 문의

문제 등록이나 기능 추가가 필요하시면 언제든 연락주세요!

**행운을 빕니다! ADsP 자격증 합격하세요! 🎉**
