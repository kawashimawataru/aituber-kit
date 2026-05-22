# フェーズ一覧

> 各 Phase の詳細タスク・完了条件は個別ファイルを参照。

## フェーズドキュメント

| Phase | ドキュメント | マイルストーン |
|-------|-------------|----------------|
| 0 | [配信基盤](phase-00-foundation.md) | M1 |
| 1 | [STT / Deepgram](phase-01-stt-deepgram.md) | M2 |
| 2 | [画面実況](phase-02-screen-commentary.md) | M3 |
| 3 | [記憶](phase-03-memory.md) | — |
| 4 | [能動発話](phase-04-proactive-speech.md) | M4 |
| 4.5 | [会話リアリティ](phase-04-5-conversation-reality.md) | M4.5 |
| 5 | [共演配信](phase-05-co-streaming.md) | M5 |
| 6 | [身体性演出](phase-06-staging.md) | M6 |

## マイルストーン

| マイルストーン | 内容 | 想定 Phase |
|----------------|------|------------|
| **M1** | 配信コメント + VRM 安定起動 | 0 |
| **M2** | Deepgram 常時 STT で人間の声がテキスト化 | 1 |
| **M3** | 画面共有実況が1ループ動く | 2 |
| **M4** | コメント枯れ・画面変化で能動発話 | 4 |
| **M4.5** | 笑い/相槌が 1.5s 以内・本編が続く「ワンセット」 | 4.5 |
| **M5** | 人間との1回共演配信完了 | 5 |
| **M6** | 台パン等が音・動き・画面で同期した「ワンショット」 | 6 |

---


## 次のアクション（実装着手順）

1. **Phase 0** を完了し、配信モードの E2E を確認する  
2. **Phase 1** の Deepgram Live 設計レビュー（API プロキシ方式の確定）  
3. **Phase 2** は `getDisplayMedia` プロトタイプを `src/features/vision/` に追加  
4. **Phase 3** は M3 運用後に GO/NO-GO を[current-state.md](../current-state.md) に追記  
5. **Phase 4** でアイドルモードを「能動発話エンジン」に統合  
6. **Phase 4.5** は Phase 1（STT 確定の速さ）と並行または直後 — 反応速度の体感に直結  
7. **Phase 6** は M4.5 以降 — 身体性演出はタイミング基盤の上に載せる  

---
