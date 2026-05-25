import { create } from 'zustand'
import {
  Board,
  OthelloPlayer,
  createInitialBoard,
} from '@/features/games/othello'

export type GameType = 'othello'
export type GameStatus = 'idle' | 'playing' | 'gameover'
export type GameMode = 'solo' | 'viewer'

interface GameState {
  gameVisible: boolean
  gameType: GameType
  board: Board
  currentPlayer: OthelloPlayer
  status: GameStatus
  winner: OthelloPlayer | 'draw' | null
  lastAiMove: [number, number] | null
  aiThinking: boolean

  // Viewer participation mode
  gameMode: GameMode
  votingActive: boolean
  votingTimeLeft: number
  viewerVotes: Record<string, string[]> // moveLabel → voter names

  setGameVisible: (v: boolean) => void
  startGame: () => void
  setBoard: (board: Board) => void
  setCurrentPlayer: (p: OthelloPlayer) => void
  setStatus: (s: GameStatus) => void
  setWinner: (w: OthelloPlayer | 'draw' | null) => void
  setLastAiMove: (m: [number, number] | null) => void
  setAiThinking: (v: boolean) => void
  setGameMode: (mode: GameMode) => void
  setVotingActive: (v: boolean) => void
  setVotingTimeLeft: (t: number) => void
  setViewerVotes: (votes: Record<string, string[]>) => void
  addViewerVote: (moveLabel: string, userName: string) => void
}

const gameStore = create<GameState>((set) => ({
  gameVisible: false,
  gameType: 'othello',
  board: createInitialBoard(),
  currentPlayer: 1,
  status: 'idle',
  winner: null,
  lastAiMove: null,
  aiThinking: false,

  gameMode: 'solo',
  votingActive: false,
  votingTimeLeft: 0,
  viewerVotes: {},

  setGameVisible: (v) => set({ gameVisible: v }),
  startGame: () =>
    set({
      board: createInitialBoard(),
      currentPlayer: 1,
      status: 'playing',
      winner: null,
      lastAiMove: null,
      aiThinking: false,
      votingActive: false,
      votingTimeLeft: 0,
      viewerVotes: {},
    }),
  setBoard: (board) => set({ board }),
  setCurrentPlayer: (currentPlayer) => set({ currentPlayer }),
  setStatus: (status) => set({ status }),
  setWinner: (winner) => set({ winner }),
  setLastAiMove: (lastAiMove) => set({ lastAiMove }),
  setAiThinking: (aiThinking) => set({ aiThinking }),
  setGameMode: (gameMode) => set({ gameMode }),
  setVotingActive: (votingActive) => set({ votingActive }),
  setVotingTimeLeft: (votingTimeLeft) => set({ votingTimeLeft }),
  setViewerVotes: (viewerVotes) => set({ viewerVotes }),
  addViewerVote: (moveLabel, userName) =>
    set((state) => ({
      viewerVotes: {
        ...state.viewerVotes,
        [moveLabel]: [...(state.viewerVotes[moveLabel] || []), userName],
      },
    })),
}))

export default gameStore
