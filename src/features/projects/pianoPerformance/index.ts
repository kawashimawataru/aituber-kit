import type { ProjectManifest } from '../types'
import settingsStore from '@/features/stores/settings'
import pianoStore from '@/features/stores/pianoStore'
import toastStore from '@/features/stores/toast'
import PianoProjectDetail from './PianoProjectDetail'

const SYSTEM_PROMPT_APPEND = `
---
[PIANO PERFORMANCE MODE]
あなたはピアノを演奏できます。ユーザーが曲のリクエストをした場合、自然な返答をしたうえで、返答の末尾に必ず [PIANO:曲名] タグを付けてください。

タグのルール:
- 形式: [PIANO:曲名] （曲名は日本語または英語、できるだけ正式名称で）
- 返答の一番最後に、1回だけ付ける

例: 「残酷な天使のテーゼですね！演奏します♪[PIANO:残酷な天使のテーゼ]」
例: 「Für Elise を弾きますね！[PIANO:Für Elise]」

曲のリクエスト以外の会話では絶対に [PIANO:] タグを付けないでください。
---`

const PIANO_TAG_RE = /\[PIANO:([^\]]+)\]/i

function getApiKey(aiService: string): string {
  const ss = settingsStore.getState()
  const map: Record<string, string> = {
    openai: ss.openaiKey,
    anthropic: ss.anthropicKey,
    google: ss.googleKey,
    azure: ss.azureKey,
    xai: ss.xaiKey,
    groq: ss.groqKey,
    cohere: ss.cohereKey,
    mistralai: ss.mistralaiKey,
    perplexity: ss.perplexityKey,
    fireworks: ss.fireworksKey,
    deepseek: ss.deepseekKey,
    openrouter: ss.openrouterKey,
  }
  return map[aiService] ?? ''
}

async function fetchAndPlay(title: string): Promise<void> {
  // ── 1. Check cache first ──────────────────────────────────────────
  const cached = pianoStore.getState().scoreCache[title]
  if (cached && cached.length > 0) {
    console.log(`[pianoPerformance] cache hit: "${title}"`)
    pianoStore.getState().startPlayback(title, cached)
    return
  }

  // ── 2. Generate via API ───────────────────────────────────────────
  const ss = settingsStore.getState()
  const aiService = ss.selectAIService as string
  const apiKey = getApiKey(aiService)

  try {
    const res = await fetch('/api/piano-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        aiService,
        model: ss.selectAIModel,
        apiKey,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error ?? `HTTP ${res.status}`)
    }

    const data = await res.json()
    if (!Array.isArray(data.score) || data.score.length === 0) {
      throw new Error('empty score returned')
    }

    // ── 3. Cache & play ───────────────────────────────────────────
    pianoStore.getState().addToCache(title, data.score)
    pianoStore.getState().startPlayback(title, data.score)
  } catch (err) {
    console.error('[pianoPerformance]', err)
    pianoStore.getState().stopPlayback()
    toastStore.getState().addToast({
      message: `🎹 譜面の生成に失敗しました: ${title}`,
      type: 'error',
      tag: 'piano-score-error',
    })
  }
}

export const pianoPerformanceProject: ProjectManifest = {
  id: 'piano-performance',
  name: 'ピアノ演奏',
  description:
    'リクエストした曲をピアノで演奏します。AIが楽譜を生成してビジュアルキーボードで再生。演奏済みの曲はキャッシュされます。',
  icon: '🎹',
  DetailComponent: PianoProjectDetail,
  systemPromptAppend: () => SYSTEM_PROMPT_APPEND,
  onAiResponse: (text) => {
    const m = text.match(PIANO_TAG_RE)
    if (!m) return
    const title = m[1].trim()
    pianoStore.getState().requestSong(title)
    void fetchAndPlay(title)
  },
}
