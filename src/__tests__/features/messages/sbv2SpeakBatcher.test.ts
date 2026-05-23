import { sbv2SpeakBatcher } from '@/features/messages/sbv2SpeakBatcher'
import { SBV2_MAX_SENTENCES_PER_BATCH } from '@/utils/ttsSentenceSplit'

describe('sbv2SpeakBatcher', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    sbv2SpeakBatcher.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('先頭1文は即座に1リクエストとして送る', () => {
    const sink = jest.fn()
    sbv2SpeakBatcher.setSink(sink)

    sbv2SpeakBatcher.enqueue('s1', {
      message: 'うん、よろしくね！',
      emotion: 'neutral',
    })

    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink.mock.calls[0][1].message).toBe('うん、よろしくね！')
  })

  it('2文目以降は最大2文まで \\n 結合', () => {
    const sink = jest.fn()
    sbv2SpeakBatcher.setSink(sink)

    sbv2SpeakBatcher.enqueue('s1', {
      message: '文1です！',
      emotion: 'neutral',
    })
    sbv2SpeakBatcher.enqueue('s1', {
      message: '文2です！',
      emotion: 'neutral',
    })
    sbv2SpeakBatcher.enqueue('s1', {
      message: '文3です！',
      emotion: 'neutral',
    })

    expect(sink).toHaveBeenCalledTimes(2)
    expect(sink.mock.calls[0][1].message).toBe('文1です！')
    expect(sink.mock.calls[1][1].message).toBe('文2です！\n文3です！')
  })

  it('flushNow で残りを送出', () => {
    const sink = jest.fn()
    sbv2SpeakBatcher.setSink(sink)

    sbv2SpeakBatcher.enqueue('s1', {
      message: 'こんにちは！',
      emotion: 'neutral',
    })
    sbv2SpeakBatcher.enqueue('s1', {
      message: '元気？',
      emotion: 'neutral',
    })
    sbv2SpeakBatcher.flushNow()

    expect(sink).toHaveBeenCalledTimes(2)
    expect(sink.mock.calls[1][1].message).toBe('元気？')
  })

  it(`${SBV2_MAX_SENTENCES_PER_BATCH + 2}文で先頭1 + 2文バッチ×2`, () => {
    const sink = jest.fn()
    sbv2SpeakBatcher.setSink(sink)

    for (let i = 1; i <= SBV2_MAX_SENTENCES_PER_BATCH + 2; i++) {
      sbv2SpeakBatcher.enqueue('s1', {
        message: `文${i}です！`,
        emotion: 'neutral',
      })
    }

    sbv2SpeakBatcher.flushNow()

    expect(sink).toHaveBeenCalledTimes(3)
    expect(sink.mock.calls[0][1].message).toBe('文1です！')
    expect(sink.mock.calls[1][1].message).toBe('文2です！\n文3です！')
    expect(sink.mock.calls[2][1].message).toBe('文4です！')
  })
})
