import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' }, responseLimit: '16mb' },
}

export type AvatarStyle = 'anime' | 'chibi' | 'semi-realistic'
export type AvatarEmotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'relaxed'

type RequestBody = {
  prompt: string
  style: AvatarStyle
  emotion: AvatarEmotion
  apiKey: string
  referenceB64?: string // base64 of reference image for consistency
}

type ResponseData = { b64: string; revised_prompt?: string } | { error: string }

const STYLE_PREFIX: Record<AvatarStyle, string> = {
  anime:
    'anime style 2D illustration, clean line art, cel shading, vibrant colors',
  chibi:
    'chibi anime style, cute super-deformed character, big head small body, bright colors',
  'semi-realistic':
    'semi-realistic anime illustration, detailed shading, soft lighting, high quality digital art',
}

const EMOTION_SUFFIX: Record<AvatarEmotion, string> = {
  neutral: 'neutral calm expression, mouth closed',
  happy: 'big bright smile, happy joyful expression, eyes curved upward',
  sad: 'sad expression, downcast eyes, slightly drooping mouth, melancholy',
  angry: 'angry expression, furrowed brows, determined eyes, serious face',
  surprised:
    'surprised wide-eyed expression, open mouth in surprise, eyebrows raised',
  relaxed: 'gentle relaxed smile, soft eyes, peaceful serene expression',
}

function buildPrompt(
  characterPrompt: string,
  style: AvatarStyle,
  emotion: AvatarEmotion
): string {
  const styleStr = STYLE_PREFIX[style]
  const emotionStr = EMOTION_SUFFIX[emotion]
  return (
    `${styleStr}, ${characterPrompt}, ` +
    `${emotionStr}, ` +
    `portrait / bust-up shot, centered composition, ` +
    `solid lime green background (#00FF00), no other background elements, ` +
    `character is fully within frame, high quality`
  )
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    prompt,
    style = 'anime',
    emotion = 'neutral',
    apiKey,
  } = req.body as RequestBody

  if (!prompt) return res.status(400).json({ error: 'prompt required' })
  if (!apiKey) return res.status(400).json({ error: 'apiKey required' })

  try {
    const openai = new OpenAI({ apiKey })

    const finalPrompt = buildPrompt(
      prompt,
      style as AvatarStyle,
      emotion as AvatarEmotion
    )

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: finalPrompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
      quality: 'hd',
    })

    const item = response.data?.[0]
    const b64 = item?.b64_json
    if (!b64) return res.status(500).json({ error: 'No image data returned' })

    return res.status(200).json({
      b64,
      revised_prompt: item?.revised_prompt,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[avatar/generate-image]', msg)
    return res.status(500).json({ error: msg })
  }
}
