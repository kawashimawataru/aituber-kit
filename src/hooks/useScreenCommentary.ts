import { useEffect, useRef, useCallback } from 'react'
import settingsStore from '@/features/stores/settings'
import homeStore from '@/features/stores/home'
import { captureFrameFromVideo, computeFrameDiff } from '@/features/vision/screenCapture'
import { generateScreenCommentary } from '@/features/vision/screenCommentator'

/**
 * 画面実況フック
 * - captureStatus が true（画面共有中）かつ screenCommentaryEnabled が true のとき動作
 * - screenCommentaryInterval 秒ごとにフレームをキャプチャ
 * - 前フレームとの差分が screenCommentaryThreshold 以上のときのみ LLM に送信
 * - 生成した実況コメントを handleSendChat と同じフローに乗せる
 */
export function useScreenCommentary(
  onCommentaryGenerated: (text: string, emotion: string) => void
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFrameRef = useRef<string | null>(null)
  const isRunningRef = useRef(false)

  const capture = useCallback(async (videoEl: HTMLVideoElement) => {
    if (isRunningRef.current) return
    isRunningRef.current = true

    try {
      const ss = settingsStore.getState()
      const hs = homeStore.getState()

      // AI発話中・チャット処理中は実況しない（割り込み防止）
      if (hs.isSpeaking || hs.chatProcessing) return

      const frame = captureFrameFromVideo(videoEl)

      // 差分チェック
      if (lastFrameRef.current) {
        const diff = await computeFrameDiff(lastFrameRef.current, frame)
        if (diff < ss.screenCommentaryThreshold) return
      }

      lastFrameRef.current = frame

      const result = await generateScreenCommentary(
        frame,
        ss.screenCommentaryPrompt || undefined
      )

      if (result.text) {
        onCommentaryGenerated(result.text, result.emotion)
      }
    } catch (err) {
      console.error('[ScreenCommentary] error:', err)
    } finally {
      isRunningRef.current = false
    }
  }, [onCommentaryGenerated])

  useEffect(() => {
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const start = () => {
      cleanup()

      const ss = settingsStore.getState()
      const intervalMs = ss.screenCommentaryInterval * 1000

      intervalRef.current = setInterval(() => {
        const hs = homeStore.getState()
        if (!hs.captureStatus) return

        // DOM から video 要素を取得（capture.tsx がレンダリングしたもの）
        const video = document.querySelector<HTMLVideoElement>(
          'video[data-screen-capture]'
        )
        if (!video || video.readyState < 2) return

        capture(video)
      }, intervalMs)
    }

    // settingsStore の変化を購読
    const unsubscribe = settingsStore.subscribe((state, prev) => {
      const enabledChanged = state.screenCommentaryEnabled !== prev.screenCommentaryEnabled
      const intervalChanged = state.screenCommentaryInterval !== prev.screenCommentaryInterval

      if (enabledChanged || intervalChanged) {
        if (state.screenCommentaryEnabled) {
          start()
        } else {
          cleanup()
        }
      }
    })

    // 初期状態でONなら開始
    if (settingsStore.getState().screenCommentaryEnabled) {
      start()
    }

    return () => {
      cleanup()
      unsubscribe()
    }
  }, [capture])
}
