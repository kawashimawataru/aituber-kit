import { Talk } from './messages'
import { SBV2_MERGE_MAX_CHARS } from '@/utils/ttsSentenceSplit'

/** ストリーム中に届く連続文をまとめる待ち時間 */
const FLUSH_DEBOUNCE_MS = 250

const SENTENCE_ENDED = /[。．.!?！？]$/

export type Sbv2BatchSink = (
  sessionId: string,
  talk: Talk,
  onComplete?: () => void
) => void

/**
 * Style-Bert-VITS2: ストリームで句点ごとに分かれた発話を短時間バッファし、
 * 1回の /voice にまとめてから合成する（文間の不自然な無音・待ちを防ぐ）
 */
class Sbv2SpeakBatcher {
  private sink: Sbv2BatchSink | null = null
  private sessionId = ''
  private parts: string[] = []
  private talkMeta: Pick<Talk, 'emotion' | 'motion'> = { emotion: 'neutral' }
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private pendingCompletes: Array<() => void> = []

  setSink(sink: Sbv2BatchSink) {
    this.sink = sink
  }

  enqueue(sessionId: string, talk: Talk, onComplete?: () => void) {
    const text = talk.message.trim()
    if (!text) {
      onComplete?.()
      return
    }

    if (sessionId !== this.sessionId) {
      this.flushNow()
      this.sessionId = sessionId
    }

    const mergedLen = this.parts.join('').length + text.length
    if (mergedLen > SBV2_MERGE_MAX_CHARS && this.parts.length > 0) {
      this.flushNow()
      this.sessionId = sessionId
    }

    const lastPart = this.parts[this.parts.length - 1]
    if (this.parts.length > 0 && SENTENCE_ENDED.test(lastPart.trim())) {
      this.flushNow()
    }

    this.parts.push(text)
    if (talk.emotion) this.talkMeta.emotion = talk.emotion
    if (talk.motion) this.talkMeta.motion = talk.motion
    if (onComplete) this.pendingCompletes.push(onComplete)

    this.scheduleFlush()
  }

  scheduleFlush() {
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = setTimeout(() => this.flushNow(), FLUSH_DEBOUNCE_MS)
  }

  flushNow() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (this.parts.length === 0 || !this.sink) return

    const message = this.parts.join('')
    const completes = this.pendingCompletes
    const sessionId = this.sessionId
    const talk: Talk = {
      message,
      emotion: this.talkMeta.emotion,
      motion: this.talkMeta.motion,
    }

    this.parts = []
    this.pendingCompletes = []

    this.sink(sessionId, talk, () => {
      completes.forEach((cb) => {
        try {
          cb()
        } catch {
          // ignore
        }
      })
    })
  }

  clear() {
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = null
    this.parts = []
    this.pendingCompletes = []
    this.sessionId = ''
  }
}

export const sbv2SpeakBatcher = new Sbv2SpeakBatcher()
