/** Deepgram Live 用ユーティリティ（pngtuber-main 準拠） */

export const DEEPGRAM_WS_BASE = 'wss://api.deepgram.com/v1/listen'

/** ノイズフロアより少し上 — 話し始め / 無音判定 */
export const DEEPGRAM_SILENCE_RMS = 0.012
/** 無音がこの時間続いたら発話終了（ms） */
export const DEEPGRAM_SILENCE_HOLD_MS = 1500
/** 音がこの時間続いたら「話し始め」（ms） */
export const DEEPGRAM_VOICE_START_HOLD_MS = 120

export function languageToDeepgramCode(language: string): string {
  if (language === 'ja') return 'ja'
  if (language === 'zh-CN' || language === 'zh-TW') return 'zh'
  if (language === 'ko') return 'ko'
  if (language === 'en') return 'en-US'
  return language
}

export function buildDeepgramLiveUrl(options: {
  language: string
  sampleRate: number
  model?: string
  endpointingMs?: number
  utteranceEndMs?: number
}): string {
  const {
    language,
    sampleRate,
    model = 'nova-3',
    endpointingMs = 700,
    utteranceEndMs = 1500,
  } = options

  const params = new URLSearchParams({
    model,
    language: languageToDeepgramCode(language),
    encoding: 'linear16',
    channels: '1',
    sample_rate: String(Math.round(sampleRate)),
    punctuate: 'true',
    interim_results: 'true',
    smart_format: 'true',
    endpointing: String(endpointingMs),
    utterance_end_ms: String(utteranceEndMs),
  })

  return `${DEEPGRAM_WS_BASE}?${params.toString()}`
}

export function calculateRms(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

export function float32ToInt16(input: Float32Array): Int16Array {
  const int16 = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16
}

/** partial テキストのマージ（pngtuber mergePartial 相当） */
export function mergeDeepgramPartial(cur: string, incoming: string): string {
  cur = (cur || '').trim()
  incoming = (incoming || '').trim()
  if (!incoming) return cur
  if (!cur) return incoming
  if (incoming.startsWith(cur)) return incoming
  if (cur.startsWith(incoming)) return cur

  const max = Math.min(cur.length, incoming.length)
  for (let k = max; k >= 3; k--) {
    if (cur.slice(-k) === incoming.slice(0, k)) {
      return (cur + incoming.slice(k)).trim()
    }
  }
  return incoming
}

export async function fetchDeepgramAuthKey(
  clientApiKey: string
): Promise<string | null> {
  const trimmed = clientApiKey.trim()
  if (trimmed) return trimmed

  try {
    const resp = await fetch('/api/stt-deepgram-token', { method: 'POST' })
    if (!resp.ok) return null
    const data = await resp.json()
    return typeof data.token === 'string' ? data.token : null
  } catch {
    return null
  }
}

export function sendDeepgramCloseStream(ws: WebSocket | null) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify({ type: 'CloseStream' }))
  } catch {
    // ignore
  }
}
