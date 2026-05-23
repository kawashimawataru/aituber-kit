import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  audio?: Buffer
  error?: string
}

const getLanguageCode = (selectLanguage: string): string => {
  switch (selectLanguage) {
    case 'ja':
      return 'JP'
    case 'en':
      return 'EN'
    case 'zh-CN':
    case 'zh-TW':
      return 'ZH'
    default:
      return 'EN'
  }
}

function resolveServerUrl(bodyUrl?: string): string {
  const url = (
    bodyUrl?.trim() ||
    process.env.STYLEBERTVITS2_SERVER_URL ||
    process.env.NEXT_PUBLIC_STYLEBERTVITS2_SERVER_URL ||
    ''
  ).trim()
  if (!url) {
    throw new Error(
      'Style-Bert-VITS2 サーバーURLが未設定です。設定→音声で「http://127.0.0.1:5050」などを入力するか、.env に STYLEBERTVITS2_SERVER_URL を設定して dev サーバーを再起動してください。'
    )
  }
  return url.replace(/\/$/, '')
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body
  const message = body.message
  const stylebertvits2ModelId = String(body.stylebertvits2ModelId ?? '0')
  const stylebertvits2ApiKey =
    body.stylebertvits2ApiKey || process.env.STYLEBERTVITS2_API_KEY
  const stylebertvits2Style = body.stylebertvits2Style || 'Neutral'
  const stylebertvits2SdpRatio = body.stylebertvits2SdpRatio ?? 0.2
  const stylebertvits2Length = body.stylebertvits2Length ?? 1.0
  const selectLanguage = getLanguageCode(body.selectLanguage || 'ja')

  try {
    const stylebertvits2ServerUrl = resolveServerUrl(body.stylebertvits2ServerUrl)

    if (stylebertvits2ServerUrl.includes('https://api.runpod.ai')) {
      const voice = await fetch(stylebertvits2ServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stylebertvits2ApiKey}`,
        },
        body: JSON.stringify({
          input: {
            action: '/voice',
            model_id: stylebertvits2ModelId,
            text: message,
            style: stylebertvits2Style,
            sdp_ratio: stylebertvits2SdpRatio,
            length: stylebertvits2Length,
            language: selectLanguage,
          },
        }),
      })

      if (!voice.ok) {
        throw new Error(
          `サーバーからの応答が異常です。ステータスコード: ${voice.status}`
        )
      }

      const voiceData = await voice.json()
      const base64Audio = voiceData.output.voice
      const buffer = Buffer.from(base64Audio, 'base64')

      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length,
      })
      res.end(buffer)
      return
    }

    const queryParams = new URLSearchParams({
      text: message,
      model_id: stylebertvits2ModelId,
      style: stylebertvits2Style,
      sdp_ratio: String(stylebertvits2SdpRatio),
      length: String(stylebertvits2Length),
      language: selectLanguage,
    })

    const postBody = {
      text: message,
      model_id: stylebertvits2ModelId,
      style: stylebertvits2Style,
      sdp_ratio: stylebertvits2SdpRatio,
      length: stylebertvits2Length,
      language: selectLanguage,
    }

    let voice = await fetch(`${stylebertvits2ServerUrl}/voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/wav',
      },
      body: JSON.stringify(postBody),
    })

    if (voice.status === 405 || voice.status === 404) {
      const voiceUrl = `${stylebertvits2ServerUrl}/voice?${queryParams}`
      voice = await fetch(voiceUrl, {
        method: 'GET',
        headers: {
          Accept: 'audio/wav',
        },
      })
    }

    if (!voice.ok) {
      const errText = await voice.text().catch(() => '')
      throw new Error(
        `SBV2 エラー (${voice.status}): ${errText.slice(0, 300) || voice.statusText} — URL: ${stylebertvits2ServerUrl}/voice`
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
    const message =
      error instanceof Error ? error.message : 'StyleBertVITS2 synthesis failed'
    console.error('[stylebertvits2]', message)
    res.status(500).json({ error: message })
  }
}
