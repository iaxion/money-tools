/**
 * 年収の壁 判定（日本・2026年時点）
 *
 * 対象: 短時間労働者・パートタイマーが知っておくべき主要な「年収の壁」。
 * - 106万円：短時間労働者の社会保険適用拡大（健保・厚年）
 * - 130万円：健康保険の被扶養者認定の年収上限
 * - 178万円：2026年（令和8年）税制改正後の所得税課税最低限
 *
 * 配偶者控除の判定基準（103万/150万/201万等）は2026年税制改正で見直しがあり
 * 公式確定値を確認中のため本関数では扱わない。
 */

export interface KabeWall {
  id: string;
  label: string;
  threshold: number;
  /** true = 年収がこの壁を超えている */
  crossed: boolean;
  /** threshold - annualIncome: 正=あと○円、負=○円超過 */
  margin: number;
  description: string;
  /** 壁を超えたときの主な影響 */
  impact: string;
}

export interface KabeResult {
  annualIncome: number;
  walls: KabeWall[];
  /** 直近の未超過の壁（最も近いNext Wall）。すべて超えている場合はnull */
  nextWall: KabeWall | null;
}

const WALL_DEFS: Omit<KabeWall, 'crossed' | 'margin'>[] = [
  {
    id: 'w106',
    label: '106万円の壁',
    threshold: 1_060_000,
    description:
      '週20時間以上・月賃金88,000円以上などの条件を満たす短時間労働者は、51人以上の企業に勤める場合に健康保険・厚生年金の加入義務が生じます（2024年10月〜）。',
    impact: '社会保険に加入 → 手取りが減るが、将来の年金・医療保険の保障が厚くなる',
  },
  {
    id: 'w130',
    label: '130万円の壁',
    threshold: 1_300_000,
    description:
      '配偶者や親の健康保険の被扶養者として認定される年収の上限（60歳未満の場合）。130万円以上になると扶養から外れ、自分で健康保険（国保または職場の社保）に加入する必要があります。',
    impact: '扶養から外れ → 国保保険料または社会保険料の自己負担が発生',
  },
  {
    id: 'w178',
    label: '178万円の壁',
    threshold: 1_780_000,
    description:
      '2026年（令和8年）の税制改正後に所得税がかかり始める目安。給与所得控除の最低保障74万円＋基礎控除104万円＝178万円が新たな課税最低限です（2026年・2027年の特例措置）。',
    impact: '所得税の納付が必要になる（住民税は93万円前後から発生するケースあり）',
  },
];

export function calcKabe(annualIncome: number): KabeResult {
  const income = Math.max(0, Math.floor(annualIncome));
  const walls: KabeWall[] = WALL_DEFS.map((w) => ({
    ...w,
    crossed: income >= w.threshold,
    margin: w.threshold - income,
  }));
  const nextWall = walls.find((w) => !w.crossed) ?? null;
  return { annualIncome: income, walls, nextWall };
}
