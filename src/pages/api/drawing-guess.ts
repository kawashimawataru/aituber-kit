import type { NextApiRequest, NextApiResponse } from 'next'
import { createAIRegistry, generateAiText } from '@/lib/api-services/vercelAi'
import type { VercelAIService } from '@/features/constants/settings'
import type { Message } from '@/features/messages/messages'

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
}

type RequestBody = {
  image: string
  aiService?: string
  model?: string
  apiKey?: string
}

type ResponseData = { guess: string } | { error: string }

const SYSTEM = `You are playing a drawing guessing game. Look at the hand-drawn sketch carefully.
What single object, animal, food, or thing is depicted?
IMPORTANT rules:
- Answer in Japanese only
- Output ONLY the noun/word (1-6 characters)
- No explanation, no punctuation, no particles
- Use common everyday Japanese words
Examples of good answers: 猫、りんご、車、山、電車、ケーキ`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    image,
    aiService = 'openai',
    model = 'gpt-4o',
    apiKey = '',
  } = req.body as RequestBody

  if (!image) return res.status(400).json({ error: 'image required' })

  try {
    const registry = createAIRegistry(aiService as VercelAIService, { apiKey })
    if (!registry)
      return res.status(500).json({ error: 'registry unavailable' })

    const messages: Message[] = [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'この絵は何を描いていますか？日本語の単語1つで答えてください。',
          },
          { type: 'image', image },
        ],
      },
    ]

    const response = await generateAiText({
      model,
      registry,
      service: aiService as VercelAIService,
      messages,
      temperature: 0.3,
      maxTokens: 20,
    })

    const data = await response.json()
    if (!response.ok || data.error) {
      return res.status(500).json({ error: data.error ?? 'LLM error' })
    }

    // Strip any surrounding punctuation/spaces
    const guess = (data.text ?? '')
      .trim()
      .replace(/^[「『【]|[」』】。、！？\s]+$/g, '')
    return res.status(200).json({ guess })
  } catch (err) {
    console.error('[drawing-guess]', err)
    return res.status(500).json({ error: String(err) })
  }
}
