## 運用ルール（手動・自動セッション 共通／最優先）

このリポジトリを改善するすべての Claude セッション（あなたが指示する手動セッションも、
クラウドの自動セッションも）は **[AUTONOMY.md](./AUTONOMY.md) を唯一のランブック**として従う。要点:

1. **取り込みは PR 経由が既定**：`auto/*` ブランチ → PR → CI(ビルド)緑 → **自動マージ**。
2. **`src/lib/tax.ts`（税率・控除）の変更は人のレビュー必須**（PR に `needs-human-review` が自動付与され、自動マージは止まる）。独断で確定値を変えない。
3. **必ず `npm run build` が通る状態**でコミット／PR する。**1実行=1改善**。
4. **正確性が最優先（YMYL）**：料率・税率は国税庁・協会けんぽ等の**公式値**のみ。推測で書かない。
5. **並行作業の衝突回避**：自動作業はクラウド（隔離環境）で実行。**同じローカル作業ツリーで2セッションを同時に走らせない**（別作業は `git worktree` で隔離）。
6. インフラは**無料枠のみ**（Cloudflare Pages / GitHub Actions 無料枠）。勝手に課金しない。

優先順位は **①正確性・鮮度 → ②SEO → ③収益最適化 → ④新ツール**。詳細・手順・バックログは AUTONOMY.md。

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
