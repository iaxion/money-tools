// 計算ロジックのテスト網羅チェック（フルオートの安全弁）。
//
// src/lib の「計算関数」(calc* と主要な公開関数) が src/lib/calc.test.ts で
// テストされているかを検査し、未整備があれば CI を失敗させる。
// 自動セッションが「お金のロジックをテスト無しで公開する」構造的劣化を防ぐ。
import { readFileSync, readdirSync } from 'node:fs';

const LIB_DIR = 'src/lib';
const TEST_FILE = 'src/lib/calc.test.ts';

// calc* 以外で必ずテストが要る公開計算関数
const REQUIRED_EXTRA = new Set(['fromHourly', 'retirementDeduction']);
// テスト必須か？（計算の正確性に直結する関数）
const mustBeTested = (name) => name.startsWith('calc') || REQUIRED_EXTRA.has(name);

const test = readFileSync(TEST_FILE, 'utf8');
const missing = [];

for (const file of readdirSync(LIB_DIR)) {
  if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
  const src = readFileSync(`${LIB_DIR}/${file}`, 'utf8');
  const re = /export function ([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    if (!mustBeTested(name)) continue;
    if (!new RegExp(`\\b${name}\\b`).test(test)) {
      missing.push(`${file}: ${name}`);
    }
  }
}

if (missing.length > 0) {
  console.error('❌ テスト未整備の計算関数があります。src/lib/calc.test.ts にテストを追加してください:');
  for (const x of missing) console.error('   - ' + x);
  console.error('（フルオートで誤計算を公開しないための必須ゲートです）');
  process.exit(1);
}
console.log('✅ 計算関数はすべて calc.test.ts でカバーされています。');
