/**
 * 積立投資（複利）シミュレーションエンジン
 *
 * 毎月一定額を積み立て、年利回りで複利運用した場合の将来資産を概算する。
 * 投資は元本割れのリスクがあり、本計算は一定利回りを仮定した試算に過ぎない。
 */

export interface InvestInput {
  /** 毎月の積立額（円） */
  monthly: number;
  /** 想定年利回り（％。例: 5 は 5%） */
  annualRatePct: number;
  /** 積立年数 */
  years: number;
}

export interface InvestResult {
  months: number;
  /** 積立元本の合計 */
  principal: number;
  /** 運用後の評価額 */
  futureValue: number;
  /** 運用益（評価額 − 元本） */
  profit: number;
  /** 通常の課税口座なら運用益にかかる税額（20.315%）。NISAならこれが非課税。 */
  taxIfTaxable: number;
}

/** 譲渡益課税率（所得税15% + 復興2.1%上乗せ + 住民税5%）。 */
export const CAPITAL_GAINS_TAX_RATE = 0.20315;

/** 毎月積立・複利の将来価値を概算する（毎月末積立とみなす）。 */
export function calcInvest(input: InvestInput): InvestResult {
  const monthly = Math.max(0, input.monthly);
  const years = Math.max(0, input.years);
  const months = Math.round(years * 12);
  const r = input.annualRatePct / 100 / 12;

  const principal = monthly * months;
  const futureValue =
    r === 0 ? principal : monthly * ((Math.pow(1 + r, months) - 1) / r);
  const profit = futureValue - principal;

  return {
    months,
    principal: Math.round(principal),
    futureValue: Math.round(futureValue),
    profit: Math.round(profit),
    taxIfTaxable: Math.round(Math.max(0, profit) * CAPITAL_GAINS_TAX_RATE),
  };
}

/** 年ごとの「元本」「評価額」の推移（グラフ・表用）。 */
export function yearlySeries(
  input: InvestInput,
): { year: number; principal: number; value: number }[] {
  const out: { year: number; principal: number; value: number }[] = [];
  const r = input.annualRatePct / 100 / 12;
  const monthly = Math.max(0, input.monthly);
  for (let y = 1; y <= Math.max(0, input.years); y++) {
    const n = y * 12;
    const principal = monthly * n;
    const value = r === 0 ? principal : monthly * ((Math.pow(1 + r, n) - 1) / r);
    out.push({ year: y, principal: Math.round(principal), value: Math.round(value) });
  }
  return out;
}
