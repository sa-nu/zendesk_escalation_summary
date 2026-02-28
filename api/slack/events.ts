import { App, LogLevel } from "@slack/bolt";
import { VercelReceiver, createHandler } from "@vercel/slack-bolt";
import { runDailySummary } from "../../src/cronJob.js";

const receiver = new VercelReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
  deferInitialization: true,
  logLevel: LogLevel.INFO,
});

app.command("/escalation-summary", async ({ command, ack, respond }) => {
  await ack();

  await respond({
    response_type: "ephemeral",
    text: ":hourglass_flowing_sand: エスカレーションサマリーを生成中...",
  });

  try {
    const result = await runDailySummary();

    if (result.success) {
      await respond({
        response_type: "ephemeral",
        text: `:white_check_mark: サマリーを投稿しました (${result.messageCount}件のメッセージを処理)`,
      });
    } else {
      await respond({
        response_type: "ephemeral",
        text: `:warning: サマリー生成に失敗しました: ${result.error}`,
      });
    }
  } catch (error) {
    console.error("サマリー生成エラー:", error);
    await respond({
      response_type: "ephemeral",
      text: ":warning: サマリー生成中にエラーが発生しました。しばらくしてからもう一度お試しください。",
    });
  }
});

export const POST = createHandler(app, receiver);
