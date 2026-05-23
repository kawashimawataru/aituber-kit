/**
 * TTS 送信用の文切り出し（Style-Bert-VITS2 向けにイントネーション重視）
 */

const MAJOR_SENTENCE_END = /[。．.!?！？\n]/
const OPEN_QUOTE = /[「『（(\[]/g
const CLOSE_QUOTE = /[」』）)\]]/g

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
 * 従来の extractSentence（他エンジン・低遅延向け）
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
 * Style-Bert-VITS2 向け: 句点・終止符単位でまとめ、括弧の途中では切らない
 */
export function extractSentenceStyleBertVits2(
  text: string
): { sentence: string; remainingText: string } {
  if (!text) {
    return { sentence: '', remainingText: '' }
  }

  let endIndex = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (!MAJOR_SENTENCE_END.test(ch)) continue

    const chunk = text.slice(0, i + 1)
    if (hasUnclosedJapaneseQuote(chunk)) {
      continue
    }

    endIndex = i
    break
  }

  if (endIndex >= 0) {
    const sentence = text.slice(0, endIndex + 1).trim()
    const remainingText = text.slice(endIndex + 1).trimStart()

    if (isInvalidStandaloneTtsUnit(sentence)) {
      return { sentence: '', remainingText: text }
    }

    return { sentence, remainingText }
  }

  // 非常に長いときだけ読点で分割（120文字超）
  if (text.length > 120) {
    const commaMatch = text.match(/^(.{40,}?[、,])/)
    if (commaMatch?.[1] && !hasUnclosedJapaneseQuote(commaMatch[1])) {
      const sentence = commaMatch[1].trim()
      if (!isInvalidStandaloneTtsUnit(sentence)) {
        return {
          sentence,
          remainingText: text.slice(commaMatch[1].length).trimStart(),
        }
      }
    }
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
