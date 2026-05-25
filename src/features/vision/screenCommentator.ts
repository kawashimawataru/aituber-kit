/**
 * 画面実況コメント生成
 * キャプチャしたフレームをマルチモーダル LLM に送り、実況テキストを得る
 */

export interface CommentaryResult {
  text: string
  emotion: string
}

export interface CommentaryOptions {
  customPrompt?: string
  maxTokens?: number
  // AI設定（未指定の場合は vision-commentary API が環境変数にフォールバック）
  aiService?: string
  model?: string
  apiKey?: string
  localLlmUrl?: string
  azureEndpoint?: string
  // 会話コンテキスト
  systemPrompt?: string
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  // 配信状況コンテキスト（画面・視聴者・配信者）
  streamContext?: string
}

export async function generateScreenCommentary(
  imageDataUrl: string,
  options: CommentaryOptions = {}
): Promise<CommentaryResult> {
  const {
    customPrompt,
    maxTokens,
    aiService,
    model,
    apiKey,
    localLlmUrl,
    azureEndpoint,
    systemPrompt,
    chatHistory,
    streamContext,
  } = options

  const response = await fetch('/api/vision-commentary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imageDataUrl,
      prompt: customPrompt,
      maxTokens,
      aiService,
      model,
      apiKey,
      localLlmUrl,
      azureEndpoint,
      systemPrompt,
      chatHistory,
      streamContext,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Vision commentary API error: ${err}`)
  }

  const data = await response.json()
  return {
    text: data.text ?? '',
    emotion: data.emotion ?? 'neutral',
  }
}
