import { useCallback } from 'react'
import { useScreenCommentary } from '@/hooks/useScreenCommentary'
import { handleSendChatFn } from '@/features/chat/handlers'
import homeStore from '@/features/stores/home'

/**
 * 画面実況マネージャー
 * - 設定で有効化されると、キャプチャ中の画面を定期的に LLM に送り実況させる
 * - 実況テキストは通常の handleSendChat フローで処理される（チャットログに残る）
 */
function ScreenCommentaryManager(): null {
  const handleSendChat = handleSendChatFn()

  const onCommentaryGenerated = useCallback(
    (text: string, emotion: string) => {
      // AI発話中・チャット処理中はスキップ（二重割込み防止）
      const hs = homeStore.getState()
      if (hs.isSpeaking || hs.chatProcessing) return

      const emotionTag = emotion && emotion !== 'neutral' ? `[${emotion}]` : ''
      const message = emotionTag ? `${emotionTag}${text}` : text

      homeStore.setState({ chatProcessing: true })
      handleSendChat(message)
    },
    [handleSendChat]
  )

  useScreenCommentary(onCommentaryGenerated)

  return null
}

export default ScreenCommentaryManager
