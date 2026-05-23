import {
  extractSentenceDefault,
  extractSentenceStyleBertVits2,
  finalizeStyleBertVits2Tail,
  hasUnclosedJapaneseQuote,
  isInvalidStandaloneTtsUnit,
} from '@/utils/ttsSentenceSplit'

describe('ttsSentenceSplit', () => {
  describe('extractSentenceStyleBertVits2', () => {
    it('最初の句点までを1文として切り出す', () => {
      expect(
        extractSentenceStyleBertVits2('こんにちは。元気ですか。')
      ).toEqual({
        sentence: 'こんにちは。',
        remainingText: '元気ですか。',
      })
    })

    it('「」の途中では ! で切らない', () => {
      const result = extractSentenceStyleBertVits2('「ちょっと待って！')
      expect(result.sentence).toBe('')
      expect(result.remainingText).toBe('「ちょっと待って！')
    })

    it('「」が閉じたら1文にまとめる', () => {
      expect(
        extractSentenceStyleBertVits2('「ちょっと待って！」ね！')
      ).toEqual({
        sentence: '「ちょっと待って！」ね！',
        remainingText: '',
      })
    })

    it('」だけの断片は単独送信しない', () => {
      expect(extractSentenceStyleBertVits2('」ね！').sentence).toBe('')
    })

    it('読点だけでは切らない（句点までバッファ）', () => {
      expect(
        extractSentenceStyleBertVits2('えーと、それは、')
      ).toEqual({
        sentence: '',
        remainingText: 'えーと、それは、',
      })
    })

    it('複数文は最初の句点で区切る', () => {
      const text =
        '私はね、可愛いものと美味しいものに目がないんだ！よろしくね！'
      expect(extractSentenceStyleBertVits2(text)).toEqual({
        sentence: '私はね、可愛いものと美味しいものに目がないんだ！',
        remainingText: 'よろしくね！',
      })
    })

    it('読点では切らず句点まで1塊にする', () => {
      const text = 'えっとね、楽しいことと可愛いものに夢中な私だよ！'
      expect(extractSentenceStyleBertVits2(text)).toEqual({
        sentence: 'えっとね、楽しいことと可愛いものに夢中な私だよ！',
        remainingText: '',
      })
    })
  })

  describe('helpers', () => {
    it('hasUnclosedJapaneseQuote', () => {
      expect(hasUnclosedJapaneseQuote('「あ')).toBe(true)
      expect(hasUnclosedJapaneseQuote('「あ」')).toBe(false)
    })

    it('isInvalidStandaloneTtsUnit', () => {
      expect(isInvalidStandaloneTtsUnit('」ね！')).toBe(true)
      expect(isInvalidStandaloneTtsUnit('わかるー！')).toBe(false)
    })

    it('extractSentenceDefault は従来どおり早めに切る', () => {
      const long = 'あ'.repeat(25) + '、'
      const { sentence } = extractSentenceDefault(long)
      expect(sentence.endsWith('、')).toBe(true)
    })

    it('finalizeStyleBertVits2Tail', () => {
      expect(finalizeStyleBertVits2Tail('  残り  ')).toBe('残り')
    })
  })
})
