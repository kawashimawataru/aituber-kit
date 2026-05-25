import { create } from 'zustand'

export interface VocabHint {
  id: string
  word: string
  partOfSpeech: string
  definition: string
  japanese: string
  example?: string
}

interface VocabHintState {
  hints: VocabHint[]
  addHints: (hints: VocabHint[]) => void
  removeHint: (id: string) => void
  clearHints: () => void
}

const vocabHintStore = create<VocabHintState>((set) => ({
  hints: [],
  addHints: (incoming) =>
    set((s) => ({
      hints: [
        ...s.hints,
        ...incoming.map((h) => ({
          ...h,
          id: h.id || `${Date.now()}-${h.word}`,
        })),
      ].slice(-6), // 最大6枚
    })),
  removeHint: (id) =>
    set((s) => ({ hints: s.hints.filter((h) => h.id !== id) })),
  clearHints: () => set({ hints: [] }),
}))

export default vocabHintStore
