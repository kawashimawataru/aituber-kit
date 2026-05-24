# 開発ステータス（常に最新）

> エージェントは作業の **開始時・終了時** に必ず更新する。  
> 最終更新: **2026-05-23 (Live2D multi-model)**

---

## アクティブ Phase

**Phase 4 / 4.5 / 6 / 6.8 / 3-2** — 会話リアリティ・ステージング・ログエクスポート

---

## 進行中タスク

| ID  | タスク     | 担当 | 状態 |
| --- | ---------- | ---- | ---- |
| —   | （未着手） | —    | —    |

---

## 完了済み（直近）

| ID            | 内容                                                                                                           | 完了日     |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ---------- |
| Live2D-compat | `discoverModel.ts` — `mocVersion` フィールド追加（moc3 5th byte 読み取り）+ UI で Cubism5 をグレーアウト       | 2026-05-23 |
| Live2D-err    | `Live2DComponent.tsx` — `fromSync`→`from()` 切替で即時エラー伝播（10s タイムアウト排除）+ エラーメッセージ改善 | 2026-05-23 |
| Live2D-sync   | `live2dEmotionSync.ts` — 表情なしモデル切替時に設定リセット（stale 設定を防止）                                | 2026-05-23 |
| 5-1           | `coStreamingPresets.tsx` — 3プリセットボタン（A/B/C）でシステムプロンプト即時反映                              | 2026-05-23 |
| 6.8-4         | `emotionBg.ts` — 感情タグ→背景切替（catalog.json キャッシュ付き）+ `coStreamingSettings.tsx` に UI             | 2026-05-23 |
| 6-11          | `stuntScheduler.ts` — stunt 発火後に cooldownMs×0.7 ms で `resetToIdle()` 自動実行                             | 2026-05-23 |
| 4.5-6         | `reactionScheduler.ts` — `playLaughSE` で happy 表情を SE より 100ms 先行させる                                | 2026-05-23 |
| i18n          | `locales/ja/translation.json` — CoStreamingPresets・BackgroundChange の 7 キー追加                             | 2026-05-23 |
| 4-4           | 状況モデル配線: Deepgram→`humanSpeaking`、画面実況→`screenChangeScore`、`shouldProactivelySpeak`→`canSpeak`    | 2026-05-23 |
| 4-5           | `coStreamingMode` / `coStreamerName` を settingsStore に追加 + 設定画面 UI                                     | 2026-05-23 |
| 6-5           | stunt 用 VRM ポーズ JSON 11本生成（`scripts/generate-stunt-poses.mjs`）+ poseConfigs に追加                    | 2026-05-23 |
| P0-1          | `scripts/generate-placeholder-se.mjs` + 9ファイル WAV 生成（public/assets/reactions/）                         | 2026-05-23 |
| P0-3          | `co-streaming-preset.md` プリセット B にタグ構文リファレンス追記                                               | 2026-05-23 |
| P1            | TTFR/TTFA `performance.mark` 計測を handlers.ts に追加（console.info 出力）                                    | 2026-05-23 |
| P1            | E2E チェックリスト拡張（Deepgram / 画面実況 / 演出タグ / JSONL）                                               | 2026-05-23 |
| P2            | `current-state.md` を実装済み内容（STT/視覚/stunt/laugh/bg/ログ）に更新                                        | 2026-05-23 |
| 4-1           | `situationModel.ts` — SessionSituation 追跡・能動発話ポリシー                                                  | 2026-05-23 |
| 4-2           | `IdleManager` に `startSituationTracker()` を組み込み（mount/unmount cleanup）                                 | 2026-05-23 |
| 4-3           | `handlers.ts` に `recordComment()` + `scheduleL1Reaction()` 連携                                               | 2026-05-23 |
| 4.5-1         | `reactionScheduler.ts` — L1先出し反応・笑いSE・`[laugh:*]` タグ                                                | 2026-05-23 |
| 4.5-2         | `handlers.ts` 全ストリーム処理ループに `parseLaughTag` + `playLaughSE` 統合                                    | 2026-05-23 |
| 6-1           | `stuntTypes.ts` — 11 stunt カタログ定義                                                                        | 2026-05-23 |
| 6-2           | `screenShake.ts` — CSS アニメーション画面シェイク                                                              | 2026-05-23 |
| 6-3           | `stuntScheduler.ts` — 表情先行→モーション80ms→SE+シェイク同時発火                                              | 2026-05-23 |
| 6-4           | `handlers.ts` 全ストリーム処理ループに `extractStuntTag` + `fireStunt` 統合                                    | 2026-05-23 |
| 6-5           | `sePlayer.ts` — Web Audio API SE プレイヤー（キャッシュ付き）                                                  | 2026-05-23 |
| 6.8-1         | `extractAndApplyBgTag` — `[bg:xxx]` タグで背景切替                                                             | 2026-05-23 |
| 6.8-2         | `index.tsx` に `id="viewer-container"` + 背景 CSS transition 追加                                              | 2026-05-23 |
| 3-2           | `exportChatLog.ts` + `chatLogExport.tsx` — JSONL ダウンロードボタン                                            | 2026-05-23 |
| 2-1           | `src/features/vision/` ディレクトリ作成（screenCapture.ts, screenCommentator.ts）                              | 2026-05-23 |
| 2-2           | `/api/vision-commentary.ts` Vision API ルート（マルチモーダル LLM 呼び出し）                                   | 2026-05-23 |
| 2-3           | `useScreenCommentary.ts` フック（差分検知ループ）                                                              | 2026-05-23 |
| 2-4           | `ScreenCommentaryManager` + `screenCommentarySettings.tsx` + `other.tsx` に追加                                | 2026-05-23 |
| 2-5           | `VideoDisplay` に `videoDataAttributes` prop 追加（`data-screen-capture` 識別）                                | 2026-05-23 |
| 1-1           | `SpeechRecognitionMode` に `'deepgram'` 追加 + 設定ストア `deepgramApiKey` 追加                                | 2026-05-23 |
| 1-2           | `useDeepgramRecognition.ts`（Live WebSocket Streaming + endpointing）作成                                      | 2026-05-23 |
| 1-3           | `/api/stt-deepgram-token.ts`（APIキープロキシ）作成                                                            | 2026-05-23 |
| 1-3           | `useVoiceRecognition.ts` に Deepgram モード統合                                                                | 2026-05-23 |
| 1-3           | `speechInput.tsx` に Deepgram UI（3択ボタン・APIキー入力）追加                                                 | 2026-05-23 |
| 1-3           | 排他ルール `deepgram-mode` 追加（realtimeAPIMode/audioMode と排他）                                            | 2026-05-23 |
| 0-1           | Node 24 + `SHARP_IGNORE_GLOBAL_LIBVIPS` セットアップ手順 doc 化                                                | 2026-05-23 |
| 0-2           | `.env.example` に Deepgram / 共演セクション追加                                                                | 2026-05-23 |
| 0-3           | YouTube モード E2E チェックリスト作成（`docs/project/e2e-youtube-checklist.md`）                               | 2026-05-23 |
| 0-4           | 共演向けシステムプロンプトプリセット doc 化（`docs/project/co-streaming-preset.md`）                           | 2026-05-23 |

---

## 次にやること（優先順）

1. **Live2D Cubism3.x 動作確認** — `from()` 切替後に akari_vts / hiyori_vts 等のトースト内エラーメッセージを確認。"Failed to CubismMoc.create()" なら Core4 で Cubism3.x moc が非対応の可能性（Core3 系 SDK の導入か、Cubism4 対応モデルへの変換を検討）
2. **SE 差し替え** `public/assets/reactions/` の無音プレースホルダーを実音源に差し替え
3. **stunt ポーズ調整** `[stunt:lean_in]` 等を実機で確認し、値を微調整（VRM エディタ推奨）
4. **実機 E2E** `docs/project/e2e-youtube-checklist.md` のチェックリストを全項目確認
5. **Phase 4.5-4** TTS パイプライン並列化（文N生成と文N-1再生のオーバーラップ）
6. **Irodori-TTS 移行**（将来）— [irodori-tts-migration.md](../project/irodori-tts-migration.md)。ローカル本体: `/Users/kawashimawataru/Desktop/Fuva_file/Irodori-TTS`

---

## ブロッカー

- なし

---

## マイルストーン進捗

| MS   | 状態                                     |
| ---- | ---------------------------------------- |
| M1   | ✅ Phase 0 完了                          |
| M2   | ✅ Phase 1 実装済み（実機テスト待ち）    |
| M3   | ✅ Phase 2 実装済み（実機テスト待ち）    |
| M4   | ✅ Phase 4 / 4.5 実装済み                |
| M6   | ✅ Phase 6 / 6.8 実装済み                |
| M3-2 | ✅ Phase 3-2 JSONL エクスポート完了      |
| M5-1 | ✅ Phase 5-1 共演プリセット UI 完了      |
| M5   | 未達（Phase 5-3/4 OBS・わんコメ ガイド） |
| M7   | 未達                                     |

---

## メモ

- 単一ファイル `development-roadmap-ja.md` は移行済み。以降の計画更新は `docs/project/` 配下で行う。
- TypeScript 本番コードのエラーはゼロ（テストファイルの既存エラーは別管理）
