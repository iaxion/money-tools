// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import { execSync } from 'node:child_process';

import cloudflare from '@astrojs/cloudflare';

// 公開URLはビルド変数 PUBLIC_SITE_URL から取得する。
//  - 本番(Cloudflare): 設定 → ビルド → ビルド変数とシークレット に設定
//  - ローカル: .env（gitignore済）
// ソースには実URLを持たない（未設定時は開発用の localhost にフォールバック）。
const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const siteUrl = (PUBLIC_SITE_URL || 'http://localhost:4321').replace(/\/+$/, '');

// デプロイ確認(/version.json + deploy-check)用のコミットSHA。
// デプロイ基盤の環境変数 → git の順で「確実に」解決する（基盤ごとに変数名が違うため）。
//  - Cloudflare Workers Builds: WORKERS_CI_COMMIT_SHA
//  - Cloudflare Pages:          CF_PAGES_COMMIT_SHA
//  - GitHub Actions:            GITHUB_SHA
//  - いずれも無ければ git rev-parse（ビルドは必ず git チェックアウト上で走る）
function resolveCommitSha() {
  const fromEnv =
    process.env.WORKERS_CI_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.trim();
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}
const commitSha = resolveCommitSha();

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  integrations: [sitemap()],
  adapter: cloudflare(),
  vite: {
    // ビルド時にSHAを埋め込む（version.json.ts から参照）。
    define: {
      __COMMIT_SHA__: JSON.stringify(commitSha),
    },
  },
});