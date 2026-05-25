import type { NextApiRequest, NextApiResponse } from 'next'
import { createAIRegistry, generateAiText } from '@/lib/api-services/vercelAi'
import type { VercelAIService } from '@/features/constants/settings'
import type { Message } from '@/features/messages/messages'
import type { PianoScore } from '@/features/projects/pianoPerformance/types'

type RequestBody = {
  title: string
  aiService?: string
  model?: string
  apiKey?: string
}

// ── Prompts ────────────────────────────────────────────────────────────────────
// For Google: mention that search grounding is available so Gemini uses it
const INSTRUCTION_GOOGLE = `You are a piano score transcription engine. Use search to find the actual melody of the song, then generate an accurate JSON piano score.

CRITICAL: Your response must be ONLY a valid JSON array. Start with '[' and end with ']'.
No text before or after. No markdown. No explanation. No citations.

Each element schema:
{ "time": <seconds>, "notes": <string[]>, "duration": <seconds>, "velocity": <0.0-1.0> }

Note format: note letter + optional # + octave digit  Examples: "C4" "D#3" "F#5" "Bb4" "G3"
Valid range: C2 to C6

Rules:
- Use the ACTUAL melody notes of the requested song — accuracy is critical
- Melody (right hand): octave 4-5, velocity 0.75-0.9
- Bass/chords (left hand): octave 2-4, velocity 0.4-0.6
- Tempo ~100-130 BPM (quarter note ≈ 0.46-0.6s)
- Total duration: 20-30 seconds of the main theme
- Both hands can play at the same time value

Output ONLY the JSON array.`

const INSTRUCTION_DEFAULT = `You are a piano score generator. Generate a precise piano score for the requested song.

CRITICAL: Your response must be ONLY a valid JSON array. Start with '[' and end with ']'.
No text before or after. No markdown. No code fences. No explanation.

Each element:
{ "time": <seconds>, "notes": <string[]>, "duration": <seconds>, "velocity": <0.0-1.0> }

Note format: "C4" "D#3" "F#5" "Bb4" etc. (Range: C2-C6)

Rules:
- IMPORTANT: Use the actual, correct melody notes of this song — not a generic or random melody
- Right hand melody: octave 4-5, velocity 0.75-0.9
- Left hand bass/chords: octave 2-4, velocity 0.4-0.6
- Tempo: quarter note ≈ 0.5s (120 BPM)
- Generate 16-20 bars of the main theme; total ~20-25 seconds
- Both hands can share the same time value

Output ONLY the JSON array starting with [ and ending with ].`

// ── JSON parsing ───────────────────────────────────────────────────────────────
type RawEvent = Record<string, unknown>

function coerceNum(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return isFinite(n) ? n : null
  }
  return null
}

function coerceNotes(v: unknown): string[] | null {
  if (Array.isArray(v) && v.length > 0) return v.map(String)
  if (typeof v === 'string' && v.length > 0) return [v]
  return null
}

function normalizeEvent(e: RawEvent): PianoScore[number] | null {
  const time =
    coerceNum(e.time) ??
    coerceNum(e.start_time) ??
    coerceNum(e.start) ??
    coerceNum(e.t)
  const notes =
    coerceNotes(e.notes) ??
    coerceNotes(e.note) ??
    coerceNotes(e.pitch) ??
    coerceNotes(e.pitches)
  const duration =
    coerceNum(e.duration) ??
    coerceNum(e.dur) ??
    coerceNum(e.length) ??
    coerceNum(e.d) ??
    0.5
  const velocity =
    coerceNum(e.velocity) ?? coerceNum(e.vel) ?? coerceNum(e.volume) ?? 0.7
  if (time === null || notes === null) return null
  return { time, notes, duration, velocity }
}

function repairTruncated(text: string): string {
  const t = text.trim()
  if (t.endsWith(']')) return t
  const lastBrace = t.lastIndexOf('}')
  if (lastBrace === -1) return t
  return t.slice(0, lastBrace + 1) + ']'
}

function tryParseScore(raw: string): PianoScore | null {
  let text = raw.trim()
  // strip markdown fences
  text = text
    .replace(/^```(?:json|javascript|js)?\r?\n?/im, '')
    .replace(/\r?\n?```\s*$/im, '')
    .trim()
  // strip leading prose before the array (e.g. "Here is the score:\n[...")
  const start = text.indexOf('[')
  if (start === -1) return null
  text = text.slice(start)

  const end = text.lastIndexOf(']')
  const arrayText = end > 0 ? text.slice(0, end + 1) : repairTruncated(text)
  const jsonText = arrayText.replace(/,(\s*[}\]])/g, '$1')

  try {
    const parsed = JSON.parse(jsonText)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    const score: PianoScore = []
    for (const e of parsed as RawEvent[]) {
      const norm = normalizeEvent(e)
      if (norm) score.push(norm)
    }
    return score.length > 0 ? score : null
  } catch {
    return null
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    title,
    aiService = 'openai',
    model = 'gpt-4o',
    apiKey = '',
  } = req.body as RequestBody

  if (!title?.trim()) return res.status(400).json({ error: 'title required' })

  console.log(`[piano-score] "${title}" via ${aiService}/${model}`)

  try {
    const registry = createAIRegistry(aiService as VercelAIService, { apiKey })
    if (!registry) {
      console.error('[piano-score] registry unavailable for:', aiService)
      return res.status(500).json({ error: 'registry unavailable' })
    }

    const isGoogle = aiService === 'google'
    const instruction = isGoogle ? INSTRUCTION_GOOGLE : INSTRUCTION_DEFAULT

    // Enable Google Search Grounding so Gemini can look up the real melody
    const providerOptions: Record<string, Record<string, unknown>> | undefined =
      isGoogle ? { google: { useSearchGrounding: true } } : undefined

    const messages: Message[] = [
      { role: 'system', content: instruction },
      {
        role: 'user',
        content: isGoogle
          ? `Search for the piano melody notes of: "${title.trim()}" and output the JSON score.`
          : `Song title: "${title.trim()}"`,
      },
    ]

    const response = await generateAiText({
      model,
      registry,
      service: aiService as VercelAIService,
      messages,
      temperature: 0.1,
      // Thinking models (Gemini 2.5) consume maxOutputTokens for internal thinking.
      // Set this high enough so actual JSON output is not cut off.
      maxTokens: 16000,
      providerOptions,
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      console.error(
        '[piano-score] LLM error:',
        data.error ?? `HTTP ${response.status}`
      )
      return res
        .status(500)
        .json({ error: data.error ?? 'LLM generation failed' })
    }

    const raw: string = (data.text ?? '').trim()
    console.log(
      `[piano-score] raw ${raw.length} chars | preview: ${raw.slice(0, 150)}`
    )

    const score = tryParseScore(raw)

    if (!score || score.length === 0) {
      console.error('[piano-score] parse failed:\n', raw.slice(0, 600))
      return res.status(500).json({ error: 'failed to parse score' })
    }

    const totalDur = Math.max(...score.map((e) => e.time + e.duration)).toFixed(
      1
    )
    console.log(`[piano-score] ✓ ${score.length} events, ~${totalDur}s`)
    return res.status(200).json({ score })
  } catch (err) {
    console.error('[piano-score] unexpected error:', err)
    return res.status(500).json({ error: 'internal error' })
  }
}
