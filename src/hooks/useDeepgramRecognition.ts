import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import settingsStore from '@/features/stores/settings'
import toastStore from '@/features/stores/toast'
import homeStore from '@/features/stores/home'
import { SpeakQueue } from '@/features/messages/speakQueue'
import { updateSituation } from '@/features/chat/situationModel'

const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen'

// Deepgram Live Streaming API のクエリパラメータ
function buildDeepgramUrl(language: string): string {
  const langCode = language === 'ja' ? 'ja' : language === 'zh-CN' || language === 'zh-TW' ? 'zh' : language === 'ko' ? 'ko' : 'en-US'
  const params = new URLSearchParams({
    model: 'nova-2',
    language: langCode,
    punctuate: 'true',
    endpointing: '300',
    utterance_end_ms: '1000',
    interim_results: 'true',
    smart_format: 'true',
  })
  return `${DEEPGRAM_WS_URL}?${params.toString()}`
}

/**
 * Deepgram Live Streaming APIを使用した常時ON音声認識フック
 */
export function useDeepgramRecognition(
  onChatProcessStart: (text: string) => void
) {
  const { t } = useTranslation()
  const selectLanguage = settingsStore((s) => s.selectLanguage)
  const deepgramApiKey = settingsStore((s) => s.deepgramApiKey)

  const [userMessage, setUserMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const isListeningRef = useRef(false)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const interimTranscriptRef = useRef('')
  const finalTranscriptRef = useRef('')
  const utteranceBufferRef = useRef<string[]>([])

  const stopListening = useCallback(async () => {
    isListeningRef.current = false
    setIsListening(false)

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    setUserMessage('')
  }, [])

  const startListening = useCallback(async () => {
    if (isListeningRef.current) return

    const apiKey = deepgramApiKey || process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY

    if (!apiKey) {
      // サーバーサイドのトークンエンドポイントから取得を試みる
      let token: string | null = null
      try {
        const resp = await fetch('/api/stt-deepgram-token', { method: 'POST' })
        if (resp.ok) {
          const data = await resp.json()
          token = data.token
        }
      } catch {
        // ignore
      }

      if (!token) {
        toastStore.getState().addToast({
          message: t('Toasts.DeepgramApiKeyRequired'),
          type: 'error',
          tag: 'deepgram-no-key',
        })
        return
      }
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      toastStore.getState().addToast({
        message: t('Toasts.MicrophonePermissionDenied'),
        type: 'error',
        tag: 'microphone-permission-error',
      })
      return
    }

    streamRef.current = stream

    const wsUrl = buildDeepgramUrl(selectLanguage)
    const authKey = deepgramApiKey || ''

    // トークン or APIキー直接認証
    let ws: WebSocket
    try {
      ws = new WebSocket(wsUrl, ['token', authKey])
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      return
    }

    wsRef.current = ws

    ws.onopen = () => {
      isListeningRef.current = true
      setIsListening(true)
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      utteranceBufferRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data)
        }
      }

      mr.start(100) // 100ms ごとにチャンク送信
    }

    ws.onmessage = (event) => {
      if (!isListeningRef.current) return

      let data: any
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }

      if (data.type === 'Results') {
        const alt = data.channel?.alternatives?.[0]
        if (!alt) return

        const transcript: string = alt.transcript || ''
        const isFinal: boolean = data.is_final === true
        const speechFinal: boolean = data.speech_final === true

        if (isFinal && transcript.trim()) {
          // 最終確定テキストをバッファに追加
          utteranceBufferRef.current.push(transcript.trim())
          interimTranscriptRef.current = ''
          finalTranscriptRef.current = utteranceBufferRef.current.join(' ')
          setUserMessage(finalTranscriptRef.current)
        } else if (!isFinal && transcript) {
          // 暫定認識中 = 人間が話している
          updateSituation({ humanSpeaking: true })
          interimTranscriptRef.current = transcript
          setUserMessage(
            [finalTranscriptRef.current, transcript].filter(Boolean).join(' ')
          )
        }

        // speech_final = 発話の切れ目 → 送信トリガー
        if (speechFinal && utteranceBufferRef.current.length > 0) {
          updateSituation({ humanSpeaking: false })
          const toSend = utteranceBufferRef.current.join(' ')
          utteranceBufferRef.current = []
          finalTranscriptRef.current = ''
          interimTranscriptRef.current = ''
          setUserMessage('')

          // AI発話中は蓄積しない（割り込み防止）
          if (!homeStore.getState().isSpeaking) {
            homeStore.setState({ chatProcessing: true })
            onChatProcessStart(toSend)
          }
        } else if (speechFinal) {
          // バッファが空でも speech_final なら話し終わり
          updateSituation({ humanSpeaking: false })
        }
      } else if (data.type === 'UtteranceEnd') {
        // フォールバック: utterance_end_ms 経過後の確定
        updateSituation({ humanSpeaking: false })
        if (utteranceBufferRef.current.length > 0) {
          const toSend = utteranceBufferRef.current.join(' ')
          utteranceBufferRef.current = []
          finalTranscriptRef.current = ''
          interimTranscriptRef.current = ''
          setUserMessage('')

          if (!homeStore.getState().isSpeaking) {
            homeStore.setState({ chatProcessing: true })
            onChatProcessStart(toSend)
          }
        }
      }
    }

    ws.onerror = (err) => {
      console.error('Deepgram WebSocket error:', err)
    }

    ws.onclose = (ev) => {
      if (isListeningRef.current) {
        console.warn('Deepgram WS closed unexpectedly, code:', ev.code)
        // 常時リスニングモードなら再接続
        if (settingsStore.getState().continuousMicListeningMode) {
          setTimeout(() => {
            if (isListeningRef.current) {
              stopListening().then(startListening)
            }
          }, 1000)
        } else {
          isListeningRef.current = false
          setIsListening(false)
        }
      }
    }
  }, [deepgramApiKey, selectLanguage, onChatProcessStart, stopListening, t])

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening()
    } else {
      homeStore.setState({ isSpeaking: false })
      SpeakQueue.stopAll()
      startListening()
    }
  }, [startListening, stopListening])

  const handleSendMessage = useCallback(async () => {
    const msg = userMessage.trim()
    if (!msg) return
    homeStore.setState({ isSpeaking: false })
    SpeakQueue.stopAll()
    await stopListening()
    onChatProcessStart(msg)
    setUserMessage('')
  }, [userMessage, onChatProcessStart, stopListening])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setUserMessage(e.target.value)
    },
    []
  )

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (isListeningRef.current) {
        stopListening()
      }
    }
  }, [stopListening])

  return useMemo(
    () => ({
      userMessage,
      isListening,
      isProcessing: false,
      silenceTimeoutRemaining: null,
      handleInputChange,
      handleSendMessage,
      toggleListening,
      startListening,
      stopListening,
    }),
    [
      userMessage,
      isListening,
      handleInputChange,
      handleSendMessage,
      toggleListening,
      startListening,
      stopListening,
    ]
  )
}
