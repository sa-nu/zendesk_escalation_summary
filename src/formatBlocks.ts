import type { KnownBlock } from "@slack/types";
import type { EscalationSummary } from "./types.js";

/**
 * EscalationSummaryをSlack Block Kit形式にフォーマットする。
 */
export function formatSummaryBlocks(summary: EscalationSummary): KnownBlock[] {
  const periodLabel = summary.periodLabel ?? "本日";

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
          text: `:white_check_mark: ${periodLabel}のエスカレーションはありませんでした。`,
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
          text: `<!subteam^S0951R6UJMP> ${periodLabel}のエスカレーション: *${summary.totalCount}件*`,
        },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: summary.summaryText.substring(0, 3000),
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
      let sectionText = `*${category.name}* (${category.count}件)\n${itemList}`;
      // Slack mrkdwn sectionの文字数上限は3000
      if (sectionText.length > 3000) {
        sectionText = sectionText.substring(0, 2997) + "…";
      }

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: sectionText,
        },
      });

      // Slack Block Kitの上限は50ブロック
      if (blocks.length >= 48) break;
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
