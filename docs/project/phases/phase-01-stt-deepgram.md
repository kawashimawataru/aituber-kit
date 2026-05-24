# Phase 1 — STT 常時 ON（Deepgram）

> 親: [フェーズ一覧](README.md) · [プロジェクト計画](../README.md)

**ゴール**: 人間配信者と同様、マイクを常に聞き、発話終了を自動検知してテキスト化する。

| #   | タスク                  | 詳細                                                                                                    | 優先度 |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------- | ------ |
| 1-1 | Deepgram プロバイダ追加 | `speechRecognitionMode: 'deepgram'`、設定 UI・`.env.example`                                            | P0     |
| 1-2 | **Live WebSocket** 実装 | pngtuber の Prerecorded 一括送信ではなく **Streaming API** + endpointing（`docs/stt-deepgram.md` 参照） | P0     |
| 1-3 | 常時リスニング UI       | 設定: `continuousMicListeningMode` との統合・排他ルール更新（`exclusionRules.ts`）                      | P0     |
| 1-4 | 発話キュー連携          | 確定テキスト → 既存 `handleSendChat` または「人間用」「AI用」チャンネル分離                             | P1     |
| 1-5 | 共演モード              | 人間 STT 結果は **LLM に渡さない** / 要約のみ渡す 等、トグルで選択                                      | P1     |

**技術メモ**

- API ルート: `/api/stt/deepgram`（トークン発行 or プロキシ）— API キーをブラウザに直置きしない
- Realtime API モード・Whisper モードとの排他を UI で明示

**完了条件**: マイク ON のまま話すと、無音後 〜1秒でテキストがチャット欄 or 内部ログに入る。

---
