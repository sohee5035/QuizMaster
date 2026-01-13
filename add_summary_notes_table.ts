import { database } from "./server/db";
import { sql } from "drizzle-orm";

async function addSummaryNotesTable() {
  console.log("🔧 summary_notes 테이블 추가 중...\n");

  try {
    // Create summary_notes table
    await database.execute(sql`
      CREATE TABLE IF NOT EXISTS summary_notes (
        id TEXT PRIMARY KEY,
        subject INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ summary_notes 테이블이 성공적으로 추가되었습니다!");
    console.log("ℹ️  이제 과목별 요약노트를 관리할 수 있습니다.");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  }
}

addSummaryNotesTable()
  .then(() => {
    console.log("\n🎉 마이그레이션이 완료되었습니다!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 마이그레이션 실패:", error);
    process.exit(1);
  });
