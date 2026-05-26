import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  error?: string
}

function resolveServerUrl(bodyUrl?: string): string {
  const url = (
    bodyUrl?.trim() ||
    process.env.IRODORI_TTS_SERVER_URL ||
    process.env.NEXT_PUBLIC_IRODORI_TTS_SERVER_URL ||
    ''
  ).trim()
  if (!url) {
    throw new Error(
      'Irodori-TTS サーバーURLが未設定です。設定→音声で「http://127.0.0.1:8088」などを入力するか、.env に IRODORI_TTS_SERVER_URL を設定してください。'
    )
  }
  return url.replace(/\/$/, '')
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | Buffer>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body
  const message = String(body.message ?? '').trim()
  if (!message) {
    return res.status(400).json({ error: 'message is required' })
  }

  const irodoriTtsVoice =
    body.irodoriTtsVoice || process.env.NEXT_PUBLIC_IRODORI_TTS_VOICE || ''
  const irodoriTtsModel =
    body.irodoriTtsModel ||
    process.env.NEXT_PUBLIC_IRODORI_TTS_MODEL ||
    'irodori-tts'
  const irodoriTtsSpeed = body.irodoriTtsSpeed ?? 1.0
  const irodoriTtsApiKey =
    body.irodoriTtsApiKey || process.env.IRODORI_TTS_API_KEY || ''
  // 0 = random (not sent), positive = fixed seed
  const irodoriTtsSeed = Number(body.irodoriTtsSeed ?? 0)
  // 0 = use server default (not sent), positive = per-request override
  const irodoriTtsNumSteps = Number(body.irodoriTtsNumSteps ?? 0)
  // 0 = use server default (not sent), non-zero = override sway coefficient
  const irodoriTtsSwayCoeff = Number(body.irodoriTtsSwayCoeff ?? 0)

  try {
    const serverUrl = resolveServerUrl(body.irodoriTtsServerUrl)
    const speechUrl = `${serverUrl}/v1/audio/speech`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'audio/wav',
    }
    if (irodoriTtsApiKey) {
      headers.Authorization = `Bearer ${irodoriTtsApiKey}`
    }

    const payload: Record<string, unknown> = {
      model: irodoriTtsModel,
      input: message,
      response_format: 'wav',
      speed: irodoriTtsSpeed,
    }
    if (irodoriTtsVoice) {
      payload.voice = irodoriTtsVoice
    }
    if (irodoriTtsSeed > 0) {
      payload.seed = irodoriTtsSeed
    }
    if (irodoriTtsNumSteps > 0) {
      payload.num_steps = irodoriTtsNumSteps
    }
    if (irodoriTtsSwayCoeff !== 0) {
      payload.sway_coeff = irodoriTtsSwayCoeff
    }

    // Debug: confirm actual params sent (do not log apiKey)
    console.info('[irodori-tts] synth', {
      url: speechUrl,
      model: irodoriTtsModel,
      voice: irodoriTtsVoice || '(omitted)',
      speed: irodoriTtsSpeed,
      seed: irodoriTtsSeed > 0 ? irodoriTtsSeed : '(omitted)',
      num_steps: irodoriTtsNumSteps > 0 ? irodoriTtsNumSteps : '(omitted)',
      sway_coeff: irodoriTtsSwayCoeff !== 0 ? irodoriTtsSwayCoeff : '(omitted)',
      inputPreview: message.slice(0, 120),
      inputLen: message.length,
    })

    const voice = await fetch(speechUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!voice.ok) {
      const errText = await voice.text().catch(() => '')
      throw new Error(
        `Irodori-TTS エラー (${voice.status}): ${errText.slice(0, 300) || voice.statusText} — URL: ${speechUrl}`
      )
    }

    const arrayBuffer = await voice.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    res.writeHead(200, {
      'Content-Type': 'audio/wav',
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  } catch (error: unknown) {
    const errMessage =
      error instanceof Error ? error.message : 'Irodori-TTS synthesis failed'
    console.error('[irodori-tts]', errMessage)
    res.status(500).json({ error: errMessage })
  }
}
