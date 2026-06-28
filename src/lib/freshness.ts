/**
 * 制度データの「鮮度」管理。
 *
 * 税率・控除・社会保険料率は毎年改定される（社会保険は毎年4月、税制改正は年末大綱→翌年施行）。
 * 放置すると古い値のまま気づけず、金融ツールとして致命的になる。
 * そこで「いつ時点の制度か」「次にいつ確認すべきか」をここで一元管理し、
 *  - サイト上に最終確認日を表示（透明性）
 *  - 期限を過ぎたら警告を表示／ビルド時に警告ログ（気づける）
 *  - 定期レビュー（スケジュール実行）の判定にも使う
 * という形で陳腐化をカバーする。
 *
 * 税率を更新したら、必ず lastReviewed と（必要なら fiscalYear / reviewDue）を更新すること。
 */
export const TAX_DATA_META = {
  /** 対象年度（表示用） */
  fiscalYear: '令和8年（2026年）',
  /** 公式情報と突き合わせて最終確認した日（YYYY-MM-DD） */
  lastReviewed: '2026-06-28',
  /**
   * 次回見直し推奨日。社会保険料率は毎年4月改定、税制改正は年末大綱→翌年施行のため、
   * 翌年4月を既定の節目とする。この日以降は最新改正の確認が必要。
   */
  reviewDue: '2027-04-01',
  /** 確認に使う公式情報源 */
  sources: [
    { name: '協会けんぽ 保険料率', url: 'https://www.kyoukaikenpo.or.jp/' },
    { name: '国税庁 税制', url: 'https://www.nta.go.jp/' },
  ],
} as const;

/** 指定日（既定: 現在）時点で見直し期限を過ぎているか。 */
export function isTaxDataStale(now: Date = new Date()): boolean {
  return now.getTime() >= new Date(TAX_DATA_META.reviewDue).getTime();
}
