# 開発ステータス（常に最新）

> エージェントは作業の **開始時・終了時** に必ず更新する。  
> 最終更新: **2026-05-23**

---

## アクティブ Phase

**Phase 4 / 4.5 / 6 / 6.8 / 3-2** — 会話リアリティ・ステージング・ログエクスポート

---

## 進行中タスク

| ID | タスク | 担当 | 状態 |
|----|--------|------|------|
| — | （未着手） | — | — |

---

## 完了済み（直近）

| ID | 内容 | 完了日 |
|----|------|--------|
| 4-1 | `situationModel.ts` — SessionSituation 追跡・能動発話ポリシー | 2026-05-23 |
| 4-2 | `IdleManager` に `startSituationTracker()` を組み込み（mount/unmount cleanup） | 2026-05-23 |
| 4-3 | `handlers.ts` に `recordComment()` + `scheduleL1Reaction()` 連携 | 2026-05-23 |
| 4.5-1 | `reactionScheduler.ts` — L1先出し反応・笑いSE・`[laugh:*]` タグ | 2026-05-23 |
| 4.5-2 | `handlers.ts` 全ストリーム処理ループに `parseLaughTag` + `playLaughSE` 統合 | 2026-05-23 |
| 6-1 | `stuntTypes.ts` — 11 stunt カタログ定義 | 2026-05-23 |
| 6-2 | `screenShake.ts` — CSS アニメーション画面シェイク | 2026-05-23 |
| 6-3 | `stuntScheduler.ts` — 表情先行→モーション80ms→SE+シェイク同時発火 | 2026-05-23 |
| 6-4 | `handlers.ts` 全ストリーム処理ループに `extractStuntTag` + `fireStunt` 統合 | 2026-05-23 |
| 6-5 | `sePlayer.ts` — Web Audio API SE プレイヤー（キャッシュ付き） | 2026-05-23 |
| 6.8-1 | `extractAndApplyBgTag` — `[bg:xxx]` タグで背景切替 | 2026-05-23 |
| 6.8-2 | `index.tsx` に `id="viewer-container"` + 背景 CSS transition 追加 | 2026-05-23 |
| 3-2 | `exportChatLog.ts` + `chatLogExport.tsx` — JSONL ダウンロードボタン | 2026-05-23 |
| 2-1 | `src/features/vision/` ディレクトリ作成（screenCapture.ts, screenCommentator.ts） | 2026-05-23 |
| 2-2 | `/api/vision-commentary.ts` Vision API ルート（マルチモーダル LLM 呼び出し） | 2026-05-23 |
| 2-3 | `useScreenCommentary.ts` フック（差分検知ループ） | 2026-05-23 |
| 2-4 | `ScreenCommentaryManager` + `screenCommentarySettings.tsx` + `other.tsx` に追加 | 2026-05-23 |
| 2-5 | `VideoDisplay` に `videoDataAttributes` prop 追加（`data-screen-capture` 識別） | 2026-05-23 |
| 1-1 | `SpeechRecognitionMode` に `'deepgram'` 追加 + 設定ストア `deepgramApiKey` 追加 | 2026-05-23 |
| 1-2 | `useDeepgramRecognition.ts`（Live WebSocket Streaming + endpointing）作成 | 2026-05-23 |
| 1-3 | `/api/stt-deepgram-token.ts`（APIキープロキシ）作成 | 2026-05-23 |
| 1-3 | `useVoiceRecognition.ts` に Deepgram モード統合 | 2026-05-23 |
| 1-3 | `speechInput.tsx` に Deepgram UI（3択ボタン・APIキー入力）追加 | 2026-05-23 |
| 1-3 | 排他ルール `deepgram-mode` 追加（realtimeAPIMode/audioMode と排他） | 2026-05-23 |
| 0-1 | Node 24 + `SHARP_IGNORE_GLOBAL_LIBVIPS` セットアップ手順 doc 化 | 2026-05-23 |
| 0-2 | `.env.example` に Deepgram / 共演セクション追加 | 2026-05-23 |
| 0-3 | YouTube モード E2E チェックリスト作成（`docs/project/e2e-youtube-checklist.md`） | 2026-05-23 |
| 0-4 | 共演向けシステムプロンプトプリセット doc 化（`docs/project/co-streaming-preset.md`） | 2026-05-23 |

---

## 次にやること（優先順）

1. **実機確認** 画面共有 ON → 「その他」設定で画面実況 ON → 30秒後に実況が来るか
2. **Phase 1 実機テスト** Deepgram STT（`DEEPGRAM_API_KEY` 設定後）
3. **Phase 5** OBS 連携ガイド・共演ドキュメント整備
4. **Phase 7** 長期記憶の改善（RAG クオリティ向上）

---

## ブロッカー

- なし

---

## マイルストーン進捗

| MS | 状態 |
|----|------|
| M1 | ✅ Phase 0 完了 |
| M2 | ✅ Phase 1 実装済み（実機テスト待ち） |
| M3 | ✅ Phase 2 実装済み（実機テスト待ち） |
| M4 | ✅ Phase 4 / 4.5 実装済み |
| M6 | ✅ Phase 6 / 6.8 実装済み |
| M3-2 | ✅ Phase 3-2 JSONL エクスポート完了 |
| M5 | 未達（Phase 5 OBS ガイド） |
| M7 | 未達 |

---

## メモ

- 単一ファイル `development-roadmap-ja.md` は移行済み。以降の計画更新は `docs/project/` 配下で行う。
- TypeScript 本番コードのエラーはゼロ（テストファイルの既存エラーは別管理）
