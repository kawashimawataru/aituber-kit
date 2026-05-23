import { EmotionType } from '@/features/messages/messages'

/** Talk.emotion を Irodori-TTS 用の先頭絵文字に変換 */
const EMOTION_EMOJI: Partial<Record<EmotionType, string>> = {
  happy: '🤭',
  sad: '😭',
  angry: '😠',
  surprised: '😮',
  relaxed: '🫶',
}

export function applyIrodoriEmotionToText(
  text: string,
  emotion: EmotionType,
  injectEmotion: boolean
): string {
  const trimmed = text.trim()
  if (!trimmed || !injectEmotion) return trimmed

  const emoji = EMOTION_EMOJI[emotion]
  if (!emoji) return trimmed

  if (trimmed.startsWith(emoji)) return trimmed
  return `${emoji}${trimmed}`
}
