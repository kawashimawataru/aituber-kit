/**
 * Phase 3-2: チャットログをJSONL形式でエクスポートする
 * 各行: {"ts":"ISO8601","role":"user"|"assistant","content":"..."}
 */

import homeStore from '@/features/stores/home'
import { Message } from '@/features/messages/messages'

export interface JsonlRecord {
  ts: string
  role: string
  content: string
}

function messageToRecord(msg: Message): JsonlRecord {
  const content =
    typeof msg.content === 'string'
      ? msg.content
      : Array.isArray(msg.content)
        ? msg.content
            .filter((c) => c.type === 'text')
            .map((c) => (c as { type: 'text'; text: string }).text)
            .join(' ')
        : String(msg.content)

  return {
    ts: msg.timestamp ?? new Date().toISOString(),
    role: msg.role,
    content,
  }
}

export function exportChatLogAsJsonl(): void {
  const chatLog = homeStore.getState().chatLog
  const exportable = chatLog.filter(
    (m) => m.role === 'user' || m.role === 'assistant'
  )

  if (exportable.length === 0) return

  const lines = exportable.map((m) => JSON.stringify(messageToRecord(m)))
  const blob = new Blob([lines.join('\n') + '\n'], {
    type: 'application/jsonlines',
  })

  const date = new Date().toISOString().slice(0, 10)
  const filename = `chat-log-${date}.jsonl`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
