import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  pickWord,
  type Difficulty,
} from '@/features/projects/drawingGame/wordLists'

export type DrawingPhase =
  | 'idle'
  | 'drawing'
  | 'guessing'
  | 'result'
  | 'gameover'

export interface RoundResult {
  word: string
  guess: string
  correct: boolean
}

interface DrawingGameState {
  // ── session state (not persisted) ────────────────────────────────
  phase: DrawingPhase
  currentWord: string
  round: number
  totalRounds: number
  score: number
  results: RoundResult[]
  usedWords: string[]
  difficulty: Difficulty
  // ── settings (persisted) ─────────────────────────────────────────
  savedDifficulty: Difficulty
  savedTotalRounds: number
  bestScores: Record<Difficulty, number>
  // ── actions ───────────────────────────────────────────────────────
  startGame: (difficulty?: Difficulty, rounds?: number) => void
  startGuessing: () => void
  showResult: (guess: string, correct: boolean) => void
  nextRound: () => void
  resetGame: () => void
  saveDifficulty: (d: Difficulty) => void
  saveTotalRounds: (n: number) => void
}

const drawingGameStore = create<DrawingGameState>()(
  persist(
    (set, get) => ({
      phase: 'idle',
      currentWord: '',
      round: 0,
      totalRounds: 5,
      score: 0,
      results: [],
      usedWords: [],
      difficulty: 'easy',
      savedDifficulty: 'easy',
      savedTotalRounds: 5,
      bestScores: { easy: 0, normal: 0, hard: 0 },

      startGame: (difficulty, rounds) => {
        const d = difficulty ?? get().savedDifficulty
        const n = rounds ?? get().savedTotalRounds
        const usedWords: string[] = []
        const word = pickWord(d, new Set(usedWords))
        usedWords.push(word)
        set({
          phase: 'drawing',
          difficulty: d,
          totalRounds: n,
          round: 1,
          score: 0,
          results: [],
          usedWords,
          currentWord: word,
        })
      },

      startGuessing: () => set({ phase: 'guessing' }),

      showResult: (guess, correct) => {
        const { currentWord, results, score } = get()
        set({
          phase: 'result',
          score: correct ? score + 1 : score,
          results: [...results, { word: currentWord, guess, correct }],
        })
      },

      nextRound: () => {
        const { round, totalRounds, difficulty, usedWords, bestScores, score } =
          get()
        if (round >= totalRounds) {
          // game over — update best score
          const newBest = Math.max(bestScores[difficulty] ?? 0, score)
          set({
            phase: 'gameover',
            bestScores: { ...bestScores, [difficulty]: newBest },
          })
          return
        }
        const word = pickWord(difficulty, new Set(usedWords))
        const nextUsed = [...usedWords, word]
        set({
          phase: 'drawing',
          round: round + 1,
          currentWord: word,
          usedWords: nextUsed,
        })
      },

      resetGame: () =>
        set({
          phase: 'idle',
          currentWord: '',
          round: 0,
          score: 0,
          results: [],
          usedWords: [],
        }),

      saveDifficulty: (d) => set({ savedDifficulty: d }),
      saveTotalRounds: (n) => set({ savedTotalRounds: n }),
    }),
    {
      name: 'drawing-game-store',
      partialize: (s) => ({
        savedDifficulty: s.savedDifficulty,
        savedTotalRounds: s.savedTotalRounds,
        bestScores: s.bestScores,
      }),
    }
  )
)

export default drawingGameStore
