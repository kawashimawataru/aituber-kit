# Phase 4 — 感情・行動の豊富化 + 状況把握・能動発話

> 親: [フェーズ一覧](README.md) · [プロジェクト計画](../README.md)


**ゴール**: Neuro 様に近い「豊かな表情・動き」と「状況に応じた話しかけ」。

| # | タスク | 詳細 | 優先度 |
|---|--------|------|--------|
| 4-1 | 感情スキーマ拡張 | 6感情 → 細分（楽しい/照れ/呆れ 等）または LLM `mood` 数値 | P2 |
| 4-2 | 行動タグ | `[action:wave]` `[action:look_at_chat]` 等、VRM/Live2D マッピング表 | P2 |
| 4-3 | **状況モデル** | 入力: 無音時間 / コメントレート / 画面差分 / 人間 STT 終了 | P0 |
| 4-4 | アイドル統合 | `useIdleMode` を状況モデルの一トリガーに格下げ・拡張 | P1 |
| 4-5 | 能動発話ポリシー | 「割込み禁止」「最低間隔」「人間優先」ルールを LLM + コード両方で | P0 |
| 4-6 | 割込み・ツッコミ | 人間発話中はキュー待ち、終了後に短いリアクション | P2 |

**状況モデル（案）**

```ts
type SessionSituation = {
  humanSpeaking: boolean
  aiSpeaking: boolean
  silenceSec: number
  lastCommentAt: number | null
  screenChangeScore: number // 0-1
  chatBacklog: number
}
```

**完了条件**: コメントが30秒無い + 画面が動いている → キャラが実況を1文入れる（アイドルより文脈に沿う）。

---
