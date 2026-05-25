import type { NextApiRequest, NextApiResponse } from 'next'
import { createAIRegistry, generateAiText } from '@/lib/api-services/vercelAi'
import { VercelAIService } from '@/features/constants/settings'
import { Message } from '@/features/messages/messages'
import { sanitizeVisionCommentaryText } from '@/utils/speakControlTags'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
}

type ChatEntry = { role: 'user' | 'assistant'; content: string }
type RequestBody = {
  image?: string
  prompt?: string
  maxTokens?: number
  // UI設定（未指定の場合は環境変数にフォールバック）
  aiService?: string
  model?: string
  apiKey?: string
  localLlmUrl?: string
  azureEndpoint?: string
  // 会話コンテキスト
  systemPrompt?: string
  chatHistory?: ChatEntry[]
  // 配信状況コンテキスト（画面・視聴者・配信者）
  streamContext?: string
}

type ResponseData = { text: string; emotion: string } | { error: string }

const VISION_INSTRUCTION = `
あなたは今、配信中のAI VTuberとして画面を見ています。
[配信状況] ブロック（あれば）には、直近の視聴者コメント・配信者の発言・前回の画面実況が含まれています。

これらすべてを踏まえて、今この瞬間に自然に口から出る一言を1〜3文で生成してください。

以下を意識してください:
- 画面で起きていることに気づいてリアクションする
- 視聴者のコメントを拾って答える・ツッコむ
- 配信者とバンターしたり同意したりする
- 複数の要素を自然に組み合わせる（「○○さんの言う通り、画面もそれっぽいし」など）
- 硬くならず、配信中のテンポで話す
- 同じ話を繰り返さない

【text フィールドのルール — 厳守】
- プレーンな日本語のみ
- 制御タグは一切禁止: [stunt:xxx] [motion:xxx] [bg:xxx] [laugh:xxx] など [ ] 形式すべて
- 画面のUIラベル・ボタン名をそのまま読み上げない（要約してコメントする）
- 感情は emotion フィールドのみ

必ず以下のJSON形式のみで返答してください（コードブロック不要）:
{"text": "発話内容", "emotion": "happy|sad|angry|relaxed|surprised|neutral のいずれか"}`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const {
    image,
    prompt: customPrompt,
    maxTokens: bodyMaxTokens,
    aiService: bodyAiService,
    model: bodyModel,
    apiKey: bodyApiKey,
    localLlmUrl,
    azureEndpoint,
    systemPrompt,
    chatHistory = [],
    streamContext,
  } = req.body as RequestBody

  const maxTokens = bodyMaxTokens && bodyMaxTokens > 0 ? bodyMaxTokens : 150

  if (!image) {
    return res.status(400).json({ error: 'image is required' })
  }

  // UI設定優先 → 環境変数フォールバック
  const aiService = (bodyAiService ||
    process.env.NEXT_PUBLIC_SELECT_AI_SERVICE ||
    'openai') as VercelAIService
  const model =
    bodyModel || process.env.NEXT_PUBLIC_SELECT_AI_MODEL || 'gpt-4o-mini'

  const servicePrefix = aiService.toUpperCase().replace(/-/g, '_')
  const apiKey =
    bodyApiKey ||
    process.env[`${servicePrefix}_KEY`] ||
    process.env[`${servicePrefix}_API_KEY`] ||
    ''

  // Azure: resourceName の抽出
  const resolvedAzureEndpoint =
    azureEndpoint || process.env.AZURE_ENDPOINT || ''
  const azureResourceName = resolvedAzureEndpoint.replace(
    /^https:\/\/|\.openai\.azure\.com.*$/g,
    ''
  )
  const azureDeployment =
    resolvedAzureEndpoint.match(/\/deployments\/([^/]+)/)?.[1] || ''
  const resolvedModel = aiService === 'azure' ? azureDeployment : model

  // システムメッセージ: キャラ設定 + 配信コンテキスト + 実況指示
  const systemContent = [
    systemPrompt || '',
    customPrompt || '',
    streamContext || '',
    VISION_INSTRUCTION,
  ]
    .filter(Boolean)
    .join('\n\n')

  // 会話履歴（制御タグ除去済みテキストのみ — LLM がタグを真似しないように）
  const historyMessages: Message[] = chatHistory
    .map((m) => ({
      role: m.role,
      content: sanitizeVisionCommentaryText(m.content),
    }))
    .filter((m) => m.content)

  // 画像付きユーザーメッセージ
  const userMessage: Message = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: '（今の画面を見て、自然な一言をお願いします）',
      },
      { type: 'image', image: image },
    ],
  }

  const messages: Message[] = [
    { role: 'system', content: systemContent },
    ...historyMessages,
    userMessage,
  ]

  try {
    const registry = createAIRegistry(aiService, {
      apiKey,
      baseURL: localLlmUrl,
      resourceName: azureResourceName,
    })

    if (!registry) {
      return res.status(500).json({ error: 'AI registry creation failed' })
    }

    const response = await generateAiText({
      model: resolvedModel,
      registry,
      service: aiService,
      messages,
      temperature: 0.8,
      maxTokens,
    })

    const data = await response.json()
    const rawText: string = data.text ?? ''

    const jsonStr = rawText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    let parsed: { text: string; emotion: string }
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = { text: rawText.trim(), emotion: 'neutral' }
    }

    const sanitizedText = sanitizeVisionCommentaryText(parsed.text || '')

    return res.status(200).json({
      text: sanitizedText,
      emotion: parsed.emotion || 'neutral',
    })
  } catch (err) {
    console.error('Vision commentary error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
