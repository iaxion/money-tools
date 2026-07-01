/**
 * 個人事業主・フリーランスの税金概算エンジン（日本）
 *
 * 対象年度: 2026年(令和8年)
 *
 * 主な前提:
 *  - 事業所得のみ（給与所得・不動産所得等は含まない）。
 *  - 青色申告特別控除は 65万円 / 55万円 / 10万円 / 0円 から選択。
 *  - 国民健康保険は市区町村により異なるためユーザー入力。
 *  - 国民年金は令和8年度確定額（月額16,980円）。
 *  - 配偶者控除・扶養控除は考慮しない（基礎控除・社保控除のみ）。
 *  - 実際の税額は各人の状況・自治体差で異なる。
 */

import { RATES, kisoKojoIncomeTax, incomeTaxByBracket } from './tax.ts';

/** 令和8年度（2026年度）国民年金保険料 月額 */
export const NENKIN_MONTHLY_2026 = 16_980;
/** 令和8年度（2026年度）国民年金保険料 年額（月額×12） */
export const NENKIN_ANNUAL_2026 = NENKIN_MONTHLY_2026 * 12; // 203,760円

export type AoiroChoice = 650_000 | 550_000 | 100_000 | 0;

export interface FreelanceInput {
  /** 売上収入（年額・円） */
  revenue: number;
  /** 必要経費（年額・円） */
  expenses: number;
  /** 青色申告特別控除（65万/55万/10万/0円） */
  aoiroDeduction: AoiroChoice;
  /** 国民健康保険料（年額・円。自治体により異なるためユーザー入力） */
  nationalHealthInsurance: number;
}

export interface FreelanceResult {
  /** 事業所得（= 売上 - 経費 - 青色申告特別控除） */
  businessIncome: number;
  /** 国民年金（年額・定額） */
  nenkin: number;
  /** 国民健康保険（ユーザー入力） */
  kokuminKenko: number;
  /** 社会保険料合計（国民年金 + 国民健康保険） */
  socialInsuranceTotal: number;
  /** 所得税（復興特別所得税込み） */
  incomeTax: number;
  /** 住民税（所得割 + 均等割） */
  residentTax: number;
  /** 税・社保の合計控除額 */
  totalDeductions: number;
  /** 手取り概算（事業所得 - 税 - 社保） */
  takeHome: number;
  /** 手取り月額（年額÷12） */
  takeHomeMonthly: number;
  /** 手取り率（手取り÷事業所得） */
  takeHomeRate: number;
  /** 実効税率（所得税+住民税 ÷ 事業所得） */
  effectiveTaxRate: number;
}

/** 個人事業主・フリーランスの税金・手取りを概算する。 */
export function calcFreelance(input: FreelanceInput): FreelanceResult {
  const revenue = Math.max(0, Math.floor(input.revenue));
  const expenses = Math.max(0, Math.floor(input.expenses));
  const nhi = Math.max(0, Math.floor(input.nationalHealthInsurance));

  // 事業所得（青色申告特別控除後）
  const netIncome = Math.max(0, revenue - expenses);
  const aoiro = Math.min(input.aoiroDeduction, netIncome); // 控除額は事業所得を超えない
  const businessIncome = netIncome - aoiro;

  // 国民年金（令和8年度確定額）
  const nenkin = NENKIN_ANNUAL_2026;
  const socialInsuranceTotal = nenkin + nhi;

  // 所得税の課税所得 = 事業所得 - 基礎控除 - 社会保険料控除
  const kiso = kisoKojoIncomeTax(businessIncome);
  const taxableIT =
    Math.floor(Math.max(0, businessIncome - kiso - socialInsuranceTotal) / 1000) * 1000;
  const baseIncomeTax = Math.floor(incomeTaxByBracket(taxableIT));
  const incomeTax = baseIncomeTax + Math.floor(baseIncomeTax * RATES.reconstructionRate);

  // 住民税の課税所得 = 事業所得 - 住民税基礎控除 - 社会保険料控除
  const taxableRT =
    Math.floor(Math.max(0, businessIncome - RATES.residentBasicDeduction - socialInsuranceTotal) / 1000) * 1000;
  const incomeBased = Math.floor(taxableRT * RATES.residentRate);
  const residentTax = taxableRT > 0 ? incomeBased + RATES.residentPerCapita : 0;

  // 集計
  const totalDeductions = incomeTax + residentTax + socialInsuranceTotal;
  const takeHome = Math.max(0, businessIncome - incomeTax - residentTax - socialInsuranceTotal);

  return {
    businessIncome,
    nenkin,
    kokuminKenko: nhi,
    socialInsuranceTotal,
    incomeTax,
    residentTax,
    totalDeductions,
    takeHome,
    takeHomeMonthly: Math.floor(takeHome / 12),
    takeHomeRate: businessIncome > 0 ? takeHome / businessIncome : 0,
    effectiveTaxRate: businessIncome > 0 ? (incomeTax + residentTax) / businessIncome : 0,
  };
}
