/**
 * 退職金の手取り（所得税・住民税）概算エンジン
 *
 * 退職金は「退職所得」として給与とは分離して課税され、税負担が軽くなる優遇がある。
 *  - 退職所得控除を差し引き、さらに残額の 1/2 のみが課税対象（一般の場合）。
 *  - 社会保険料はかからない。
 *
 * 注意（概算の前提）:
 *  - 勤続5年以下の法人役員等・短期退職手当等の「1/2課税の不適用」特例は考慮しない。
 *  - 「退職所得の受給に関する申告書」を提出した一般的なケースを想定。
 */

import { incomeTaxByBracket, RATES } from './tax.ts';

export interface TaishokuInput {
  /** 退職金の額（円） */
  amount: number;
  /** 勤続年数（端数は1年に切り上げ） */
  yearsOfService: number;
}

export interface TaishokuResult {
  /** 退職所得控除額 */
  deduction: number;
  /** 課税退職所得金額（1/2後・1,000円未満切捨て） */
  taxableRetirementIncome: number;
  /** 所得税（復興特別所得税込み） */
  incomeTax: number;
  /** 住民税 */
  residentTax: number;
  /** 手取り額 */
  takeHome: number;
}

/** 退職所得控除額を計算する。 */
export function retirementDeduction(yearsOfService: number): number {
  const y = Math.max(1, Math.ceil(yearsOfService));
  if (y <= 20) return Math.max(800_000, 400_000 * y);
  return 8_000_000 + 700_000 * (y - 20);
}

export function calcTaishoku(input: TaishokuInput): TaishokuResult {
  const amount = Math.max(0, Math.floor(input.amount));
  const deduction = retirementDeduction(input.yearsOfService);

  // 課税退職所得金額 =（退職金 − 控除）× 1/2（1,000円未満切捨て）
  const taxable =
    Math.floor(Math.max(0, (amount - deduction) / 2) / 1000) * 1000;

  const baseIncomeTax = Math.floor(incomeTaxByBracket(taxable));
  const incomeTax =
    baseIncomeTax + Math.floor(baseIncomeTax * RATES.reconstructionRate);
  const residentTax = Math.floor(taxable * RATES.residentRate);

  return {
    deduction,
    taxableRetirementIncome: taxable,
    incomeTax,
    residentTax,
    takeHome: amount - incomeTax - residentTax,
  };
}
