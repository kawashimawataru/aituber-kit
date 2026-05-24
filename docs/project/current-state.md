# 現状資産

### AITuberKit 側

| 領域             | 既存機能                                                              | 共演での活用                                                                           |
| ---------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 配信コメント     | YouTube API / **わんコメ**（Twitch 等を集約可）                       | 視聴者入力                                                                             |
| 会話継続         | Mastra ワークフロー（継続・新トピック・スリープ）                     | コメントが少ないときの自発話 **の前身**                                                |
| STT              | ブラウザ Web Speech / Whisper / Realtime API / **Deepgram（実装済）** | Deepgram: `/hooks/useDeepgramRecognition.ts`、WS Streaming + endpointing               |
| 記憶             | `maxPastMessages` + RAG（IndexedDB + Embedding）                      | セッション跨ぎ・視聴者 ID は弱い                                                       |
| 感情・モーション | `[happy]` `[motion:xxx]`、Live2D/VRM マッピング                       | 拡張の土台                                                                             |
| 視覚             | マルチモーダル（カメラ・画像アップロード）/ **画面実況（実装済）**    | `features/vision/`, `useScreenCommentary.ts`, `/api/vision-commentary.ts`              |
| 能動性           | **アイドルモード**、**人感検知**、**状況モデル（実装済）**            | `SessionSituation`, `startSituationTracker`, `shouldProactivelySpeak`                  |
| 外部連携         | WebSocket 外部連携モード                                              | Python サイドカー連携の候補                                                            |
| 会話リアリティ   | L1先出し反応・笑い SE・`[laugh:*]` タグ **（実装済）**                | `reactionScheduler.ts`, handlers.ts パイプライン統合                                   |
| 身体性演出       | `[stunt:xxx]` タグ・画面シェイク・SE 同時発火 **（実装済）**          | `stuntScheduler.ts`, `screenShake.ts`, `stuntTypes.ts`（11 stunt）                     |
| 背景演出         | `[bg:xxx]` タグで LLM 起点の背景切替 **（実装済）**                   | `extractAndApplyBgTag`, 0.8s CSS transition                                            |
| ログ             | JSONL エクスポート **（実装済）**                                     | `exportChatLog.ts`, 設定→その他→ダウンロードボタン                                     |
| TTS              | **Style-Bert-VITS2（実装済）** / OpenAI TTS 等                        | 将来 **Irodori-TTS** へ移行予定 → [irodori-tts-migration.md](irodori-tts-migration.md) |

### pngtuber-main から持ってこれる知見（コード参照用）

| 機能                      | 参照先                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| Deepgram STT（Live 方針） | `pngtuber-main/docs/stt-deepgram.md`, `src/input/providers/deepgram.py` |
| 画面実況                  | `src/vision/commentator.py`, `src/vision/capture.py`                    |
| mem0 長期記憶             | `src/memory/long_term.py`                                               |
| 日次 jsonl                | `memory/characters/*/logs/*.jsonl`                                      |
| VTS 感情・口パク          | `src/avatar/vtube_studio.py`（Live2D は VTS 経由の参考）                |

### 3.1 現状調査：体の傾け・背景変更（2026-05-23）

コードベースを確認した結果。**背景は手動変更まで実装済み。体の傾けは会話・演出連動では未実装。**

#### 体を傾ける（lean / tilt）

| 項目                           | 有無 | 実装の実態                                                                                                                                      |
| ------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **会話中に「体を傾ける」タグ** | ✅   | `[stunt:lean_in]` `[stunt:lean_forward]` `[stunt:lean_back]` `[stunt:tilt_head]` — stuntScheduler でパース・実行                                |
| **VRM 全身の傾き**             | △    | `[motion:xxx]` → `poseConfigs` → `PoseManager.applyPose`（JSON/VRMA ポーズ）で **作者が傾きポーズを作れば可能**だが、標準同梱・自動傾きではない |
| **VRM 表情のみ**               | ○    | `EmoteController` / `ExpressionController`（happy, sad 等）                                                                                     |
| **`characterRotation` 設定**   | △    | 名前は rotation だが実体は **カメラの注視点（target）**（`viewer.ts` の `saveCameraPosition`）。**骨格の体傾きではない**                        |
| **キャラ位置・固定**           | ○    | `characterPosition`（カメラ位置）、`fixedCharacterPosition`、Live2D の `fixPosition` / `saveModelPosition`                                      |
| **Live2D 体傾き**              | △    | モデル組み込みの **モーション・ParamAngle** に依存。設定画面でモーショングループを割り当て可能だが **「傾ける」専用機能はない**                 |
| **PNGTuber**                   | △    | 動画状態切替のみ。傾きは素材次第                                                                                                                |

**結論**: 「のけぞる・前のめり・よそ見で首を傾ける」は **Phase 6 の stunt カタログ + VRM/Live2D 用モーション素材** として計画する。現状は **手動でポーズ JSON を足す** か、カメラを動かす程度。

**関連コード**

- VRM ポーズ: `src/lib/VRMAnimation/poseManager.ts`, `src/features/vrmViewer/model.ts`（`talk.motion`）
- モーションタグ: `src/features/chat/handlers.ts`（`extractMotionTag`）
- 設定 UI: `src/components/settings/character.tsx`（`PoseConfigSettings`）

#### 背景変更

| 項目                           | 有無 | 実装の実態                                                                                     |
| ------------------------------ | ---- | ---------------------------------------------------------------------------------------------- |
| **静止画背景の選択**           | ○    | 設定 → **基本** → 背景設定（`based.tsx`）                                                      |
| **背景のアップロード**         | ○    | `/api/upload-background` → `public/backgrounds/`                                               |
| **背景一覧**                   | ○    | `/api/get-background-list`                                                                     |
| **緑背景（クロマキ用）**       | ○    | `backgroundImageUrl === 'green'` → `#00FF00`（`index.tsx`）                                    |
| **環境変数初期値**             | ○    | `NEXT_PUBLIC_BACKGROUND_IMAGE_PATH`（`.env.example`）                                          |
| **Webカメラ/画面共有を背景に** | ○    | `useVideoAsBackground`（設定 → **その他** `advancedSettings.tsx`、表示は `VideoDisplay.tsx`）  |
| **メニューから画像1枚**        | ○    | `menu.tsx` の hidden file input → `homeStore.backgroundImageUrl`（Blob URL、永続化はしない）   |
| **会話・感情から背景を変える** | ✅   | `[bg:xxx]` タグ → `extractAndApplyBgTag` → `homeStore.backgroundImageUrl`、0.8s CSS transition |
| **動画背景ループ（ファイル）** | ×    | 共有画面以外の MP4 背景カタログなし                                                            |

**結論**: **配信前・手動での背景変更は十分**。Neuro 的な「ムードで背景が変わる」は **未実装 → Phase 6.8（下記）** で計画。

**関連コード**

- 表示: `src/pages/index.tsx`（`backgroundStyle`）
- 状態: `src/features/stores/home.ts`（`backgroundImageUrl`）
- 設定: `src/components/settings/based.tsx`

---
