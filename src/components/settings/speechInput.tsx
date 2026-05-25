import { useTranslation } from 'react-i18next'
import settingsStore from '@/features/stores/settings'
import { TextButton } from '../textButton'
import { ToggleSwitch } from '../toggleSwitch'
import Image from 'next/image'
import { WhisperTranscriptionModel } from '@/features/constants/settings'
import { Link } from '../link'
import { getOpenAIWhisperModels } from '@/features/constants/aiModels'

const SPEECH_MODES = ['browser', 'whisper', 'deepgram'] as const

const SpeechInput = () => {
  const noSpeechTimeout = settingsStore((s) => s.noSpeechTimeout)
  const showSilenceProgressBar = settingsStore((s) => s.showSilenceProgressBar)
  const speechRecognitionMode = settingsStore((s) => s.speechRecognitionMode)
  const whisperTranscriptionModel = settingsStore(
    (s) => s.whisperTranscriptionModel
  )
  const openaiKey = settingsStore((s) => s.openaiKey)
  const deepgramApiKey = settingsStore((s) => s.deepgramApiKey)
  const deepgramAutoSend = settingsStore((s) => s.deepgramAutoSend)
  const deepgramEndpointingMs = settingsStore((s) => s.deepgramEndpointingMs)
  const deepgramUtteranceEndMs = settingsStore((s) => s.deepgramUtteranceEndMs)
  const deepgramSilenceHoldMs = settingsStore((s) => s.deepgramSilenceHoldMs)
  const deepgramModel = settingsStore((s) => s.deepgramModel)
  const continuousMicListeningMode = settingsStore(
    (s) => s.continuousMicListeningMode
  )
  const initialSpeechTimeout = settingsStore((s) => s.initialSpeechTimeout)
  const realtimeAPIMode = settingsStore((s) => s.realtimeAPIMode)
  const audioMode = settingsStore((s) => s.audioMode)

  const { t } = useTranslation()

  const whisperModels: { value: WhisperTranscriptionModel; label: string }[] =
    getOpenAIWhisperModels().map((m) => ({
      value: m as WhisperTranscriptionModel,
      label: m,
    }))

  // realtimeAPIモードかaudioモードがオンの場合はボタンを無効化
  const isSpeechModeSwitchDisabled = realtimeAPIMode || audioMode

  return (
    <div className="mb-10">
      <div className="flex items-center mb-6">
        <Image
          src="/images/setting-icons/microphone-settings.svg"
          alt="Microphone Settings"
          width={24}
          height={24}
          className="mr-2"
        />
        <h2 className="text-2xl font-bold">{t('SpeechInputSettings')}</h2>
      </div>
      <div className="my-6">
        <div className="my-4 text-xl font-bold">
          {t('SpeechRecognitionMode')}
        </div>
        <div className="my-2 text-sm whitespace-pre-wrap">
          {t('SpeechRecognitionModeInfo')}
        </div>
        {isSpeechModeSwitchDisabled && (
          <div className="my-4 text-sm text-orange-500 whitespace-pre-line">
            {t('SpeechRecognitionModeDisabledInfo')}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {SPEECH_MODES.map((mode) => (
            <TextButton
              key={mode}
              onClick={() =>
                settingsStore.setState({ speechRecognitionMode: mode })
              }
              disabled={isSpeechModeSwitchDisabled}
              className={
                speechRecognitionMode === mode ? 'opacity-100' : 'opacity-50'
              }
            >
              {mode === 'browser'
                ? t('BrowserSpeechRecognition')
                : mode === 'whisper'
                  ? t('WhisperSpeechRecognition')
                  : t('DeepgramSpeechRecognition')}
            </TextButton>
          ))}
        </div>
      </div>
      {speechRecognitionMode === 'whisper' && (
        <>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">
              {t('OpenAIAPIKeyLabel')}
            </div>
            <div className="my-4">
              {t('APIKeyInstruction')}
              <br />
              <Link
                url="https://platform.openai.com/account/api-keys"
                label="OpenAI Platform"
              />
            </div>
            <input
              className="text-ellipsis px-4 py-2 w-full md:w-1/2 bg-white hover:bg-white-hover rounded-lg"
              type="text"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) =>
                settingsStore.setState({ openaiKey: e.target.value })
              }
            />
          </div>
          <div className="mt-6">
            <div className="mb-4 text-xl font-bold">
              {t('WhisperTranscriptionModel')}
            </div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('WhisperTranscriptionModelInfo')}
            </div>
            <select
              id="whisper-model-select"
              className="px-4 py-2 bg-white hover:bg-white-hover rounded-lg w-full md:w-1/2"
              value={whisperTranscriptionModel}
              onChange={(e) =>
                settingsStore.setState({
                  whisperTranscriptionModel: e.target
                    .value as WhisperTranscriptionModel,
                })
              }
            >
              {whisperModels.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      {speechRecognitionMode === 'deepgram' && (
        <>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">
              {t('DeepgramApiKeyLabel')}
            </div>
            <div className="my-4">
              {t('DeepgramApiKeyInfo')}
              <br />
              <Link
                url="https://console.deepgram.com/"
                label="Deepgram Console"
              />
            </div>
            <input
              className="text-ellipsis px-4 py-2 w-full md:w-1/2 bg-white hover:bg-white-hover rounded-lg"
              type="text"
              placeholder="..."
              value={deepgramApiKey}
              onChange={(e) =>
                settingsStore.setState({ deepgramApiKey: e.target.value })
              }
            />
            <div className="my-4 text-sm text-gray-500 whitespace-pre-wrap">
              {t('DeepgramKeyNotRequired')}
            </div>
          </div>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">{t('ContinuousMic')}</div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('DeepgramContinuousMicInfo')}
            </div>
            <ToggleSwitch
              enabled={continuousMicListeningMode}
              onChange={(v) =>
                settingsStore.setState({ continuousMicListeningMode: v })
              }
            />
          </div>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">
              {t('DeepgramAutoSend')}
            </div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('DeepgramAutoSendInfo')}
            </div>
            <ToggleSwitch
              enabled={deepgramAutoSend}
              onChange={(v) => settingsStore.setState({ deepgramAutoSend: v })}
            />
          </div>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">
              {t('DeepgramEndpointing')}: {deepgramEndpointingMs}ms
            </div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('DeepgramEndpointingInfo')}
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={deepgramEndpointingMs}
              className="w-full input-range"
              onChange={(e) =>
                settingsStore.setState({
                  deepgramEndpointingMs: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">
              {t('DeepgramUtteranceEnd')}: {deepgramUtteranceEndMs}ms
            </div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('DeepgramUtteranceEndInfo')}
            </div>
            <input
              type="range"
              min={500}
              max={3000}
              step={100}
              value={deepgramUtteranceEndMs}
              className="w-full input-range"
              onChange={(e) =>
                settingsStore.setState({
                  deepgramUtteranceEndMs: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">
              {t('DeepgramSilenceHold')}: {deepgramSilenceHoldMs}ms
            </div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('DeepgramSilenceHoldInfo')}
            </div>
            <input
              type="range"
              min={500}
              max={3000}
              step={100}
              value={deepgramSilenceHoldMs}
              className="w-full input-range"
              onChange={(e) =>
                settingsStore.setState({
                  deepgramSilenceHoldMs: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">{t('DeepgramModel')}</div>
            <select
              className="px-4 py-2 bg-white hover:bg-white-hover rounded-lg"
              value={deepgramModel}
              onChange={(e) =>
                settingsStore.setState({ deepgramModel: e.target.value })
              }
            >
              <option value="nova-2">nova-2</option>
              <option value="nova-3">nova-3</option>
            </select>
          </div>
        </>
      )}
      {speechRecognitionMode === 'browser' && !realtimeAPIMode && (
        <>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">
              {t('InitialSpeechTimeout')}
            </div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('InitialSpeechTimeoutInfo')}
            </div>
            <div className="mt-6 font-bold">
              <div className="select-none">
                {t('InitialSpeechTimeout')}: {initialSpeechTimeout.toFixed(1)}秒
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="0.5"
                value={initialSpeechTimeout}
                onChange={(e) =>
                  settingsStore.setState({
                    initialSpeechTimeout: parseFloat(e.target.value),
                  })
                }
                className="mt-2 mb-4 input-range"
              />
            </div>
          </div>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">{t('NoSpeechTimeout')}</div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('NoSpeechTimeoutInfo')}
            </div>
            <div className="mt-6 font-bold">
              <div className="select-none">
                {t('NoSpeechTimeout')}: {noSpeechTimeout.toFixed(1)}秒
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={noSpeechTimeout}
                onChange={(e) =>
                  settingsStore.setState({
                    noSpeechTimeout: parseFloat(e.target.value),
                  })
                }
                className="mt-2 mb-4 input-range"
              />
            </div>
            <div className="mt-6">
              <div className="font-bold mb-2">
                {t('ShowSilenceProgressBar')}
              </div>
              <ToggleSwitch
                enabled={showSilenceProgressBar}
                onChange={(v) =>
                  settingsStore.setState({ showSilenceProgressBar: v })
                }
              />
            </div>
          </div>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">{t('ContinuousMic')}</div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('ContinuousMicInfo')}
            </div>
            <ToggleSwitch
              enabled={continuousMicListeningMode}
              onChange={(v) =>
                settingsStore.setState({ continuousMicListeningMode: v })
              }
            />
          </div>
        </>
      )}
    </div>
  )
}

export default SpeechInput
