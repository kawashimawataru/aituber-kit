import { useEffect } from 'react'
import vocabHintStore, {
  type VocabHint,
} from '@/features/stores/vocabHintStore'

const HINT_DISPLAY_MS = 8000

function HintCard({ hint }: { hint: VocabHint }) {
  const remove = vocabHintStore((s) => s.removeHint)

  useEffect(() => {
    const t = setTimeout(() => remove(hint.id), HINT_DISPLAY_MS)
    return () => clearTimeout(t)
  }, [hint.id, remove])

  return (
    <div
      className="rounded-xl px-4 py-3 text-left animate-fade-in-right"
      style={{
        background:
          'linear-gradient(135deg, rgba(20,20,40,0.92), rgba(40,20,60,0.92))',
        border: '1px solid rgba(168,85,247,0.4)',
        backdropFilter: 'blur(8px)',
        minWidth: 220,
        maxWidth: 280,
      }}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-white font-bold text-lg leading-tight">
          {hint.word}
        </span>
        <span className="text-purple-300 text-xs italic">
          {hint.partOfSpeech}
        </span>
      </div>
      <div className="text-purple-100 text-sm leading-snug mb-1">
        {hint.definition}
      </div>
      <div className="text-yellow-300 text-sm font-medium">{hint.japanese}</div>
      {hint.example && (
        <div className="mt-1.5 text-gray-400 text-xs italic border-t border-white/10 pt-1.5 leading-snug">
          {hint.example}
        </div>
      )}
    </div>
  )
}

/**
 * TOEFL語彙ヒントを画面右端に積み上げ表示する
 */
export default function VocabHintOverlay() {
  const hints = vocabHintStore((s) => s.hints)

  if (hints.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 top-1/4 z-30 flex flex-col gap-3">
      {hints.map((h) => (
        <HintCard key={h.id} hint={h} />
      ))}
    </div>
  )
}
