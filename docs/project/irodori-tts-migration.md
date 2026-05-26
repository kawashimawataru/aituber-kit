# Irodori-TTS 運用ガイド

> **ステータス**: 統合済み・稼働中  
> **最終更新**: 2026-05-27

---

## 現状（統合済み）

| 項目 | 状態 |
|---|---|
| AITuberKit TTS | `irodoritts` エンジン実装済み（`/api/irodori-tts`） |
| Irodori-TTS サーバー | `Fuva_file/Irodori-TTS/server.py` を使用 |
| 感情→絵文字注入 | 実装済み（設定で ON/OFF 可） |
| プリフェッチ合成 | 実装済み（`prefetchSpeakPipeline.ts`） |
| 文末チャンク分割 | クライアント側で `。！？` 単位に分割済み |

---

## ローカル環境

| 用途 | パス |
|---|---|
| **Irodori-TTS 本体・サーバー** | `/Users/kawashimawataru/Desktop/Fuva_file/Irodori-TTS` |
| **AITuberKit** | `/Users/kawashimawataru/Desktop/Fuva_file/aituber-kit` |

---

## 推奨起動コマンド（Mac / Apple Silicon MPS）

```bash
cd /Users/kawashimawataru/Desktop/Fuva_file/Irodori-TTS

uv run python server.py \
  --checkpoint Aratako/Irodori-TTS-500M-v3 \
  --no-split \
  --no-watermark \
  --default-seed 21 \
  --num-steps 6
```

### フラグ解説

| フラグ | 理由 |
|---|---|
| `--no-split` | クライアント側がすでに文単位に分割して送る。サーバー内二重分割を防ぐ |
| `--no-watermark` | SilentCipher（48kHz→44.1kHz リサンプル）は MPS でクラッシュの原因。個人利用に不要。約 1.9s 節約 |
| `--default-seed 21` | クライアントが seed を送らなかった場合のフォールバック。声のブレを抑制 |
| `--num-steps 6` | デフォルト 8 から削減。音質への影響は軽微で約 700ms 節約 |

---

## 速度改善の記録（2026-05-27）

### 問題

`decode_latent`（DACVAE デコード）が CPU で動作しており 3.4 秒かかっていた。

```
# 変更前（steps=8, watermark あり, codec=CPU）
decode_latent=3404ms  sample_rf=2742ms  silentcipher_watermark=1885ms
合計推論: ~8.6s  RTF=1.75
```

### 原因

`server.py` の `RuntimeKey` は `codec_device` を指定しないと CPU がデフォルトになっていた。
DiT モデル（MPS）とコーデック（CPU）でデバイスが分離されていた。

### 対応内容（`Fuva_file/Irodori-TTS/server.py`）

1. `--codec-device` CLI 引数を追加
2. 未指定時は `--device` と同じデバイス（MPS）を自動使用するよう変更
3. `RuntimeKey` に `codec_device=codec_device` を渡すよう修正

```python
# 変更箇所（server.py main()）
codec_device = args.codec_device or device
key = RuntimeKey(
    checkpoint=checkpoint_path,
    model_device=device,
    codec_device=codec_device,   # ← 追加
    compile_model=...,
)
```

### 期待効果

| 処理 | 変更前 | 変更後（推定） |
|---|---|---|
| decode_latent（コーデック） | 3404ms (CPU) | ~800ms (MPS) |
| sample_rf（拡散） | 2742ms (steps=8) | ~2050ms (steps=6) |
| silentcipher_watermark | 1885ms | 0ms (--no-watermark) |
| **合計** | **~8.6s** | **~3.4s** |

コーデックが MPS でクラッシュする場合は `--codec-device cpu` で元に戻せる。

---

## 声の安定化設定

### 問題：会話中に声が別人レベルで変わる

**原因①：シード未固定**  
`irodoriTtsSeed = 0`（毎回ランダム）のままだと生成ごとに声の質感がブレる。

**対応**：設定 → 音声 → IrodoriTTS の「シード（声のブレ抑制）」に固定値（例: `21`）を入力。

---

**原因②：感情タグ絵文字注入**  
感情が変わるたびにテキスト先頭に絵文字が付き（`🤭`, `😭`, `😠` 等）、モデルへの強いスタイル指示になる。シード固定しても感情切り替えのたびに声が大きく変わる。

| 感情 | 送信テキスト |
|---|---|
| neutral | `こんにちは！` |
| happy | `🤭こんにちは！` |
| angry | `😠こんにちは！` |

**対応**：設定 → 音声 → IrodoriTTS の「感情タグを絵文字で付与」を **OFF** にする。

---

## MPS クラッシュ対応

`commit an already committed command buffer` エラーは SilentCipher ウォーターマーク処理が MPS 上でクラッシュするもの。`--no-watermark` で解消する（上記起動コマンドに含む）。

それでもクラッシュする場合：

```bash
uv run python server.py \
  --checkpoint Aratako/Irodori-TTS-500M-v3 \
  --no-split \
  --no-watermark \
  --default-seed 21 \
  --num-steps 6 \
  --device cpu      # ← 安定するが遅い
```

---

## AITuberKit 側の実装ファイル

| ファイル | 役割 |
|---|---|
| `src/features/messages/synthesizeVoiceIrodoriTts.ts` | 合成関数（感情→絵文字変換含む） |
| `src/pages/api/irodori-tts.ts` | Next.js API プロキシ（`/v1/audio/speech` へ転送） |
| `src/features/messages/speakCharacter.ts` | TTS 分岐・プリフェッチパイプライン呼び出し |
| `src/features/messages/prefetchSpeakPipeline.ts` | 並列合成・順序再生パイプライン |
| `src/utils/ttsSentenceSplit.ts` | `extractSentenceSentenceEnd`：`。！？` で文チャンク分割 |
| `src/utils/irodoriTtsEmotion.ts` | 感情→絵文字マッピング |
| `src/components/settings/voice.tsx` | 設定 UI（サーバー URL, voice, speed, seed, steps, sway 等） |

### 設定ストアのキー（`src/features/stores/settings.ts`）

```typescript
irodoriTtsServerUrl    // サーバー URL（例: http://127.0.0.1:8088）
irodoriTtsApiKey       // Bearer トークン（未設定なら空）
irodoriTtsVoice        // voices/ 内のスピーカー名
irodoriTtsModel        // モデル名（デフォルト: irodori-tts）
irodoriTtsSpeed        // 速度倍率
irodoriTtsInjectEmotion // 感情絵文字注入 ON/OFF
irodoriTtsSeed         // 0=ランダム、1以上=固定
irodoriTtsNumSteps     // 0=サーバーデフォルト、正数=オーバーライド
irodoriTtsSwayCoeff    // 0=サーバーデフォルト
```

---

## 関連ドキュメント

| ファイル | 内容 |
|---|---|
| [current-state.md](current-state.md) | 現状資産一覧 |
| [../dev-log/STATUS.md](../dev-log/STATUS.md) | 進捗・優先順位 |
