# E2E チェックリスト（Phase 0-6）

> 完了条件: `npm run dev` で VRM/Live2D 表示 + YouTube コメント1件への応答が再現できる

---

## 事前準備

- [ ] Node.js 24.x がアクティブ（`node -v` で確認）
- [ ] `.env` が存在する（`cp .env.example .env` で作成）
- [ ] YouTube API キーを `.env` に設定済み
  ```
  NEXT_PUBLIC_YOUTUBE_API_KEY="AIza..."
  NEXT_PUBLIC_YOUTUBE_LIVE_ID="<ライブ配信ID>"
  NEXT_PUBLIC_YOUTUBE_MODE="true"
  ```
- [ ] AI プロバイダーの API キーを `.env` に設定済み
  ```
  OPENAI_API_KEY="sk-..."   # または使用するプロバイダー
  ```

---

## 起動確認

- [ ] `npm run dev` でエラーなく起動
- [ ] http://localhost:3000 にアクセスできる
- [ ] VRM または Live2D キャラクターが画面に表示される
- [ ] ブラウザコンソールに致命的エラーがない

---

## YouTube 連携確認

### YouTube API モード

- [ ] 設定 → YouTube → YouTube モードを ON
- [ ] コメントソース: `youtube-api` を選択
- [ ] ライブ配信中の Live ID を入力
- [ ] コメント取得間隔を設定（デフォルト: 10秒）
- [ ] テストコメントを YouTube Live に投稿
- [ ] AITuberKit がコメントを受信し、キャラクターが応答を発話する

### わんコメ（OneComme）モード ※PC 側で OneComme が起動済みの場合

- [ ] コメントソース: `onecomme` を選択
- [ ] わんコメポート: `11180`（デフォルト）を確認
- [ ] わんコメ画面でコメントが流れていることを確認
- [ ] AITuberKit がコメントを受信し応答する

---

## 応答品質確認

- [ ] コメント受信後、キャラクターの口が動く（リップシンク）
- [ ] 応答テキストがチャットログに表示される
- [ ] 感情タグ（`[happy]` 等）が含まれる場合、表情が変化する
- [ ] 複数コメントが来た場合、キューで順番に処理される

---

## 会話継続モード確認（任意）

- [ ] 設定 → YouTube → 会話継続モード ON
- [ ] コメントが途絶えたあと、自動的に発話が発生する
- [ ] 閾値設定（新トピック: 3回 / スリープ: 6回）が機能している

---

---

## Deepgram STT 確認（Phase 1）

事前: `DEEPGRAM_API_KEY` を `.env` に設定 or 設定画面で入力

- [ ] 設定 → 音声入力 → 認識モード「Deepgram」を選択
- [ ] `realtimeAPIMode` / `audioMode` が自動的に OFF になる（排他制御）
- [ ] マイクを ON → 発話 → テキストがチャット欄に入る
- [ ] 無音 1 秒以上で発言が確定される（`endpointing=300`, `utterance_end_ms=1000`）
- [ ] ブラウザコンソールに `[Deepgram] speech_final` ログが出る
- [ ] `DEEPGRAM_API_KEY` 未設定でも `/api/stt-deepgram-token` 経由でトークン取得できる

---

## 画面実況確認（Phase 2）

事前: マルチモーダル対応モデルを設定（gpt-4o 等）

- [ ] ブラウザで画面共有を許可（カメラアイコン → 画面共有）
- [ ] 設定 → その他 → 画面実況モードを ON
- [ ] `VideoDisplay` に `data-screen-capture="true"` 属性が付いている（DevTools で確認）
- [ ] 設定した間隔（デフォルト 30秒）が経過したらコメントが来る
- [ ] 画面変化が少ない場合はスキップされる（閾値確認）
- [ ] コメント中は実況がスキップされる（`isSpeaking` チェック）

---

## 演出タグ確認（Phase 4.5 / 6 / 6.8）

> チャット入力欄にそのまま入力するか、システムプロンプト経由で LLM に出力させる

- [ ] `[laugh:short]` — 笑い SE が再生、タグが TTS テキストから除去される
- [ ] `[laugh:medium]` / `[laugh:big]` — 長さの異なる SE が再生される
- [ ] `[stunt:flinch]` — 表情（surprised）→ モーション（80ms 後）→ 画面シェイク
- [ ] `[stunt:desk_slam_light]` — 軽い机叩き SE + 小シェイク
- [ ] `[stunt:lean_in]` — SE なし、モーションのみ（happy 表情）
- [ ] `[bg:green]` — 背景がグリーンバックに 0.8s でフェード
- [ ] `[bg:ファイル名.png]` — public/backgrounds/ のファイルに切替
- [ ] ブラウザコンソールに `[TTFR] xxx ms` / `[TTFA] xxx ms` が出る
- [ ] L1 先出し: 「草ｗｗ」入力 → 本編より先に「ふふ」等が発話キューに入る

---

## JSONL エクスポート確認（Phase 3-2）

- [ ] 設定 → その他 → 「JSONL でダウンロード」ボタンが表示される
- [ ] ボタンをクリック → `chat-log-YYYY-MM-DD.jsonl` がダウンロードされる
- [ ] 各行が `{"ts":"...","role":"user"|"assistant","content":"..."}` 形式
- [ ] 画像メッセージは content が text 部分のみ出力される

---

## トラブルシューティング

| 症状                           | 確認箇所                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| コメントが来ない               | YouTube Live が公開配信か確認 / API キーの quota 確認                                 |
| 応答がない                     | AI API キーの確認 / ブラウザコンソールのエラー確認                                    |
| 音が出ない                     | TTS エンジン設定 / ブラウザの音声許可                                                 |
| キャラが表示されない           | VRM/Live2D ファイルのパス確認                                                         |
| SE が聞こえない（stunt/laugh） | `public/assets/reactions/` に WAV ファイルがあるか確認 / ブラウザの音声許可           |
| Deepgram が反応しない          | `DEEPGRAM_API_KEY` の確認 / WebSocket 接続エラーをコンソールで確認                    |
| 画面実況が来ない               | マルチモーダルモデルが選択されているか / `data-screen-capture` 属性を DevTools で確認 |

---

**最終更新**: 2026-05-23（Phase 4-6 項目追加）
