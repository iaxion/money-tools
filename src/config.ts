/**
 * サイト全体の設定。
 *
 * ★個人情報・環境ごとに変わる値はソースに直書きせず、環境変数から注入する★
 *  ローカル: プロジェクト直下の `.env`（gitignore 済み・コミットされない）
 *  本番:     Cloudflare Pages の「環境変数」/ GitHub Actions の Secrets 等で設定
 *
 * 使う環境変数（すべて任意。未設定でもビルドは通る）:
 *  - PUBLIC_SITE_URL       公開URL（例 https://example.com）
 *  - PUBLIC_CONTACT_EMAIL  問い合わせ先メール
 *  - PUBLIC_ADSENSE_CLIENT Google AdSense パブリッシャーID（ca-pub-...）
 *  - PUBLIC_SITE_NAME      サイト名（任意）
 *  - PUBLIC_SITE_AUTHOR    運営者名（任意）
 *  - PUBLIC_GSC_VERIFICATION  Google Search Console のメタタグ認証コード（任意）
 *
 * ※ PUBLIC_ 接頭辞は Astro が環境変数を読み込むための規約。これらの値は最終的に
 *    静的HTMLに出力される（=公開される）前提のものだけを入れること。秘密鍵等は入れない。
 */

const env = import.meta.env;

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  lang: string;
  author: string;
  contactEmail: string;
  adsenseClient: string;
  /** Google Search Console のメタタグ認証コード（content の値のみ） */
  gscVerification: string;
  /** Cloudflare Web Analytics のビーコントークン（Cookie不要・計測用） */
  analyticsToken: string;
}

export const SITE: SiteConfig = {
  name: env.PUBLIC_SITE_NAME || 'お金の計算ツール',
  description:
    '給与の手取り、税金、社会保険料などを無料で素早く計算できるツール集。2026年(令和8年)の最新税制に対応。',
  // 公開URLはビルド変数から注入。未設定時は開発用 localhost にフォールバック（実URLは持たない）。
  url: stripTrailingSlash(env.PUBLIC_SITE_URL || 'http://localhost:4321'),
  lang: 'ja',
  author: env.PUBLIC_SITE_AUTHOR || '運営者',
  contactEmail: env.PUBLIC_CONTACT_EMAIL || '',
  adsenseClient: env.PUBLIC_ADSENSE_CLIENT || '',
  gscVerification: env.PUBLIC_GSC_VERIFICATION || '',
  analyticsToken: env.PUBLIC_CF_BEACON || '',
};

/**
 * アフィリエイトリンク（A8等の広告コードHTML）。
 * アカウント固有で変わる値なのでソースに直書きせず、ビルド変数から注入する。
 * 値は A8 の「広告リンク作成」で得たHTMLスニペット（1行）をそのまま設定。
 * 空なら該当CTAは表示されない。
 */
export const AFFILIATES = {
  /** NISA/株 証券口座（例: DMM株）→ NISAツールに表示 */
  brokerage: env.PUBLIC_AFF_BROKERAGE || '',
  /** ふるさと納税サイト（楽天/ふるさとチョイス等）→ ふるさと納税ツールに表示
   *  旧名 PUBLIC_AFF_RAKUTEN_FURUSATO でも動くようフォールバック。 */
  furusato:
    env.PUBLIC_AFF_FURUSATO || env.PUBLIC_AFF_RAKUTEN_FURUSATO || '',
} as const;
