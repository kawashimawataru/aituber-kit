import type { NextApiRequest, NextApiResponse } from 'next'

export interface IrodoriTtsVoiceOption {
  id: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IrodoriTtsVoiceOption[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const serverUrl = String(
    req.query.serverUrl ||
      process.env.IRODORI_TTS_SERVER_URL ||
      process.env.NEXT_PUBLIC_IRODORI_TTS_SERVER_URL ||
      ''
  )
    .trim()
    .replace(/\/$/, '')

  if (!serverUrl) {
    return res.status(400).json({ error: 'serverUrl is required' })
  }

  try {
    const apiKey = process.env.IRODORI_TTS_API_KEY || ''
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }

    const response = await fetch(`${serverUrl}/v1/audio/voices`, { headers })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const voices: IrodoriTtsVoiceOption[] = Array.isArray(data?.data)
      ? data.data.map((v: { id?: string; voice_id?: string }) => ({
          id: v.id || v.voice_id || '',
        }))
      : Array.isArray(data)
        ? data.map((id: string) => ({ id }))
        : []

    res.status(200).json(voices.filter((v) => v.id))
  } catch (error) {
    console.error('[irodori-tts-voices]', error)
    res.status(500).json({ error: 'Failed to fetch Irodori-TTS voices' })
  }
}
