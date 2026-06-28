# お金の計算ツール（money-tools）

日本の給与・税金・社会保険・資産形成を計算できる無料ツール集。Astro 製の静的サイトで、
Cloudflare Pages 等に無料でデプロイできます。**収益化は AdSense ＋ アフィリエイト**を想定。

- 旗艦ツール：`/tools/tedori/` 給与の手取り計算（2025年税制対応）
- 計算ロジック：`src/lib/tax.ts`（年度更新はここの `RATES` と控除関数を直すだけ）
- サイト設定：`src/config.ts`（値は環境変数から注入。直書きしない）／環境変数の雛形は `.env.example`

---

## ✅ あなたが行う手動ステップ（収益化までの手順）

> コードは私（Claude）が自動で増やします。お金に直結する以下の操作だけ、あなたの手で一度設定してください。

### 1. 環境変数を設定する（個人情報はコミットしない）
ドメインやメール等は**ソースに直書きせず環境変数**で渡します。`.env.example` を参考に：

- **ローカル**：`.env.example` をコピーして `.env` を作り、実値を記入（`.env` は gitignore 済み＝コミットされません）
  ```sh
  cp .env.example .env   # 既にある場合は不要
  # PUBLIC_SITE_URL / PUBLIC_CONTACT_EMAIL を記入
  ```
- **本番（Cloudflare Pages）**：ダッシュボードの **Settings → Environment variables** に同じ変数を登録
  - `PUBLIC_SITE_URL` … 公開URL（例 `https://example.com`、末尾スラッシュ無し）
  - `PUBLIC_CONTACT_EMAIL` … 問い合わせ先メール
  - `PUBLIC_ADSENSE_CLIENT` … （AdSense 通過後に）`ca-pub-XXXXXXXXXXXXXXXX`

### 2. GitHub に公開リポジトリを作る
1. GitHub で空のリポジトリを作成（例 `money-tools`）
2. このフォルダで：
   ```sh
   git add -A && git commit -m "初回公開"
   git branch -M main
   git remote add origin https://github.com/＜あなた＞/money-tools.git
   git push -u origin main
   ```

### 3. Cloudflare Pages で無料デプロイ
1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**
2. リポジトリを選択
3. ビルド設定：
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy → `xxxx.pages.dev` で公開される

### 4. 独自ドメインを接続
Cloudflare Pages の **Custom domains** に手持ちのドメインを追加し、表示される DNS 指示に従う
（Cloudflare 管理ドメインなら自動）。`src/config.ts` の `url` と一致させること。

### 5. Google Search Console に登録（集客の起点）
1. https://search.google.com/search-console → ドメイン追加・所有権確認
2. **サイトマップ送信**：`sitemap-index.xml` を登録
3. 主要ページを「URL 検査 → インデックス登録をリクエスト」

### 6. Google AdSense を申請（広告収益）
1. https://adsense.google.com で申請（独自ドメイン・コンテンツ・プライバシーポリシーが必要 → 本サイトは対応済み）
2. 審査通過後、発行された `ca-pub-...` を環境変数 `PUBLIC_ADSENSE_CLIENT` に設定して再デプロイ
3. `public/ads.txt` を作成し、AdSense が指示する1行（`google.com, pub-XXXX, DIRECT, f08c47fec0942fa0`）を貼る

### 7. アフィリエイト ASP に登録（高単価収益）
- **A8.net**（最大手・審査ゆるめ）/ **もしもアフィリエイト**（Amazon・楽天も簡単）
- 手取りツールと相性が良い案件：証券口座（NISA）、会計ソフト（freee・マネーフォワード）、転職、クレカ
- 取得した広告リンクを各ツールの文中に自然に設置（私が設置箇所を用意します）

### 8. SNS で集客（あなたの担当）
- X（旧Twitter）等で「年収◯◯万の手取りはいくら？」系の投稿＋ツールへのリンク
- SEO は数か月かかるため、初期はSNS流入が「最初の1円」への近道

---

## 🛠 開発コマンド

| コマンド | 内容 |
| :-- | :-- |
| `npm install` | 依存関係をインストール |
| `npm run dev` | ローカル開発サーバ（`localhost:4321`） |
| `npm run build` | 本番ビルド → `./dist/` |
| `npm run preview` | ビルド結果をローカル確認 |

## 📁 構成

```
src/
├── config.ts          # サイト設定（環境変数 PUBLIC_* から読み込み。直書きしない）
├── lib/tax.ts         # 手取り計算エンジン（年度更新はここ）
├── layouts/Base.astro # 共通レイアウト（SEO/OGP/AdSense）
├── pages/
│   ├── index.astro        # トップ（ツール一覧）
│   ├── about / privacy / contact
│   ├── robots.txt.ts      # robots（sitemap参照）
│   └── tools/tedori.astro # 手取り計算ツール
└── styles/global.css
```

## ⚠️ 注意
計算結果は概算です。料率・控除は毎年改正されるため、`src/lib/tax.ts` の `RATES` を年度ごとに更新してください。
