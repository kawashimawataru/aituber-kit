import type { NextApiRequest, NextApiResponse } from 'next'
import { createAIRegistry, generateAiText } from '@/lib/api-services/vercelAi'
import { VercelAIService } from '@/features/constants/settings'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
}

type ResponseData = { text: string; emotion: string } | { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { image, prompt } = req.body as { image?: string; prompt?: string }

  if (!image) {
    return res.status(400).json({ error: 'image is required' })
  }

  const aiService = (process.env.NEXT_PUBLIC_SELECT_AI_SERVICE || 'openai') as VercelAIService
  const model = process.env.NEXT_PUBLIC_SELECT_AI_MODEL || 'gpt-4o-mini'

  const servicePrefix = aiService.toUpperCase().replace(/-/g, '_')
  const apiKey =
    process.env[`${servicePrefix}_KEY`] ||
    process.env[`${servicePrefix}_API_KEY`] ||
    ''

  const systemText =
    prompt ||
    `あなたは今、配信画面を見ています。
画面の内容を見て、配信者のキャラクターとして自然な実況コメントを1〜2文で生成してください。
必ず以下のJSON形式のみで返答してください（コードブロック不要）:
{"text": "コメント本文", "emotion": "happy|sad|angry|relaxed|surprised|neutral のいずれか"}`

  try {
    const registry = createAIRegistry(aiService, { apiKey })
    if (!registry) {
      return res.status(500).json({ error: 'AI registry creation failed' })
    }

    const response = await generateAiText({
      model,
      registry,
      service: aiService,
      messages: [
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: systemText },
            { type: 'image' as const, image: image },
          ],
        },
      ],
      temperature: 0.8,
      maxTokens: 256,
    })

    const data = await response.json()
    const rawText: string = data.text ?? ''

    const jsonStr = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let parsed: { text: string; emotion: string }
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = { text: rawText.trim(), emotion: 'neutral' }
    }

    return res.status(200).json({
      text: parsed.text || '',
      emotion: parsed.emotion || 'neutral',
    })
  } catch (err) {
    console.error('Vision commentary error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
