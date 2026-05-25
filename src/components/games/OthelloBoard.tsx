import React from 'react'
import { Board, isValidMove, COLS, posToLabel } from '@/features/games/othello'

interface Props {
  board: Board
  currentPlayer: 1 | 2
  aiThinking: boolean
  lastAiMove: [number, number] | null
  onCellClick: (row: number, col: number) => void
  viewerVotes?: Record<string, string[]>
  votingActive?: boolean
}

export default function OthelloBoard({
  board,
  currentPlayer,
  aiThinking,
  lastAiMove,
  onCellClick,
  viewerVotes,
  votingActive,
}: Props) {
  const canPlace = currentPlayer === 1 && !aiThinking && !votingActive

  return (
    <div className="flex flex-col items-center select-none">
      {/* Column labels */}
      <div className="flex ml-6">
        {Array.from({ length: 8 }, (_, c) => (
          <div
            key={c}
            className="w-8 h-4 flex items-center justify-center text-xs text-gray-400"
          >
            {COLS[c]}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Row labels */}
        <div className="flex flex-col">
          {Array.from({ length: 8 }, (_, r) => (
            <div
              key={r}
              className="w-6 h-8 flex items-center justify-center text-xs text-gray-400"
            >
              {r + 1}
            </div>
          ))}
        </div>

        {/* Board */}
        <div className="border-2 border-gray-700 rounded">
          {board.map((row, r) => (
            <div key={r} className="flex">
              {row.map((cell, c) => {
                const valid = isValidMove(board, r, c, 1)
                const isLastAi =
                  lastAiMove && lastAiMove[0] === r && lastAiMove[1] === c
                const label = posToLabel(r, c)
                const voteCount = votingActive
                  ? (viewerVotes?.[label]?.length ?? 0)
                  : 0

                return (
                  <div
                    key={c}
                    onClick={() => canPlace && valid && onCellClick(r, c)}
                    className={[
                      'w-8 h-8 border border-gray-600 flex items-center justify-center relative',
                      'bg-green-800',
                      canPlace && valid
                        ? 'cursor-pointer hover:bg-green-700'
                        : '',
                      isLastAi ? 'ring-2 ring-yellow-400 ring-inset' : '',
                    ].join(' ')}
                  >
                    {cell === 1 && (
                      <div className="w-6 h-6 rounded-full bg-gray-900 shadow-md" />
                    )}
                    {cell === 2 && (
                      <div className="w-6 h-6 rounded-full bg-white shadow-md" />
                    )}
                    {cell === 0 &&
                      valid &&
                      (votingActive && voteCount > 0 ? (
                        <div className="w-6 h-6 rounded-full bg-yellow-500/70 flex items-center justify-center text-white text-xs font-bold shadow">
                          {voteCount}
                        </div>
                      ) : (
                        <div className="w-3 h-3 rounded-full border-2 border-gray-400 opacity-60" />
                      ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
