/**
 * 住宅ローン（元利均等返済）シミュレーションエンジン
 *
 * 元利均等返済：毎月の返済額（元金＋利息）が一定になる、最も一般的な返済方式。
 * すべて確定的な計算で、概算ではなく数式どおりの正確な値を返す。
 */

export interface LoanInput {
  /** 借入額（円） */
  principal: number;
  /** 年利（％。例: 1.5 は 1.5%） */
  annualRatePct: number;
  /** 返済年数 */
  years: number;
}

export interface LoanResult {
  months: number;
  /** 毎月の返済額（円） */
  monthlyPayment: number;
  /** 総返済額（円） */
  totalPayment: number;
  /** 利息の総額（円） */
  totalInterest: number;
}

/** 元利均等返済の毎月返済額・総額・利息を計算する。 */
export function calcLoan(input: LoanInput): LoanResult {
  const principal = Math.max(0, input.principal);
  const months = Math.max(1, Math.round(input.years * 12));
  const r = input.annualRatePct / 100 / 12;

  let monthlyPayment: number;
  if (r === 0) {
    monthlyPayment = principal / months;
  } else {
    const pow = Math.pow(1 + r, months);
    monthlyPayment = (principal * r * pow) / (pow - 1);
  }

  const monthly = Math.round(monthlyPayment);
  const totalPayment = monthly * months;

  return {
    months,
    monthlyPayment: monthly,
    totalPayment,
    totalInterest: totalPayment - principal,
  };
}
