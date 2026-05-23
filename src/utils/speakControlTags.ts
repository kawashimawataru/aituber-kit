import { EMOTIONS } from '@/features/messages/messages'

const EMOTION_TAG_PATTERN = new RegExp(
  `\\[(?:${EMOTIONS.join('|')})\\]`,
  'gi'
)

/**
 * TTS 用テキストから制御タグを除去（文中・先頭問わず）
 */
export function stripSpeakControlTags(text: string): string {
  return text
    .replace(/\[motion:[^\]]+\]/gi, '')
    .replace(/\[stunt:[a-z_]+\]/gi, '')
    .replace(/\[bg:[^\]]+\]/gi, '')
    .replace(/\[laugh:(?:short|medium|big)\]/gi, '')
    .replace(EMOTION_TAG_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
