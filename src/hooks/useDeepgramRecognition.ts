import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import settingsStore from '@/features/stores/settings'
import toastStore from '@/features/stores/toast'
import homeStore from '@/features/stores/home'
import { SpeakQueue } from '@/features/messages/speakQueue'
import { updateSituation } from '@/features/chat/situationModel'
import {
  buildDeepgramLiveUrl,
  calculateRms,
  fetchDeepgramAuthKey,
  float32ToInt16,
  mergeDeepgramPartial,
  sendDeepgramCloseStream,
  DEEPGRAM_SILENCE_RMS,
  DEEPGRAM_VOICE_START_HOLD_MS,
} from '@/utils/deepgramLive'

/**
 * Deepgram Live Streaming（pngtuber-main 準拠）
 * - linear16 PCM ストリーミング
 * - 常時 ON: マイク常時開放 + VAD で発話検知 → 発話終了で自動送信
 * - endpointing / speech_final / UtteranceEnd で確定
 */
export function useDeepgramRecognition(
  onChatProcessStart: (text: string) => void
) {
  const { t } = useTranslation()
  const selectLanguage = settingsStore((s) => s.selectLanguage)
  const deepgramApiKey = settingsStore((s) => s.deepgramApiKey)
  const deepgramAutoSend = settingsStore((s) => s.deepgramAutoSend)
  const deepgramEndpointingMs = settingsStore((s) => s.deepgramEndpointingMs)
  const deepgramModel = settingsStore((s) => s.deepgramModel)
  const deepgramSilenceHoldMs = settingsStore((s) => s.deepgramSilenceHoldMs)
  const continuousMicListeningMode = settingsStore(
    (s) => s.continuousMicListeningMode
  )

  const [userMessage, setUserMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const isListeningRef = useRef(false)

  const wsRef = useRef<WebSocket | null>(null)
  const utteranceStreamRef = useRef<MediaStream | null>(null)
  const alwaysOnStreamRef = useRef<MediaStream | null>(null)
  const pcmContextRef = useRef<AudioContext | null>(null)
  const pcmProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const pcmSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const alwaysOnContextRef = useRef<AudioContext | null>(null)
  const alwaysOnAnalyserRef = useRef<AnalyserNode | null>(null)
  const alwaysOnRafRef = useRef<number | null>(null)
  const alwaysOnVoiceSinceRef = useRef<number | null>(null)
  const silenceAnalyserRef = useRef<AnalyserNode | null>(null)
  const silenceRafRef = useRef<number | null>(null)
  const silentSinceRef = useRef<number | null>(null)

  const utteranceActiveRef = useRef(false)
  const confirmedRef = useRef('')
  const partialRef = useRef('')
  const authKeyRef = useRef<string | null>(null)
  const inputSyncTimerRef = useRef<number | null>(null)

  const chatProcessing = homeStore((s) => s.chatProcessing)

  const syncInputFromTranscript = useCallback((immediate = false) => {
    const display = [confirmedRef.current, partialRef.current]
      .filter(Boolean)
      .join(' ')

    const apply = () => {
      setUserMessage(display)
      inputSyncTimerRef.current = null
    }

    if (immediate) {
      if (inputSyncTimerRef.current !== null) {
        clearTimeout(inputSyncTimerRef.current)
        inputSyncTimerRef.current = null
      }
      apply()
      return
    }

    if (inputSyncTimerRef.current !== null) return
    inputSyncTimerRef.current = window.setTimeout(apply, 80)
  }, [])

  const stopSilenceWatcher = useCallback(() => {
    if (silenceRafRef.current !== null) {
      cancelAnimationFrame(silenceRafRef.current)
      silenceRafRef.current = null
    }
    silentSinceRef.current = null
    try {
      silenceAnalyserRef.current?.disconnect()
    } catch {
      // ignore
    }
    silenceAnalyserRef.current = null
  }, [])

  const stopPcmPipeline = useCallback(() => {
    stopSilenceWatcher()
    if (pcmProcessorRef.current) {
      try {
        pcmProcessorRef.current.disconnect()
      } catch {
        // ignore
      }
      pcmProcessorRef.current.onaudioprocess = null
      pcmProcessorRef.current = null
    }
    try {
      pcmSourceRef.current?.disconnect()
    } catch {
      // ignore
    }
    pcmSourceRef.current = null
    if (pcmContextRef.current) {
      void pcmContextRef.current.close().catch(() => undefined)
      pcmContextRef.current = null
    }
  }, [stopSilenceWatcher])

  const closeDeepgramWs = useCallback(() => {
    sendDeepgramCloseStream(wsRef.current)
    if (wsRef.current) {
      try {
        wsRef.current.close()
      } catch {
        // ignore
      }
      wsRef.current = null
    }
  }, [])

  const canAutoSendNow = useCallback(() => {
    const hs = homeStore.getState()
    return !hs.isSpeaking && !hs.chatProcessing
  }, [])

  const dispatchTranscript = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (trimmed.length < 2) return

      if (!canAutoSendNow()) {
        setUserMessage(trimmed)
        return
      }

      confirmedRef.current = ''
      partialRef.current = ''
      setUserMessage(trimmed)

      updateSituation({ humanSpeaking: false })
      homeStore.setState({ chatProcessing: true })
      onChatProcessStart(trimmed)
    },
    [canAutoSendNow, onChatProcessStart]
  )

  const finalizeUtterance = useCallback(
    async (options?: { send?: boolean }) => {
      if (!utteranceActiveRef.current) return

      utteranceActiveRef.current = false
      stopPcmPipeline()
      closeDeepgramWs()

      if (partialRef.current) {
        confirmedRef.current = mergeDeepgramPartial(
          confirmedRef.current,
          partialRef.current
        )
        partialRef.current = ''
      }

      const text = confirmedRef.current.trim()
      confirmedRef.current = ''
      partialRef.current = ''

      const shouldSend =
        options?.send !== false &&
        deepgramAutoSend &&
        text.length >= 2 &&
        canAutoSendNow()

      if (shouldSend) {
        dispatchTranscript(text)
      } else if (text) {
        setUserMessage(text)
      } else {
        setUserMessage('')
      }

      if (
        !alwaysOnStreamRef.current &&
        utteranceStreamRef.current &&
        !continuousMicListeningMode
      ) {
        utteranceStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      utteranceStreamRef.current = null
    },
    [
      stopPcmPipeline,
      closeDeepgramWs,
      deepgramAutoSend,
      canAutoSendNow,
      dispatchTranscript,
      continuousMicListeningMode,
    ]
  )

  const handleDeepgramMessage = useCallback(
    (raw: string) => {
      if (!utteranceActiveRef.current) return

      let data: Record<string, unknown>
      try {
        data = JSON.parse(raw)
      } catch {
        return
      }

      if (data.type === 'Results') {
        const channel = data.channel as
          | { alternatives?: Array<{ transcript?: string }> }
          | undefined
        const alt = channel?.alternatives?.[0]
        if (!alt) return

        const transcript = (alt.transcript || '').trim()
        const isFinal = data.is_final === true
        const speechFinal = data.speech_final === true

        if (isFinal && transcript) {
          confirmedRef.current = mergeDeepgramPartial(
            confirmedRef.current,
            transcript
          )
          partialRef.current = ''
          syncInputFromTranscript(true)
        } else if (!isFinal && transcript) {
          updateSituation({ humanSpeaking: true })
          if (partialRef.current && transcript === partialRef.current) {
            confirmedRef.current = mergeDeepgramPartial(
              confirmedRef.current,
              partialRef.current
            )
            partialRef.current = ''
          } else {
            partialRef.current = transcript
          }
          syncInputFromTranscript()
        }

        if (speechFinal && deepgramAutoSend) {
          void finalizeUtterance({ send: true })
        } else if (speechFinal) {
          updateSituation({ humanSpeaking: false })
        }
      } else if (data.type === 'UtteranceEnd') {
        updateSituation({ humanSpeaking: false })
        if (deepgramAutoSend) {
          void finalizeUtterance({ send: true })
        }
      }
    },
    [deepgramAutoSend, finalizeUtterance, syncInputFromTranscript]
  )

  const startSilenceWatcher = useCallback(
    (stream: MediaStream) => {
      stopSilenceWatcher()
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      src.connect(analyser)
      silenceAnalyserRef.current = analyser

      const buf = new Float32Array(analyser.fftSize)
      const tick = () => {
        if (!utteranceActiveRef.current || !silenceAnalyserRef.current) return
        silenceAnalyserRef.current.getFloatTimeDomainData(buf)
        const rms = calculateRms(buf)
        const now = performance.now()

        if (rms < DEEPGRAM_SILENCE_RMS) {
          if (silentSinceRef.current === null) silentSinceRef.current = now
          if (now - silentSinceRef.current > deepgramSilenceHoldMs) {
            void finalizeUtterance({ send: deepgramAutoSend })
            return
          }
        } else {
          silentSinceRef.current = null
        }
        silenceRafRef.current = requestAnimationFrame(tick)
      }
      silenceRafRef.current = requestAnimationFrame(tick)
    },
    [
      stopSilenceWatcher,
      deepgramSilenceHoldMs,
      deepgramAutoSend,
      finalizeUtterance,
    ]
  )

  const beginUtteranceStream = useCallback(
    async (stream: MediaStream) => {
      if (utteranceActiveRef.current) return

      const authKey =
        authKeyRef.current || (await fetchDeepgramAuthKey(deepgramApiKey))
      if (!authKey) {
        toastStore.getState().addToast({
          message: t('Toasts.DeepgramApiKeyRequired'),
          type: 'error',
          tag: 'deepgram-no-key',
        })
        return
      }
      authKeyRef.current = authKey

      utteranceStreamRef.current = stream
      utteranceActiveRef.current = true
      confirmedRef.current = ''
      partialRef.current = ''
      setUserMessage('')

      const pcmContext = new AudioContext()
      pcmContextRef.current = pcmContext
      const sampleRate = pcmContext.sampleRate

      const wsUrl = buildDeepgramLiveUrl({
        language: selectLanguage,
        sampleRate,
        model: deepgramModel,
        endpointingMs: deepgramEndpointingMs,
      })

      const ws = new WebSocket(wsUrl, ['token', authKey])
      wsRef.current = ws

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Deepgram connection timeout')),
          8000
        )
        ws.onopen = () => {
          clearTimeout(timer)
          resolve()
        }
        ws.onerror = () => {
          clearTimeout(timer)
          reject(new Error('Deepgram WebSocket error'))
        }
      })

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          handleDeepgramMessage(event.data)
        }
      }

      ws.onclose = () => {
        if (utteranceActiveRef.current) {
          void finalizeUtterance({ send: false })
        }
      }

      startSilenceWatcher(stream)

      const source = pcmContext.createMediaStreamSource(stream)
      pcmSourceRef.current = source
      const processor = pcmContext.createScriptProcessor(4096, 1, 1)
      pcmProcessorRef.current = processor

      processor.onaudioprocess = (ev) => {
        if (
          !utteranceActiveRef.current ||
          !wsRef.current ||
          wsRef.current.readyState !== WebSocket.OPEN
        ) {
          return
        }
        const input = ev.inputBuffer.getChannelData(0)
        const int16 = float32ToInt16(input)
        try {
          wsRef.current.send(int16.buffer)
        } catch {
          // ignore
        }
      }

      source.connect(processor)
      const mute = pcmContext.createGain()
      mute.gain.value = 0
      processor.connect(mute)
      mute.connect(pcmContext.destination)
    },
    [
      deepgramApiKey,
      selectLanguage,
      deepgramModel,
      deepgramEndpointingMs,
      handleDeepgramMessage,
      finalizeUtterance,
      startSilenceWatcher,
      t,
    ]
  )

  const stopAlwaysOnLoop = useCallback(() => {
    if (alwaysOnRafRef.current !== null) {
      cancelAnimationFrame(alwaysOnRafRef.current)
      alwaysOnRafRef.current = null
    }
    alwaysOnVoiceSinceRef.current = null
    try {
      alwaysOnAnalyserRef.current?.disconnect()
    } catch {
      // ignore
    }
    alwaysOnAnalyserRef.current = null
    if (alwaysOnContextRef.current) {
      void alwaysOnContextRef.current.close().catch(() => undefined)
      alwaysOnContextRef.current = null
    }
    if (alwaysOnStreamRef.current) {
      alwaysOnStreamRef.current.getTracks().forEach((track) => track.stop())
      alwaysOnStreamRef.current = null
    }
  }, [])

  const startAlwaysOnLoop = useCallback(async () => {
    if (alwaysOnStreamRef.current) return

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

    alwaysOnStreamRef.current = stream
    const ctx = new AudioContext()
    alwaysOnContextRef.current = ctx
    const src = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    src.connect(analyser)
    alwaysOnAnalyserRef.current = analyser

    const buf = new Float32Array(analyser.fftSize)
    const tick = () => {
      if (!isListeningRef.current || !alwaysOnAnalyserRef.current) return

      if (!utteranceActiveRef.current) {
        alwaysOnAnalyserRef.current.getFloatTimeDomainData(buf)
        const rms = calculateRms(buf)
        const now = performance.now()

        if (rms >= DEEPGRAM_SILENCE_RMS) {
          if (alwaysOnVoiceSinceRef.current === null) {
            alwaysOnVoiceSinceRef.current = now
          }
          if (
            now - alwaysOnVoiceSinceRef.current >=
              DEEPGRAM_VOICE_START_HOLD_MS &&
            canAutoSendNow()
          ) {
            alwaysOnVoiceSinceRef.current = null
            void beginUtteranceStream(alwaysOnStreamRef.current!)
          }
        } else {
          alwaysOnVoiceSinceRef.current = null
        }
      }

      alwaysOnRafRef.current = requestAnimationFrame(tick)
    }
    alwaysOnRafRef.current = requestAnimationFrame(tick)
  }, [beginUtteranceStream, canAutoSendNow, t])

  const stopListening = useCallback(async () => {
    isListeningRef.current = false
    setIsListening(false)

    await finalizeUtterance({ send: false })
    stopAlwaysOnLoop()
    authKeyRef.current = null
    confirmedRef.current = ''
    partialRef.current = ''
    setUserMessage('')
  }, [finalizeUtterance, stopAlwaysOnLoop])

  const startListening = useCallback(async () => {
    if (isListeningRef.current) return

    isListeningRef.current = true
    setIsListening(true)

    if (continuousMicListeningMode) {
      await startAlwaysOnLoop()
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      isListeningRef.current = false
      setIsListening(false)
      toastStore.getState().addToast({
        message: t('Toasts.MicrophonePermissionDenied'),
        type: 'error',
        tag: 'microphone-permission-error',
      })
      return
    }

    try {
      await beginUtteranceStream(stream)
    } catch (error) {
      console.error('Deepgram utterance start failed:', error)
      stream.getTracks().forEach((track) => track.stop())
      isListeningRef.current = false
      setIsListening(false)
    }
  }, [continuousMicListeningMode, startAlwaysOnLoop, beginUtteranceStream, t])

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      if (utteranceActiveRef.current) {
        void finalizeUtterance({ send: deepgramAutoSend })
      } else {
        void stopListening()
      }
    } else {
      homeStore.setState({ isSpeaking: false })
      SpeakQueue.stopAll()
      void startListening()
    }
  }, [finalizeUtterance, deepgramAutoSend, stopListening, startListening])

  const handleSendMessage = useCallback(async () => {
    const msg = userMessage.trim()
    if (!msg) return
    homeStore.setState({ isSpeaking: false })
    SpeakQueue.stopAll()
    await finalizeUtterance({ send: false })
    if (continuousMicListeningMode) {
      isListeningRef.current = true
      setIsListening(true)
      if (!alwaysOnStreamRef.current) {
        await startAlwaysOnLoop()
      }
    } else {
      await stopListening()
    }
    homeStore.setState({ chatProcessing: true })
    onChatProcessStart(msg)
    setUserMessage('')
  }, [
    userMessage,
    onChatProcessStart,
    finalizeUtterance,
    continuousMicListeningMode,
    startAlwaysOnLoop,
    stopListening,
  ])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setUserMessage(e.target.value)
    },
    []
  )

  const checkRecognitionActive = useCallback(() => {
    if (!isListeningRef.current) return false
    if (continuousMicListeningMode) {
      return alwaysOnStreamRef.current !== null
    }
    return utteranceActiveRef.current
  }, [continuousMicListeningMode])

  useEffect(() => {
    if (chatProcessing) {
      if (inputSyncTimerRef.current !== null) {
        clearTimeout(inputSyncTimerRef.current)
        inputSyncTimerRef.current = null
      }
      setUserMessage('')
      confirmedRef.current = ''
      partialRef.current = ''
    }
  }, [chatProcessing])

  useEffect(() => {
    return () => {
      if (inputSyncTimerRef.current !== null) {
        clearTimeout(inputSyncTimerRef.current)
      }
      void stopListening()
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
      checkRecognitionActive,
    }),
    [
      userMessage,
      isListening,
      handleInputChange,
      handleSendMessage,
      toggleListening,
      startListening,
      stopListening,
      checkRecognitionActive,
    ]
  )
}
