import { useEffect, useRef } from 'react'
import pianoStore from '@/features/stores/pianoStore'
import {
  schedulePianoNote,
  normalizeNoteName,
} from '@/features/projects/pianoPerformance/pianoSynth'

// ── Layout constants ──────────────────────────────────────────────
const W = 28 // white key width px
const BW = 17 // black key width px
const WH = 88 // white key height px
const BH = 54 // black key height px
const OCTAVES = [2, 3, 4, 5] // C2 to B5

interface KeyLayout {
  note: string
  isBlack: boolean
  leftPx: number
}

// White keys C D E F G A B and black keys between them
const WHITE_DEFS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
// black key defs: [name, index of white key to the left (0-based within octave)]
const BLACK_DEFS: [string, number][] = [
  ['C#', 0],
  ['D#', 1],
  ['F#', 3],
  ['G#', 4],
  ['A#', 5],
]

function buildLayout(): KeyLayout[] {
  const keys: KeyLayout[] = []
  let whitePos = 0

  for (const oct of OCTAVES) {
    const octLeft = whitePos * W
    for (let i = 0; i < 7; i++) {
      keys.push({
        note: `${WHITE_DEFS[i]}${oct}`,
        isBlack: false,
        leftPx: octLeft + i * W,
      })
    }
    for (const [bName, afterIdx] of BLACK_DEFS) {
      keys.push({
        note: `${bName}${oct}`,
        isBlack: true,
        leftPx: octLeft + (afterIdx + 1) * W - BW / 2,
      })
    }
    whitePos += 7
  }

  return keys
}

const KEY_LAYOUT = buildLayout()
const TOTAL_WHITE = OCTAVES.length * 7
const KEYBOARD_WIDTH = TOTAL_WHITE * W

// ── Component ─────────────────────────────────────────────────────
export default function PianoDisplay() {
  const phase = pianoStore((s) => s.phase)
  const songTitle = pianoStore((s) => s.songTitle)
  const score = pianoStore((s) => s.score)
  const activeNotes = pianoStore((s) => s.activeNotes)

  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  // ── Audio scheduling + animation ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || score.length === 0) return

    const ctx = new AudioContext()
    ctxRef.current = ctx

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -20
    compressor.ratio.value = 8
    compressor.connect(ctx.destination)

    void ctx.resume().then(() => {
      const startTime = ctx.currentTime + 0.1
      startTimeRef.current = startTime

      for (const event of score) {
        for (const note of event.notes) {
          schedulePianoNote(
            ctx,
            compressor,
            note,
            startTime + event.time,
            event.duration,
            event.velocity ?? 0.7
          )
        }
      }

      const totalDuration = Math.max(...score.map((e) => e.time + e.duration))

      const tick = () => {
        const elapsed = ctx.currentTime - startTime
        const currentNotes = score
          .filter(
            (e) => elapsed >= e.time - 0.02 && elapsed < e.time + e.duration
          )
          .flatMap((e) => e.notes.map(normalizeNoteName))

        pianoStore.getState().setActiveNotes(currentNotes)

        if (elapsed < totalDuration + 0.5) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          pianoStore.getState().stopPlayback()
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    })

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      pianoStore.getState().setActiveNotes([])
      void ctx.close().catch(() => undefined)
      ctxRef.current = null
    }
  }, [phase, score])

  if (phase === 'idle') return null

  const activeSet = new Set(activeNotes)

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pb-0">
      {/* Header panel */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-t-xl bg-black/80 text-white text-sm backdrop-blur-sm min-w-0 max-w-[90vw]">
        <span className="text-base">🎹</span>
        <span className="font-bold truncate max-w-[200px]">{songTitle}</span>
        {phase === 'loading' && (
          <span className="text-white/60 text-xs animate-pulse">
            譜面生成中…
          </span>
        )}
        {phase === 'playing' && (
          <span className="text-green-400 text-xs">▶ 演奏中</span>
        )}
        <button
          onClick={() => pianoStore.getState().stopPlayback()}
          className="ml-auto text-white/50 hover:text-white text-xs px-1"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      {/* Piano keyboard */}
      <div
        className="bg-gray-900 rounded-b-xl overflow-x-auto overflow-y-hidden"
        style={{ maxWidth: '96vw' }}
      >
        <div
          className="relative"
          style={{ width: KEYBOARD_WIDTH, height: WH + 8 }}
        >
          {/* White keys (rendered first, black keys on top) */}
          {KEY_LAYOUT.filter((k) => !k.isBlack).map((key) => {
            const active = activeSet.has(key.note)
            return (
              <div
                key={key.note}
                className="absolute border border-gray-300 rounded-b-md transition-colors duration-75"
                style={{
                  left: key.leftPx,
                  top: 0,
                  width: W - 1,
                  height: WH,
                  backgroundColor: active ? '#fbbf24' : '#f9fafb',
                  boxShadow: active
                    ? '0 0 8px rgba(251,191,36,0.8)'
                    : '1px 2px 3px rgba(0,0,0,0.3)',
                  zIndex: 1,
                }}
              />
            )
          })}

          {/* Black keys */}
          {KEY_LAYOUT.filter((k) => k.isBlack).map((key) => {
            const active = activeSet.has(key.note)
            return (
              <div
                key={key.note}
                className="absolute rounded-b-md transition-colors duration-75"
                style={{
                  left: key.leftPx,
                  top: 0,
                  width: BW,
                  height: BH,
                  backgroundColor: active ? '#f97316' : '#1c1c1e',
                  boxShadow: active
                    ? '0 0 6px rgba(249,115,22,0.9)'
                    : '1px 3px 4px rgba(0,0,0,0.6)',
                  zIndex: 2,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
