// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

import cloudflare from '@astrojs/cloudflare';

// 公開URLはビルド変数 PUBLIC_SITE_URL から取得する。
//  - 本番(Cloudflare): 設定 → ビルド → ビルド変数とシークレット に設定
//  - ローカル: .env（gitignore済）
// ソースには実URLを持たない（未設定時は開発用の localhost にフォールバック）。
const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const siteUrl = (PUBLIC_SITE_URL || 'http://localhost:4321').replace(/\/+$/, '');

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  integrations: [sitemap()],
  adapter: cloudflare(),
});