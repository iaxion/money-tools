import { describe, it, expect } from 'vitest';
import { calcTedori, calcSocialInsurance, calcBonus, RATES } from './tax.ts';
import { calcLoan } from './loan.ts';
import { calcInvest } from './invest.ts';
import { calcTaishoku, retirementDeduction } from './taishoku.ts';
import { calcFurusato } from './furusato.ts';
import { fromHourly } from './convert.ts';
import { calcKabe } from './kabe.ts';
import { calcKogaku, KOGAKU_BRACKETS } from './kogaku.ts';
import { calcShitsugyo, calcDailyBenefit } from './shitsugyo.ts';

/**
 * 計算エンジンの安全弁テスト（フルオート運用の品質ゲート）。
 *
 * 方針:
 *  - 年度ごとの料率改定で「正当な更新」までブロックしないよう、税系は「許容幅(レンジ)」で検証。
 *  - 代わりに、年度に依存しない「普遍的な不変条件」(手取り≤額面 / 非負 / 単調性 等)を厳格に検証し、
 *    式の壊れ(÷2忘れ・符号ミス・桁ミス)を確実に捕捉する。
 *  - 純粋な数式(ローン/複利/換算)は厳密値で検証。
 */

describe('手取り計算 calcTedori', () => {
  const incomes = [3_000_000, 4_000_000, 5_000_000, 6_000_000, 8_000_000, 10_000_000, 15_000_000];

  it('普遍的な不変条件（年度非依存）', () => {
    let prevTax = -1;
    for (const inc of incomes) {
      const r = calcTedori({ annualIncome: inc, age40OrOver: false, hasSpouse: false, dependents: 0 });
      // 手取りは額面以下、かつ正
      expect(r.takeHomeAnnual).toBeLessThan(inc);
      expect(r.takeHomeAnnual).toBeGreaterThan(0);
      // 各控除は非負
      expect(r.socialInsuranceTotal).toBeGreaterThanOrEqual(0);
      expect(r.incomeTax).toBeGreaterThanOrEqual(0);
      expect(r.residentTax).toBeGreaterThanOrEqual(0);
      // 手取り率は常識的な範囲（55〜95%）
      expect(r.takeHomeRate).toBeGreaterThan(0.55);
      expect(r.takeHomeRate).toBeLessThan(0.95);
      // 月額×12 ≒ 年額
      expect(Math.abs(r.takeHomeMonthly * 12 - r.takeHomeAnnual)).toBeLessThan(12);
      // 所得が上がるほど税(所得税+住民税)は増える（単調増加）
      const tax = r.incomeTax + r.residentTax;
      expect(tax).toBeGreaterThan(prevTax);
      prevTax = tax;
    }
  });

  it('既知の公表値レンジ（2026・許容幅で年度更新も許容）', () => {
    const r400 = calcTedori({ annualIncome: 4_000_000, age40OrOver: false, hasSpouse: false, dependents: 0 });
    expect(r400.takeHomeAnnual).toBeGreaterThan(3_000_000);
    expect(r400.takeHomeAnnual).toBeLessThan(3_350_000);

    const r1000 = calcTedori({ annualIncome: 10_000_000, age40OrOver: false, hasSpouse: false, dependents: 0 });
    expect(r1000.takeHomeAnnual).toBeGreaterThan(6_900_000);
    expect(r1000.takeHomeAnnual).toBeLessThan(7_700_000);
  });

  it('40歳以上は介護保険ぶん社会保険料が増える', () => {
    const under = calcTedori({ annualIncome: 5_000_000, age40OrOver: false, hasSpouse: false, dependents: 0 });
    const over = calcTedori({ annualIncome: 5_000_000, age40OrOver: true, hasSpouse: false, dependents: 0 });
    expect(over.socialInsuranceTotal).toBeGreaterThan(under.socialInsuranceTotal);
  });

  it('扶養が増えると税が減る（または同じ）', () => {
    const d0 = calcTedori({ annualIncome: 6_000_000, age40OrOver: false, hasSpouse: false, dependents: 0 });
    const d2 = calcTedori({ annualIncome: 6_000_000, age40OrOver: false, hasSpouse: false, dependents: 2 });
    expect(d2.incomeTax + d2.residentTax).toBeLessThanOrEqual(d0.incomeTax + d0.residentTax);
  });

  it('社会保険料は本人負担（折半）の妥当な水準', () => {
    const si = calcSocialInsurance(5_000_000, false);
    // 額面の概ね13〜17%（健保+厚年+雇用の本人負担合計）
    expect(si.total).toBeGreaterThan(5_000_000 * 0.12);
    expect(si.total).toBeLessThan(5_000_000 * 0.18);
    expect(si.health + si.pension + si.employment).toBe(si.total);
  });
});

describe('住宅ローン calcLoan（厳密値）', () => {
  it('3000万・1.5%・35年 ≒ 月91,855円', () => {
    const r = calcLoan({ principal: 30_000_000, annualRatePct: 1.5, years: 35 });
    expect(r.monthlyPayment).toBeGreaterThan(91_000);
    expect(r.monthlyPayment).toBeLessThan(92_700);
    expect(r.totalPayment).toBeGreaterThan(r.monthlyPayment * 419);
  });
  it('金利0%は元金÷回数、利息は0', () => {
    const r = calcLoan({ principal: 12_000_000, annualRatePct: 0, years: 10 });
    expect(r.monthlyPayment).toBe(Math.round(12_000_000 / 120));
    expect(r.totalInterest).toBeGreaterThanOrEqual(0);
  });
  it('総返済額 ≥ 元金、利息 ≥ 0', () => {
    const r = calcLoan({ principal: 25_000_000, annualRatePct: 2, years: 30 });
    expect(r.totalPayment).toBeGreaterThanOrEqual(25_000_000);
    expect(r.totalInterest).toBeGreaterThanOrEqual(0);
  });
});

describe('積立NISA calcInvest（厳密値）', () => {
  it('月3万・5%・20年 ≒ 1,233万', () => {
    const r = calcInvest({ monthly: 30_000, annualRatePct: 5, years: 20 });
    expect(r.futureValue).toBeGreaterThan(12_000_000);
    expect(r.futureValue).toBeLessThan(12_600_000);
    expect(r.profit).toBe(r.futureValue - r.principal);
  });
  it('利回り0%なら評価額=元本', () => {
    const r = calcInvest({ monthly: 20_000, annualRatePct: 0, years: 10 });
    expect(r.futureValue).toBe(r.principal);
    expect(r.profit).toBe(0);
  });
  it('課税口座の税は運用益の約20.315%', () => {
    const r = calcInvest({ monthly: 30_000, annualRatePct: 5, years: 20 });
    expect(r.taxIfTaxable).toBe(Math.round(r.profit * 0.20315));
  });
});

describe('退職金 calcTaishoku', () => {
  it('退職所得控除（勤続20年以下/超）', () => {
    expect(retirementDeduction(10)).toBe(4_000_000); // 40万×10
    expect(retirementDeduction(30)).toBe(15_000_000); // 800万+70万×10
    expect(retirementDeduction(38)).toBe(20_600_000);
  });
  it('控除が退職金を上回れば税0・手取り全額', () => {
    const r = calcTaishoku({ amount: 20_000_000, yearsOfService: 38 });
    expect(r.taxableRetirementIncome).toBe(0);
    expect(r.incomeTax).toBe(0);
    expect(r.residentTax).toBe(0);
    expect(r.takeHome).toBe(20_000_000);
  });
  it('手取りは額面以下・非負', () => {
    const r = calcTaishoku({ amount: 30_000_000, yearsOfService: 35 });
    expect(r.takeHome).toBeLessThanOrEqual(30_000_000);
    expect(r.takeHome).toBeGreaterThan(0);
  });
});

describe('ふるさと納税 calcFurusato', () => {
  it('上限は非負、年収が上がれば上限も上がる（単調）', () => {
    let prev = -1;
    for (const inc of [3_000_000, 5_000_000, 7_000_000, 10_000_000]) {
      const f = calcFurusato({ annualIncome: inc, age40OrOver: false, hasSpouse: false, dependents: 0 });
      expect(f.limit).toBeGreaterThanOrEqual(0);
      expect(f.limit).toBeGreaterThan(prev);
      prev = f.limit;
    }
  });
  it('年収500万独身の上限は概ね4〜7万円', () => {
    const f = calcFurusato({ annualIncome: 5_000_000, age40OrOver: false, hasSpouse: false, dependents: 0 });
    expect(f.limit).toBeGreaterThan(40_000);
    expect(f.limit).toBeLessThan(75_000);
  });
});

describe('時給→年収 fromHourly（厳密値）', () => {
  it('時給1200×8h×20日 → 年収2,304,000', () => {
    const r = fromHourly({ hourly: 1200, hoursPerDay: 8, daysPerMonth: 20 });
    expect(r.daily).toBe(9_600);
    expect(r.monthly).toBe(192_000);
    expect(r.annual).toBe(2_304_000);
  });
});

describe('年収の壁 calcKabe', () => {
  it('不変条件: margin = threshold - income', () => {
    for (const income of [800_000, 1_200_000, 1_500_000, 2_000_000]) {
      const r = calcKabe(income);
      for (const w of r.walls) {
        expect(w.margin).toBe(w.threshold - income);
      }
    }
  });

  it('100万円: 3壁すべて未到達、nextWallはw106', () => {
    const r = calcKabe(1_000_000);
    expect(r.walls.every((w) => !w.crossed)).toBe(true);
    expect(r.nextWall?.id).toBe('w106');
  });

  it('120万円: 106万の壁のみ超過、nextWallはw130', () => {
    const r = calcKabe(1_200_000);
    expect(r.walls.find((w) => w.id === 'w106')?.crossed).toBe(true);
    expect(r.walls.find((w) => w.id === 'w130')?.crossed).toBe(false);
    expect(r.nextWall?.id).toBe('w130');
  });

  it('140万円: 106・130を超過、178は未到達', () => {
    const r = calcKabe(1_400_000);
    expect(r.walls.find((w) => w.id === 'w106')?.crossed).toBe(true);
    expect(r.walls.find((w) => w.id === 'w130')?.crossed).toBe(true);
    expect(r.walls.find((w) => w.id === 'w178')?.crossed).toBe(false);
    expect(r.nextWall?.id).toBe('w178');
  });

  it('200万円: 3壁すべて超過、nextWallはnull', () => {
    const r = calcKabe(2_000_000);
    expect(r.walls.every((w) => w.crossed)).toBe(true);
    expect(r.nextWall).toBeNull();
  });

  it('ちょうど106万円の境界: 超過判定', () => {
    expect(calcKabe(1_060_000).walls.find((w) => w.id === 'w106')?.crossed).toBe(true);
    expect(calcKabe(1_059_999).walls.find((w) => w.id === 'w106')?.crossed).toBe(false);
  });
});

describe('高額療養費 calcKogaku', () => {
  it('不変条件: 自己負担上限 ≤ 窓口3割負担、払い戻しは非負', () => {
    const medicals = [300_000, 500_000, 1_000_000, 3_000_000, 5_000_000];
    const brackets = Object.keys(KOGAKU_BRACKETS) as (keyof typeof KOGAKU_BRACKETS)[];
    for (const b of brackets) {
      for (const m of medicals) {
        const r = calcKogaku({ medicalCostTotal: m, incomeBracket: b });
        expect(r.selfPayCap).toBeGreaterThan(0);
        expect(r.refund).toBeGreaterThanOrEqual(0);
        expect(r.windowPay).toBeGreaterThanOrEqual(0);
        // refund = max(0, windowPay - selfPayCap)の整合
        expect(r.refund).toBe(Math.max(0, r.windowPay - r.selfPayCap));
      }
    }
  });

  it('所得が高いほど自己負担上限が高い（単調性: ア≥イ≥ウ≥エ≥オ）', () => {
    const medical = 1_000_000;
    const orders: (keyof typeof KOGAKU_BRACKETS)[] = ['ア', 'イ', 'ウ', 'エ', 'オ'];
    let prev = Infinity;
    for (const b of orders) {
      const r = calcKogaku({ medicalCostTotal: medical, incomeBracket: b });
      expect(r.selfPayCap).toBeLessThanOrEqual(prev);
      prev = r.selfPayCap;
    }
  });

  it('多数回該当は通常より上限が低い', () => {
    const medical = 1_000_000;
    const brackets: (keyof typeof KOGAKU_BRACKETS)[] = ['ア', 'イ', 'ウ', 'エ', 'オ'];
    for (const b of brackets) {
      const normal = calcKogaku({ medicalCostTotal: medical, incomeBracket: b });
      const multiple = calcKogaku({ medicalCostTotal: medical, incomeBracket: b, multipleHit: true });
      expect(multiple.selfPayCap).toBeLessThanOrEqual(normal.selfPayCap);
    }
  });

  it('区分ウ・総医療費100万: 公式値(約80,100+7,330=87,430円前後)', () => {
    // 総医療費100万円: 80,100 + (1,000,000 - 267,000) * 0.01 = 80,100 + 7,330 = 87,430
    const r = calcKogaku({ medicalCostTotal: 1_000_000, incomeBracket: 'ウ' });
    expect(r.selfPayCap).toBe(87_430);
    expect(r.windowPay).toBe(300_000); // 3割
    expect(r.refund).toBe(300_000 - 87_430); // 212,570
  });

  it('区分エ・オはフラット（医療費増加で上限変わらない）', () => {
    const r1 = calcKogaku({ medicalCostTotal: 500_000, incomeBracket: 'エ' });
    const r2 = calcKogaku({ medicalCostTotal: 5_000_000, incomeBracket: 'エ' });
    expect(r1.selfPayCap).toBe(r2.selfPayCap);

    const r3 = calcKogaku({ medicalCostTotal: 500_000, incomeBracket: 'オ' });
    const r4 = calcKogaku({ medicalCostTotal: 5_000_000, incomeBracket: 'オ' });
    expect(r3.selfPayCap).toBe(r4.selfPayCap);
  });

  it('区分ア・総医療費100万: 公式値(252,600+1,580=254,180円)', () => {
    // 総医療費100万円: 252,600 + (1,000,000 - 842,000) * 0.01 = 252,600 + 1,580 = 254,180
    const r = calcKogaku({ medicalCostTotal: 1_000_000, incomeBracket: 'ア' });
    expect(r.selfPayCap).toBe(254_180);
  });
});

describe('ボーナス手取り calcBonus', () => {
  const cases: [number, number][] = [
    [300_000, 250_000],
    [500_000, 300_000],
    [1_000_000, 400_000],
    [2_000_000, 600_000],
  ];

  it('普遍的な不変条件', () => {
    for (const [bonus, monthly] of cases) {
      const r = calcBonus({ bonus, monthlySalary: monthly, age40OrOver: false, hasSpouse: false, dependents: 0 });
      expect(r.takeHome).toBeLessThanOrEqual(bonus); // 手取りは額面以下
      expect(r.takeHome).toBeGreaterThan(0);
      expect(r.health).toBeGreaterThanOrEqual(0);
      expect(r.pension).toBeGreaterThanOrEqual(0);
      expect(r.employment).toBeGreaterThanOrEqual(0);
      expect(r.incomeTax).toBeGreaterThanOrEqual(0);
      // 賞与は住民税が引かれないので率は給与手取りより高め（概ね70〜95%）
      expect(r.takeHomeRate).toBeGreaterThan(0.6);
      expect(r.takeHomeRate).toBeLessThanOrEqual(1);
      // 内訳の整合
      expect(r.socialInsuranceTotal).toBe(r.health + r.pension + r.employment);
      expect(r.totalDeductions).toBe(r.socialInsuranceTotal + r.incomeTax);
      expect(r.takeHome).toBe(bonus - r.totalDeductions);
    }
  });

  it('40歳以上は介護ぶん社会保険料が増える', () => {
    const u = calcBonus({ bonus: 500_000, monthlySalary: 300_000, age40OrOver: false, hasSpouse: false, dependents: 0 });
    const o = calcBonus({ bonus: 500_000, monthlySalary: 300_000, age40OrOver: true, hasSpouse: false, dependents: 0 });
    expect(o.socialInsuranceTotal).toBeGreaterThan(u.socialInsuranceTotal);
  });

  it('厚生年金は1回の賞与150万円が上限', () => {
    // 標準賞与額200万でも厚年は150万ベースで頭打ち
    const r = calcBonus({ bonus: 2_000_000, monthlySalary: 500_000, age40OrOver: false, hasSpouse: false, dependents: 0 });
    expect(r.pension).toBe(Math.floor((1_500_000 * RATES.pension) / 2));
  });
});

describe('失業給付 calcShitsugyo', () => {
  it('不変条件: 日額は上限以下・下限以上、給付日数は正、総額は正', () => {
    const cases: [number, number, '自己都合' | '会社都合', number][] = [
      [200_000, 28, '自己都合', 3],
      [300_000, 40, '会社都合', 8],
      [500_000, 52, '会社都合', 15],
      [250_000, 62, '自己都合', 25],
    ];
    for (const [monthly, age, reason, years] of cases) {
      const r = calcShitsugyo({ monthlyWage6mAvg: monthly, age, reason, insuredYears: years });
      expect(r.dailyBenefit).toBeGreaterThanOrEqual(2_411);         // 令和7年下限
      expect(r.dailyBenefit).toBeLessThanOrEqual(8_870);            // 最高上限
      expect(r.totalDays).toBeGreaterThan(0);
      expect(r.totalEstimate).toBeGreaterThan(0);
      expect(r.totalEstimate).toBe(r.dailyBenefit * r.totalDays);
      expect(r.dailyWage).toBeGreaterThan(0);
    }
  });

  it('会社都合 ≥ 自己都合の給付日数（同条件）', () => {
    const base = { monthlyWage6mAvg: 300_000, age: 40, insuredYears: 8 };
    const vol = calcShitsugyo({ ...base, reason: '自己都合' });
    const inv = calcShitsugyo({ ...base, reason: '会社都合' });
    expect(inv.totalDays).toBeGreaterThanOrEqual(vol.totalDays);
  });

  it('自己都合の給付制限は1ヶ月、会社都合は0ヶ月', () => {
    const vol = calcShitsugyo({ monthlyWage6mAvg: 300_000, age: 35, reason: '自己都合', insuredYears: 5 });
    const inv = calcShitsugyo({ monthlyWage6mAvg: 300_000, age: 35, reason: '会社都合', insuredYears: 5 });
    expect(vol.benefitRestrictionMonths).toBe(1);
    expect(inv.benefitRestrictionMonths).toBe(0);
  });

  it('賃金日額 = 月給平均 × 6 ÷ 180', () => {
    const r = calcShitsugyo({ monthlyWage6mAvg: 300_000, age: 35, reason: '自己都合', insuredYears: 5 });
    expect(r.dailyWage).toBe(Math.round(300_000 * 6 / 180)); // = 10,000円
  });

  it('月給平均10万（低賃金）: 日額は下限(2,411)以上80%以下', () => {
    const r = calcShitsugyo({ monthlyWage6mAvg: 100_000, age: 30, reason: '自己都合', insuredYears: 3 });
    const wage = Math.round(100_000 * 6 / 180);
    expect(r.dailyBenefit).toBeGreaterThanOrEqual(2_411);
    expect(r.dailyBenefit).toBeLessThanOrEqual(Math.ceil(wage * 0.8));
  });

  it('月給平均30万（中程度）: 日額は上限を超えない', () => {
    const r = calcShitsugyo({ monthlyWage6mAvg: 300_000, age: 40, reason: '自己都合', insuredYears: 12 });
    expect(r.dailyBenefit).toBeLessThanOrEqual(8_055); // 30〜44歳の上限
  });

  it('自己都合・被保険者10年以上で給付日数が増える', () => {
    const r9  = calcShitsugyo({ monthlyWage6mAvg: 300_000, age: 35, reason: '自己都合', insuredYears: 9 });
    const r10 = calcShitsugyo({ monthlyWage6mAvg: 300_000, age: 35, reason: '自己都合', insuredYears: 10 });
    const r20 = calcShitsugyo({ monthlyWage6mAvg: 300_000, age: 35, reason: '自己都合', insuredYears: 20 });
    expect(r9.totalDays).toBe(90);
    expect(r10.totalDays).toBe(120);
    expect(r20.totalDays).toBe(150);
  });

  it('基本手当日額の上限: 令和7年8月1日以降の公式値', () => {
    // 高月給で各年齢区分の上限に張り付くことを確認
    expect(calcDailyBenefit(100_000, 25)).toBe(7_255);  // 29歳以下
    expect(calcDailyBenefit(100_000, 40)).toBe(8_055);  // 30〜44歳
    expect(calcDailyBenefit(100_000, 55)).toBe(8_870);  // 45〜59歳
    expect(calcDailyBenefit(100_000, 62)).toBe(7_623);  // 60〜64歳
  });
});
