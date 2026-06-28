import type { APIRoute } from 'astro';
import { SITE } from '../config.ts';

/**
 * ads.txt（広告枠の販売を許可する事業者を宣言するファイル）。
 * AdSense のパブリッシャーID（PUBLIC_ADSENSE_CLIENT）が設定されている時だけ出力する。
 * 形式: google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
 */
export const GET: APIRoute = () => {
  const client = SITE.adsenseClient; // 例: ca-pub-XXXXXXXXXXXXXXXX
  if (!client) {
    return new Response('Not found', { status: 404 });
  }
  const pub = client.replace(/^ca-/, ''); // pub-XXXXXXXXXXXXXXXX
  const body = `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
