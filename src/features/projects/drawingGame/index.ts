import type { ProjectManifest } from '../types'
import drawingGameStore from '@/features/stores/drawingGameStore'
import DrawingGameDetail from './DrawingGameDetail'

const SYSTEM_PROMPT_APPEND = `
---
[お絵描き伝言ゲームモード]
今、ユーザーとお絵描き伝言ゲームをしています。
ユーザーがお題の絵を描き、AIがビジョンで見て何を描いたか当てるゲームです。

ゲームの盛り上げ方:
- 正解したら思いっきり喜んで褒める
- 外れたら「え、それに見える！？」など面白おかしく反応する
- ユーザーが「ゲームしよう」と言ったら企画設定パネルを使うよう案内する
- ゲームに集中した短め・テンポよい返答をする
---`

export const drawingGameProject: ProjectManifest = {
  id: 'drawing-game',
  name: 'お絵描き伝言ゲーム',
  description:
    'AIがお題を出し、ユーザーが絵を描いてAIが当てる！ビジョンAIを使ったリアルタイム対戦。',
  icon: '🎨',
  DetailComponent: DrawingGameDetail,
  systemPromptAppend: () => {
    // Only inject when game is active
    if (drawingGameStore.getState().phase === 'idle') return ''
    return SYSTEM_PROMPT_APPEND
  },
}
