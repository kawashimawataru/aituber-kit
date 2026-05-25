import { useCallback, useEffect } from 'react'
import { MessageInput } from '@/components/messageInput'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'

type Props = {
  onChatProcessStart: (text: string) => void
}

export const MessageInputContainer = ({ onChatProcessStart }: Props) => {
  const isSpeaking = homeStore((s) => s.isSpeaking)
  const continuousMicListeningMode = settingsStore(
    (s) => s.continuousMicListeningMode
  )
  const speechRecognitionMode = settingsStore((s) => s.speechRecognitionMode)
  const deepgramAutoSend = settingsStore((s) => s.deepgramAutoSend)
  const realtimeAPIMode = settingsStore((s) => s.realtimeAPIMode)
  const audioMode = settingsStore((s) => s.audioMode)

  const {
    userMessage,
    isListening,
    isTranscribing,
    silenceTimeoutRemaining,
    handleInputChange,
    handleSendMessage,
    toggleListening,
    handleStopSpeaking,
    startListening,
    stopListening,
  } = useVoiceRecognition({ onChatProcessStart })

  // ユーザー発話テキストをhomeStoreに同期（UserSpeechDisplay用）
  useEffect(() => {
    homeStore.setState({ displayUserSpeech: userMessage })
  }, [userMessage])

  const handleContinuousMicChange = useCallback(
    async (enabled: boolean) => {
      if (speechRecognitionMode === 'whisper') return

      settingsStore.setState({ continuousMicListeningMode: enabled })

      if (!enabled && isListening) {
        await stopListening()
        return
      }

      const hs = homeStore.getState()
      if (enabled && !isListening && !hs.isSpeaking && !hs.chatProcessing) {
        await startListening()
      }
    },
    [speechRecognitionMode, isListening, stopListening, startListening]
  )

  const handleDeepgramAutoSendChange = useCallback((enabled: boolean) => {
    settingsStore.setState({ deepgramAutoSend: enabled })
  }, [])

  const showSpeechInputToggles =
    !realtimeAPIMode &&
    !audioMode &&
    (speechRecognitionMode === 'browser' ||
      speechRecognitionMode === 'deepgram')

  return (
    <MessageInput
      userMessage={userMessage}
      isMicRecording={isListening}
      onChangeUserMessage={handleInputChange}
      onClickMicButton={toggleListening}
      onClickSendButton={handleSendMessage}
      onClickStopButton={handleStopSpeaking}
      isSpeaking={isSpeaking}
      silenceTimeoutRemaining={silenceTimeoutRemaining}
      continuousMicListeningMode={
        continuousMicListeningMode &&
        (speechRecognitionMode === 'browser' ||
          speechRecognitionMode === 'deepgram')
      }
      isDeepgramTranscribing={
        speechRecognitionMode === 'deepgram' && isTranscribing
      }
      showSpeechInputToggles={showSpeechInputToggles}
      speechRecognitionMode={speechRecognitionMode}
      deepgramAutoSend={deepgramAutoSend}
      onContinuousMicChange={handleContinuousMicChange}
      onDeepgramAutoSendChange={handleDeepgramAutoSendChange}
    />
  )
}
