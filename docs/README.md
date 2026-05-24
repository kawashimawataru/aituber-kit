# AITuberKit ドキュメント

公式ドキュメントサイト: [docs.aituberkit.com](https://docs.aituberkit.com/)

本リポジトリ内の `docs/` は、**ライセンス・多言語 README** に加え、**共演配信（Neuro 様方向）の開発計画** と **開発ログ** を格納する。

---

## ディレクトリ構成

```
docs/
├── README.md                 ← このファイル（索引）
├── project/                  ← 計画書（Claude Code 自律開発の正本）
│   ├── README.md             ← ★ エージェントはここから読む
│   ├── vision.md
│   ├── architecture.md
│   ├── current-state.md
│   ├── matrix.md
│   ├── phases/               ← Phase 0〜6 のタスク詳細
│   └── reference/
├── dev-log/                  ← 日付付き開発ログ + 現在ステータス
│   ├── README.md
│   ├── STATUS.md             ← ★ 常に最新の進捗・ブロッカー
│   └── YYYY-MM-DD.md
├── development-roadmap-ja.md ← 移行済み（リダイレクト）
├── license*.md
├── character_model_licence*.md
└── README_*.md               ← 多言語 README
```

---

## クイックリンク

| 目的                      | ファイル                                             |
| ------------------------- | ---------------------------------------------------- |
| **今何をすべきか**        | [dev-log/STATUS.md](dev-log/STATUS.md)               |
| **全体ビジョン**          | [project/vision.md](project/vision.md)               |
| **フェーズとタスク**      | [project/phases/README.md](project/phases/README.md) |
| **機能の実装済み/未実装** | [project/matrix.md](project/matrix.md)               |
| **今日の作業記録**        | [dev-log/](dev-log/)                                 |

---

## 上流リポジトリとの関係

- 比較・移植参考: [pngtuber-main](../pngtuber-main)（別ディレクトリ想定）
- 実装: `src/`（本 Kit）、設定は `.env.example`
