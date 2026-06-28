// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

// 公開URL。環境変数 PUBLIC_SITE_URL があればそれを優先し、無ければ既定の公開URLを使う。
// ※ 公開URLは秘密情報ではない（HTML/サイトマップ/検索結果に必ず出る公開値）ため既定値として持つ。
//    ドメインを変える場合は環境変数 PUBLIC_SITE_URL で上書き可能。
const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const siteUrl = (PUBLIC_SITE_URL || 'https://money-tools.iaxion.dev').replace(/\/+$/, '');

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  integrations: [sitemap()],
});
