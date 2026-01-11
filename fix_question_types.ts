import { storage } from "./server/storage";

async function fixQuestionTypes() {
  console.log("🔍 문제 타입 확인 및 수정 중...");

  const allQuestions = await storage.getQuestions();
  console.log(`📊 총 ${allQuestions.length}개의 문제 확인`);

  let fixedCount = 0;

  for (const question of allQuestions) {
    const currentType = question.type;
    const upperType = currentType.toUpperCase();

    if (currentType !== upperType) {
      console.log(`🔧 수정: ${question.id} - "${currentType}" → "${upperType}"`);
      await storage.updateQuestion(question.id, { type: upperType });
      fixedCount++;
    }
  }

  console.log(`\n✅ 완료! ${fixedCount}개의 문제 타입을 대문자로 수정했습니다.`);

  if (fixedCount === 0) {
    console.log("ℹ️  모든 문제의 타입이 이미 대문자입니다.");
  }
}

fixQuestionTypes()
  .then(() => {
    console.log("\n🎉 타입 수정 작업이 완료되었습니다!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  });
