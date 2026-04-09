import {
  buildGameCommentaryMessages,
  parseCommentaryResponse,
} from '@/features/gameCommentary/generateGameCommentary'
import { normalizeGameCommentarySceneAnalysis } from '@/features/gameCommentary/analyzeGameCommentaryScene'

jest.mock('@/features/stores/settings', () => ({
  __esModule: true,
  default: {
    getState: () => ({
      systemPrompt: 'character prompt',
      gameCommentaryPromptTemplate: 'commentary prompt',
    }),
  },
}))

describe('game commentary helpers', () => {
  it('builds commentary messages with background scene analyses', () => {
    const messages = buildGameCommentaryMessages(
      [{ commentary: '前回の実況', sceneDescription: '前回のシーン' }],
      'data:image/jpeg;base64,current',
      [{ role: 'user', content: '右に行って！' }],
      [{ summary: 'プレイヤーが右通路へ移動中' }]
    )

    expect(messages).toEqual([
      { role: 'system', content: 'character prompt\n\ncommentary prompt' },
      { role: 'user', content: '右に行って！' },
      { role: 'user', content: '[前回の画面状況] 前回のシーン' },
      { role: 'assistant', content: '前回の実況' },
      {
        role: 'user',
        content:
          '[発話中の補助的な画面解析メモ・古い順]\n1. プレイヤーが右通路へ移動中',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: '画面の状況を実況してください。' },
          { type: 'image', image: 'data:image/jpeg;base64,current' },
        ],
      },
    ])
  })

  it('parses commentary response with emotion and scene', () => {
    expect(
      parseCommentaryResponse(
        '[happy]ナイス回避！\n[scene]プレイヤーがボスの左後方へ回り込み、HPは6割。'
      )
    ).toEqual({
      text: 'ナイス回避！',
      emotion: 'happy',
      sceneDescription: 'プレイヤーがボスの左後方へ回り込み、HPは6割。',
    })
  })

  it('normalizes background scene analysis output', () => {
    expect(
      normalizeGameCommentarySceneAnalysis(
        '  プレイヤーが崖際にいる  \n\nHPは残りわずか\n\n敵が接近中\n\n余計な行'
      )
    ).toBe('プレイヤーが崖際にいる\nHPは残りわずか\n敵が接近中')
  })
})
