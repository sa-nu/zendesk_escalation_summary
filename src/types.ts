/** Slackから取得した個別のエスカレーションメッセージ */
export interface EscalationMessage {
  ts: string;
  text: string;
  username: string;
  isBot: boolean;
  postedAt: string;
  replyCount: number;
  threadReplies?: string[];
}

/** AI要約の結果 */
export interface EscalationSummary {
  date: string;
  totalCount: number;
  summaryText: string;
  categories?: SummaryCategory[];
}

/** カテゴリ別の内訳 */
export interface SummaryCategory {
  name: string;
  count: number;
  items: string[];
}
