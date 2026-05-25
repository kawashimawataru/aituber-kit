import { useEffect, useRef, useCallback } from 'react'
import settingsStore from '@/features/stores/settings'
import homeStore from '@/features/stores/home'
import {
  captureFrameFromVideo,
  computeFrameDiff,
} from '@/features/vision/screenCapture'
import { generateScreenCommentary } from '@/features/vision/screenCommentator'
import { updateSituation } from '@/features/chat/situationModel'
import { messageSelectors } from '@/features/messages/messageSelectors'
import { sanitizeVisionCommentaryText } from '@/utils/speakControlTags'
import {
  buildContextBlock,
  setScreenSummary,
} from '@/features/streaming/streamContext'

/**
 * 画面実況フック
 * - captureStatus が true（画面共有中）かつ screenCommentaryEnabled が true のとき動作
 * - screenCommentaryInterval 秒ごとにフレームをキャプチャ（起動直後も即実行）
 * - 前フレームとの差分が screenCommentaryThreshold 以上のときのみ LLM に送信
 * - AI設定・システムプロンプト・会話履歴を Vision LLM に渡してコンテキスト付き実況を生成
 * - 生成した実況コメントは直接 TTS 発話（handleSendChat 経由の二重 LLM なし）
 */
export function useScreenCommentary(
  onCommentaryGenerated: (text: string, emotion: string) => void
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFrameRef = useRef<string | null>(null)
  const isRunningRef = useRef(false)

  const capture = useCallback(
    async (videoEl: HTMLVideoElement) => {
      if (isRunningRef.current) return
      isRunningRef.current = true

      try {
        const ss = settingsStore.getState()
        const hs = homeStore.getState()

        // 発話中・AI処理中は実況しない（TTS キューの衝突を防ぐ）
        if (hs.isSpeaking || hs.chatProcessing) return

        const frame = captureFrameFromVideo(videoEl)

        // 差分チェック
        if (lastFrameRef.current) {
          const diff = await computeFrameDiff(lastFrameRef.current, frame)
          updateSituation({ screenChangeScore: diff })
          if (diff < ss.screenCommentaryThreshold) return
        }

        lastFrameRef.current = frame

        // 会話履歴（テキストのみ、直近 6 件）
        const chatLog = homeStore.getState().chatLog
        const recentMessages = messageSelectors
          .cutImageMessage(chatLog.slice(-6))
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: sanitizeVisionCommentaryText(
              typeof m.content === 'string' ? m.content : ''
            ),
          }))
          .filter((m) => m.content)

        // AI設定を UI 設定から取得
        const aiOptions = buildAiOptions(ss)

        // 配信状況コンテキスト（視聴者コメント・配信者発言）をプロンプトに注入
        const streamCtxBlock = buildContextBlock(ss.coStreamerName || undefined)

        const result = await generateScreenCommentary(frame, {
          ...aiOptions,
          customPrompt: ss.screenCommentaryPrompt || undefined,
          maxTokens: ss.screenCommentaryMaxTokens,
          systemPrompt: ss.systemPrompt || undefined,
          chatHistory: recentMessages,
          streamContext: streamCtxBlock || undefined,
        })

        if (result.text) {
          // 画面実況結果をコンテキストに保存（次回チャット呼び出しで参照される）
          setScreenSummary(result.text)
          onCommentaryGenerated(result.text, result.emotion)
        }
      } catch (err) {
        console.error('[ScreenCommentary] error:', err)
      } finally {
        isRunningRef.current = false
      }
    },
    [onCommentaryGenerated]
  )

  useEffect(() => {
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const tryCapture = () => {
      const hs = homeStore.getState()
      if (!hs.captureStatus) return

      const video = document.querySelector<HTMLVideoElement>(
        'video[data-screen-capture]'
      )
      if (!video || video.readyState < 2) return

      capture(video)
    }

    const start = () => {
      cleanup()

      const ss = settingsStore.getState()
      const intervalMs = ss.screenCommentaryInterval * 1000

      // 起動直後に即キャプチャ（30秒待ちを解消）
      tryCapture()

      intervalRef.current = setInterval(tryCapture, intervalMs)
    }

    const unsubscribe = settingsStore.subscribe((state, prev) => {
      const enabledChanged =
        state.screenCommentaryEnabled !== prev.screenCommentaryEnabled
      const intervalChanged =
        state.screenCommentaryInterval !== prev.screenCommentaryInterval

      if (enabledChanged || intervalChanged) {
        if (state.screenCommentaryEnabled) {
          start()
        } else {
          cleanup()
        }
      }
    })

    if (settingsStore.getState().screenCommentaryEnabled) {
      start()
    }

    return () => {
      cleanup()
      unsubscribe()
    }
  }, [capture])
}

/**
 * settingsStore の AI 設定を CommentaryOptions 形式に変換する
 */
function buildAiOptions(ss: ReturnType<typeof settingsStore.getState>) {
  const service = ss.selectAIService as string

  const keyMap: Record<string, string> = {
    openai: ss.openaiKey,
    anthropic: ss.anthropicKey,
    google: ss.googleKey,
    azure: ss.azureKey,
    xai: ss.xaiKey,
    groq: ss.groqKey,
    cohere: ss.cohereKey,
    mistralai: ss.mistralaiKey,
    perplexity: ss.perplexityKey,
    fireworks: ss.fireworksKey,
    deepseek: ss.deepseekKey,
    openrouter: ss.openrouterKey,
    lmstudio: ss.lmstudioKey,
    ollama: ss.ollamaKey,
  }

  return {
    aiService: service,
    model: ss.selectAIModel,
    apiKey: keyMap[service] || '',
    localLlmUrl: ss.localLlmUrl || '',
    azureEndpoint: ss.azureEndpoint || '',
  }
}
