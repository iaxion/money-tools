// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

// 公開URLは環境変数 PUBLIC_SITE_URL から取得（ローカルは .env、本番は Cloudflare Pages の環境変数）。
// ソースにドメインを直書きしない。
const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const siteUrl = (PUBLIC_SITE_URL || 'http://localhost:4321').replace(/\/+$/, '');

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  integrations: [sitemap()],
});
