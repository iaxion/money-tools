import type { APIRoute } from 'astro';

/**
 * デプロイ確認用の指紋。ビルド時にコミットSHAとビルド時刻を埋め込む。
 *
 * 本番が返すSHAと GitHub のコミットSHAが一致するかで
 * 「最新コミットが本当にデプロイされたか」を機械的に検証できる
 * （`.github/workflows/deploy-check.yml` が利用）。
 *
 * SHA は astro.config.mjs がビルド時に解決して `__COMMIT_SHA__` として注入する
 * （デプロイ基盤の環境変数 → git rev-parse の順。基盤の変数名に依存しない）。
 * ビルド時に値を固定したいので必ず静的生成する。
 */
declare const __COMMIT_SHA__: string;

export const prerender = true;

export const GET: APIRoute = () => {
  const body = JSON.stringify({ sha: __COMMIT_SHA__, builtAt: new Date().toISOString() });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
};
