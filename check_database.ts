import { storage } from "./server/storage";

async function checkDatabase() {
  console.log("🔍 데이터베이스 상태 확인...\n");

  const allQuestions = await storage.getQuestions();
  console.log(`📊 총 ${allQuestions.length}개의 문제\n`);

  if (allQuestions.length > 0) {
    console.log("=== 처음 3개 문제 상세 정보 ===");
    for (let i = 0; i < Math.min(3, allQuestions.length); i++) {
      const q = allQuestions[i];
      console.log(`\n${i + 1}. 문제 ID: ${q.id}`);
      console.log(`   타입: "${q.type}" (길이: ${q.type.length})`);
      console.log(`   과목: ${q.subject}`);
      console.log(`   회차: ${q.round}`);
      console.log(`   난이도: ${q.difficulty}`);
      console.log(`   문제: ${q.stem.substring(0, 50)}...`);
    }

    // 타입별 개수
    const typeCount: any = {};
    allQuestions.forEach(q => {
      typeCount[q.type] = (typeCount[q.type] || 0) + 1;
    });

    console.log("\n=== 타입별 개수 ===");
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`   "${type}": ${count}개`);
    });
  }
}

checkDatabase()
  .then(() => {
    console.log("\n✅ 확인 완료!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 오류:", error);
    process.exit(1);
  });
