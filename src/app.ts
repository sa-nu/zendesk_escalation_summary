import "dotenv/config";
import { runDailySummary } from "./cronJob.js";

// ローカルでサマリー生成を手動実行するスクリプト
(async () => {
  console.log("エスカレーションサマリーを手動実行します...");
  const result = await runDailySummary();

  if (result.success) {
    console.log(`完了: ${result.messageCount}件のメッセージを処理しました`);
  } else {
    console.error(`失敗: ${result.error}`);
    process.exit(1);
  }
})();
