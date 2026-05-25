import { Talk } from './messages'
import { applyIrodoriEmotionToText } from '@/utils/irodoriTtsEmotion'

export async function synthesizeVoiceIrodoriTtsApi(
  talk: Talk,
  irodoriTtsServerUrl: string,
  irodoriTtsApiKey: string,
  irodoriTtsVoice: string,
  irodoriTtsModel: string,
  irodoriTtsSpeed: number,
  irodoriTtsInjectEmotion: boolean,
  irodoriTtsSeed: number,
  irodoriTtsNumSteps: number,
  irodoriTtsSwayCoeff: number = 0
) {
  const input = applyIrodoriEmotionToText(
    talk.message,
    talk.emotion,
    irodoriTtsInjectEmotion
  )

  try {
    const res = await fetch('/api/irodori-tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: input,
        irodoriTtsServerUrl,
        irodoriTtsApiKey,
        irodoriTtsVoice,
        irodoriTtsModel,
        irodoriTtsSpeed,
        irodoriTtsSeed,
        irodoriTtsNumSteps,
        irodoriTtsSwayCoeff,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(
        `Irodori-TTS APIからの応答が異常です。ステータスコード: ${res.status}${errBody ? ` — ${errBody.slice(0, 200)}` : ''}`
      )
    }

    return await res.arrayBuffer()
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Irodori-TTSでエラーが発生しました: ${error.message}`)
    }
    throw new Error('Irodori-TTSで不明なエラーが発生しました')
  }
}
