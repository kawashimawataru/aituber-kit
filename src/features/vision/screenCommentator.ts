/**
 * 画面実況コメント生成
 * キャプチャしたフレームをマルチモーダル LLM に送り、実況テキストを得る
 */

export interface CommentaryResult {
  text: string
  emotion: string
}

const DEFAULT_PROMPT = `あなたは今、配信画面を見ています。
画面の内容を見て、配信者のキャラクターとして自然な実況コメントを1〜2文で生成してください。
必ず以下のJSON形式のみで返答してください:
{"text": "コメント本文", "emotion": "happy|sad|angry|relaxed|surprised|neutral のいずれか"}`

/**
 * base64 dataURL の画像を LLM に渡して実況コメントを生成する
 * 既存の /api/ai/vercel を直接使わず、fetch で呼ぶ
 */
export async function generateScreenCommentary(
  imageDataUrl: string,
  customPrompt?: string
): Promise<CommentaryResult> {
  const prompt = customPrompt ?? DEFAULT_PROMPT

  const response = await fetch('/api/vision-commentary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl, prompt }),
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
