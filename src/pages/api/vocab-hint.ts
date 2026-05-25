import type { NextApiRequest, NextApiResponse } from 'next'
import { createAIRegistry, generateAiText } from '@/lib/api-services/vercelAi'
import type { VercelAIService } from '@/features/constants/settings'
import type { Message } from '@/features/messages/messages'

type RequestBody = {
  text: string
  aiService?: string
  model?: string
  apiKey?: string
}

type VocabHint = {
  id: string
  word: string
  partOfSpeech: string
  definition: string
  japanese: string
  example?: string
}

const INSTRUCTION = `Extract 1-3 notable TOEFL-level English vocabulary words from the text below.
For each word return JSON with fields: word, partOfSpeech, definition (concise English), japanese (Japanese translation), example (short example sentence using the word).

Return ONLY a JSON array, no markdown fences.
Example: [{"word":"eloquent","partOfSpeech":"adj","definition":"fluent or persuasive in speaking","japanese":"雄弁な","example":"She gave an eloquent speech."}]

If there are no TOEFL-level words, return [].`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    text,
    aiService = 'openai',
    model = 'gpt-4o-mini',
    apiKey = '',
  } = req.body as RequestBody

  if (!text?.trim()) return res.status(200).json({ hints: [] })

  try {
    const registry = createAIRegistry(aiService as VercelAIService, { apiKey })
    if (!registry) return res.status(200).json({ hints: [] })

    const messages: Message[] = [
      { role: 'system', content: INSTRUCTION },
      { role: 'user', content: text.slice(0, 1000) },
    ]

    const response = await generateAiText({
      model,
      registry,
      service: aiService as VercelAIService,
      messages,
      temperature: 0.2,
      maxTokens: 400,
    })

    const data = await response.json()
    const raw: string = (data.text ?? '').trim()

    let hints: VocabHint[] = []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        hints = parsed.slice(0, 3).map((h, i) => ({
          id: `${Date.now()}-${i}`,
          word: h.word ?? '',
          partOfSpeech: h.partOfSpeech ?? '',
          definition: h.definition ?? '',
          japanese: h.japanese ?? '',
          example: h.example ?? '',
        }))
      }
    } catch {
      // parsing failed → return empty
    }

    return res.status(200).json({ hints })
  } catch (err) {
    console.error('[vocab-hint]', err)
    return res.status(200).json({ hints: [] })
  }
}
