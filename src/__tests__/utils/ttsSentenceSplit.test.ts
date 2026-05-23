import {
  extractSentenceDefault,
  extractSentenceStyleBertVits2,
  finalizeStyleBertVits2Tail,
  hasUnclosedJapaneseQuote,
  isInvalidStandaloneTtsUnit,
} from '@/utils/ttsSentenceSplit'

describe('ttsSentenceSplit', () => {
  describe('extractSentenceStyleBertVits2', () => {
    it('句点までを1文として切り出す', () => {
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

    it('読点では短い文を切らない', () => {
      expect(
        extractSentenceStyleBertVits2('えーと、それは、')
      ).toEqual({
        sentence: '',
        remainingText: 'えーと、それは、',
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
