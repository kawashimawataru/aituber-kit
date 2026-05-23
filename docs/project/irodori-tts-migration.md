# Irodori-TTS 移行計画

> **ステータス**: 未着手（将来対応）  
> **最終更新**: 2026-05-23

共演配信（Neuro 様方向）では、感情・笑い・相槌を TTS 側でも表現しやすい **Irodori-TTS** への移行を計画する。  
現状の **Style-Bert-VITS2（SBV2）** は開発・検証用として維持しつつ、本番音声は Irodori に切り替える方針。

---

## 現状

| 項目 | 状態 |
|------|------|
| AITuberKit TTS | SBV2 専用エンジンあり（`/api/stylebertvits2`） |
| Irodori-TTS | **未統合**（[phase-04-5](phases/phase-04-5-conversation-reality.md) の TTS 表にも「本 Kit には未統合」） |
| ローカルリポジトリ | 下記パスに **Irodori-TTS 本体** を clone 済み |
| API サーバー | **Irodori-TTS-Server** は未 clone（移行時に追加） |

---

## ローカル環境（このマシン）

AITuberKit と **同じ親ディレクトリ**（`Fuva_file`）に配置されている。

| 用途 | パス |
|------|------|
| **Irodori-TTS 本体**（推論・学習・Gradio） | `/Users/kawashimawataru/Desktop/Fuva_file/Irodori-TTS` |
| **AITuberKit**（本リポジトリ） | `/Users/kawashimawataru/Desktop/Fuva_file/aituber-kit` |
| **Irodori-TTS-Server**（移行時に clone 予定） | `/Users/kawashimawataru/Desktop/Fuva_file/Irodori-TTS-Server`（未作成） |

### Irodori-TTS リポジトリの主なエントリ

| ファイル | 用途 |
|----------|------|
| `infer.py` | CLI 推論（v3 ベース / 参照音声クローン） |
| `gradio_app.py` | Web UI（ベースモデル） |
| `gradio_app_voicedesign.py` | Web UI（VoiceDesign・キャプション制御） |
| `irodori_tts/` | Python パッケージ本体 |

セットアップはリポジトリ README に従う（`uv sync --extra cu128` 等）。Mac では `--extra cpu` も可だが推論は遅い可能性あり。

---

## なぜ Irodori か（SBV2 との役割分担）

| | Style-Bert-VITS2 | Irodori-TTS |
|--|------------------|-------------|
| 強み | スタイル名指定・ローカル運用が軽い | **絵文字による感情制御**、VoiceDesign、Flow Matching 品質 |
| 共演との相性 | 記号・伸ばしで近似 | Phase 4.5 の笑い・感情と **絵文字注入** で相性が良い |
| AITuberKit | 実装済み | これから |

**方針**: 短期は SBV2 で動作確認を続け、中期的に Irodori を第一 TTS にする。SBV2 設定は `.env` に残し、設定画面でエンジン切替できるようにする。

---

## 推奨アーキテクチャ

AITuberKit は **HTTP クライアント** のまま。推論は別プロセス。

```text
[AITuberKit ブラウザ]
    → POST /api/irodori-tts（新規・未実装）
        → [Irodori-TTS-Server :8088 など]
            → POST /v1/audio/speech  （OpenAI TTS 互換）
                → Irodori-TTS 推論（GPU 推奨）
    → SpeakQueue → Live2D / VRM リップシンク
```

公式: [Aratako/Irodori-TTS-Server](https://github.com/Aratako/Irodori-TTS-Server)  
Irodori-TTS 本体 README からもリンクされている。

### Irodori-TTS-Server の起動イメージ（移行時）

```bash
cd /Users/kawashimawataru/Desktop/Fuva_file/Irodori-TTS-Server
# clone 後
uv sync
cp .env.example .env
# voices/ に参照音声 sample.wav 等を配置
uv run python -m irodori_openai_tts --host 0.0.0.0 --port 8088
```

ヘルスチェック: `curl http://localhost:8088/health`

---

## AITuberKit 側の実装タスク（移行時）

既存 TTS 追加手順（`CLAUDE.md` / SBV2 実装）に沿う。

| # | タスク | ファイル例 |
|---|--------|------------|
| 1 | `AIVoice` に `irodoritts` 追加 | `src/features/constants/settings.ts` |
| 2 | 合成関数 | `src/features/messages/synthesizeVoiceIrodoriTts.ts` |
| 3 | API プロキシ | `src/pages/api/irodori-tts.ts` → Server の `/v1/audio/speech` |
| 4 | 再生分岐 | `src/features/messages/speakCharacter.ts` |
| 5 | 設定 UI | `src/components/settings/voice.tsx` |
| 6 | 環境変数 | `.env.example` — `IRODORI_TTS_SERVER_URL`, `NEXT_PUBLIC_*` |
| 7 | 感情→絵文字 | `Talk.emotion` / LLM 出力 → Irodori `input` へ（[EMOJI 仕様](https://github.com/Aratako/Irodori-TTS) 参照） |
| 8 | テスト | `src/__tests__/features/messages/` |

### 暫定ショートカット（検証のみ）

OpenAI TTS 経路に `baseURL` を渡せるようにすれば、Server を **OpenAI 互換**として試せる。  
ただし mp3 固定・絵文字 UI なしのため、**本番は専用エンジン（上表）を推奨**。

---

## 移行フェーズ（案）

| フェーズ | 内容 | 完了条件 |
|----------|------|----------|
| **I-0** | `Irodori-TTS-Server` を `Fuva_file` に clone、参照音声で curl 合成成功 | `speech.wav` が聞ける |
| **I-1** | AITuberKit に `irodoritts` エンジン追加（wav 返却） | 設定→音声テストで再生 |
| **I-2** | 感情→絵文字マッピング + Phase 4.5 連携 | `[happy]` / emotion と音声のトーンが一致 |
| **I-3** | SBV2 から本番切替、`.env` ドキュメント更新 | 共演 E2E で Irodori 経路のみ |
| **I-4**（任意） | VoiceDesign / LoRA / 参照音声カタログ UI | キャラ別 voice 選択 |

---

## 環境変数（移行時に追加予定）

```bash
# Irodori-TTS-Server（OpenAI 互換 API）
IRODORI_TTS_SERVER_URL="http://127.0.0.1:8088"
NEXT_PUBLIC_IRODORI_TTS_SERVER_URL="http://127.0.0.1:8088"
NEXT_PUBLIC_IRODORI_TTS_VOICE="sample"
NEXT_PUBLIC_IRODORI_TTS_MODEL="irodori-tts"
# ローカル Server は API キー不要のことが多い（ダミー可）
IRODORI_TTS_API_KEY=""
```

SBV2 用の `NEXT_PUBLIC_STYLEBERTVITS2_*` は **移行後も残す**（切り替え・フォールバック用）。

---

## 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| [phase-04-5-conversation-reality.md](phases/phase-04-5-conversation-reality.md) | 笑い・TTFR・Irodori 向き TTS メモ |
| [current-state.md](current-state.md) | 現状資産一覧 |
| [matrix.md](matrix.md) | 機能マトリクス |
| [../dev-log/STATUS.md](../dev-log/STATUS.md) | 進捗・優先順位 |

---

## メモ

- Irodori-TTS **v3** が `main` ブランチの想定。Server も v3 ベースモデルをデフォルト DL。
- **Live2D 表示問題**（Cubism Core バージョン）と **TTS 移行**は独立。並行して対応可能。
- 外部リンク: [Irodori-TTS](https://github.com/Aratako/Irodori-TTS) / [Irodori-TTS-Server](https://github.com/Aratako/Irodori-TTS-Server) / [Hugging Face コレクション](https://huggingface.co/collections/Aratako/irodori-tts)
