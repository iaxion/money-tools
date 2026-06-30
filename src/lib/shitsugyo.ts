/**
 * 失業給付（基本手当）シミュレーター（日本・雇用保険）
 *
 * 出典:
 *   - 厚生労働省「雇用保険の基本手当日額の変更（令和7年8月1日〜）」
 *     https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000160564_00048.html
 *   - ハローワーク「基本手当の所定給付日数」
 *     https://www.hellowork.mhlw.go.jp/insurance/insurance_benefitdays.html
 *   - 厚生労働省「令和7年4月以降の給付制限短縮」
 *     https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000160564_00045.html
 *
 * 注意: 上限額・給付率は毎年8月に改定。本ファイルは令和7年8月1日〜令和8年7月31日の値。
 */

export type SeparationReason = '自己都合' | '会社都合';

export interface ShitsugyoInput {
  /** 離職前6ヶ月の月給平均（総支給額・円） */
  monthlyWage6mAvg: number;
  /** 離職時の年齢（歳） */
  age: number;
  /** 離職理由（自己都合 or 会社都合・特定受給資格者） */
  reason: SeparationReason;
  /** 雇用保険の被保険者期間（年）。1年未満の場合は 0 */
  insuredYears: number;
}

export interface ShitsugyoResult {
  /** 賃金日額（円）= 月給平均 × 6 ÷ 180 */
  dailyWage: number;
  /** 基本手当日額（円） */
  dailyBenefit: number;
  /** 給付率（0〜1）= dailyBenefit / dailyWage */
  benefitRate: number;
  /** 所定給付日数（日） */
  totalDays: number;
  /** 受給総額の目安（円）= dailyBenefit × totalDays */
  totalEstimate: number;
  /** 給付制限期間（月）。0 = なし（会社都合） */
  benefitRestrictionMonths: number;
}

/**
 * 基本手当日額の上限額（令和7年8月1日以降・年齢別）
 * 出典: 厚生労働省「令和7年8月1日からの基本手当日額等の適用について」
 */
const BENEFIT_CAPS: Record<string, number> = {
  under30: 7_255,
  u30_44: 8_055,
  u45_59: 8_870,
  u60_64: 7_623,
};

/** 基本手当日額の下限額（全年齢共通、令和7年8月1日以降） */
const BENEFIT_MIN = 2_411;

/** 賃金日額の下限（= 最低賃金 × 20/7 ≒ 3,014円、令和7年度） */
const DAILY_WAGE_MIN = 3_014;

function getBenefitCap(age: number): number {
  if (age < 30) return BENEFIT_CAPS.under30;
  if (age < 45) return BENEFIT_CAPS.u30_44;
  if (age < 60) return BENEFIT_CAPS.u45_59;
  return BENEFIT_CAPS.u60_64;
}

/**
 * 基本手当日額の計算（令和7年8月1日以降の公式計算式）
 *
 * 60歳未満:  y = 0.8w − 0.3{(w−5,340)/7,800}w  (5,340 < w ≤ 13,140)
 * 60〜64歳:  y = 0.8w − 0.35{(w−5,340)/6,460}w (5,340 < w ≤ 11,800)
 *
 * 出典: 厚生労働省 基本手当日額の計算式（令和7年8月1日〜）
 */
export function calcDailyBenefit(dailyWage: number, age: number): number {
  const w = Math.max(DAILY_WAGE_MIN, dailyWage);
  const cap = getBenefitCap(age);
  let benefit: number;

  if (age < 60) {
    if (w <= 5_340) {
      benefit = w * 0.8;
    } else if (w <= 13_140) {
      // y = w(7,842 − 0.3w) / 7,800
      benefit = (w * (7_842 - 0.3 * w)) / 7_800;
    } else {
      benefit = w * 0.5;
    }
  } else {
    // 60〜64歳
    if (w <= 5_340) {
      benefit = w * 0.8;
    } else if (w <= 11_800) {
      // y = w(7,037 − 0.35w) / 6,460
      benefit = (w * (7_037 - 0.35 * w)) / 6_460;
    } else {
      benefit = w * 0.45;
    }
  }

  return Math.min(Math.max(Math.round(benefit), BENEFIT_MIN), cap);
}

/**
 * 所定給付日数テーブル（特定受給資格者・会社都合）
 * 列インデックス: [1年未満, 1〜5年, 5〜10年, 10〜20年, 20年以上]
 * 出典: ハローワーク「基本手当の所定給付日数」
 */
const INVOLUNTARY_DAYS: Record<string, [number, number, number, number, number]> = {
  under30: [90, 90, 120, 180, 180],
  u30_34: [90, 90, 180, 210, 240],
  u35_44: [90, 90, 180, 240, 270],
  u45_59: [90, 180, 240, 270, 330],
  u60_64: [90, 150, 180, 210, 240],
};

function getAgeKey(age: number): keyof typeof INVOLUNTARY_DAYS {
  if (age < 30) return 'under30';
  if (age < 35) return 'u30_34';
  if (age < 45) return 'u35_44';
  if (age < 60) return 'u45_59';
  return 'u60_64';
}

function getInsuredYearsIndex(years: number): 0 | 1 | 2 | 3 | 4 {
  if (years < 1) return 0;
  if (years < 5) return 1;
  if (years < 10) return 2;
  if (years < 20) return 3;
  return 4;
}

function getTotalDays(age: number, insuredYears: number, reason: SeparationReason): number {
  if (reason === '自己都合') {
    // 一般の受給資格者（年齢不問）
    if (insuredYears < 10) return 90;
    if (insuredYears < 20) return 120;
    return 150;
  }
  // 会社都合（特定受給資格者）
  return INVOLUNTARY_DAYS[getAgeKey(age)][getInsuredYearsIndex(insuredYears)];
}

/** 失業給付（基本手当）を概算する */
export function calcShitsugyo(input: ShitsugyoInput): ShitsugyoResult {
  const { monthlyWage6mAvg, age, reason, insuredYears } = input;

  const dailyWage = Math.round((Math.max(0, monthlyWage6mAvg) * 6) / 180);
  const dailyBenefit = calcDailyBenefit(dailyWage, age);
  const benefitRate = dailyWage > 0 ? dailyBenefit / dailyWage : 0;
  const totalDays = getTotalDays(age, insuredYears, reason);
  const totalEstimate = dailyBenefit * totalDays;
  // 令和7年4月1日以降の離職: 自己都合は原則1ヶ月の給付制限
  const benefitRestrictionMonths = reason === '自己都合' ? 1 : 0;

  return {
    dailyWage,
    dailyBenefit,
    benefitRate,
    totalDays,
    totalEstimate,
    benefitRestrictionMonths,
  };
}
