import { WebClient } from "@slack/web-api";
import type { KnownBlock } from "@slack/types";
import type { EscalationMessage } from "./types.js";

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const channelId = process.env.SLACK_CHANNEL_ID!;

/**
 * #2h_zendesk_escalation から過去24時間のメッセージを取得する。
 * ページネーション対応。スレッド返信も取得。
 */
export async function fetchEscalationMessages(): Promise<EscalationMessage[]> {
  const now = Math.floor(Date.now() / 1000);
  const twentyFourHoursAgo = now - 24 * 60 * 60;

  const messages: EscalationMessage[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.conversations.history({
      channel: channelId,
      oldest: String(twentyFourHoursAgo),
      latest: String(now),
      limit: 200,
      cursor,
    });

    for (const msg of response.messages ?? []) {
      if (!msg.ts || msg.subtype === "channel_join") continue;

      const escalation: EscalationMessage = {
        ts: msg.ts,
        text: msg.text ?? "",
        username: msg.username ?? (msg.bot_id ? `bot:${msg.bot_id}` : "unknown"),
        isBot: !!msg.bot_id,
        postedAt: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        replyCount: msg.reply_count ?? 0,
      };

      if (escalation.replyCount > 0) {
        escalation.threadReplies = await fetchThreadReplies(msg.ts);
      }

      messages.push(escalation);
    }

    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return messages;
}

async function fetchThreadReplies(threadTs: string): Promise<string[]> {
  const response = await client.conversations.replies({
    channel: channelId,
    ts: threadTs,
    limit: 50,
  });

  return (response.messages ?? [])
    .slice(1)
    .map((msg) => msg.text ?? "")
    .filter(Boolean);
}

/**
 * 指定チャンネルにBlock Kit形式のメッセージを投稿する。
 */
export async function postSummary(
  targetChannelId: string,
  blocks: KnownBlock[],
  fallbackText: string,
): Promise<void> {
  await client.chat.postMessage({
    channel: targetChannelId,
    blocks,
    text: fallbackText,
  });
}
