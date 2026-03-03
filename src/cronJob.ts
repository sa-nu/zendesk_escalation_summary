import { fetchEscalationMessages, postSummary } from "./slackClient.js";
import { summarizeEscalations } from "./summarizer.js";
import { formatSummaryBlocks } from "./formatBlocks.js";

function getTodayJST(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function getWeekRangeJST(): string {
  const now = new Date();
  const end = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(start)}〜${fmt(end)}`;
}

/**
 * デイリーサマリーのメイン処理。
 * 1. Slackからエスカレーションメッセージを取得（過去24時間）
 * 2. Claude AIで要約
 * 3. フォーマットしてSlackに投稿
 */
export async function runDailySummary(): Promise<{
  success: boolean;
  messageCount: number;
  error?: string;
}> {
  const date = getTodayJST();
  const targetChannelId = process.env.SLACK_CHANNEL_ID!;

  console.log(`[${date}] エスカレーションサマリー生成を開始...`);

  try {
    const messages = await fetchEscalationMessages();
    console.log(`  取得メッセージ数: ${messages.length}`);

    const summary = await summarizeEscalations(messages, date);
    console.log(`  サマリー生成完了`);

    const blocks = formatSummaryBlocks(summary);
    const fallbackText = `${date} エスカレーションサマリー (${summary.totalCount}件)`;

    await postSummary(targetChannelId, blocks, fallbackText);
    console.log(`  サマリー投稿完了 (channel: ${targetChannelId})`);

    return { success: true, messageCount: messages.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  エラー: ${errorMessage}`);
    return { success: false, messageCount: 0, error: errorMessage };
  }
}

/**
 * 週次サマリーのメイン処理。
 * 1. Slackからエスカレーションメッセージを取得（過去7日間）
 * 2. Claude AIで要約
 * 3. フォーマットしてSlackに投稿
 */
export async function runWeeklySummary(): Promise<{
  success: boolean;
  messageCount: number;
  error?: string;
}> {
  const weekRange = getWeekRangeJST();
  const date = `${weekRange} 週次`;
  const targetChannelId = process.env.SLACK_CHANNEL_ID!;

  console.log(`[${date}] 週次エスカレーションサマリー生成を開始...`);

  try {
    const messages = await fetchEscalationMessages(168, false, 50); // 7日、スレッドなし、最大50件
    console.log(`  取得メッセージ数: ${messages.length}`);

    const summary = await summarizeEscalations(messages, date, "今週", "claude-sonnet-4-6");
    console.log(`  サマリー生成完了`);

    const blocks = formatSummaryBlocks(summary);
    const fallbackText = `${date} エスカレーションサマリー (${summary.totalCount}件)`;

    await postSummary(targetChannelId, blocks, fallbackText);
    console.log(`  サマリー投稿完了 (channel: ${targetChannelId})`);

    return { success: true, messageCount: messages.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  エラー: ${errorMessage}`);
    return { success: false, messageCount: 0, error: errorMessage };
  }
}
