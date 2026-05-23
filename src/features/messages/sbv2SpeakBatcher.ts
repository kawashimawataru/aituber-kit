import { Talk } from './messages'
import {
  SBV2_FIRST_CHUNK_SENTENCES,
  SBV2_MERGE_MAX_CHARS,
  SBV2_MAX_SENTENCES_PER_BATCH,
} from '@/utils/ttsSentenceSplit'

/** ストリーム終了待ち（残り文をまとめる） */
const FLUSH_DEBOUNCE_MS = 250

export type Sbv2BatchSink = (
  sessionId: string,
  talk: Talk,
  onComplete?: () => void
) => void

/**
 * Style-Bert-VITS2:
 * - 先頭1文 → 即 1 POST（最初の声を早く）
 * - 以降 → 最大2文 / 80文字を \n 結合 + auto_split + split_interval
 * - 先読み合成は PrefetchSpeakPipeline が担当
 */
class Sbv2SpeakBatcher {
  private sink: Sbv2BatchSink | null = null
  private sessionId = ''
  private parts: string[] = []
  private talkMeta: Pick<Talk, 'emotion' | 'motion'> = { emotion: 'neutral' }
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private pendingCompletes: Array<() => void> = []
  private firstBatchSent = false

  setSink(sink: Sbv2BatchSink) {
    this.sink = sink
  }

  private joinedLength(): number {
    return this.parts.join('\n').length
  }

  private shouldFlushBatch(): boolean {
    return (
      this.parts.length >= SBV2_MAX_SENTENCES_PER_BATCH ||
      this.joinedLength() >= SBV2_MERGE_MAX_CHARS
    )
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
      this.firstBatchSent = false
    }

    this.parts.push(text)
    if (talk.emotion) this.talkMeta.emotion = talk.emotion
    if (talk.motion) this.talkMeta.motion = talk.motion
    if (onComplete) this.pendingCompletes.push(onComplete)

    if (
      !this.firstBatchSent &&
      this.parts.length >= SBV2_FIRST_CHUNK_SENTENCES
    ) {
      this.flushNow()
      return
    }

    if (this.shouldFlushBatch()) {
      this.flushNow()
      return
    }

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

    const message = this.parts.join('\n')
    const completes = this.pendingCompletes
    const sessionId = this.sessionId
    const talk: Talk = {
      message,
      emotion: this.talkMeta.emotion,
      motion: this.talkMeta.motion,
    }

    this.parts = []
    this.pendingCompletes = []
    this.firstBatchSent = true

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
    this.firstBatchSent = false
  }
}

export const sbv2SpeakBatcher = new Sbv2SpeakBatcher()
