/**
 * 高額療養費 自己負担上限シミュレーター（日本・現行制度 2026年時点）
 *
 * 対象: 70歳未満の健康保険（協会けんぽ・組合健保）加入者
 * 出典: 厚生労働省「高額療養費制度を利用される皆さまへ」
 *   https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/juuyou/kougakuiryou/index.html
 *
 * 2026年8月に自己負担上限の引き上げ改正が施行予定。
 * 本ファイルは現行値のみを反映し、改正後の数値は確定値を確認してから更新する。
 */

export type IncomeBracket = 'ア' | 'イ' | 'ウ' | 'エ' | 'オ';

export interface KogakuInput {
  /** 1か月の総医療費（10割・円）。窓口3割負担なら÷0.3で換算。 */
  medicalCostTotal: number;
  /** 所得区分（70歳未満） */
  incomeBracket: IncomeBracket;
  /** 多数回該当: 直近12か月で同一世帯4回目以降の高額療養費 */
  multipleHit?: boolean;
}

export interface KogakuResult {
  /** 窓口負担（3割）の概算額 */
  windowPay: number;
  /** 自己負担上限額 */
  selfPayCap: number;
  /** 払い戻し見込み（窓口3割負担 − 自己負担上限）。負になる場合は0 */
  refund: number;
}

/** 所得区分の定義（70歳未満・現行制度） */
export const KOGAKU_BRACKETS: Record<
  IncomeBracket,
  {
    label: string;
    /** 標準報酬月額 */
    standardRemuneration: string;
    /** おおよその年収目安 */
    incomeGuide: string;
    /**
     * 自己負担上限額の計算関数。
     * base: 基礎額、threshold: 医療費閾値（超過分に1%をかける）、excess1pct: trueなら (総医療費-threshold)×1% を加算
     */
    cap: (totalMedical: number) => number;
    /** 多数回該当（4回目以降）の上限額 */
    multipleHitCap: number;
  }
> = {
  ア: {
    label: 'ア（年収約1,160万円以上）',
    standardRemuneration: '83万円以上',
    incomeGuide: '約1,160万円〜',
    cap: (m) => 252_600 + Math.max(0, m - 842_000) * 0.01,
    multipleHitCap: 140_100,
  },
  イ: {
    label: 'イ（年収約770〜1,160万円）',
    standardRemuneration: '53〜79万円',
    incomeGuide: '約770〜1,160万円',
    cap: (m) => 167_400 + Math.max(0, m - 558_000) * 0.01,
    multipleHitCap: 93_000,
  },
  ウ: {
    label: 'ウ（年収約370〜770万円）',
    standardRemuneration: '28〜50万円',
    incomeGuide: '約370〜770万円',
    cap: (m) => 80_100 + Math.max(0, m - 267_000) * 0.01,
    multipleHitCap: 44_400,
  },
  エ: {
    label: 'エ（年収〜約370万円）',
    standardRemuneration: '26万円以下',
    incomeGuide: '〜約370万円',
    cap: (_) => 57_600,
    multipleHitCap: 44_400,
  },
  オ: {
    label: 'オ（住民税非課税）',
    standardRemuneration: '住民税非課税',
    incomeGuide: '住民税非課税世帯',
    cap: (_) => 35_400,
    multipleHitCap: 24_600,
  },
};

export function calcKogaku(input: KogakuInput): KogakuResult {
  const total = Math.max(0, Math.round(input.medicalCostTotal));
  const def = KOGAKU_BRACKETS[input.incomeBracket];

  const selfPayCap = input.multipleHit
    ? def.multipleHitCap
    : Math.round(def.cap(total));

  const windowPay = Math.round(total * 0.3);
  const refund = Math.max(0, windowPay - selfPayCap);

  return { windowPay, selfPayCap, refund };
}
