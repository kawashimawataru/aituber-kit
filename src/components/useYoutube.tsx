import { useCallback, useEffect, useRef } from 'react'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'
import {
  fetchAndProcessComments,
  resetYoutubeState,
  YouTubeComment,
} from '@/features/youtube/youtubeComments'
import { useOneComme } from '@/features/youtube/useOneComme'

interface Params {
  handleSendChat: (text: string, userName?: string) => Promise<void>
}

interface UseYoutubeReturn {
  oneCommeStatus: {
    isConnected: boolean
    isLoading: boolean
    error: string | null
  }
}

const useYoutube = ({ handleSendChat }: Params): UseYoutubeReturn => {
  const youtubePlaying = settingsStore((s) => s.youtubePlaying)
  const youtubeCommentInterval = settingsStore((s) => s.youtubeCommentInterval)
  const youtubeCommentSource = settingsStore((s) => s.youtubeCommentSource)
  const onecommePort = settingsStore((s) => s.onecommePort)
  const twitchMode = settingsStore((s) => s.twitchMode)
  const twitchPlaying = settingsStore((s) => s.twitchPlaying)

  // どちらかのモードが再生中
  const isStreamingPlaying = youtubePlaying || twitchPlaying

  // わんコメコメント用バッファ
  const commentBufferRef = useRef<YouTubeComment[]>([])

  // handleSendChat をrefで保持し、useCallbackの依存から外す
  const handleSendChatRef = useRef(handleSendChat)
  handleSendChatRef.current = handleSendChat

  // 多重実行防止用ref
  const isProcessingRef = useRef(false)

  // わんコメ接続: YouTube+onecomme または Twitchモード再生中に有効化
  const {
    isConnected: oneCommeConnected,
    isLoading: oneCommeLoading,
    error: oneCommeError,
  } = useOneComme({
    enabled:
      (youtubeCommentSource === 'onecomme' && youtubePlaying) ||
      (twitchMode && twitchPlaying),
    port: onecommePort,
    commentBufferRef,
  })

  const fetchAndProcessCommentsCallback = useCallback(async () => {
    const ss = settingsStore.getState()
    const hs = homeStore.getState()

    const streamingActive =
      (ss.youtubeMode && ss.youtubePlaying) ||
      (ss.twitchMode && ss.twitchPlaying)

    if (
      isProcessingRef.current ||
      hs.chatProcessing ||
      hs.chatProcessingCount > 0 ||
      !streamingActive
    ) {
      return
    }

    isProcessingRef.current = true
    try {
      if (
        ss.youtubeMode &&
        ss.youtubePlaying &&
        ss.youtubeCommentSource === 'youtube-api'
      ) {
        // YouTube APIモード: 従来通り
        if (!ss.youtubeLiveId || !ss.youtubeApiKey) return
        console.log('Call fetchAndProcessComments !!!')
        await fetchAndProcessComments(handleSendChatRef.current)
      } else {
        // わんコメモード (YouTube or Twitch): バッファをドレインして渡す
        const bufferedComments = [...commentBufferRef.current]
        commentBufferRef.current = []
        console.log(
          'Call fetchAndProcessComments (OneComme) !!!',
          'buffered:',
          bufferedComments.length
        )
        await fetchAndProcessComments(
          handleSendChatRef.current,
          bufferedComments
        )
      }
    } finally {
      isProcessingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isStreamingPlaying) return
    fetchAndProcessCommentsCallback()

    const intervalId = setInterval(() => {
      fetchAndProcessCommentsCallback()
    }, youtubeCommentInterval * 1000)

    return () => {
      clearInterval(intervalId)
      resetYoutubeState()
    }
  }, [
    isStreamingPlaying,
    youtubeCommentInterval,
    fetchAndProcessCommentsCallback,
  ])

  return {
    oneCommeStatus: {
      isConnected: oneCommeConnected,
      isLoading: oneCommeLoading,
      error: oneCommeError,
    },
  }
}

export default useYoutube
