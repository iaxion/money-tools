import type { APIRoute } from 'astro';

/**
 * デプロイ確認用の指紋。ビルド時にコミットSHAとビルド時刻を埋め込む。
 *
 * Cloudflare Pages はビルド時に `CF_PAGES_COMMIT_SHA` を提供する。
 * これを本番が返すSHAと GitHub のコミットSHAが一致するかで
 * 「最新コミットが本当にデプロイされたか」を機械的に検証できる
 * （`.github/workflows/deploy-check.yml` が利用）。
 */
export const GET: APIRoute = () => {
  const sha =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    'dev';
  const body = JSON.stringify({ sha, builtAt: new Date().toISOString() });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
};
