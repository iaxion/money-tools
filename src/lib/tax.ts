/**
 * 給与の手取り概算エンジン（日本）
 *
 * 対象年度: 2025年(令和7年)分の所得税・住民税・社会保険料率に基づく概算。
 *
 * 主な前提（概算のため実際の給与明細とは数千円〜数万円ずれる場合があります）:
 *  - 社会保険は「協会けんぽ 東京支部 2025年度(令和7年度)」の料率を使用。
 *  - 健康保険・厚生年金は本来「標準報酬月額」の等級表で決まるが、
 *    ここでは年収に料率を直接適用し、上限のみ反映する簡略計算。
 *  - 賞与の社会保険上限（賞与ごとの上限）は簡略化し年収に含めて計算。
 *  - 住民税は所得割10%＋均等割5,000円。調整控除は省略（概算）。
 *  - 各種控除は基礎控除・社会保険料控除・配偶者控除・扶養控除(一般)のみ考慮。
 *  - 所得税には復興特別所得税(2.1%)を含む。
 *
 * 料率は RATES にまとめてあるので、年度更新時はここだけ変更すれば済む。
 */

export interface TedoriInput {
  /** 額面年収（賞与込みの総支給額・円） */
  annualIncome: number;
  /** 40歳以上64歳以下か（介護保険の対象） */
  age40OrOver: boolean;
  /** 配偶者控除の対象となる配偶者がいるか（本人の所得900万円以下を前提） */
  hasSpouse: boolean;
  /** 扶養親族の人数（16歳以上・一般扶養として概算） */
  dependents: number;
}

export interface TedoriResult {
  /** 額面年収 */
  annualIncome: number;
  /** 健康保険料（介護保険込み・本人負担） */
  healthInsurance: number;
  /** 厚生年金保険料（本人負担） */
  pension: number;
  /** 雇用保険料（本人負担） */
  employmentInsurance: number;
  /** 社会保険料合計（本人負担） */
  socialInsuranceTotal: number;
  /** 所得税（復興特別所得税込み・年額） */
  incomeTax: number;
  /** 住民税（年額） */
  residentTax: number;
  /** 控除合計（社会保険＋税） */
  totalDeductions: number;
  /** 手取り年額 */
  takeHomeAnnual: number;
  /** 手取り月額（年額 ÷ 12） */
  takeHomeMonthly: number;
  /** 手取り率（手取り ÷ 額面） */
  takeHomeRate: number;
}

/** 2025年度(令和7年度)の料率・上限 */
export const RATES = {
  /** 健康保険料率（協会けんぽ東京・全額。本人はこの半分） */
  health: 0.0991,
  /** 健康＋介護保険料率（40歳以上・全額。本人はこの半分） */
  healthWithCare: 0.115,
  /** 厚生年金保険料率（全額。本人はこの半分） */
  pension: 0.183,
  /** 雇用保険料率（一般の事業・本人負担分） */
  employment: 0.0055,
  /** 厚生年金の標準報酬月額の上限 */
  pensionMonthlyCap: 650_000,
  /** 健康保険の標準報酬月額の上限 */
  healthMonthlyCap: 1_390_000,
  /** 住民税 均等割（標準・森林環境税込み） */
  residentPerCapita: 5_000,
  /** 住民税 所得割の税率 */
  residentRate: 0.1,
  /** 住民税の基礎控除 */
  residentBasicDeduction: 430_000,
  /** 住民税の配偶者控除・扶養控除(一般) */
  residentDependentDeduction: 330_000,
  /** 復興特別所得税率 */
  reconstructionRate: 0.021,
} as const;

/** 給与所得控除（2025年改正後）。給与収入から差し引く。 */
export function kyuyoShotokuKojo(income: number): number {
  if (income <= 1_900_000) return Math.min(income, 650_000);
  if (income <= 3_600_000) return income * 0.3 + 80_000;
  if (income <= 6_600_000) return income * 0.2 + 440_000;
  if (income <= 8_500_000) return income * 0.1 + 1_100_000;
  return 1_950_000;
}

/**
 * 所得税の基礎控除（2025・2026年分の特例上乗せを含む）。
 * 合計所得金額（＝給与所得）に応じて段階的に変動する。
 */
export function kisoKojoIncomeTax(goukeiShotoku: number): number {
  if (goukeiShotoku <= 1_320_000) return 950_000;
  if (goukeiShotoku <= 3_360_000) return 880_000;
  if (goukeiShotoku <= 4_890_000) return 680_000;
  if (goukeiShotoku <= 6_550_000) return 630_000;
  if (goukeiShotoku <= 23_500_000) return 580_000;
  if (goukeiShotoku <= 24_000_000) return 480_000;
  if (goukeiShotoku <= 24_500_000) return 320_000;
  if (goukeiShotoku <= 25_000_000) return 160_000;
  return 0;
}

/** 所得税の累進税率による税額（復興税を含まない）。課税所得は1,000円未満切り捨て済みを想定。 */
export function incomeTaxByBracket(taxable: number): number {
  const brackets: [limit: number, rate: number, deduction: number][] = [
    [1_950_000, 0.05, 0],
    [3_300_000, 0.1, 97_500],
    [6_950_000, 0.2, 427_500],
    [9_000_000, 0.23, 636_000],
    [18_000_000, 0.33, 1_536_000],
    [40_000_000, 0.4, 2_796_000],
    [Infinity, 0.45, 4_796_000],
  ];
  for (const [limit, rate, deduction] of brackets) {
    if (taxable <= limit) return Math.max(0, taxable * rate - deduction);
  }
  return 0;
}

/** 社会保険料（本人負担・年額）を概算する。手取り計算・ふるさと納税計算で共用。 */
export function calcSocialInsurance(
  annualIncome: number,
  age40OrOver: boolean,
): { health: number; pension: number; employment: number; total: number } {
  const income = Math.max(0, Math.floor(annualIncome));
  const healthRate = age40OrOver ? RATES.healthWithCare : RATES.health;
  const healthBase = Math.min(income, RATES.healthMonthlyCap * 12);
  const health = Math.floor((healthBase * healthRate) / 2);

  const pensionBase = Math.min(income, RATES.pensionMonthlyCap * 12);
  const pension = Math.floor((pensionBase * RATES.pension) / 2);

  const employment = Math.floor(income * RATES.employment);

  return { health, pension, employment, total: health + pension + employment };
}

/** 給与の手取りを概算する。 */
export function calcTedori(input: TedoriInput): TedoriResult {
  const income = Math.max(0, Math.floor(input.annualIncome));
  const dependents = Math.max(0, Math.floor(input.dependents));

  // --- 社会保険料（本人負担） ---
  const si = calcSocialInsurance(income, input.age40OrOver);
  const healthInsurance = si.health;
  const pension = si.pension;
  const employmentInsurance = si.employment;
  const socialInsuranceTotal = si.total;

  // --- 給与所得 ---
  const goukeiShotoku = Math.max(0, income - kyuyoShotokuKojo(income));

  // --- 所得税 ---
  const kiso = kisoKojoIncomeTax(goukeiShotoku);
  const spouseDeduction = input.hasSpouse ? 380_000 : 0;
  const dependentDeduction = dependents * 380_000;
  const incomeTaxDeductions =
    socialInsuranceTotal + kiso + spouseDeduction + dependentDeduction;
  const taxableIncome =
    Math.floor(Math.max(0, goukeiShotoku - incomeTaxDeductions) / 1000) * 1000;
  const baseIncomeTax = Math.floor(incomeTaxByBracket(taxableIncome));
  const incomeTax =
    baseIncomeTax + Math.floor(baseIncomeTax * RATES.reconstructionRate);

  // --- 住民税（所得割＋均等割） ---
  const residentDeductions =
    socialInsuranceTotal +
    RATES.residentBasicDeduction +
    (input.hasSpouse ? RATES.residentDependentDeduction : 0) +
    dependents * RATES.residentDependentDeduction;
  const residentTaxable =
    Math.floor(Math.max(0, goukeiShotoku - residentDeductions) / 1000) * 1000;
  const incomeBased = Math.floor(residentTaxable * RATES.residentRate);
  const residentTax =
    residentTaxable > 0 ? incomeBased + RATES.residentPerCapita : 0;

  // --- 集計 ---
  const totalDeductions = socialInsuranceTotal + incomeTax + residentTax;
  const takeHomeAnnual = income - totalDeductions;

  return {
    annualIncome: income,
    healthInsurance,
    pension,
    employmentInsurance,
    socialInsuranceTotal,
    incomeTax,
    residentTax,
    totalDeductions,
    takeHomeAnnual,
    takeHomeMonthly: Math.floor(takeHomeAnnual / 12),
    takeHomeRate: income > 0 ? takeHomeAnnual / income : 0,
  };
}

/** 円のカンマ区切り表記 */
export function yen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}
