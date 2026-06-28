#!/usr/bin/env node
/**
 * 制度データ（税率・社会保険料率）の鮮度チェック。
 *
 * src/lib/freshness.ts の reviewDue（次回見直し推奨日）を読み取り、
 * 現在日がそれを過ぎていれば警告を出す。CI とローカルの両方から使える。
 *
 *   node scripts/check-freshness.mjs
 *
 * 終了コード:
 *   0 = 期限内（OK）
 *   1 = 期限切れ（要レビュー）  ※CI ではビルドを止めず警告のみに使う
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/lib/freshness.ts'), 'utf8');

const pick = (key) => (src.match(new RegExp(`${key}:\\s*'([^']+)'`)) || [])[1];
const reviewDue = pick('reviewDue');
const lastReviewed = pick('lastReviewed');
const fiscalYear = pick('fiscalYear');

if (!reviewDue) {
  console.error('freshness.ts から reviewDue を読み取れませんでした。');
  process.exit(1);
}

const now = new Date();
const due = new Date(reviewDue);
const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);

console.log(`制度データ: ${fiscalYear} / 最終確認 ${lastReviewed} / 見直し期限 ${reviewDue}`);

if (days < 0) {
  console.warn(`⚠️  見直し期限を ${-days} 日超過しています。税率・料率の最新確認が必要です（AUTONOMY.md 参照）。`);
  process.exit(1);
}
if (days <= 30) {
  console.warn(`⏰ 見直し期限まであと ${days} 日。改定期（社会保険=4月 / 税制=年末→翌年）に注意。`);
}
console.log('✅ 鮮度OK。');
process.exit(0);
