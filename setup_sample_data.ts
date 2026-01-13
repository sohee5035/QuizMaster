import { storage } from "./server/storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupSampleData() {
  console.log("🔍 기존 문제 확인 중...");

  // 1. 기존 문제 가져오기
  const allQuestions = await storage.getQuestions();
  console.log(`📊 총 ${allQuestions.length}개의 문제가 있습니다.`);

  // 2. 외환 관련 문제 찾기 및 삭제
  const foreignExchangeQuestions = allQuestions.filter(q =>
    q.stem.includes('외환') || (q.tags && q.tags.includes('외환'))
  );

  if (foreignExchangeQuestions.length > 0) {
    console.log(`🗑️  외환 관련 문제 ${foreignExchangeQuestions.length}개 삭제 중...`);
    for (const q of foreignExchangeQuestions) {
      await storage.deleteQuestion(q.id);
      console.log(`   ✓ 삭제: ${q.id} - ${q.stem.substring(0, 30)}...`);
    }
  } else {
    console.log("ℹ️  외환 관련 문제가 없습니다.");
  }

  // 3. CSV 파일 읽기 및 파싱
  console.log("\n📝 새로운 샘플 문제 등록 중...");
  const csvPath = path.join(__dirname, 'adsp_sample_questions.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');

  let successCount = 0;

  // 4. 각 문제 등록
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(',');
    const questionData: any = {};
    headers.forEach((header, idx) => {
      questionData[header] = values[idx] || '';
    });

    try {
      // 문제 생성 (타입을 대문자로 변환)
      const questionType = questionData.type.toUpperCase();
      const question = await storage.createQuestion({
        id: questionData.questionId,
        type: questionType,
        stem: questionData.stem,
        explanation: questionData.explanation || null,
        tags: null,
        difficulty: null,
        source: null,
        answer: questionType === 'OX' ? (questionData.correctAnswer === 'O') : null,
        author: 'default',
        category: null,
        subject: parseInt(questionData.subject) || null,
        round: questionData.round ? parseInt(questionData.round) : null,
      });

      // 사지선다인 경우 선택지 생성
      if (questionType === 'MCQ') {
        const choices = [
          { content: questionData.choice1, isCorrect: questionData.correctAnswer === '1' },
          { content: questionData.choice2, isCorrect: questionData.correctAnswer === '2' },
          { content: questionData.choice3, isCorrect: questionData.correctAnswer === '3' },
          { content: questionData.choice4, isCorrect: questionData.correctAnswer === '4' },
        ];

        for (const choice of choices) {
          await storage.createChoice({
            id: `${question.id}_${choices.indexOf(choice) + 1}`,
            questionId: question.id,
            content: choice.content,
            isCorrect: choice.isCorrect,
          });
        }
      }

      successCount++;
      console.log(`   ✓ ${questionData.questionId} (${questionData.subject}과목) 등록 완료`);
    } catch (error: any) {
      console.error(`   ✗ ${questionData.questionId} 등록 실패:`, error.message);
    }
  }

  console.log(`\n✅ 완료! ${successCount}개의 문제가 등록되었습니다.`);
  console.log("\n📊 과목별 문제 수:");
  const finalQuestions = await storage.getQuestions();
  const bySubject = finalQuestions.reduce((acc: any, q) => {
    const subject = q.subject || '미분류';
    acc[subject] = (acc[subject] || 0) + 1;
    return acc;
  }, {});

  Object.entries(bySubject).forEach(([subject, count]) => {
    console.log(`   ${subject}과목: ${count}개`);
  });
}

setupSampleData()
  .then(() => {
    console.log("\n🎉 모든 작업이 완료되었습니다!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  });
