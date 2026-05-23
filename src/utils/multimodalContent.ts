import { Message } from '@/features/messages/messages'

/** マルチモーダル content 配列からテキストを安全に取得 */
export function getTextFromMessageContent(
  content: Message['content'] | undefined
): string {
  if (content === undefined) return ''
  if (typeof content === 'string') return content
  if (!Array.isArray(content) || !content[0]) return ''
  const first = content[0]
  return typeof first === 'object' && first && 'text' in first
    ? first.text
    : ''
}

/** マルチモーダル content 配列から画像 URL を安全に取得 */
export function getImageFromMessageContent(
  content: Message['content'] | undefined
): string {
  if (!Array.isArray(content) || !content[1]) return ''
  const second = content[1]
  return typeof second === 'object' && second && 'image' in second
    ? second.image
    : ''
}
