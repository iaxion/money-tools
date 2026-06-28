/**
 * 時給から日給・月収・年収を換算する（額面ベース）。
 * 残業・各種手当・社会保険料・税金は含まない単純換算。手取りは別途「手取り計算」ツールを参照。
 */

export interface WageInput {
  /** 時給（円） */
  hourly: number;
  /** 1日の労働時間（時間） */
  hoursPerDay: number;
  /** 1か月の労働日数（日） */
  daysPerMonth: number;
}

export interface WageResult {
  daily: number;
  monthly: number;
  annual: number;
}

export function fromHourly(input: WageInput): WageResult {
  const hourly = Math.max(0, input.hourly);
  const hoursPerDay = Math.max(0, input.hoursPerDay);
  const daysPerMonth = Math.max(0, input.daysPerMonth);
  const daily = hourly * hoursPerDay;
  const monthly = daily * daysPerMonth;
  const annual = monthly * 12;
  return {
    daily: Math.round(daily),
    monthly: Math.round(monthly),
    annual: Math.round(annual),
  };
}
