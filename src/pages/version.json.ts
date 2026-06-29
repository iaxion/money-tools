import type { APIRoute } from 'astro';

/**
 * デプロイ確認用の指紋。ビルド時にコミットSHAとビルド時刻を埋め込む。
 *
 * 本番が返すSHAと GitHub のコミットSHAが一致するかで
 * 「最新コミットが本当にデプロイされたか」を機械的に検証できる
 * （`.github/workflows/deploy-check.yml` が利用）。
 *
 * デプロイ基盤ごとにビルド時の環境変数名が違うので順に拾う:
 *  - Cloudflare Workers Builds … `WORKERS_CI_COMMIT_SHA`
 *  - Cloudflare Pages          … `CF_PAGES_COMMIT_SHA`
 *  - GitHub Actions            … `GITHUB_SHA`
 *
 * ビルド時に値を埋め込みたいので必ず静的生成する（prerender）。
 */
export const prerender = true;

export const GET: APIRoute = () => {
  const sha =
    process.env.WORKERS_CI_COMMIT_SHA ||
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
