# 目標アーキテクチャ

```mermaid
flowchart TB
  subgraph inputs [入力]
    MIC[常時マイク STT Deepgram Live]
    SCR[画面キャプチャ]
    YT[YouTube / わんコメ]
    HUM[人間配信者の状態]
  end

  subgraph brain [判断]
    CTX[状況モデル 無音/画面差分/キュー]
    MEM[記憶 短期+RAG+任意mem0]
    LLM[LLM 応答+感情+行動]
    RXN[反応スケジューラ 先出し/笑い/間]
  end

  subgraph outputs [出力]
    TTS[TTS + 笑いSE]
    AVA[VRM / Live2D / PNG]
    ACT[行動 モーション/表情/割込]
    STG[演出 台パン/シェイク/道具]
  end

  MIC --> CTX
  SCR --> CTX
  YT --> CTX
  HUM --> CTX
  CTX --> MEM
  MEM --> LLM
  LLM --> RXN
  RXN --> TTS
  RXN --> AVA
  RXN --> ACT
  RXN --> STG
```

**設計原則**

1. **単一の発話キュー**（`SpeakQueue` 拡張）— 人間の発話中は AI が被らない優先度制御
2. **状況はストア1箇所** — `homeStore` または新 `sessionStore` に集約
3. **ブラウザ完結を優先** — mem0/Qdrant はサーバー負荷・運用が重いため Phase 3 で要否判断

---
