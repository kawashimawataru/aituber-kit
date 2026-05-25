import { useTranslation } from 'react-i18next'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

import {
  PRESET_A,
  PRESET_B,
  PRESET_C,
  PRESET_D,
} from '@/features/constants/koeiroParam'
import {
  AIVoice,
  OpenAITTSVoice,
  OpenAITTSModel,
} from '@/features/constants/settings'
import type { TtsSplitMode } from '@/utils/ttsSentenceSplit'
import { getOpenAITTSModels } from '@/features/constants/aiModels'
import { testVoice } from '@/features/messages/speakCharacter'
import settingsStore from '@/features/stores/settings'
import { Link } from '../link'
import { TextButton } from '../textButton'
import { ToggleSwitch } from '../toggleSwitch'
import speakers from '../speakers.json'
// import speakers_aivis from '../speakers_aivis.json'
import { useRestrictedMode } from '@/hooks/useRestrictedMode'
import {
  formatSbv2ModelOptionLabel,
  formatStyleBertVits2StyleOptionLabel,
  getStyleBertVits2StyleDescription,
} from '@/utils/styleBertVits2StyleDescriptions'

const Voice = () => {
  const { isRestrictedMode } = useRestrictedMode()
  const koeiromapKey = settingsStore((s) => s.koeiromapKey)
  const elevenlabsApiKey = settingsStore((s) => s.elevenlabsApiKey)
  const cartesiaApiKey = settingsStore((s) => s.cartesiaApiKey)

  const realtimeAPIMode = settingsStore((s) => s.realtimeAPIMode)
  const audioMode = settingsStore((s) => s.audioMode)

  const selectVoice = settingsStore((s) => s.selectVoice)
  const ttsSplitMode = settingsStore((s) => s.ttsSplitMode)
  const koeiroParam = settingsStore((s) => s.koeiroParam)
  const googleTtsType = settingsStore((s) => s.googleTtsType)
  const voicevoxSpeaker = settingsStore((s) => s.voicevoxSpeaker)
  const voicevoxSpeed = settingsStore((s) => s.voicevoxSpeed)
  const voicevoxPitch = settingsStore((s) => s.voicevoxPitch)
  const voicevoxIntonation = settingsStore((s) => s.voicevoxIntonation)
  const voicevoxServerUrl = settingsStore((s) => s.voicevoxServerUrl)
  const aivisSpeechSpeaker = settingsStore((s) => s.aivisSpeechSpeaker)
  const aivisSpeechSpeed = settingsStore((s) => s.aivisSpeechSpeed)
  const aivisSpeechPitch = settingsStore((s) => s.aivisSpeechPitch)
  const aivisSpeechIntonationScale = settingsStore(
    (s) => s.aivisSpeechIntonationScale
  )
  const aivisSpeechServerUrl = settingsStore((s) => s.aivisSpeechServerUrl)
  const aivisSpeechTempoDynamics = settingsStore(
    (s) => s.aivisSpeechTempoDynamics
  )
  const aivisSpeechPrePhonemeLength = settingsStore(
    (s) => s.aivisSpeechPrePhonemeLength
  )
  const aivisSpeechPostPhonemeLength = settingsStore(
    (s) => s.aivisSpeechPostPhonemeLength
  )
  const aivisCloudApiKey = settingsStore((s) => s.aivisCloudApiKey)
  const aivisCloudModelUuid = settingsStore((s) => s.aivisCloudModelUuid)
  const aivisCloudStyleId = settingsStore((s) => s.aivisCloudStyleId)
  const aivisCloudStyleName = settingsStore((s) => s.aivisCloudStyleName)
  const aivisCloudUseStyleName = settingsStore((s) => s.aivisCloudUseStyleName)
  const aivisCloudSpeed = settingsStore((s) => s.aivisCloudSpeed)
  const aivisCloudPitch = settingsStore((s) => s.aivisCloudPitch)
  const aivisCloudIntonationScale = settingsStore(
    (s) => s.aivisCloudIntonationScale
  )
  const aivisCloudTempoDynamics = settingsStore(
    (s) => s.aivisCloudTempoDynamics
  )
  const aivisCloudPrePhonemeLength = settingsStore(
    (s) => s.aivisCloudPrePhonemeLength
  )
  const aivisCloudPostPhonemeLength = settingsStore(
    (s) => s.aivisCloudPostPhonemeLength
  )
  const stylebertvits2ServerUrl = settingsStore(
    (s) => s.stylebertvits2ServerUrl
  )
  const stylebertvits2ApiKey = settingsStore((s) => s.stylebertvits2ApiKey)
  const stylebertvits2ModelId = settingsStore((s) => s.stylebertvits2ModelId)
  const stylebertvits2Style = settingsStore((s) => s.stylebertvits2Style)
  const stylebertvits2SdpRatio = settingsStore((s) => s.stylebertvits2SdpRatio)
  const stylebertvits2Length = settingsStore((s) => s.stylebertvits2Length)
  const irodoriTtsServerUrl = settingsStore((s) => s.irodoriTtsServerUrl)
  const irodoriTtsApiKey = settingsStore((s) => s.irodoriTtsApiKey)
  const irodoriTtsVoice = settingsStore((s) => s.irodoriTtsVoice)
  const irodoriTtsModel = settingsStore((s) => s.irodoriTtsModel)
  const irodoriTtsSpeed = settingsStore((s) => s.irodoriTtsSpeed)
  const irodoriTtsInjectEmotion = settingsStore(
    (s) => s.irodoriTtsInjectEmotion
  )
  const irodoriTtsSeed = settingsStore((s) => s.irodoriTtsSeed)
  const irodoriTtsNumSteps = settingsStore((s) => s.irodoriTtsNumSteps)
  const irodoriTtsSwayCoeff = settingsStore((s) => s.irodoriTtsSwayCoeff)
  const gsviTtsServerUrl = settingsStore((s) => s.gsviTtsServerUrl)
  const gsviTtsModelId = settingsStore((s) => s.gsviTtsModelId)
  const gsviTtsBatchSize = settingsStore((s) => s.gsviTtsBatchSize)
  const gsviTtsSpeechRate = settingsStore((s) => s.gsviTtsSpeechRate)
  const elevenlabsVoiceId = settingsStore((s) => s.elevenlabsVoiceId)
  const cartesiaVoiceId = settingsStore((s) => s.cartesiaVoiceId)
  const openaiAPIKey = settingsStore((s) => s.openaiKey)
  const openaiTTSVoice = settingsStore((s) => s.openaiTTSVoice)
  const openaiTTSModel = settingsStore((s) => s.openaiTTSModel)
  const openaiTTSSpeed = settingsStore((s) => s.openaiTTSSpeed)
  const azureTTSKey = settingsStore((s) => s.azureTTSKey)
  const azureTTSEndpoint = settingsStore((s) => s.azureTTSEndpoint)
  const { t } = useTranslation()
  const [speakers_aivis, setSpeakers_aivis] = useState<Array<any>>([])
  const [speakers_voicevox, setSpeakers_voicevox] = useState<Array<any>>([])
  const [customVoiceText, setCustomVoiceText] = useState<string>('')
  const [sbv2Models, setSbv2Models] = useState<
    Array<{
      modelId: string
      label: string
      styles: string[]
      speakers: string[]
    }>
  >([])
  const [sbv2ModelsLoading, setSbv2ModelsLoading] = useState(false)
  const [irodoriVoices, setIrodoriVoices] = useState<Array<{ id: string }>>([])
  const [irodoriVoicesLoading, setIrodoriVoicesLoading] = useState(false)

  const fetchIrodoriVoices = useCallback(async () => {
    const url = settingsStore.getState().irodoriTtsServerUrl.trim()
    if (!url) return

    setIrodoriVoicesLoading(true)
    try {
      const res = await fetch(
        `/api/irodori-tts-voices?serverUrl=${encodeURIComponent(url)}`
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load voices')
      }
      setIrodoriVoices(Array.isArray(data) ? data : [])

      const currentVoice = settingsStore.getState().irodoriTtsVoice
      if (!currentVoice && data?.[0]?.id) {
        settingsStore.setState({ irodoriTtsVoice: data[0].id })
      }
    } catch (error) {
      console.error('Failed to fetch Irodori-TTS voices:', error)
      setIrodoriVoices([])
    } finally {
      setIrodoriVoicesLoading(false)
    }
  }, [])

  const fetchSbv2Models = useCallback(async () => {
    const url = settingsStore.getState().stylebertvits2ServerUrl.trim()
    if (!url) return

    setSbv2ModelsLoading(true)
    try {
      const res = await fetch(
        `/api/stylebertvits2-models?serverUrl=${encodeURIComponent(url)}`
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load models')
      }
      setSbv2Models(data.models || [])

      const currentId = settingsStore.getState().stylebertvits2ModelId
      const current = (data.models || []).find(
        (m: { modelId: string }) => m.modelId === currentId
      )
      const first = data.models?.[0]
      const target = current || first
      if (target) {
        const styles: string[] = target.styles || []
        const currentStyle = settingsStore.getState().stylebertvits2Style
        const updates: {
          stylebertvits2ModelId?: string
          stylebertvits2Style?: string
        } = {}

        // 会話中の model_id 切替を防ぐ: 有効な選択があるときは上書きしない
        if (!current) {
          updates.stylebertvits2ModelId = target.modelId
        }

        if (styles.length > 0 && !styles.includes(currentStyle)) {
          updates.stylebertvits2Style = styles[0] || 'Neutral'
        }

        if (Object.keys(updates).length > 0) {
          settingsStore.setState(updates)
        }
      }
    } catch (error) {
      console.error('Failed to fetch SBV2 models:', error)
      setSbv2Models([])
    } finally {
      setSbv2ModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (
      selectVoice === 'irodoritts' &&
      irodoriTtsServerUrl.trim() &&
      irodoriVoices.length === 0 &&
      !irodoriVoicesLoading
    ) {
      fetchIrodoriVoices()
    }
  }, [
    selectVoice,
    irodoriTtsServerUrl,
    irodoriVoices.length,
    irodoriVoicesLoading,
    fetchIrodoriVoices,
  ])

  useEffect(() => {
    if (
      selectVoice === 'stylebertvits2' &&
      stylebertvits2ServerUrl.trim() &&
      sbv2Models.length === 0 &&
      !sbv2ModelsLoading
    ) {
      fetchSbv2Models()
    }
  }, [
    selectVoice,
    stylebertvits2ServerUrl,
    sbv2Models.length,
    sbv2ModelsLoading,
    fetchSbv2Models,
  ])

  const [isUpdatingSpeakers, setIsUpdatingSpeakers] = useState<boolean>(false)
  const [speakersUpdateError, setSpeakersUpdateError] = useState<string>('')
  const [isUpdatingVoicevoxSpeakers, setIsUpdatingVoicevoxSpeakers] =
    useState<boolean>(false)
  const [voicevoxSpeakersUpdateError, setVoicevoxSpeakersUpdateError] =
    useState<string>('')

  // AIVISの話者一覧を取得する関数
  const fetchAivisSpeakers = async () => {
    try {
      const response = await fetch('/speakers_aivis.json')
      const data = await response.json()
      setSpeakers_aivis(data)
    } catch (error) {
      console.error('Failed to fetch AIVIS speakers:', error)
    }
  }

  // VOICEVOXの話者一覧を取得する関数
  const fetchVoicevoxSpeakers = async () => {
    try {
      const response = await fetch('/speakers.json')
      const data = await response.json()
      setSpeakers_voicevox(data)
    } catch (error) {
      console.error('Failed to fetch VOICEVOX speakers:', error)
    }
  }

  // コンポーネントマウント時またはAIVIS選択時に話者一覧を取得
  useEffect(() => {
    if (selectVoice === 'aivis_speech') {
      fetchAivisSpeakers()
    }
  }, [selectVoice])

  // コンポーネントマウント時またはVOICEVOX選択時に話者一覧を取得
  useEffect(() => {
    if (selectVoice === 'voicevox') {
      fetchVoicevoxSpeakers()
    }
  }, [selectVoice])

  // 追加: realtimeAPIMode または audioMode が true の場合にメッセージを表示
  if (realtimeAPIMode || audioMode) {
    return (
      <div className="text-center text-xl whitespace-pre-line">
        {t('CannotUseVoice')}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Image
          src="/images/setting-icons/voice-settings.svg"
          alt="Voice Settings"
          width={24}
          height={24}
          className="mr-2"
        />
        <h2 className="text-2xl font-bold">{t('VoiceSettings')}</h2>
      </div>
      <div className="mb-4 text-xl font-bold">
        {t('SyntheticVoiceEngineChoice')}
      </div>
      <div className="my-2 text-sm whitespace-pre-wrap">
        {t('VoiceEngineInstruction')}
      </div>
      <div className="my-2">
        <select
          value={selectVoice}
          onChange={(e) =>
            settingsStore.setState({ selectVoice: e.target.value as AIVoice })
          }
          className="px-4 py-2 bg-white hover:bg-white-hover rounded-lg"
        >
          <option value="voicevox">{t('UsingVoiceVox')}</option>
          <option value="koeiromap">{t('UsingKoeiromap')}</option>
          <option value="google">{t('UsingGoogleTTS')}</option>
          <option value="stylebertvits2">{t('UsingStyleBertVITS2')}</option>
          <option value="irodoritts">{t('UsingIrodoriTTS')}</option>
          <option value="aivis_speech">{t('UsingAivisSpeech')}</option>
          <option value="aivis_cloud_api">{t('UsingAivisCloudAPI')}</option>
          <option value="gsvitts">{t('UsingGSVITTS')}</option>
          <option value="elevenlabs">{t('UsingElevenLabs')}</option>
          <option value="cartesia">{t('UsingCartesia')}</option>
          <option value="openai">{t('UsingOpenAITTS')}</option>
          <option value="azure">{t('UsingAzureTTS')}</option>
        </select>
      </div>

      <div className="border-t border-gray-300 pt-6 my-6">
        <div className="mb-4 text-xl font-bold">{t('TTSSplitMode')}</div>
        <div className="my-2 text-sm whitespace-pre-wrap">
          {t('TTSSplitModeDesc')}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {(
            [
              ['auto', t('TTSSplitModeAuto'), t('TTSSplitModeAutoDesc')],
              [
                'punctuation',
                t('TTSSplitModePunctuation'),
                t('TTSSplitModePunctuationDesc'),
              ],
              [
                'sentence',
                t('TTSSplitModeSentence'),
                t('TTSSplitModeSentenceDesc'),
              ],
              ['all', t('TTSSplitModeAll'), t('TTSSplitModeAllDesc')],
            ] as [TtsSplitMode, string, string][]
          ).map(([id, label, desc]) => (
            <button
              key={id}
              onClick={() => settingsStore.setState({ ttsSplitMode: id })}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                ttsSplitMode === id
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 bg-white hover:border-gray-400'
              }`}
            >
              <div className="font-bold text-sm">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-300 pt-6 my-6">
        <div className="mb-4 text-xl font-bold">{t('VoiceAdjustment')}</div>
        {(() => {
          if (selectVoice === 'koeiromap') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('KoeiromapInfo')}
                  <br />
                  <Link
                    url="https://koemotion.rinna.co.jp"
                    label="https://koemotion.rinna.co.jp"
                  />
                </div>
                <div className="mt-4 font-bold">{t('APIKey')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={koeiromapKey}
                    onChange={(e) =>
                      settingsStore.setState({ koeiromapKey: e.target.value })
                    }
                  />
                </div>

                <div className="mt-4 font-bold">{t('Preset')}</div>
                <div className="my-2 grid grid-cols-2 gap-[8px]">
                  <TextButton
                    onClick={() =>
                      settingsStore.setState({
                        koeiroParam: {
                          speakerX: PRESET_A.speakerX,
                          speakerY: PRESET_A.speakerY,
                        },
                      })
                    }
                  >
                    {t('Cute')}
                  </TextButton>
                  <TextButton
                    onClick={() =>
                      settingsStore.setState({
                        koeiroParam: {
                          speakerX: PRESET_B.speakerX,
                          speakerY: PRESET_B.speakerY,
                        },
                      })
                    }
                  >
                    {t('Energetic')}
                  </TextButton>
                  <TextButton
                    onClick={() =>
                      settingsStore.setState({
                        koeiroParam: {
                          speakerX: PRESET_C.speakerX,
                          speakerY: PRESET_C.speakerY,
                        },
                      })
                    }
                  >
                    {t('Cool')}
                  </TextButton>
                  <TextButton
                    onClick={() =>
                      settingsStore.setState({
                        koeiroParam: {
                          speakerX: PRESET_D.speakerX,
                          speakerY: PRESET_D.speakerY,
                        },
                      })
                    }
                  >
                    {t('Mature')}
                  </TextButton>
                </div>
                <div className="mt-6">
                  <div className="select-none">x : {koeiroParam.speakerX}</div>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={0.001}
                    value={koeiroParam.speakerX}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        koeiroParam: {
                          speakerX: Number(e.target.value),
                          speakerY: koeiroParam.speakerY,
                        },
                      })
                    }}
                  ></input>
                  <div className="select-none">y : {koeiroParam.speakerY}</div>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={0.001}
                    value={koeiroParam.speakerY}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        koeiroParam: {
                          speakerX: koeiroParam.speakerX,
                          speakerY: Number(e.target.value),
                        },
                      })
                    }}
                  ></input>
                </div>
              </>
            )
          } else if (selectVoice === 'voicevox') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('VoiceVoxInfo')}
                  <br />
                  <Link
                    url="https://voicevox.hiroshiba.jp/"
                    label="https://voicevox.hiroshiba.jp/"
                  />
                </div>
                <div className="mt-4 font-bold">{t('VoicevoxServerUrl')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="http://localhost:50021"
                    value={voicevoxServerUrl}
                    onChange={(e) =>
                      settingsStore.setState({
                        voicevoxServerUrl: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('SpeakerSelection')}</div>
                <div className="space-y-3">
                  <select
                    value={voicevoxSpeaker}
                    onChange={(e) =>
                      settingsStore.setState({
                        voicevoxSpeaker: e.target.value,
                      })
                    }
                    className="px-4 py-2 bg-white hover:bg-white-hover rounded-lg"
                  >
                    <option value="">{t('Select')}</option>
                    {(speakers_voicevox.length > 0
                      ? speakers_voicevox
                      : speakers
                    ).map((speaker) => (
                      <option key={speaker.id} value={speaker.id}>
                        {speaker.speaker}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={async () => {
                      setIsUpdatingVoicevoxSpeakers(true)
                      setVoicevoxSpeakersUpdateError('')
                      try {
                        const response = await fetch(
                          '/api/update-voicevox-speakers?serverUrl=' +
                            encodeURIComponent(voicevoxServerUrl)
                        )
                        if (response.ok) {
                          const updatedSpeakersResponse = await fetch(
                            `/speakers.json?ts=${Date.now()}`
                          )
                          const updatedSpeakers =
                            await updatedSpeakersResponse.json()
                          setSpeakers_voicevox(updatedSpeakers)
                        } else {
                          setVoicevoxSpeakersUpdateError(
                            '話者リストの更新に失敗しました'
                          )
                        }
                      } catch (error) {
                        setVoicevoxSpeakersUpdateError(
                          'ネットワークエラーが発生しました'
                        )
                      } finally {
                        setIsUpdatingVoicevoxSpeakers(false)
                      }
                    }}
                    disabled={isUpdatingVoicevoxSpeakers || isRestrictedMode}
                    className="w-full px-4 py-2 text-sm font-medium text-theme bg-primary hover:bg-primary-hover active:bg-primary-press disabled:bg-primary-disabled disabled:cursor-not-allowed rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {isUpdatingVoicevoxSpeakers
                      ? '更新中...'
                      : t('UpdateSpeakerList')}
                  </button>
                  {voicevoxSpeakersUpdateError && (
                    <div className="mt-2 text-red-600 text-sm">
                      {voicevoxSpeakersUpdateError}
                    </div>
                  )}
                </div>
                <div className="mt-6 font-bold">
                  <div className="select-none">
                    {t('VoicevoxSpeed')}: {voicevoxSpeed}
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.01}
                    value={voicevoxSpeed}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        voicevoxSpeed: Number(e.target.value),
                      })
                    }}
                  ></input>
                  <div className="select-none">
                    {t('VoicevoxPitch')}: {voicevoxPitch}
                  </div>
                  <input
                    type="range"
                    min={-0.15}
                    max={0.15}
                    step={0.01}
                    value={voicevoxPitch}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        voicevoxPitch: Number(e.target.value),
                      })
                    }}
                  ></input>
                  <div className="select-none">
                    {t('VoicevoxIntonation')}: {voicevoxIntonation}
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={2.0}
                    step={0.01}
                    value={voicevoxIntonation}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        voicevoxIntonation: Number(e.target.value),
                      })
                    }}
                  ></input>
                </div>
              </>
            )
          } else if (selectVoice === 'google') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('GoogleTTSInfo')}
                  {t('AuthFileInstruction')}
                  <br />
                  <Link
                    url="https://developers.google.com/workspace/guides/create-credentials?#create_credentials_for_a_service_account"
                    label="https://developers.google.com/workspace/guides/create-credentials?#create_credentials_for_a_service_account"
                  />
                  <br />
                  <br />
                  {t('LanguageModelURL')}
                  <br />
                  <Link
                    url="https://cloud.google.com/text-to-speech/docs/voices"
                    label="https://cloud.google.com/text-to-speech/docs/voices"
                  />
                </div>
                <div className="mt-4 font-bold">{t('LanguageChoice')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={googleTtsType}
                    onChange={(e) =>
                      settingsStore.setState({ googleTtsType: e.target.value })
                    }
                  />
                </div>
              </>
            )
          } else if (selectVoice === 'stylebertvits2') {
            const selectedSbv2Model = sbv2Models.find(
              (m) => m.modelId === stylebertvits2ModelId
            )
            const availableStyles = selectedSbv2Model?.styles?.length
              ? selectedSbv2Model.styles
              : sbv2Models.length === 0
                ? [stylebertvits2Style].filter(Boolean)
                : ['Neutral']

            const currentStyleDescription =
              getStyleBertVits2StyleDescription(stylebertvits2Style)

            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('StyleBertVITS2Info')}
                  <br />
                  <Link
                    url="https://github.com/litagin02/Style-Bert-VITS2"
                    label="https://github.com/litagin02/Style-Bert-VITS2"
                  />
                  <br />
                  <br />
                </div>
                <p className="my-1 text-xs text-gray-600 whitespace-pre-wrap">
                  {t('StyleBeatVITS2TtsSplitHint')}
                </p>
                <div className="mt-4 font-bold">
                  {t('StyleBeatVITS2ServerURL')}
                </div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder={t('StyleBeatVITS2ServerURLPlaceholder')}
                    value={stylebertvits2ServerUrl}
                    onChange={(e) =>
                      settingsStore.setState({
                        stylebertvits2ServerUrl: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-3">
                  <TextButton
                    onClick={fetchSbv2Models}
                    disabled={
                      !stylebertvits2ServerUrl.trim() || sbv2ModelsLoading
                    }
                  >
                    {sbv2ModelsLoading
                      ? '...'
                      : t('StyleBeatVITS2RefreshModels')}
                  </TextButton>
                  {sbv2Models.length > 0 && (
                    <span className="ml-3 text-sm text-gray-600">
                      {t('StyleBeatVITS2ModelsLoaded', {
                        count: sbv2Models.length,
                      })}
                    </span>
                  )}
                </div>
                <div className="mt-4 font-bold">
                  {t('StyleBeatVITS2ApiKey')}
                </div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="（ローカルは空で可）"
                    value={stylebertvits2ApiKey}
                    onChange={(e) =>
                      settingsStore.setState({
                        stylebertvits2ApiKey: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">
                  {t('StyleBeatVITS2SelectModel')}
                </div>
                <div className="mt-2">
                  {sbv2Models.length > 0 ? (
                    <select
                      className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                      value={stylebertvits2ModelId}
                      onChange={(e) => {
                        const modelId = e.target.value
                        const model = sbv2Models.find(
                          (m) => m.modelId === modelId
                        )
                        settingsStore.setState({
                          stylebertvits2ModelId: modelId,
                          stylebertvits2Style:
                            model?.styles?.[0] || stylebertvits2Style,
                        })
                      }}
                    >
                      {sbv2Models.map((model) => (
                        <option key={model.modelId} value={model.modelId}>
                          {formatSbv2ModelOptionLabel(
                            model.label,
                            model.modelId,
                            model.speakers
                          )}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                      type="number"
                      placeholder="0"
                      value={stylebertvits2ModelId}
                      onChange={(e) =>
                        settingsStore.setState({
                          stylebertvits2ModelId: e.target.value,
                        })
                      }
                    />
                  )}
                </div>
                <div className="mt-4 font-bold">{t('StyleBeatVITS2Style')}</div>
                <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                  {t('StyleBeatVITS2StyleSelectHint')}
                </p>
                <div className="mt-2">
                  {sbv2Models.length > 0 && availableStyles.length > 0 ? (
                    <select
                      className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                      value={
                        availableStyles.includes(stylebertvits2Style)
                          ? stylebertvits2Style
                          : availableStyles[0]
                      }
                      onChange={(e) =>
                        settingsStore.setState({
                          stylebertvits2Style: e.target.value,
                        })
                      }
                    >
                      {availableStyles.map((style) => (
                        <option key={style} value={style}>
                          {formatStyleBertVits2StyleOptionLabel(style)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                      type="text"
                      placeholder="Neutral"
                      value={stylebertvits2Style}
                      onChange={(e) =>
                        settingsStore.setState({
                          stylebertvits2Style: e.target.value,
                        })
                      }
                    />
                  )}
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-xs font-bold text-gray-700 mb-1">
                    {t('StyleBeatVITS2StyleDescription')}
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {currentStyleDescription}
                  </p>
                </div>
                <div className="mt-4 font-bold">
                  {t('StyleBeatVITS2SdpRatio')}: {stylebertvits2SdpRatio}
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {t('StyleBeatVITS2SdpRatioHint')}
                </p>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={stylebertvits2SdpRatio}
                  className="mt-2 mb-4 input-range"
                  onChange={(e) => {
                    settingsStore.setState({
                      stylebertvits2SdpRatio: Number(e.target.value),
                    })
                  }}
                ></input>
                <div className="mt-4 font-bold">
                  {t('StyleBeatVITS2Length')}: {stylebertvits2Length}
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={2.0}
                  step={0.01}
                  value={stylebertvits2Length}
                  className="mt-2 mb-4 input-range"
                  onChange={(e) => {
                    settingsStore.setState({
                      stylebertvits2Length: Number(e.target.value),
                    })
                  }}
                ></input>
              </>
            )
          } else if (selectVoice === 'irodoritts') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('IrodoriTTSInfo')}
                  <br />
                  <Link
                    url="https://github.com/Aratako/Irodori-TTS-Server"
                    label="https://github.com/Aratako/Irodori-TTS-Server"
                  />
                </div>
                <p className="my-1 text-xs text-gray-600 whitespace-pre-wrap">
                  {t('IrodoriTTSServerHint')}
                </p>
                <div className="mt-4 font-bold">{t('IrodoriTTSServerURL')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder={t('IrodoriTTSServerURLPlaceholder')}
                    value={irodoriTtsServerUrl}
                    onChange={(e) =>
                      settingsStore.setState({
                        irodoriTtsServerUrl: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-3">
                  <TextButton
                    onClick={fetchIrodoriVoices}
                    disabled={
                      !irodoriTtsServerUrl.trim() || irodoriVoicesLoading
                    }
                  >
                    {irodoriVoicesLoading
                      ? '...'
                      : t('IrodoriTTSRefreshVoices')}
                  </TextButton>
                  {irodoriVoices.length > 0 && (
                    <span className="ml-3 text-sm text-gray-600">
                      {t('IrodoriTTSVoicesLoaded', {
                        count: irodoriVoices.length,
                      })}
                    </span>
                  )}
                </div>
                <div className="mt-4 font-bold">{t('IrodoriTTSApiKey')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="（ローカルは空で可）"
                    value={irodoriTtsApiKey}
                    onChange={(e) =>
                      settingsStore.setState({
                        irodoriTtsApiKey: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('IrodoriTTSVoice')}</div>
                {irodoriVoices.length > 0 ? (
                  <select
                    className="mt-2 px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    value={irodoriTtsVoice}
                    onChange={(e) =>
                      settingsStore.setState({
                        irodoriTtsVoice: e.target.value,
                      })
                    }
                  >
                    <option value="">{t('Select')}</option>
                    {irodoriVoices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="mt-2 text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="sample"
                    value={irodoriTtsVoice}
                    onChange={(e) =>
                      settingsStore.setState({
                        irodoriTtsVoice: e.target.value,
                      })
                    }
                  />
                )}
                <div className="mt-4 font-bold">{t('IrodoriTTSModel')}</div>
                <input
                  className="mt-2 text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                  type="text"
                  value={irodoriTtsModel}
                  onChange={(e) =>
                    settingsStore.setState({
                      irodoriTtsModel: e.target.value,
                    })
                  }
                />
                <div className="mt-4 font-bold">
                  {t('IrodoriTTSSpeed')}: {irodoriTtsSpeed}
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={4.0}
                  step={0.05}
                  value={irodoriTtsSpeed}
                  className="mt-2 mb-4 input-range"
                  onChange={(e) =>
                    settingsStore.setState({
                      irodoriTtsSpeed: Number(e.target.value),
                    })
                  }
                />
                <div className="mt-4 font-bold">
                  {t('IrodoriTTSInjectEmotion')}
                </div>
                <ToggleSwitch
                  enabled={irodoriTtsInjectEmotion}
                  onChange={(v) =>
                    settingsStore.setState({ irodoriTtsInjectEmotion: v })
                  }
                />
                <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                  {t('IrodoriTTSInjectEmotionHint')}
                </p>
                <div className="mt-4 font-bold">
                  {t('IrodoriTTSNumSteps')}:{' '}
                  {irodoriTtsNumSteps === 0
                    ? t('IrodoriTTSNumStepsDefault')
                    : irodoriTtsNumSteps}
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {t('IrodoriTTSNumStepsHint')}
                </p>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={irodoriTtsNumSteps}
                  className="mt-2 mb-1 input-range"
                  onChange={(e) =>
                    settingsStore.setState({
                      irodoriTtsNumSteps: Number(e.target.value),
                    })
                  }
                />
                <div className="flex justify-between text-xs text-gray-500 mb-4">
                  <span>{t('IrodoriTTSNumStepsDefault')}</span>
                  <span>4</span>
                  <span>8</span>
                  <span>12</span>
                  <span>20</span>
                </div>
                <div className="mt-2 font-bold">{t('IrodoriTTSSeed')}</div>
                <p className="mt-1 text-xs text-gray-600">
                  {t('IrodoriTTSSeedHint')}
                </p>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="mt-2 px-4 py-2 w-full md:w-1/2 bg-white hover:bg-white-hover rounded-lg text-sm"
                  placeholder="0"
                  value={irodoriTtsSeed}
                  onChange={(e) =>
                    settingsStore.setState({
                      irodoriTtsSeed: Math.max(
                        0,
                        parseInt(e.target.value) || 0
                      ),
                    })
                  }
                />
                <div className="mt-4 font-bold">
                  {t('IrodoriTTSSwayCoeff')}:{' '}
                  {irodoriTtsSwayCoeff === 0
                    ? t('IrodoriTTSNumStepsDefault')
                    : irodoriTtsSwayCoeff.toFixed(1)}
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {t('IrodoriTTSSwayCoeffHint')}
                </p>
                <input
                  type="range"
                  min={-2.5}
                  max={0}
                  step={0.1}
                  value={irodoriTtsSwayCoeff}
                  className="mt-2 mb-1 input-range"
                  onChange={(e) =>
                    settingsStore.setState({
                      irodoriTtsSwayCoeff: Number(e.target.value),
                    })
                  }
                />
                <div className="flex justify-between text-xs text-gray-500 mb-4">
                  <span>-2.5</span>
                  <span>-2.0</span>
                  <span>-1.5</span>
                  <span>-1.0</span>
                  <span>{t('IrodoriTTSNumStepsDefault')}</span>
                </div>
              </>
            )
          } else if (selectVoice === 'aivis_speech') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('AivisSpeechInfo')}
                  <br />
                  <Link
                    url="https://aivis-project.com/"
                    label="https://aivis-project.com/"
                  />
                </div>
                <div className="mt-4 font-bold">
                  {t('AivisSpeechServerUrl')}
                </div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="http://localhost:10101"
                    value={aivisSpeechServerUrl}
                    onChange={(e) =>
                      settingsStore.setState({
                        aivisSpeechServerUrl: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('AivisSpeechSpeaker')}</div>
                <div className="space-y-3">
                  <select
                    value={aivisSpeechSpeaker}
                    onChange={(e) =>
                      settingsStore.setState({
                        aivisSpeechSpeaker: e.target.value,
                      })
                    }
                    className="px-4 py-2 bg-white hover:bg-white-hover rounded-lg"
                  >
                    <option value="">{t('Select')}</option>
                    {speakers_aivis.map((speaker) => (
                      <option key={speaker.id} value={speaker.id}>
                        {speaker.speaker}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={async () => {
                      setIsUpdatingSpeakers(true)
                      setSpeakersUpdateError('')
                      try {
                        const response = await fetch(
                          '/api/update-aivis-speakers?serverUrl=' +
                            encodeURIComponent(aivisSpeechServerUrl)
                        )
                        if (response.ok) {
                          const updatedSpeakersResponse = await fetch(
                            `/speakers_aivis.json?ts=${Date.now()}`
                          )
                          const updatedSpeakers =
                            await updatedSpeakersResponse.json()
                          setSpeakers_aivis(updatedSpeakers)
                        } else {
                          setSpeakersUpdateError(
                            '話者リストの更新に失敗しました'
                          )
                        }
                      } catch (error) {
                        setSpeakersUpdateError(
                          'ネットワークエラーが発生しました'
                        )
                      } finally {
                        setIsUpdatingSpeakers(false)
                      }
                    }}
                    disabled={isUpdatingSpeakers || isRestrictedMode}
                    className="w-full px-4 py-2 text-sm font-medium text-theme bg-primary hover:bg-primary-hover active:bg-primary-press disabled:bg-primary-disabled disabled:cursor-not-allowed rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {isUpdatingSpeakers ? '更新中...' : t('UpdateSpeakerList')}
                  </button>
                  {speakersUpdateError && (
                    <div className="mt-2 text-red-600 text-sm">
                      {speakersUpdateError}
                    </div>
                  )}
                </div>
                <div className="mt-6 font-bold">
                  <div className="select-none">
                    {t('SpeechSpeed')}: {aivisSpeechSpeed}
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.01}
                    value={aivisSpeechSpeed}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisSpeechSpeed: Number(e.target.value),
                      })
                    }}
                  />
                  <div className="select-none">
                    {t('Pitch')}: {aivisSpeechPitch}
                  </div>
                  <input
                    type="range"
                    min={-0.15}
                    max={0.15}
                    step={0.01}
                    value={aivisSpeechPitch}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisSpeechPitch: Number(e.target.value),
                      })
                    }}
                  />
                  <div className="select-none">
                    {t('TempoDynamics')}: {aivisSpeechTempoDynamics}
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.01}
                    value={aivisSpeechTempoDynamics}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisSpeechTempoDynamics: Number(e.target.value),
                      })
                    }}
                  />
                  <div className="select-none">
                    {t('AivisSpeechIntonationScale')}:{' '}
                    {aivisSpeechIntonationScale}
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={2.0}
                    step={0.01}
                    value={aivisSpeechIntonationScale}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisSpeechIntonationScale: Number(e.target.value),
                      })
                    }}
                  />
                  <div className="select-none">
                    {t('PreSilenceDuration')}:{' '}
                    {aivisSpeechPrePhonemeLength}{' '}
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.01}
                    value={aivisSpeechPrePhonemeLength}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisSpeechPrePhonemeLength: Number(e.target.value),
                      })
                    }}
                  />
                  <div className="select-none">
                    {t('PostSilenceDuration')}:{' '}
                    {aivisSpeechPostPhonemeLength}{' '}
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.01}
                    value={aivisSpeechPostPhonemeLength}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisSpeechPostPhonemeLength: Number(e.target.value),
                      })
                    }}
                  />
                </div>
              </>
            )
          } else if (selectVoice === 'aivis_cloud_api') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('AivisCloudAPIInfo')}
                  <br />
                  <Link
                    url="https://hub.aivis-project.com/cloud-api/"
                    label={t('AivisCloudAPIDashboard')}
                  />
                </div>
                <div className="mt-4 font-bold">{t('APIKey')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="password"
                    placeholder="Aivis Cloud API Key"
                    value={aivisCloudApiKey}
                    onChange={(e) =>
                      settingsStore.setState({
                        aivisCloudApiKey: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('ModelUUID')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="a59cb814-..."
                    value={aivisCloudModelUuid}
                    onChange={(e) =>
                      settingsStore.setState({
                        aivisCloudModelUuid: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <label className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      checked={aivisCloudUseStyleName}
                      onChange={(e) =>
                        settingsStore.setState({
                          aivisCloudUseStyleName: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="font-medium">{t('UseStyleName')}</span>
                  </label>
                  <div className="text-sm text-gray-600 mb-4">
                    {t('StyleSelectionDescription')}
                  </div>

                  {aivisCloudUseStyleName ? (
                    <>
                      <div className="font-bold">{t('StyleName')}</div>
                      <div className="mt-2">
                        <input
                          className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                          type="text"
                          maxLength={20}
                          placeholder={t('StyleNamePlaceholder')}
                          value={aivisCloudStyleName}
                          onChange={(e) =>
                            settingsStore.setState({
                              aivisCloudStyleName: e.target.value,
                            })
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold">{t('StyleID')}</div>
                      <div className="mt-2">
                        <input
                          className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                          type="number"
                          min="0"
                          max="31"
                          value={aivisCloudStyleId}
                          onChange={(e) =>
                            settingsStore.setState({
                              aivisCloudStyleId: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-6 font-bold">
                  <div className="select-none">
                    {t('SpeechSpeed')}: {aivisCloudSpeed}
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.01}
                    value={aivisCloudSpeed}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisCloudSpeed: Number(e.target.value),
                      })
                    }}
                  />
                  <div className="select-none">
                    {t('Pitch')}: {aivisCloudPitch}
                  </div>
                  <input
                    type="range"
                    min={-1.0}
                    max={1.0}
                    step={0.01}
                    value={aivisCloudPitch}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisCloudPitch: Number(e.target.value),
                      })
                    }}
                  />
                  <div className="select-none">
                    {t('TempoDynamics')}: {aivisCloudTempoDynamics}
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.01}
                    value={aivisCloudTempoDynamics}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisCloudTempoDynamics: Number(e.target.value),
                      })
                    }}
                  />
                  <div className="select-none">
                    {t('EmotionalIntensity')}: {aivisCloudIntonationScale}
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={2.0}
                    step={0.01}
                    value={aivisCloudIntonationScale}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisCloudIntonationScale: Number(e.target.value),
                      })
                    }}
                  />
                  <div className="select-none">
                    {t('PreSilenceDuration')}: {aivisCloudPrePhonemeLength}{' '}
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.01}
                    value={aivisCloudPrePhonemeLength}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisCloudPrePhonemeLength: Number(e.target.value),
                      })
                    }}
                  />
                  <div className="select-none">
                    {t('PostSilenceDuration')}:{' '}
                    {aivisCloudPostPhonemeLength}{' '}
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.01}
                    value={aivisCloudPostPhonemeLength}
                    className="mt-2 mb-4 input-range"
                    onChange={(e) => {
                      settingsStore.setState({
                        aivisCloudPostPhonemeLength: Number(e.target.value),
                      })
                    }}
                  />
                </div>
              </>
            )
          } else if (selectVoice === 'gsvitts') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('GSVITTSInfo')}
                </div>
                <div className="mt-4 font-bold">{t('GSVITTSServerUrl')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={gsviTtsServerUrl}
                    onChange={(e) =>
                      settingsStore.setState({
                        gsviTtsServerUrl: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('GSVITTSModelID')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={gsviTtsModelId}
                    onChange={(e) =>
                      settingsStore.setState({ gsviTtsModelId: e.target.value })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('GSVITTSBatchSize')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="number"
                    step="1"
                    placeholder="..."
                    value={gsviTtsBatchSize}
                    onChange={(e) =>
                      settingsStore.setState({
                        gsviTtsBatchSize: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('GSVITTSSpeechRate')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="number"
                    step="0.1"
                    placeholder="..."
                    value={gsviTtsSpeechRate}
                    onChange={(e) =>
                      settingsStore.setState({
                        gsviTtsSpeechRate: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </>
            )
          } else if (selectVoice === 'elevenlabs') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('ElevenLabsInfo')}
                  <br />
                  <Link
                    url="https://elevenlabs.io/api"
                    label="https://elevenlabs.io/api"
                  />
                  <br />
                </div>
                <div className="mt-4 font-bold">{t('ElevenLabsApiKey')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={elevenlabsApiKey}
                    onChange={(e) =>
                      settingsStore.setState({
                        elevenlabsApiKey: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('ElevenLabsVoiceId')}</div>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('ElevenLabsVoiceIdInfo')}
                  <br />
                  <Link
                    url="https://api.elevenlabs.io/v1/voices"
                    label="https://api.elevenlabs.io/v1/voices"
                  />
                  <br />
                </div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={elevenlabsVoiceId}
                    onChange={(e) =>
                      settingsStore.setState({
                        elevenlabsVoiceId: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )
          } else if (selectVoice === 'cartesia') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('CartesiaInfo')}
                  <br />
                  <Link
                    url="https://docs.cartesia.ai/api-reference/tts/bytes"
                    label="https://docs.cartesia.ai/api-reference/tts/bytes"
                  />
                  <br />
                </div>
                <div className="mt-4 font-bold">{t('CartesiaApiKey')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={cartesiaApiKey}
                    onChange={(e) =>
                      settingsStore.setState({
                        cartesiaApiKey: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('CartesiaVoiceId')}</div>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('CartesiaVoiceIdInfo')}
                  <br />
                  <Link
                    url="https://docs.cartesia.ai/api-reference/voices/list"
                    label="https://docs.cartesia.ai/api-reference/voices/list"
                  />
                  <br />
                </div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={cartesiaVoiceId}
                    onChange={(e) =>
                      settingsStore.setState({
                        cartesiaVoiceId: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )
          } else if (selectVoice === 'openai') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('OpenAITTSInfo')}
                </div>
                <div className="mt-4 font-bold">{t('OpenAIAPIKeyLabel')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={openaiAPIKey}
                    onChange={(e) =>
                      settingsStore.setState({
                        openaiKey: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('OpenAITTSVoice')}</div>
                <div className="mt-2">
                  <select
                    value={openaiTTSVoice}
                    onChange={(e) =>
                      settingsStore.setState({
                        openaiTTSVoice: e.target.value as OpenAITTSVoice,
                      })
                    }
                    className="px-4 py-2 bg-white hover:bg-white-hover rounded-lg"
                  >
                    <option value="alloy">alloy</option>
                    <option value="ash">ash</option>
                    <option value="ballad">ballad</option>
                    <option value="coral">coral</option>
                    <option value="echo">echo</option>
                    <option value="fable">fable</option>
                    <option value="onyx">onyx</option>
                    <option value="nova">nova</option>
                    <option value="sage">sage</option>
                    <option value="shimmer">shimmer</option>
                  </select>
                </div>
                <div className="mt-4 font-bold">{t('OpenAITTSModel')}</div>
                <div className="mt-2">
                  <select
                    value={openaiTTSModel}
                    onChange={(e) =>
                      settingsStore.setState({
                        openaiTTSModel: e.target.value as OpenAITTSModel,
                      })
                    }
                    className="px-4 py-2 bg-white hover:bg-white-hover rounded-lg"
                  >
                    {getOpenAITTSModels().map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 font-bold">
                  {t('OpenAITTSSpeed')}: {openaiTTSSpeed}
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={4.0}
                  step={0.01}
                  value={openaiTTSSpeed}
                  className="mt-2 mb-4 input-range"
                  onChange={(e) => {
                    settingsStore.setState({
                      openaiTTSSpeed: Number(e.target.value),
                    })
                  }}
                />
              </>
            )
          } else if (selectVoice === 'azure') {
            return (
              <>
                <div className="my-2 text-sm whitespace-pre-wrap">
                  {t('AzureTTSInfo')}
                </div>
                <div className="mt-4 font-bold">{t('AzureAPIKeyLabel')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={azureTTSKey}
                    onChange={(e) =>
                      settingsStore.setState({
                        azureTTSKey: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('AzureEndpoint')}</div>
                <div className="mt-2">
                  <input
                    className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
                    type="text"
                    placeholder="..."
                    value={azureTTSEndpoint}
                    onChange={(e) =>
                      settingsStore.setState({
                        azureTTSEndpoint: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4 font-bold">{t('OpenAITTSVoice')}</div>
                <div className="mt-2">
                  <select
                    value={openaiTTSVoice}
                    onChange={(e) =>
                      settingsStore.setState({
                        openaiTTSVoice: e.target.value as OpenAITTSVoice,
                      })
                    }
                    className="px-4 py-2 bg-white hover:bg-white-hover rounded-lg"
                  >
                    <option value="alloy">alloy</option>
                    <option value="echo">echo</option>
                    <option value="fable">fable</option>
                    <option value="onyx">onyx</option>
                    <option value="nova">nova</option>
                    <option value="shimmer">shimmer</option>
                  </select>
                </div>
                <div className="mt-4 font-bold">{t('OpenAITTSModel')}</div>
                <div className="mt-4 font-bold">
                  {t('OpenAITTSSpeed')}: {openaiTTSSpeed}
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={4.0}
                  step={0.01}
                  value={openaiTTSSpeed}
                  className="mt-2 mb-4 input-range"
                  onChange={(e) => {
                    settingsStore.setState({
                      openaiTTSSpeed: Number(e.target.value),
                    })
                  }}
                />
              </>
            )
          }
        })()}
      </div>

      {/* カスタムテキスト入力と統合テストボタン */}
      <div className="mt-10 p-4 bg-gray-50 rounded-lg">
        <div className="mb-4 text-xl font-bold">{t('TestVoiceSettings')}</div>
        <div className="flex items-center">
          <input
            className="flex-1 px-4 py-2 bg-white hover:bg-white-hover rounded-lg"
            type="text"
            placeholder={t('CustomVoiceTextPlaceholder')}
            value={customVoiceText}
            onChange={(e) => setCustomVoiceText(e.target.value)}
          />
        </div>
        <div className="flex items-center mt-4">
          <TextButton
            onClick={() => testVoice(selectVoice, customVoiceText)}
            disabled={!customVoiceText}
          >
            {t('TestSelectedVoice')}
          </TextButton>
        </div>
      </div>
    </div>
  )
}
export default Voice
