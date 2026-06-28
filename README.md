# お金の計算ツール（money-tools）

日本の給与・税金・社会保険・資産形成を計算できる無料ツール集。Astro 製の静的サイト。

- 計算ロジックは `src/lib/` に純粋関数で実装（手取り `tax.ts` / 積立NISA `invest.ts` / 住宅ローン `loan.ts` / ふるさと納税 `furusato.ts` / 退職金 `taishoku.ts` / 換算 `convert.ts`）。
- 税率・控除は `src/lib/tax.ts` の `RATES` と控除関数に集約。年度更新はここと `src/lib/freshness.ts` を直す。
- サイト設定 `src/config.ts` は環境変数（`PUBLIC_*`）から注入し、URL・メール等を直書きしない（雛形は `.env.example`）。

## 開発コマンド

| コマンド | 内容 |
| :-- | :-- |
| `npm install` | 依存関係をインストール |
| `npm run dev` | ローカル開発サーバ（`localhost:4321`） |
| `npm run build` | 本番ビルド → `./dist/` |
| `npm run preview` | ビルド結果をローカル確認 |

## 環境変数（`.env.example` 参照）

| 変数 | 用途 |
| :-- | :-- |
| `PUBLIC_SITE_URL` | 公開URL（canonical / サイトマップ） |
| `PUBLIC_CONTACT_EMAIL` | お問い合わせ表示 |
| `PUBLIC_ADSENSE_CLIENT` | AdSense パブリッシャーID（メタタグ＋ads.txt を生成） |
| `PUBLIC_GSC_VERIFICATION` | Search Console メタタグ認証（任意） |

値はローカルは `.env`（gitignore 済）、本番はホスティングのビルド変数で設定する。

## 構成

```
src/
├── config.ts            # サイト設定（環境変数から読み込み）
├── lib/
│   ├── tax.ts           # 手取り計算エンジン（料率 RATES・控除関数）
│   ├── invest.ts loan.ts furusato.ts taishoku.ts convert.ts
│   └── freshness.ts     # 制度データの鮮度メタ（最終確認日・見直し期限）
├── components/Freshness.astro
├── layouts/Base.astro   # 共通レイアウト（SEO/OGP/AdSense）
├── pages/
│   ├── index.astro about/ privacy/ contact/
│   ├── robots.txt.ts ads.txt.ts
│   └── tools/{tedori,nisa,loan,furusato,taishoku,kanzan}.astro
└── styles/global.css
```

## 制度データの鮮度（メンテナンス）

税率・社会保険料率は毎年改定される（社会保険＝毎年4月、税制改正＝年末大綱→翌年）。
`src/lib/freshness.ts` の `TAX_DATA_META`（対象年度・最終確認日・見直し期限）で管理し、
見直し期限を過ぎるとサイト上に警告を表示する。定期レビューの手順は `AUTONOMY.md` を参照。

## 注意

計算結果は概算。料率・控除は `src/lib/tax.ts` の `RATES` と控除関数を年度ごとに更新する。
