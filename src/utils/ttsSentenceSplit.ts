/**
 * TTS 送信用の文切り出し
 * Style-Bert-VITS2: 句点（。！？）単位でまとめ、読点では切らない
 */

const MAJOR_SENTENCE_END = /[。．.!?！？\n]/
const OPEN_QUOTE = /[「『（(\[]/g
const CLOSE_QUOTE = /[」』）)\]]/g

/** SBV2: 1リクエストにまとめる最大文字数（複数文の結合上限） */
export const SBV2_MERGE_MAX_CHARS = 100

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

  if (
    /^[\s」』）)\]、,，.!?！？:：;；\-_~～'"''""]+$/.test(t)
  ) {
    return true
  }

  return false
}

/**
 * 従来の extractSentence（他エンジン・Irodori 等・低遅延向け）
 */
export function extractSentenceDefault(
  text: string
): { sentence: string; remainingText: string } {
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
export function extractSentenceStyleBertVits2(
  text: string
): { sentence: string; remainingText: string } {
  if (!text) {
    return { sentence: '', remainingText: '' }
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
  return extractSentenceDefault(text)
}

/**
 * ストリーム終了時: 残りテキストを1リクエスト用に整形
 */
export function finalizeStyleBertVits2Tail(text: string): string {
  return text.trim()
}
