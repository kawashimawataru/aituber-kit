import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PianoScore } from '@/features/projects/pianoPerformance/types'

type Phase = 'idle' | 'loading' | 'playing'

interface PianoState {
  // ── playback (not persisted) ──────────────────────────────────────
  phase: Phase
  songTitle: string
  score: PianoScore
  activeNotes: string[]
  // ── cache (persisted) ─────────────────────────────────────────────
  scoreCache: Record<string, PianoScore>
  // ── actions ───────────────────────────────────────────────────────
  requestSong: (title: string) => void
  startPlayback: (title: string, score: PianoScore) => void
  stopPlayback: () => void
  setActiveNotes: (notes: string[]) => void
  addToCache: (title: string, score: PianoScore) => void
  removeFromCache: (title: string) => void
  clearCache: () => void
}

const pianoStore = create<PianoState>()(
  persist(
    (set) => ({
      phase: 'idle',
      songTitle: '',
      score: [],
      activeNotes: [],
      scoreCache: {},

      requestSong: (title) =>
        set({ phase: 'loading', songTitle: title, score: [], activeNotes: [] }),

      startPlayback: (title, score) =>
        set({ phase: 'playing', songTitle: title, score }),

      stopPlayback: () => set({ phase: 'idle', activeNotes: [] }),

      setActiveNotes: (notes) => set({ activeNotes: notes }),

      addToCache: (title, score) =>
        set((s) => ({ scoreCache: { ...s.scoreCache, [title]: score } })),

      removeFromCache: (title) =>
        set((s) => {
          const { [title]: _removed, ...rest } = s.scoreCache
          return { scoreCache: rest }
        }),

      clearCache: () => set({ scoreCache: {} }),
    }),
    {
      name: 'piano-store',
      // Only persist the score cache, not ephemeral playback state
      partialize: (s) => ({ scoreCache: s.scoreCache }),
    }
  )
)

export default pianoStore
