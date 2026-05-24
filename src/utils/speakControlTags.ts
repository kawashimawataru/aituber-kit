import { EMOTIONS } from '@/features/messages/messages'

const EMOTION_TAG_PATTERN = new RegExp(
  `\\[(?:${EMOTIONS.join('|')})\\]`,
  'gi'
)

/** 独白・メタ用タグ（TTS・表示から除去） */
const META_TAG_PATTERN =
  /\[(?:thought|thinking|internal|whisper|aside|memo|note)\]/gi

/** LLM が invent する [curious] [excited] 等（既知タグ除去後のフォールバック） */
const UNKNOWN_ASCII_TAG_PATTERN = /\[(?!\/)[a-zA-Z][a-zA-Z0-9_:]*\]/g

/**
 * TTS 用テキストから制御タグを除去（文中・先頭・末尾すべて）
 */
export function stripSpeakControlTags(text: string): string {
  return text
    .replace(/\[motion:[^\]]+\]/gi, '')
    .replace(/\[stunt:[a-z_]+\]/gi, '')
    .replace(/\[bg:[^\]]+\]/gi, '')
    .replace(/\[laugh:(?:short|medium|big)\]/gi, '')
    .replace(META_TAG_PATTERN, '')
    .replace(EMOTION_TAG_PATTERN, '')
    .replace(UNKNOWN_ASCII_TAG_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * 画面実況など LLM 出力をプレーンな発話テキストに整える
 */
export function sanitizeVisionCommentaryText(text: string): string {
  let cleaned = stripSpeakControlTags(text)
  // JSON 残骸やコードフェンス
  cleaned = cleaned
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{"text"\s*:/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return cleaned
}
