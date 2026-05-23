import type { NextApiRequest, NextApiResponse } from 'next'

type Response = { token: string } | { error: string }

// Deepgram WebSocket STT用の一時トークン（API キーをブラウザに直露出しない）
export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPGRAM_API_KEY is not configured' })
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'limited', ttl: 30 }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Deepgram token error:', text)
      return res.status(response.status).json({ error: 'Failed to get token' })
    }

    const data = await response.json()
    return res.status(200).json({ token: data.key })
  } catch (err) {
    console.error('Deepgram token fetch error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
