// Cloudflare Web Analytics の実トラフィックを取得し docs/scoreboard.md に書き出す。
// AI(戦略家/クリティック/ビルダー)が「どのページに人が来ているか」を読んで
// 伸びてるページを強化・死んでるものを畳む判断に使う＝データ駆動の心臓。
//
// 認証は GitHub Actions の Secret から（自律AIエージェントにはトークンを触らせない）:
//   - CF_ANALYTICS_TOKEN : Cloudflare の「Account Analytics: Read」読み取り専用トークン
//   - CF_ACCOUNT_ID      : Cloudflare アカウントID
// siteTag は公開のビーコンtoken（HTMLに出ている公開値）。
import { writeFileSync } from 'node:fs';

const TOKEN = process.env.CF_ANALYTICS_TOKEN;
const ACCOUNT = process.env.CF_ACCOUNT_ID;
const SITE_TAG = process.env.CF_WEB_ANALYTICS_TAG || 'dcff68068fc24559b495f3f2b263918d';
const OUT = 'docs/scoreboard.md';

const stamp = new Date().toISOString();
const write = (body) =>
  writeFileSync(
    OUT,
    `# スコアボード（実トラフィック）\n\n> 自動生成（GitHub Actions × Cloudflare Web Analytics）。AI はこれを読んで注力先を決める。\n\n${body}\n\n_更新: ${stamp}_\n`,
  );

if (!TOKEN || !ACCOUNT) {
  write('（CF_ANALYTICS_TOKEN / CF_ACCOUNT_ID 未設定のため未取得。GitHub Secret に登録すると計測が入ります。）');
  console.log('secrets 未設定のためプレースホルダを書き出し。');
  process.exit(0);
}

const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
const until = new Date().toISOString().slice(0, 10);
const query = `query Score($a:String!,$s:String!,$since:String!,$until:String!){
  viewer{ accounts(filter:{accountTag:$a}){
    rumPageloadEventsAdaptiveGroups(filter:{siteTag:$s, date_geq:$since, date_leq:$until}, limit:100, orderBy:[count_DESC]){
      count dimensions{ requestPath }
    }
  }}
}`;

try {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { a: ACCOUNT, s: SITE_TAG, since, until } }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
  const g = json.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
  const rows = g.map((x) => ({ path: x.dimensions.requestPath, pv: x.count })).sort((a, b) => b.pv - a.pv);
  const total = rows.reduce((s, r) => s + r.pv, 0);
  let md = `**期間 ${since}〜${until}（過去7日）／合計PV: ${total}**\n\n| ページ | PV |\n| :-- | --: |\n`;
  md += rows.length ? rows.slice(0, 40).map((r) => `| ${r.path} | ${r.pv} |`).join('\n') : '| (まだ訪問なし) | 0 |';
  write(md);
  console.log(`scoreboard 更新: ${rows.length}ページ / 合計${total}PV`);
} catch (e) {
  write(`（取得失敗: ${String(e).slice(0, 300)} — クエリ/権限を確認。）`);
  console.error('取得失敗:', e);
  // 失敗してもワークフローは緑のまま（サイトに影響しない）
}
