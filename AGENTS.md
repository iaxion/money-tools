## 運用ルール（手動・自動セッション 共通／最優先）

このリポジトリを改善するすべての Claude セッション（あなたが指示する手動セッションも、
クラウドの自動セッションも）は **[AUTONOMY.md](./AUTONOMY.md) を唯一のランブック**として従う。要点:

1. **取り込みは PR 経由が既定**：`auto/*` ブランチ → PR → CI(**ビルド＋計算ユニットテスト**)緑 → **自動マージ（フルオート）**。
2. **`src/lib/tax.ts`（税率・控除）もフルオートで自動マージ**。安全弁は **`src/lib/calc.test.ts`（既知の公表値レンジ＋不変条件）がCIで必ず通ること**＝壊れた計算は自動ブロック。変更時は `npm test` 通過を確認し、`money-logic-changed` ラベルで事後確認可能に。**テストを壊れた値に合わせて緩めない**。料率は公式値のみ。
3. **必ず `npm run build` と `npm test` が通る状態**でコミット／PR する。**1実行=1改善**。
4. **正確性が最優先（YMYL）**：料率・税率は国税庁・協会けんぽ等の**公式値**のみ。推測で書かない。
5. **並行作業の衝突回避**：自動作業はクラウド（隔離環境）で実行。**同じローカル作業ツリーで2セッションを同時に走らせない**（別作業は `git worktree` で隔離）。
6. インフラは**無料枠のみ**（Cloudflare Pages / GitHub Actions 無料枠）。勝手に課金しない。

**収益はデータ駆動で最大化**する（アクセス解析で測り、伸びる施策へ寄せ、ダメなら見切る）。
優先順位 **①正確性・鮮度 → ②計測(解析) → ③長尾SEO量産 → ④収益最適化 → ⑤有料ツール/新サービス**。詳細な戦略・手順・バックログは AUTONOMY.md。

---

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
