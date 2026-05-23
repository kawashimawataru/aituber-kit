import { wait } from '@/utils/wait'
import { AIVoice } from '@/features/constants/settings'
import settingsStore from '@/features/stores/settings'
import { Talk } from './messages'
import { SpeakQueue } from './speakQueue'
import {
  asyncConvertEnglishToJapaneseReading,
  containsEnglish,
} from '@/utils/textProcessing'

/** 文と文の間の自然な間 — Irodori 等 */
export const INTER_SENTENCE_PAUSE_MS = 150

/** SBV2: バッチ WAV 間の最小間隔（split_interval=0.5s に合わせた自然な文間ポーズ） */
export const SBV2_INTER_BATCH_PAUSE_MS = 500

/** SBV2 等ローカル TTS の同時合成数（サーバー直列推論のため SBV2 は 1） */
export const LOCAL_TTS_MAX_CONCURRENT_SYNTH = 2
export const SBV2_MAX_CONCURRENT_SYNTH = 1

type PendingItem = {
  sessionId: string
  buffer: ArrayBuffer
  talk: Talk
  isNeedDecode: boolean
  onComplete?: () => void
  tokenAtStart: number
}

const PREFETCH_VOICES: AIVoice[] = ['stylebertvits2', 'irodoritts']

export function usesPrefetchTts(voice: AIVoice): boolean {
  return PREFETCH_VOICES.includes(voice)
}

/**
 * ローカル TTS 向け: 合成は並列、再生は順序維持。
 * 再生中に次の文を先読みして文間の空白を短くする。
 */
export class PrefetchSpeakPipeline {
  private static _instance: PrefetchSpeakPipeline | null = null
  private synthSeq = 0
  private playSeq = 0
  private pending = new Map<number, PendingItem>()
  private sessionId: string | null = null
  private inFlight = 0

  static getInstance(): PrefetchSpeakPipeline {
    if (!PrefetchSpeakPipeline._instance) {
      PrefetchSpeakPipeline._instance = new PrefetchSpeakPipeline()
    }
    return PrefetchSpeakPipeline._instance
  }

  reset(sessionId?: string) {
    if (sessionId && this.sessionId === sessionId) return
    this.pending.clear()
    this.synthSeq = 0
    this.playSeq = 0
    this.inFlight = 0
    if (sessionId) this.sessionId = sessionId
  }

  clearAll() {
    this.pending.clear()
    this.synthSeq = 0
    this.playSeq = 0
    this.inFlight = 0
    this.sessionId = null
  }

  enqueue(
    sessionId: string,
    talk: Talk,
    synthesize: (talk: Talk) => Promise<ArrayBuffer | null>,
    initialToken: number,
    onComplete?: () => void
  ) {
    if (this.sessionId !== sessionId) {
      this.reset()
      this.sessionId = sessionId
    }

    const index = this.synthSeq++
    void this.runSynth(index, sessionId, talk, synthesize, initialToken, onComplete)
  }

  private async runSynth(
    _index: number,
    sessionId: string,
    talk: Talk,
    synthesize: (talk: Talk) => Promise<ArrayBuffer | null>,
    initialToken: number,
    onComplete?: () => void
  ) {
    const voice = settingsStore.getState().selectVoice
    const maxConcurrent =
      voice === 'stylebertvits2'
        ? SBV2_MAX_CONCURRENT_SYNTH
        : LOCAL_TTS_MAX_CONCURRENT_SYNTH

    while (this.inFlight >= maxConcurrent) {
      if (SpeakQueue.currentStopToken !== initialToken) return
      await wait(16)
    }

    if (SpeakQueue.currentStopToken !== initialToken) return

    this.inFlight++
    try {
      const ss = settingsStore.getState()
      let message = talk.message

      if (
        message &&
        ss.changeEnglishToJapanese &&
        ss.selectLanguage === 'ja' &&
        containsEnglish(message)
      ) {
        try {
          message = await asyncConvertEnglishToJapaneseReading(message)
          talk = { ...talk, message }
        } catch (error) {
          console.error('Error converting English to Japanese:', error)
        }
      }

      if (SpeakQueue.currentStopToken !== initialToken) return

      const buffer = message ? await synthesize(talk) : null

      if (SpeakQueue.currentStopToken !== initialToken) {
        onComplete?.()
        return
      }

      if (!buffer) {
        onComplete?.()
        return
      }

      this.pending.set(_index, {
        sessionId,
        buffer,
        talk,
        isNeedDecode: true,
        onComplete,
        tokenAtStart: initialToken,
      })
      this.flushReady()
    } finally {
      this.inFlight--
    }
  }

  private flushReady() {
    const speakQueue = SpeakQueue.getInstance()

    while (this.pending.has(this.playSeq)) {
      const item = this.pending.get(this.playSeq)!
      this.pending.delete(this.playSeq)
      this.playSeq++

      if (item.tokenAtStart !== SpeakQueue.currentStopToken) {
        item.onComplete?.()
        continue
      }

      let called = false
      const guardedOnComplete = () => {
        if (item.onComplete && !called) {
          called = true
          item.onComplete()
        }
      }

      speakQueue.addTask({
        sessionId: item.sessionId,
        audioBuffer: item.buffer,
        talk: item.talk,
        isNeedDecode: item.isNeedDecode,
        onComplete: guardedOnComplete,
      })
    }
  }
}
