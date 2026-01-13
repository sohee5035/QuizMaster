import { storage } from "./server/storage";
import { database } from "./server/db";
import { sql } from "drizzle-orm";

async function addBoxContentField() {
  console.log("🔧 box_content 필드 추가 중...\n");

  try {
    // Add box_content column to questions table
    await database.execute(sql`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS box_content TEXT
    `);

    console.log("✅ box_content 필드가 성공적으로 추가되었습니다!");
    console.log("ℹ️  이제 문제 등록 시 박스 내용을 추가할 수 있습니다.");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  }
}

addBoxContentField()
  .then(() => {
    console.log("\n🎉 마이그레이션이 완료되었습니다!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 마이그레이션 실패:", error);
    process.exit(1);
  });
