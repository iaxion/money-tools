/**
 * iDeCo（個人型確定拠出年金）節税シミュレーター
 *
 * 計算内容: iDeCoの掛金による小規模企業共済等掛金控除から、
 * 年間節税額（所得税＋住民税）と累計節税額の目安を概算する。
 *
 * 前提・制限（概算のため実際の節税額とは異なる場合があります）:
 * - 給与所得のみ・独身・扶養なしの前提で税額を推計（家族構成等により実際は異なる）。
 * - 掛金限度額は 2026年12月1日施行の令和7年度年金制度改正法で切り替え。
 * - 企業年金あり・公務員の改正後上限は企業年金/共済掛金額次第のため現行値を据え置き
 *   （正確な上限はご加入の企業年金/共済窓口にご確認ください）。
 * - 運用益・受取時課税は対象外（本ツールは「掛金の所得控除による節税」に特化）。
 * - 累計節税額は現在の税率・掛金が継続すると仮定した単純合計（運用益は含まない）。
 */

import {
  calcSocialInsurance,
  kyuyoShotokuKojo,
  kisoKojoIncomeTax,
  incomeTaxByBracket,
  RATES,
} from './tax.ts';

export type IdecoCategory =
  | '会社員_企業年金なし'
  | '会社員_企業年金あり'
  | '公務員'
  | '第1号_自営'
  | '第3号_専業主婦';

export interface IdecoInput {
  annualIncome: number;
  monthlyContribution: number;
  age: number;
  category: IdecoCategory;
  useReformLimit?: boolean;
}

export interface IdecoResult {
  annualContribution: number;
  cappedContribution: number;
  incomeTaxSaved: number;
  residentTaxSaved: number;
  totalAnnualSaved: number;
  cumulativeSaved: number;
  isOverLimit: boolean;
  monthlyExcess: number;
  limitUsed: number;
  limitAfterReform: number;
  remainingYears: number;
}

/** 月額拠出上限（2026年11月以前・現行） */
export const IDECO_LIMITS_CURRENT: Record<IdecoCategory, number> = {
  '会社員_企業年金なし': 23_000,
  '会社員_企業年金あり': 20_000,
  '公務員': 20_000,
  '第1号_自営': 68_000,
  '第3号_専業主婦': 23_000,
};

/**
 * 月額拠出上限（2026年12月1日施行・令和7年度年金制度改正後）。
 * 企業年金あり・公務員は合算枠6.2万に変わるが、iDeCo単独の上限は
 * 企業年金/共済掛金額次第のため現行値を据え置き（窓口でご確認ください）。
 */
export const IDECO_LIMITS_REFORM: Record<IdecoCategory, number> = {
  '会社員_企業年金なし': 62_000,
  '会社員_企業年金あり': 20_000,
  '公務員': 20_000,
  '第1号_自営': 75_000,
  '第3号_専業主婦': 23_000,
};

/** iDeCoの掛金による年間・累計節税額の目安を概算する。 */
export function calcIdeco(input: IdecoInput): IdecoResult {
  const { annualIncome, monthlyContribution, age, category, useReformLimit = false } = input;

  const limits = useReformLimit ? IDECO_LIMITS_REFORM : IDECO_LIMITS_CURRENT;
  const limitUsed = limits[category];
  const limitAfterReform = IDECO_LIMITS_REFORM[category];

  const monthly = Math.max(0, Math.floor(monthlyContribution));
  const cappedMonthly = Math.min(monthly, limitUsed);
  const isOverLimit = monthly > limitUsed;
  const monthlyExcess = Math.max(0, monthly - limitUsed);

  const cappedContribution = cappedMonthly * 12;
  const annualContribution = monthly * 12;

  // 年収から課税所得を推計（独身・扶養なし・社保控除+基礎控除のみ）
  const income = Math.max(0, Math.floor(annualIncome));
  const age40OrOver = age >= 40 && age <= 64;
  const si = calcSocialInsurance(income, age40OrOver);
  const shotoku = Math.max(0, income - kyuyoShotokuKojo(income));
  const kiso = kisoKojoIncomeTax(shotoku);
  const rawTaxable = Math.max(0, shotoku - si.total - kiso);

  // 所得税節税: iDeCo掛金分だけ課税所得を圧縮した差額
  const taxable0 = Math.floor(rawTaxable / 1_000) * 1_000;
  const taxable1 = Math.floor(Math.max(0, rawTaxable - cappedContribution) / 1_000) * 1_000;
  const incomeTaxSaved = Math.floor(
    (incomeTaxByBracket(taxable0) - incomeTaxByBracket(taxable1)) * (1 + RATES.reconstructionRate),
  );

  // 住民税節税: 所得割10%（課税所得を超える部分は節税なし）
  const residentTaxSaved = Math.floor(
    Math.min(cappedContribution, rawTaxable) * RATES.residentRate,
  );

  const totalAnnualSaved = incomeTaxSaved + residentTaxSaved;

  // 65歳まで同額節税できると仮定した単純合計（拠出可能年齢上限）
  const remainingYears = Math.max(0, 65 - Math.max(0, Math.floor(age)));
  const cumulativeSaved = totalAnnualSaved * remainingYears;

  return {
    annualContribution,
    cappedContribution,
    incomeTaxSaved,
    residentTaxSaved,
    totalAnnualSaved,
    cumulativeSaved,
    isOverLimit,
    monthlyExcess,
    limitUsed,
    limitAfterReform,
    remainingYears,
  };
}
