import drawingGameStore from '@/features/stores/drawingGameStore'
import type { Difficulty } from './wordLists'

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string }[] =
  [
    { value: 'easy', label: 'かんたん', desc: '動物・食べ物など' },
    { value: 'normal', label: 'ふつう', desc: 'スポーツ・自然現象など' },
    { value: 'hard', label: 'むずかしい', desc: '抽象・動作など' },
  ]

const ROUND_OPTIONS = [3, 5, 10]

export default function DrawingGameDetail() {
  const savedDifficulty = drawingGameStore((s) => s.savedDifficulty)
  const savedTotalRounds = drawingGameStore((s) => s.savedTotalRounds)
  const bestScores = drawingGameStore((s) => s.bestScores)
  const phase = drawingGameStore((s) => s.phase)
  const { saveDifficulty, saveTotalRounds, startGame } =
    drawingGameStore.getState()

  const isPlaying = phase !== 'idle'

  return (
    <div className="space-y-4">
      {/* Difficulty */}
      <div>
        <div className="text-xs font-bold text-gray-600 mb-2">難易度</div>
        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 transition-colors ${
                savedDifficulty === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
              onClick={() => saveDifficulty(opt.value)}
              disabled={isPlaying}
            >
              <div>{opt.label}</div>
              <div className="text-gray-400 text-[10px]">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Rounds */}
      <div>
        <div className="text-xs font-bold text-gray-600 mb-2">ラウンド数</div>
        <div className="flex gap-2">
          {ROUND_OPTIONS.map((n) => (
            <button
              key={n}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                savedTotalRounds === n
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
              onClick={() => saveTotalRounds(n)}
              disabled={isPlaying}
            >
              {n}問
            </button>
          ))}
        </div>
      </div>

      {/* Best scores */}
      <div>
        <div className="text-xs font-bold text-gray-600 mb-2">ベストスコア</div>
        <div className="space-y-1">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center justify-between text-xs px-3 py-2 bg-gray-50 rounded-lg"
            >
              <span>{opt.label}</span>
              <span className="font-bold text-primary">
                {bestScores[opt.value]} / {savedTotalRounds}点
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
          isPlaying
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
        }`}
        onClick={() =>
          !isPlaying && startGame(savedDifficulty, savedTotalRounds)
        }
        disabled={isPlaying}
      >
        {isPlaying ? '🎨 ゲーム中…' : '🎮 ゲームスタート！'}
      </button>
    </div>
  )
}
