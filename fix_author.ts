import { storage } from "./server/storage";

async function fixAuthor() {
  console.log("🔧 문제 작성자(author) 수정 중...\n");

  const allQuestions = await storage.getQuestions();
  console.log(`📊 총 ${allQuestions.length}개의 문제 확인`);

  let fixedCount = 0;

  for (const question of allQuestions) {
    if (question.author === 'admin') {
      console.log(`🔧 수정: ${question.id} - author: "admin" → "default"`);
      await storage.updateQuestion(question.id, { author: 'default' });
      fixedCount++;
    }
  }

  console.log(`\n✅ 완료! ${fixedCount}개의 문제 author를 수정했습니다.`);

  if (fixedCount === 0) {
    console.log("ℹ️  모든 문제의 author가 이미 'default'입니다.");
  }

  // 결과 확인
  console.log("\n=== 수정 후 상태 확인 ===");
  const updatedQuestions = await storage.getQuestions();
  const authorCount: any = {};
  updatedQuestions.forEach(q => {
    authorCount[q.author] = (authorCount[q.author] || 0) + 1;
  });

  Object.entries(authorCount).forEach(([author, count]) => {
    console.log(`   author="${author}": ${count}개`);
  });
}

fixAuthor()
  .then(() => {
    console.log("\n🎉 author 수정 작업이 완료되었습니다!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  });
