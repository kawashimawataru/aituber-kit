import type { ProjectManifest } from '../types'
import vocabHintStore from '@/features/stores/vocabHintStore'
import settingsStore from '@/features/stores/settings'

const SYSTEM_PROMPT_APPEND = `
---
[ENGLISH PRACTICE MODE — TOEFL]
You are now running as a TOEFL English conversation practice partner.

Rules:
- Respond exclusively in English (use Japanese only for brief clarifications when the user seems genuinely lost)
- Use naturally varied, TOEFL-level academic vocabulary in context
- Keep conversations lively: ask follow-up questions, share opinions, push for depth
- Gently correct grammar or word-choice errors inline: "✓ Better: «correction»"
- Bring up TOEFL-relevant topics: integrated writing, argument analysis, campus situations, academic lectures
- Sample topics: biology, archaeology, history, economics, cognitive psychology, astronomy, environmental science
- When the user makes a good point, affirm it and build on it
- Periodically introduce a mini-challenge: "Here's a TOEFL-style prompt: ..."
- Keep each response to 2-4 natural spoken sentences — we're doing voice practice
---`

async function fetchVocabHints(text: string): Promise<void> {
  try {
    const ss = settingsStore.getState()
    const serviceMap: Record<string, string> = {
      openai: ss.openaiKey,
      anthropic: ss.anthropicKey,
      google: ss.googleKey,
    }
    const aiService = ss.selectAIService as string
    const apiKey = serviceMap[aiService] || ''

    const res = await fetch('/api/vocab-hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        aiService,
        model: ss.selectAIModel,
        apiKey,
      }),
    })
    if (!res.ok) return

    const data = await res.json()
    if (Array.isArray(data.hints) && data.hints.length > 0) {
      vocabHintStore.getState().addHints(data.hints)
    }
  } catch {
    // non-critical — silently ignore
  }
}

export const englishPracticeProject: ProjectManifest = {
  id: 'english-practice',
  name: 'TOEFL英会話練習',
  description:
    'AI VTuberと英語で会話しながらTOEFLに向けた語彙・表現を自然に身につける。',
  icon: '🎓',
  systemPromptAppend: () => SYSTEM_PROMPT_APPEND,
  onAiResponse: (text) => {
    void fetchVocabHints(text)
  },
}
