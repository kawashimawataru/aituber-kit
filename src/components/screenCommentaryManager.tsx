import { useCallback } from 'react'
import { useScreenCommentary } from '@/hooks/useScreenCommentary'
import { speakMessageHandler } from '@/features/chat/handlers'
import homeStore from '@/features/stores/home'
import { sanitizeVisionCommentaryText } from '@/utils/speakControlTags'

/**
 * 画面実況マネージャー
 * - 設定で有効化されると、キャプチャ中の画面を定期的にマルチモーダル LLM に送り実況させる
 * - Vision LLM にはキャラのシステムプロンプト・会話履歴・画面を渡すため、文脈を踏まえたコメントが生成される
 * - 生成したコメントは handleSendChat（二重 LLM）を経由せず直接 TTS 発話する
 */
function ScreenCommentaryManager(): null {
  const onCommentaryGenerated = useCallback((text: string, emotion: string) => {
    // 二重チェック: 発話中/処理中なら捨てる
    const hs = homeStore.getState()
    if (hs.isSpeaking || hs.chatProcessing) return

    const plainText = sanitizeVisionCommentaryText(text)
    if (!plainText) return

    // 感情は JSON の emotion フィールドのみ（text 内タグは使わない）
    const emotionTag = emotion && emotion !== 'neutral' ? `[${emotion}]` : ''
    const message = emotionTag ? `${emotionTag}${plainText}` : plainText

    void speakMessageHandler(message)
  }, [])

  useScreenCommentary(onCommentaryGenerated)

  return null
}

export default ScreenCommentaryManager
