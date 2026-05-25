export type Cell = 0 | 1 | 2 // 0=empty 1=black(player) 2=white(AI)
export type Board = Cell[][]
export type OthelloPlayer = 1 | 2

const DIRS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

export const COLS = 'ABCDEFGH'

export function posToLabel(row: number, col: number): string {
  return `${COLS[col]}${row + 1}`
}

// Parse viewer chat comment as an Othello coordinate.
// Accepts: "D4", "d4", "4D", "D4!", "D 4" etc.
export function parseOthelloCoord(
  text: string
): { row: number; col: number } | null {
  const t = text.trim().toUpperCase()

  let m = t.match(/^([A-H])\s*([1-8])\s*[!！。、.]*$/)
  if (m) return { row: parseInt(m[2]) - 1, col: COLS.indexOf(m[1]) }

  m = t.match(/^([1-8])\s*([A-H])\s*[!！。、.]*$/)
  if (m) return { row: parseInt(m[1]) - 1, col: COLS.indexOf(m[2]) }

  return null
}

export function createInitialBoard(): Board {
  const b: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(0) as Cell[])
  b[3][3] = 2
  b[3][4] = 1
  b[4][3] = 1
  b[4][4] = 2
  return b
}

export function getFlips(
  board: Board,
  row: number,
  col: number,
  player: OthelloPlayer
): [number, number][] {
  if (board[row][col] !== 0) return []
  const opp: OthelloPlayer = player === 1 ? 2 : 1
  const flips: [number, number][] = []

  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = []
    let r = row + dr
    let c = col + dc
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === opp) {
      line.push([r, c])
      r += dr
      c += dc
    }
    if (
      line.length > 0 &&
      r >= 0 &&
      r < 8 &&
      c >= 0 &&
      c < 8 &&
      board[r][c] === player
    ) {
      flips.push(...line)
    }
  }
  return flips
}

export function isValidMove(
  board: Board,
  row: number,
  col: number,
  player: OthelloPlayer
): boolean {
  return getFlips(board, row, col, player).length > 0
}

export function applyMove(
  board: Board,
  row: number,
  col: number,
  player: OthelloPlayer
): Board {
  const flips = getFlips(board, row, col, player)
  if (flips.length === 0) return board
  const next = board.map((r) => [...r]) as Board
  next[row][col] = player
  for (const [r, c] of flips) next[r][c] = player
  return next
}

export function getValidMoves(
  board: Board,
  player: OthelloPlayer
): [number, number][] {
  const moves: [number, number][] = []
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (isValidMove(board, r, c, player)) moves.push([r, c])
  return moves
}

export function countPieces(board: Board): { black: number; white: number } {
  let black = 0,
    white = 0
  for (const row of board)
    for (const cell of row) {
      if (cell === 1) black++
      else if (cell === 2) white++
    }
  return { black, white }
}

// Corner-weighted greedy: corners score high, adjacent-to-corner score low
const WEIGHTS: number[][] = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -40, 2, 2, 2, 2, -40, -20],
  [10, 2, 5, 1, 1, 5, 2, 10],
  [5, 2, 1, 0, 0, 1, 2, 5],
  [5, 2, 1, 0, 0, 1, 2, 5],
  [10, 2, 5, 1, 1, 5, 2, 10],
  [-20, -40, 2, 2, 2, 2, -40, -20],
  [100, -20, 10, 5, 5, 10, -20, 100],
]

export function aiPickMove(board: Board): [number, number] | null {
  const moves = getValidMoves(board, 2)
  if (moves.length === 0) return null

  let best: [number, number] = moves[0]
  let bestScore = -Infinity

  for (const [r, c] of moves) {
    const flips = getFlips(board, r, c, 2)
    let score = WEIGHTS[r][c] + flips.length
    // Bonus: count net pieces after move
    const nb = applyMove(board, r, c, 2)
    const { white, black } = countPieces(nb)
    score += (white - black) * 0.5
    if (score > bestScore) {
      bestScore = score
      best = [r, c]
    }
  }
  return best
}
