/**
 * 副業の確定申告要否・追加税額概算エンジン（日本）
 *
 * 対象: 本業が給与所得者（会社員等）で、副業が雑所得の場合を想定。
 * 副業所得が年20万円を超えると確定申告が必要（所得税）。
 * 追加税額は「本業のみ」と「本業＋副業の合算」の差額で算出する。
 *
 * 前提・制限:
 *  - 副業の種類は「雑所得」として扱う（事業所得・不動産所得等は対象外）。
 *  - 副業からの社会保険料は発生しない前提（フリーランス等の国民年金・国保は考慮しない）。
 *  - 本業の社会保険は calcSocialInsurance を使用（税.ts と共用）。
 *  - 住民税は翌年課税（確定申告後に増加）。
 *  - 所得税の基礎控除は合計所得金額（給与所得＋副業所得）に基づく。
 *  - 2026年(令和8年)の税率・控除に基づく概算。
 */

import {
  calcSocialInsurance,
  kyuyoShotokuKojo,
  kisoKojoIncomeTax,
  incomeTaxByBracket,
  RATES,
  calcTedori,
} from './tax.ts';

export interface FukugyoInput {
  /** 本業の給与年収（額面・円） */
  mainIncome: number;
  /** 副業の所得（収入から経費を引いた後の金額・円） */
  subIncome: number;
  /** 40歳以上64歳以下か（介護保険の対象） */
  age40OrOver: boolean;
  /** 配偶者控除の対象となる配偶者がいるか（本人の所得900万円以下を前提） */
  hasSpouse: boolean;
  /** 扶養親族の人数（16歳以上・一般扶養として概算） */
  dependents: number;
}

export interface FukugyoResult {
  /** 本業給与年収 */
  mainIncome: number;
  /** 副業所得 */
  subIncome: number;
  /** 確定申告が必要か（副業所得20万円超） */
  needsFiling: boolean;
  /** 本業のみの所得税（復興特別所得税込み） */
  baseIncomeTax: number;
  /** 本業のみの住民税 */
  baseResidentTax: number;
  /** 合算後（本業＋副業）の所得税 */
  combinedIncomeTax: number;
  /** 合算後（本業＋副業）の住民税 */
  combinedResidentTax: number;
  /** 副業による追加所得税 */
  additionalIncomeTax: number;
  /** 副業による追加住民税（翌年課税） */
  additionalResidentTax: number;
  /** 副業による追加税合計 */
  totalAdditionalTax: number;
  /** 副業所得に対する実効税率（追加税÷副業所得） */
  effectiveTaxRate: number;
}

/** 副業所得を加えた場合の所得税・住民税を計算する内部関数。 */
function calcCombinedTax(
  mainIncome: number,
  subIncome: number,
  age40OrOver: boolean,
  hasSpouse: boolean,
  dependents: number,
): { incomeTax: number; residentTax: number } {
  const si = calcSocialInsurance(mainIncome, age40OrOver);
  const sub = Math.max(0, Math.floor(subIncome));

  // 給与所得（本業）
  const kyuyoShotoku = Math.max(0, mainIncome - kyuyoShotokuKojo(mainIncome));
  // 合計所得金額（給与所得＋副業雑所得）
  const goukeiShotoku = kyuyoShotoku + sub;

  // 所得税の計算
  const kiso = kisoKojoIncomeTax(goukeiShotoku);
  const spouseDeduction = hasSpouse ? 380_000 : 0;
  const dependentDeduction = Math.max(0, dependents) * 380_000;
  const deductions = si.total + kiso + spouseDeduction + dependentDeduction;
  const taxable = Math.floor(Math.max(0, goukeiShotoku - deductions) / 1000) * 1000;
  const baseIT = Math.floor(incomeTaxByBracket(taxable));
  const incomeTax = baseIT + Math.floor(baseIT * RATES.reconstructionRate);

  // 住民税の計算
  const residentDed =
    si.total +
    RATES.residentBasicDeduction +
    (hasSpouse ? RATES.residentDependentDeduction : 0) +
    Math.max(0, dependents) * RATES.residentDependentDeduction;
  const residentTaxable = Math.floor(Math.max(0, goukeiShotoku - residentDed) / 1000) * 1000;
  const incomeBased = Math.floor(residentTaxable * RATES.residentRate);
  const residentTax = residentTaxable > 0 ? incomeBased + RATES.residentPerCapita : 0;

  return { incomeTax, residentTax };
}

/** 副業の確定申告要否と追加税額を概算する。 */
export function calcFukugyo(input: FukugyoInput): FukugyoResult {
  const main = Math.max(0, Math.floor(input.mainIncome));
  const sub = Math.max(0, Math.floor(input.subIncome));

  // 確定申告要否（雑所得20万円超）
  const needsFiling = sub > 200_000;

  // 本業のみの税額
  const base = calcTedori({
    annualIncome: main,
    age40OrOver: input.age40OrOver,
    hasSpouse: input.hasSpouse,
    dependents: input.dependents,
  });

  // 合算後（本業＋副業）の税額
  const combined = calcCombinedTax(
    main,
    sub,
    input.age40OrOver,
    input.hasSpouse,
    input.dependents,
  );

  const additionalIncomeTax = Math.max(0, combined.incomeTax - base.incomeTax);
  const additionalResidentTax = Math.max(0, combined.residentTax - base.residentTax);
  const totalAdditionalTax = additionalIncomeTax + additionalResidentTax;

  return {
    mainIncome: main,
    subIncome: sub,
    needsFiling,
    baseIncomeTax: base.incomeTax,
    baseResidentTax: base.residentTax,
    combinedIncomeTax: combined.incomeTax,
    combinedResidentTax: combined.residentTax,
    additionalIncomeTax,
    additionalResidentTax,
    totalAdditionalTax,
    effectiveTaxRate: sub > 0 ? totalAdditionalTax / sub : 0,
  };
}
