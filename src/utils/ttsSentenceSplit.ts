/**
 * TTS 送信用の文切り出し
 * Style-Bert-VITS2: 句点（。！？）単位でまとめ、読点では切らない
 */

const MAJOR_SENTENCE_END = /[。．.!?！？\n]/
const OPEN_QUOTE = /[「『（(\[]/g
const CLOSE_QUOTE = /[」』）)\]]/g

/** SBV2: 1 POST にまとめる最大文字数 (安全網; 通常は MAX_SENTENCES で先にフラッシュ) */
export const SBV2_MERGE_MAX_CHARS = 80

/** SBV2: 先頭は即1文だけ送る（Time-to-first-audio 短縮） */
export const SBV2_FIRST_CHUNK_SENTENCES = 1

/**
 * SBV2: 1 POST あたりの最大文数。
 * 1文/バッチにすることで各合成が3-5秒に収まり、
 * 先読みパイプラインが再生中に次バッチを完了できる。
 */
export const SBV2_MAX_SENTENCES_PER_BATCH = 1

/** SBV2: auto_split 時の文間無音（秒）— 複数文を1バッチに結合する場合のみ使用 */
export const SBV2_SPLIT_INTERVAL_SEC = 0.5

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) || []).length
}

/** 開き括弧・引用符が閉じていない */
export function hasUnclosedJapaneseQuote(text: string): boolean {
  return countMatches(text, OPEN_QUOTE) > countMatches(text, CLOSE_QUOTE)
}

/** 単独では TTS に送らない断片（」ね！ だけ等） */
export function isInvalidStandaloneTtsUnit(text: string): boolean {
  const t = text.trim()
  if (!t) return true

  if (/^[」』）)\]】›»]+/.test(t) && t.length < 24) {
    return true
  }

  if (/^[\s」』）)\]、,，.!?！？:：;；\-_~～'"''""]+$/.test(t)) {
    return true
  }

  return false
}

/**
 * 従来の extractSentence（他エンジン・Irodori 等・低遅延向け）
 */
export function extractSentenceDefault(text: string): {
  sentence: string
  remainingText: string
} {
  const sentenceMatch = text.match(
    /^(.{1,19}?(?:[。．.!?！？\n]|(?=\[))|.{20,}?(?:[、,。．.!?！？\n]|(?=\[)))/
  )
  if (sentenceMatch?.[0]) {
    return {
      sentence: sentenceMatch[0],
      remainingText: text.slice(sentenceMatch[0].length).trimStart(),
    }
  }
  return { sentence: '', remainingText: text }
}

/**
 * Style-Bert-VITS2 向け:
 * - 読点（、）では切らない
 * - 最初の句点（。！？）までを1塊（複数文は別 TTS + 再生間ポーズ）
 */
export function extractSentenceStyleBertVits2(text: string): {
  sentence: string
  remainingText: string
} {
  if (!text) {
    return { sentence: '', remainingText: '' }
  }

  const inlineControl = text.search(/\[(?:laugh|stunt|motion|bg):[^\]]+\]/i)
  if (inlineControl > 0) {
    const before = text.slice(0, inlineControl)
    const after = text.slice(inlineControl)
    const split = extractSentenceStyleBertVits2(before)
    if (split.sentence) {
      return {
        sentence: split.sentence,
        remainingText: [split.remainingText, after]
          .filter(Boolean)
          .join(' ')
          .trim(),
      }
    }
  }

  let firstSentenceEnd = -1

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (!MAJOR_SENTENCE_END.test(ch)) continue

    const chunk = text.slice(0, i + 1)
    if (hasUnclosedJapaneseQuote(chunk)) continue

    firstSentenceEnd = i
    break
  }

  if (firstSentenceEnd >= 0) {
    const sentence = text.slice(0, firstSentenceEnd + 1).trim()
    const remainingText = text.slice(firstSentenceEnd + 1).trimStart()

    if (isInvalidStandaloneTtsUnit(sentence)) {
      return { sentence: '', remainingText: text }
    }

    return { sentence, remainingText }
  }

  // 句点がまだ来ていない → ストリーム中はバッファ（読点だけでは送らない）
  if (text.length <= SBV2_MERGE_MAX_CHARS) {
    return { sentence: '', remainingText: text }
  }

  return { sentence: '', remainingText: text }
}

export function extractSentenceForVoice(
  text: string,
  voice: string
): { sentence: string; remainingText: string } {
  if (voice === 'stylebertvits2') {
    return extractSentenceStyleBertVits2(text)
  }
  // IrodoriTTS: split at sentence endings only (no comma splits)
  // The server handles internal 。！？ splitting via split_sentences=True
  if (voice === 'irodoritts') {
    return extractSentenceSentenceEnd(text)
  }
  return extractSentenceDefault(text)
}

export type TtsSplitMode = 'auto' | 'punctuation' | 'sentence' | 'all'

/**
 * 句読点区切り: 、。！？ など読点・句点どちらでも区切る（文字数しきい値なし）
 */
export function extractSentencePunctuation(text: string): {
  sentence: string
  remainingText: string
} {
  const m = text.match(/^(.+?[、，,。．.!?！？\n])/)
  if (m?.[0]) {
    return {
      sentence: m[0],
      remainingText: text.slice(m[0].length).trimStart(),
    }
  }
  return { sentence: '', remainingText: text }
}

/**
 * 文末区切り: 。！？ のみ（読点では切らない）
 */
export function extractSentenceSentenceEnd(text: string): {
  sentence: string
  remainingText: string
} {
  const m = text.match(/^(.+?[。．.!?！？\n])/)
  if (m?.[0]) {
    return {
      sentence: m[0],
      remainingText: text.slice(m[0].length).trimStart(),
    }
  }
  return { sentence: '', remainingText: text }
}

/**
 * 一括送信: ストリーム完了まで蓄積し、done 時に一度に送る
 */
export function extractSentenceAll(_text: string): {
  sentence: string
  remainingText: string
} {
  return { sentence: '', remainingText: _text }
}

/**
 * モードと音声エンジンに基づいて文を切り出す
 */
export function extractSentenceByMode(
  text: string,
  mode: TtsSplitMode,
  voice: string
): { sentence: string; remainingText: string } {
  switch (mode) {
    case 'punctuation':
      return extractSentencePunctuation(text)
    case 'sentence':
      return extractSentenceSentenceEnd(text)
    case 'all':
      return extractSentenceAll(text)
    case 'auto':
    default:
      return extractSentenceForVoice(text, voice)
  }
}

/**
 * ストリーム終了時: 残りテキストを1リクエスト用に整形
 */
export function finalizeStyleBertVits2Tail(text: string): string {
  return text.trim()
}
