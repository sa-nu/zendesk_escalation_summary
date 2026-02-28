import type { KnownBlock } from "@slack/types";
import type { EscalationSummary } from "./types.js";

/**
 * EscalationSummaryをSlack Block Kit形式にフォーマットする。
 */
export function formatSummaryBlocks(summary: EscalationSummary): KnownBlock[] {
  if (summary.totalCount === 0) {
    return [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${summary.date} エスカレーションサマリー`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":white_check_mark: 本日のエスカレーションはありませんでした。",
        },
      },
    ];
  }

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${summary.date} エスカレーションサマリー`,
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `本日のエスカレーション: *${summary.totalCount}件*`,
        },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: summary.summaryText,
      },
    },
  ];

  if (summary.categories && summary.categories.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*カテゴリ別内訳*",
      },
    });

    for (const category of summary.categories) {
      const itemList = category.items.map((item) => `  - ${item}`).join("\n");

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${category.name}* (${category.count}件)\n${itemList}`,
        },
      });
    }
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `このサマリーはAIにより自動生成されました | ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
      },
    ],
  });

  return blocks;
}
