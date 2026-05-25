import React, { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gameStore from '@/features/stores/gameStore'
import {
  applyMove,
  countPieces,
  getValidMoves,
  isValidMove,
  aiPickMove,
  posToLabel,
  parseOthelloCoord,
  Board,
} from '@/features/games/othello'
import { speakMessageHandler } from '@/features/chat/handlers'
import {
  registerGameCommentHandler,
  unregisterGameCommentHandler,
} from '@/features/games/viewerGameBus'
import OthelloBoard from './OthelloBoard'

const VOTE_DURATION = 20 // seconds

// --- Solo mode phrases ---
const AI_MOVE_PHRASES = [
  (pos: string) => `${pos}に置きました！`,
  (pos: string) => `${pos}！どうぞ。`,
  (pos: string) => `んー、${pos}でいきます。`,
  (pos: string) => `${pos}に置くよ！`,
]
const AI_WIN_PHRASES = [
  '[happy] やったー！私の勝ちです！',
  '[happy] 勝ちました！またやろうね！',
  '[happy] わーい！白の勝ち！',
]
const PLAYER_WIN_PHRASES = [
  '[sad] 負けてしまいました…次は勝つよ！',
  '[sad] やられた〜。強いね！',
  '[sad] うう…また挑戦したいです。',
]
const VIEWER_WIN_PHRASES = [
  '[sad] 視聴者チームの勝ち！やられました〜！',
  '[sad] みんな強い！また挑戦するよ！',
  '[sad] 視聴者のみんなに負けちゃった…！',
]
const DRAW_PHRASES = [
  '引き分けですね〜！いい勝負でした！',
  '同点！接戦でした！',
]
const AI_PASS_PHRASES = ['パスします…', '置けるところがないのでパスです。']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function aiMovePhraseFor(pos: string): string {
  return pick(AI_MOVE_PHRASES)(pos)
}

// --- Component ---
export default function GamePanel() {
  const { t } = useTranslation()
  const {
    status,
    board,
    currentPlayer,
    winner,
    lastAiMove,
    aiThinking,
    startGame: storeStartGame,
    setBoard,
    setCurrentPlayer,
    setStatus,
    setWinner,
    setLastAiMove,
    setAiThinking,
    setGameVisible,
    gameMode,
    setGameMode,
    votingActive,
    setVotingActive,
    votingTimeLeft,
    setVotingTimeLeft,
    viewerVotes,
    setViewerVotes,
  } = gameStore()

  const processingRef = useRef(false)
  const votingInProgressRef = useRef(false)
  const votingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unregisterGameCommentHandler()
      if (votingTimerRef.current) clearInterval(votingTimerRef.current)
    }
  }, [])

  const startGame = useCallback(() => {
    unregisterGameCommentHandler()
    if (votingTimerRef.current) {
      clearInterval(votingTimerRef.current)
      votingTimerRef.current = null
    }
    processingRef.current = false
    votingInProgressRef.current = false
    storeStartGame()
  }, [storeStartGame])

  const endGame = useCallback(
    (nextBoard: Board) => {
      const { black, white } = countPieces(nextBoard)
      let w: 'draw' | 1 | 2 = 'draw'
      if (black > white) w = 1
      else if (white > black) w = 2
      setWinner(w)
      setStatus('gameover')

      const phrase =
        w === 2
          ? pick(AI_WIN_PHRASES)
          : w === 1
            ? gameMode === 'viewer'
              ? pick(VIEWER_WIN_PHRASES)
              : pick(PLAYER_WIN_PHRASES)
            : pick(DRAW_PHRASES)
      void speakMessageHandler(phrase)
    },
    [setWinner, setStatus, gameMode]
  )

  // AI turn (player 2 = white)
  const runAiTurn = useCallback(
    (b: Board) => {
      if (processingRef.current) return
      processingRef.current = true
      setAiThinking(true)

      setTimeout(() => {
        const move = aiPickMove(b)
        if (!move) {
          const playerMoves = getValidMoves(b, 1)
          if (playerMoves.length === 0) {
            endGame(b)
          } else {
            void speakMessageHandler(pick(AI_PASS_PHRASES))
            setCurrentPlayer(1)
          }
          setAiThinking(false)
          processingRef.current = false
          return
        }

        const [ar, ac] = move
        const nb = applyMove(b, ar, ac, 2)
        setBoard(nb)
        setLastAiMove([ar, ac])
        setAiThinking(false)
        processingRef.current = false

        void speakMessageHandler(aiMovePhraseFor(posToLabel(ar, ac)))

        const playerMoves = getValidMoves(nb, 1)
        if (
          getValidMoves(nb, 1).length === 0 &&
          getValidMoves(nb, 2).length === 0
        ) {
          endGame(nb)
        } else if (playerMoves.length === 0) {
          void speakMessageHandler('あなたはパスです！もう一度打ちます。')
          setTimeout(() => runAiTurn(nb), 800)
        } else {
          setCurrentPlayer(1)
        }
      }, 600)
    },
    [setAiThinking, setBoard, setLastAiMove, setCurrentPlayer, endGame]
  )

  // Keep latest runAiTurn in a ref to avoid stale closure in viewer voting timer
  const runAiTurnRef = useRef(runAiTurn)
  useEffect(() => {
    runAiTurnRef.current = runAiTurn
  }, [runAiTurn])

  const endGameRef = useRef(endGame)
  useEffect(() => {
    endGameRef.current = endGame
  }, [endGame])

  // Apply the winning viewer vote and continue the game
  const applyViewerVote = useCallback(
    (b: Board) => {
      votingInProgressRef.current = false
      const votes = gameStore.getState().viewerVotes

      const validMoves = getValidMoves(b, 1)
      if (validMoves.length === 0) {
        // Viewer team must pass
        void speakMessageHandler('視聴者チームはパスです！')
        const aiMoves = getValidMoves(b, 2)
        if (aiMoves.length === 0) {
          endGameRef.current(b)
        } else {
          setCurrentPlayer(2)
          runAiTurnRef.current(b)
        }
        return
      }

      // Find top voted valid move
      let topMove: [number, number] | null = null
      let topCount = 0

      for (const [r, c] of validMoves) {
        const label = posToLabel(r, c)
        const count = (votes[label] || []).length
        if (count > topCount) {
          topCount = count
          topMove = [r, c]
        }
      }

      let moveLabel: string
      if (!topMove) {
        // No votes — pick random valid move
        const idx = Math.floor(Math.random() * validMoves.length)
        topMove = validMoves[idx]
        moveLabel = posToLabel(topMove[0], topMove[1])
        void speakMessageHandler(`投票なし…${moveLabel}にランダムで置きます！`)
      } else {
        moveLabel = posToLabel(topMove[0], topMove[1])
        void speakMessageHandler(
          `${topCount}票で${moveLabel}！視聴者チームの手です！`
        )
      }

      const [mr, mc] = topMove
      const nb = applyMove(b, mr, mc, 1)
      setBoard(nb)
      setLastAiMove(null)
      setViewerVotes({})

      const aiMoves = getValidMoves(nb, 2)
      const playerMoves2 = getValidMoves(nb, 1)

      if (aiMoves.length === 0 && playerMoves2.length === 0) {
        endGameRef.current(nb)
        return
      }

      if (aiMoves.length === 0) {
        void speakMessageHandler(pick(AI_PASS_PHRASES))
        setCurrentPlayer(1) // → useEffect triggers next viewer voting
        return
      }

      setCurrentPlayer(2)
      runAiTurnRef.current(nb)
    },
    [setBoard, setLastAiMove, setCurrentPlayer, setViewerVotes]
  )

  const applyViewerVoteRef = useRef(applyViewerVote)
  useEffect(() => {
    applyViewerVoteRef.current = applyViewerVote
  }, [applyViewerVote])

  // Start viewer voting for player 1's turn
  const startViewerVoting = useCallback(
    (b: Board) => {
      if (votingInProgressRef.current) return
      votingInProgressRef.current = true

      if (votingTimerRef.current) clearInterval(votingTimerRef.current)

      setViewerVotes({})
      setVotingActive(true)
      setVotingTimeLeft(VOTE_DURATION)

      const validMoves = getValidMoves(b, 1)
      const exampleMove =
        validMoves.length > 0
          ? posToLabel(validMoves[0][0], validMoves[0][1])
          : 'D4'
      void speakMessageHandler(
        `視聴者の番！コメントで座標を投票してください！（例：${exampleMove}）${VOTE_DURATION}秒以内！`
      )

      registerGameCommentHandler((comment) => {
        const coord = parseOthelloCoord(comment.userComment)
        if (!coord) return false // not a coordinate — let it through to LLM

        // Intercept from LLM; count as vote only if it's a valid move
        if (isValidMove(b, coord.row, coord.col, 1)) {
          const label = posToLabel(coord.row, coord.col)
          gameStore.getState().addViewerVote(label, comment.userName)
        }
        return true
      })

      let timeLeft = VOTE_DURATION
      votingTimerRef.current = setInterval(() => {
        timeLeft--
        gameStore.getState().setVotingTimeLeft(timeLeft)
        if (timeLeft <= 0) {
          if (votingTimerRef.current) clearInterval(votingTimerRef.current)
          votingTimerRef.current = null
          gameStore.getState().setVotingActive(false)
          unregisterGameCommentHandler()
          applyViewerVoteRef.current(b)
        }
      }, 1000)
    },
    [setViewerVotes, setVotingActive, setVotingTimeLeft]
  )

  // Solo mode: player clicks board
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (
        status !== 'playing' ||
        currentPlayer !== 1 ||
        aiThinking ||
        gameMode === 'viewer'
      )
        return

      const nb = applyMove(board, row, col, 1)
      if (nb === board) return

      setBoard(nb)
      setLastAiMove(null)

      const aiMoves = getValidMoves(nb, 2)
      const playerMoves = getValidMoves(nb, 1)

      if (aiMoves.length === 0 && playerMoves.length === 0) {
        endGame(nb)
        return
      }

      if (aiMoves.length === 0) {
        setCurrentPlayer(1)
        void speakMessageHandler(pick(AI_PASS_PHRASES))
        return
      }

      setCurrentPlayer(2)
      runAiTurn(nb)
    },
    [
      status,
      currentPlayer,
      aiThinking,
      gameMode,
      board,
      setBoard,
      setLastAiMove,
      setCurrentPlayer,
      endGame,
      runAiTurn,
    ]
  )

  // Dispatch to AI or viewer voting based on currentPlayer
  useEffect(() => {
    if (status !== 'playing') return
    if (currentPlayer === 2 && !processingRef.current) {
      runAiTurn(board)
    } else if (
      currentPlayer === 1 &&
      gameMode === 'viewer' &&
      !votingInProgressRef.current
    ) {
      startViewerVoting(board)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, status, gameMode])

  const { black, white } = countPieces(board)

  // Top 3 votes for display
  const topVotes = Object.entries(viewerVotes)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-2 w-fit">
      {/* Mode selector (before game starts) */}
      {status === 'idle' && (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setGameMode('solo')}
            className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
              gameMode === 'solo'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('GameModeSolo')}
          </button>
          <button
            onClick={() => setGameMode('viewer')}
            className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
              gameMode === 'viewer'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('GameModeViewer')}
          </button>
        </div>
      )}

      {/* Viewer mode hint */}
      {status === 'idle' && gameMode === 'viewer' && (
        <p className="text-center text-xs text-gray-400 px-2">
          {t('GameModeViewerHint')}
        </p>
      )}

      {/* Score row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gray-900 border border-gray-400" />
          <span className="text-white font-bold text-lg">{black}</span>
          <span className="text-gray-400 text-sm">
            {gameMode === 'viewer'
              ? currentPlayer === 1 && status === 'playing' && votingActive
                ? '🗳️'
                : ''
              : currentPlayer === 1 && status === 'playing' && !aiThinking
                ? t('GameYourTurn')
                : ''}
          </span>
        </div>

        {/* Voting countdown */}
        {gameMode === 'viewer' && votingActive && (
          <span className="text-yellow-400 font-bold text-sm">
            {t('GameViewerVoteSeconds', { sec: votingTimeLeft })}
          </span>
        )}

        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">
            {(aiThinking || currentPlayer === 2) && status === 'playing'
              ? t('GameAiThinking')
              : ''}
          </span>
          <span className="text-white font-bold text-lg">{white}</span>
          <div className="w-5 h-5 rounded-full bg-white border border-gray-400" />
        </div>
      </div>

      {/* Board */}
      {status !== 'idle' && (
        <OthelloBoard
          board={board}
          currentPlayer={currentPlayer}
          aiThinking={aiThinking}
          lastAiMove={lastAiMove}
          onCellClick={handleCellClick}
          viewerVotes={gameMode === 'viewer' ? viewerVotes : undefined}
          votingActive={gameMode === 'viewer' && votingActive}
        />
      )}

      {/* Viewer vote tally */}
      {gameMode === 'viewer' && votingActive && topVotes.length > 0 && (
        <div className="flex gap-2 justify-center flex-wrap">
          {topVotes.map(([label, voters]) => (
            <div
              key={label}
              className="bg-gray-700 rounded px-2 py-0.5 text-xs text-white"
            >
              <span className="font-bold text-yellow-400">{label}</span>
              <span className="ml-1 text-gray-300">×{voters.length}</span>
            </div>
          ))}
        </div>
      )}

      {/* Game over */}
      {status === 'gameover' && (
        <div className="text-center py-2">
          <div className="text-white font-bold text-base">
            {winner === 1
              ? gameMode === 'viewer'
                ? t('GameViewerWins')
                : t('GamePlayerWins')
              : winner === 2
                ? t('GameAiWins')
                : t('GameDraw')}
          </div>
          <div className="text-gray-400 text-sm">
            {t('GameFinalScore', { black, white })}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 justify-center mt-1">
        {status === 'idle' ? (
          <button
            onClick={startGame}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold"
          >
            {t('GameStart')}
          </button>
        ) : (
          <button
            onClick={startGame}
            className="px-4 py-1.5 bg-secondary hover:bg-secondary-hover text-white rounded-lg text-sm"
          >
            {t('GameRestart')}
          </button>
        )}
        <button
          onClick={() => setGameVisible(false)}
          className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
        >
          {t('GameClose')}
        </button>
      </div>
    </div>
  )
}
