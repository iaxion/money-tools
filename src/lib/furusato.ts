/**
 * ふるさと納税の控除上限額（自己負担2,000円で済む上限）の目安を計算する。
 *
 * 計算式（特例控除の上限）:
 *   上限額 ≒ 住民税所得割額 × 20% ÷ (90% − 所得税の限界税率 × 1.021) + 2,000円
 *
 * 給与所得者・ふるさと納税以外の大きな控除がないケースを想定した概算。
 * 住宅ローン控除・医療費控除・iDeCo 等がある場合や、自治体差により実際の上限は変動する。
 */

import {
  RATES,
  kyuyoShotokuKojo,
  kisoKojoIncomeTax,
  calcSocialInsurance,
} from './tax.ts';

export interface FurusatoInput {
  /** 額面年収（円） */
  annualIncome: number;
  /** 40歳以上64歳以下か（介護保険の対象） */
  age40OrOver: boolean;
  /** 配偶者控除の対象となる配偶者がいるか */
  hasSpouse: boolean;
  /** 扶養親族の人数（16歳以上） */
  dependents: number;
}

export interface FurusatoResult {
  /** 控除上限額の目安（円） */
  limit: number;
  /** 住民税の所得割額（円） */
  residentTaxIncomeBased: number;
  /** 所得税の限界税率 */
  marginalIncomeTaxRate: number;
}

/** 課税所得から所得税の限界税率を返す。 */
function marginalIncomeTaxRate(taxable: number): number {
  if (taxable <= 1_950_000) return 0.05;
  if (taxable <= 3_300_000) return 0.1;
  if (taxable <= 6_950_000) return 0.2;
  if (taxable <= 9_000_000) return 0.23;
  if (taxable <= 18_000_000) return 0.33;
  if (taxable <= 40_000_000) return 0.4;
  return 0.45;
}

export function calcFurusato(input: FurusatoInput): FurusatoResult {
  const income = Math.max(0, Math.floor(input.annualIncome));
  const dependents = Math.max(0, Math.floor(input.dependents));
  const social = calcSocialInsurance(income, input.age40OrOver).total;
  const kyuyoShotoku = Math.max(0, income - kyuyoShotokuKojo(income));

  // 所得税の課税所得 → 限界税率
  const itDeductions =
    social +
    kisoKojoIncomeTax(kyuyoShotoku) +
    (input.hasSpouse ? 380_000 : 0) +
    dependents * 380_000;
  const itTaxable =
    Math.floor(Math.max(0, kyuyoShotoku - itDeductions) / 1000) * 1000;
  const mRate = itTaxable > 0 ? marginalIncomeTaxRate(itTaxable) : 0;

  // 住民税の所得割額
  const rtDeductions =
    social +
    RATES.residentBasicDeduction +
    (input.hasSpouse ? RATES.residentDependentDeduction : 0) +
    dependents * RATES.residentDependentDeduction;
  const rtTaxable =
    Math.floor(Math.max(0, kyuyoShotoku - rtDeductions) / 1000) * 1000;
  const residentIncomeBased = Math.floor(rtTaxable * RATES.residentRate);

  // 控除上限額（目安）
  const denom = 0.9 - mRate * 1.021;
  const limit =
    residentIncomeBased > 0 && denom > 0
      ? Math.floor((residentIncomeBased * 0.2) / denom + 2000)
      : 0;

  return {
    limit,
    residentTaxIncomeBased: residentIncomeBased,
    marginalIncomeTaxRate: mRate,
  };
}
