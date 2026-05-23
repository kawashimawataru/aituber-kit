/**
 * Phase 4.5-2: 反応スケジューラ
 * 入力確定イベントを受け取り、L1（先出し反応）を即座にキューに入れ、
 * 本編 LLM 生成と並行して処理する
 *
 * L0: 聴いている見せ（idle 揺れ — TTS 不要、既存アイドルで対応）
 * L1: 先出し反応（「えっ」「ふふ」「まじ？」等）
 * L2: 本編（既存 LLM ストリーム）
 * L3: 事後非言語（笑い SE / 息）
 */

import { playSE, getLaughSEPath } from '@/utils/sePlayer'
import homeStore from '@/features/stores/home'
import { speakCharacter } from '@/features/messages/speakCharacter'

export type LaughType = 'short' | 'medium' | 'big'

// L1 先出し反応テンプレート（キーワード → 反応）
const L1_RULES: Array<{
  pattern: RegExp
  reactions: string[]
  emotion: string
}> = [
  {
    pattern: /草|w{2,}|笑|ｗ{2,}|lol|lmao/i,
    reactions: ['ふふ', 'あはは', 'うける', 'わかる'],
    emotion: 'happy',
  },
  {
    pattern: /まじ|マジ|え[えぇ]|嘘|うそ/,
    reactions: ['え？', 'まじ？', 'えっと'],
    emotion: 'surprised',
  },
  {
    pattern: /かわい|可愛|きゃわ/,
    reactions: ['ありがとう', 'えへへ'],
    emotion: 'happy',
  },
  {
    pattern: /おめでと|祝|anniversary/i,
    reactions: ['ありがとー！', 'やった！'],
    emotion: 'happy',
  },
  {
    pattern: /つら|辛い|きつい|しんど/,
    reactions: ['うーん', 'それは'],
    emotion: 'sad',
  },
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * コメントテキストから L1 先出し反応を選ぶ
 * マッチしなければ null
 */
export function selectL1Reaction(
  text: string
): { phrase: string; emotion: string } | null {
  for (const rule of L1_RULES) {
    if (rule.pattern.test(text)) {
      return {
        phrase: pickRandom(rule.reactions),
        emotion: rule.emotion,
      }
    }
  }
  return null
}

/**
 * L1 を SpeakQueue に先出しする
 * handleSendChat の直前に呼ぶ
 */
export function scheduleL1Reaction(inputText: string): void {
  const reaction = selectL1Reaction(inputText)
  if (!reaction) return

  const hs = homeStore.getState()
  if (hs.isSpeaking || hs.chatProcessing) return

  const sessionId = `l1-${Date.now()}`
  speakCharacter(
    sessionId,
    {
      message: reaction.phrase,
      emotion: reaction.emotion as any,
    },
    () => {},
    () => {}
  )
}

/**
 * Phase 4.5-3: 笑い SE を即時再生する（L3 事後非言語）
 */
export async function playLaughSE(type: LaughType): Promise<void> {
  await playSE(getLaughSEPath(type), 0.7)
}

/**
 * `[laugh:short|medium|big]` タグ文字列を解析して再生
 */
export function parseLaughTag(text: string): {
  laughType: LaughType | null
  remainingText: string
} {
  const match = text.match(/^\s*\[laugh:(short|medium|big)\]/i)
  if (match) {
    return {
      laughType: match[1] as LaughType,
      remainingText: text.slice(text.indexOf(match[0]) + match[0].length).trimStart(),
    }
  }
  return { laughType: null, remainingText: text }
}
