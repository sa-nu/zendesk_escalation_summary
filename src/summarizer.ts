import Anthropic from "@anthropic-ai/sdk";
import type { EscalationMessage, EscalationSummary, SummaryCategory } from "./types.js";

const anthropic = new Anthropic();

/**
 * Claude APIでエスカレーションメッセージを要約する。
 * @param periodLabel 期間ラベル（デフォルト: "本日"）。週次の場合は "今週" を指定。
 */
export async function summarizeEscalations(
  messages: EscalationMessage[],
  date: string,
  periodLabel: string = "本日",
): Promise<EscalationSummary> {
  if (messages.length === 0) {
    return {
      date,
      totalCount: 0,
      summaryText: `${periodLabel}のエスカレーションはありませんでした。`,
      periodLabel,
    };
  }

  const formattedMessages = messages
    .map((msg, i) => {
      const msgText = msg.text.length > 500 ? msg.text.substring(0, 500) + "…" : msg.text;
      let text = `[${i + 1}] ${msg.postedAt} (${msg.username}): ${msgText}`;
      if (msg.threadReplies && msg.threadReplies.length > 0) {
        text += `\n  スレッド返信 (${msg.threadReplies.length}件):`;
        for (const reply of msg.threadReplies.slice(0, 3)) {
          text += `\n    - ${reply.substring(0, 200)}`;
        }
      }
      return text;
    })
    .join("\n\n");

  // メッセージ番号→permalink のマッピングを作成
  const permalinkMap = new Map<number, string>();
  messages.forEach((msg, i) => {
    permalinkMap.set(i + 1, msg.permalink);
  });

  const prompt = `あなたはZendeskエスカレーション分析の専門家です。
以下は${periodLabel}（${date}）の #2h_zendesk_escalation チャンネルに投稿されたエスカレーションメッセージの一覧です。

${formattedMessages}

上記のメッセージを分析し、以下のJSON形式で日本語のサマリーを作成してください：

{
  "summaryText": "全体的なサマリー（3-5文で主要な傾向やトピックを説明）",
  "categories": [
    {
      "name": "カテゴリ名（例：アカウント関連、技術的問題、請求関連など）",
      "items": [
        {"description": "エスカレーションの簡潔な説明", "messageNumber": 対応するメッセージ番号}
      ]
    }
  ]
}

注意事項：
- サマリーは簡潔かつ実用的に
- カテゴリは内容に応じて3-7個程度に分類
- 緊急性の高いものがあれば優先的に言及
- 各itemのmessageNumberは元メッセージの番号（[1], [2]等の数字）を指定してください
- 1つのメッセージは1つのカテゴリにのみ分類し、重複させないでください
- 全メッセージ（${messages.length}件）を漏れなく分類してください
- JSONのみを出力してください`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Claude APIからテキスト応答を取得できませんでした");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      date,
      totalCount: messages.length,
      summaryText: textContent.text,
      periodLabel,
    };
  }

  let parsed: {
    summaryText: string;
    categories?: {
      name: string;
      items: { description: string; messageNumber: number }[];
    }[];
  };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("JSON parse error:", e);
    return {
      date,
      totalCount: messages.length,
      summaryText: textContent.text.substring(0, 3000),
      periodLabel,
    };
  }

  // メッセージ番号からpermalinkを解決してSlackリンク付きのitemsに変換
  const categories: SummaryCategory[] | undefined = parsed.categories?.map((cat) => ({
    name: cat.name,
    count: cat.items.length,
    items: cat.items.map((item) => {
      const link = permalinkMap.get(item.messageNumber);
      return link
        ? `${item.description} <${link}|詳細>`
        : item.description;
    }),
  }));

  return {
    date,
    totalCount: messages.length,
    summaryText: parsed.summaryText,
    categories,
    periodLabel,
  };
}
