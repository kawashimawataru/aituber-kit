import { sbv2SpeakBatcher } from '@/features/messages/sbv2SpeakBatcher'

describe('sbv2SpeakBatcher', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    sbv2SpeakBatcher.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('句点で終わる文は別リクエストに分ける', () => {
    const sink = jest.fn()
    sbv2SpeakBatcher.setSink(sink)

    sbv2SpeakBatcher.enqueue('s1', {
      message: 'うん、よろしくね！',
      emotion: 'neutral',
    })
    sbv2SpeakBatcher.enqueue('s1', {
      message: 'これからたくさんおしゃべりしようね！',
      emotion: 'neutral',
    })

    jest.advanceTimersByTime(250)

    expect(sink).toHaveBeenCalledTimes(2)
    expect(sink.mock.calls[0][1].message).toBe('うん、よろしくね！')
    expect(sink.mock.calls[1][1].message).toBe(
      'これからたくさんおしゃべりしようね！'
    )
  })

  it('flushNow で即座に送出する', () => {
    const sink = jest.fn()
    sbv2SpeakBatcher.setSink(sink)

    sbv2SpeakBatcher.enqueue('s1', {
      message: 'こんにちは！',
      emotion: 'neutral',
    })
    sbv2SpeakBatcher.flushNow()

    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink.mock.calls[0][1].message).toBe('こんにちは！')
  })
})
