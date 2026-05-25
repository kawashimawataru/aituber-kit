import { useRef, useState, useCallback } from 'react'
import drawingGameStore from '@/features/stores/drawingGameStore'
import settingsStore from '@/features/stores/settings'
import DrawingCanvas, { type DrawingCanvasHandle } from './DrawingCanvas'
import type { Difficulty } from './wordLists'

// ── Helpers ────────────────────────────────────────────────────────────────────
function normalizeJP(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      // katakana → hiragana
      .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
  )
}

function isCorrect(word: string, guess: string): boolean {
  const w = normalizeJP(word)
  const g = normalizeJP(guess)
  return w === g || w.includes(g) || g.includes(w)
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'かんたん',
  normal: 'ふつう',
  hard: 'むずかしい',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DrawingPhase() {
  const { currentWord, round, totalRounds } = drawingGameStore((s) => s)
  const { startGuessing } = drawingGameStore.getState()
  const canvasRef = useRef<DrawingCanvasHandle>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const imageData = canvas.exportImage()
    startGuessing()
    setSubmitting(true)

    try {
      const ss = settingsStore.getState()
      const serviceMap: Record<string, string> = {
        openai: ss.openaiKey,
        anthropic: ss.anthropicKey,
        google: ss.googleKey,
        azure: ss.azureKey,
        xai: ss.xaiKey,
        groq: ss.groqKey,
        cohere: ss.cohereKey,
        mistralai: ss.mistralaiKey,
        perplexity: ss.perplexityKey,
        fireworks: ss.fireworksKey,
        deepseek: ss.deepseekKey,
        openrouter: ss.openrouterKey,
      }
      const aiService = ss.selectAIService as string
      const res = await fetch('/api/drawing-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          aiService,
          model: ss.selectAIModel,
          apiKey: serviceMap[aiService] ?? '',
        }),
      })
      const data = await res.json()
      const guess: string = data.guess ?? '???'
      const correct = isCorrect(currentWord, guess)
      drawingGameStore.getState().showResult(guess, correct)
    } catch {
      drawingGameStore.getState().showResult('???', false)
    } finally {
      setSubmitting(false)
    }
  }, [currentWord, startGuessing])

  return (
    <div className="p-4 space-y-3">
      <div className="text-center">
        <div className="text-xs text-gray-500 mb-1">
          Round {round}/{totalRounds}
        </div>
        <div className="text-lg font-bold">
          🎨 お題：
          <span className="text-2xl text-primary ml-1">「{currentWord}」</span>
          を描いてください！
        </div>
      </div>
      <DrawingCanvas ref={canvasRef} disabled={submitting} />
      <button
        className="w-full py-3 bg-primary text-theme font-bold rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-50"
        onClick={handleSubmit}
        disabled={submitting}
      >
        ✅ 提出する
      </button>
    </div>
  )
}

function GuessingPhase() {
  return (
    <div className="p-8 flex flex-col items-center gap-4">
      <div className="text-4xl animate-spin">🤔</div>
      <div className="text-base font-bold text-gray-700">
        AIが絵を見て考え中…
      </div>
      <div className="text-sm text-gray-500">ドキドキ…</div>
    </div>
  )
}

function ResultPhase() {
  const { results, score, round, totalRounds } = drawingGameStore((s) => s)
  const last = results[results.length - 1]
  if (!last) return null

  const isCorrectResult = last.correct

  return (
    <div className="p-6 flex flex-col items-center gap-4 text-center">
      <div className="text-5xl">{isCorrectResult ? '🎉' : '😅'}</div>
      <div
        className={`text-2xl font-bold ${isCorrectResult ? 'text-green-600' : 'text-red-500'}`}
      >
        {isCorrectResult ? '正解！🎊' : 'ハズレ…'}
      </div>
      <div className="space-y-1">
        <div className="text-sm text-gray-500">AIの答え：</div>
        <div className="text-3xl font-bold">「{last.guess}」</div>
        {!isCorrectResult && (
          <div className="text-sm text-gray-500">
            正解は「{last.word}」でした
          </div>
        )}
      </div>
      <div className="text-sm text-gray-600">
        現在のスコア：<span className="font-bold text-primary">{score}</span> /{' '}
        {round}
      </div>
      <button
        className="w-full py-3 bg-primary text-theme font-bold rounded-xl hover:opacity-90 transition-opacity"
        onClick={() => drawingGameStore.getState().nextRound()}
      >
        {round >= totalRounds ? '🏁 結果を見る' : '次のお題へ →'}
      </button>
    </div>
  )
}

function GameOverPhase() {
  const { score, totalRounds, results, difficulty, bestScores } =
    drawingGameStore((s) => s)
  const ratio = score / totalRounds

  const emoji = ratio >= 0.8 ? '🏆' : ratio >= 0.5 ? '🥈' : '😤'
  const message =
    ratio >= 0.8
      ? 'パーフェクトに近い！さすが！'
      : ratio >= 0.5
        ? 'なかなかやるじゃん！'
        : 'もっと練習が必要かも…？'

  return (
    <div className="p-6 space-y-4">
      <div className="text-center">
        <div className="text-5xl mb-2">{emoji}</div>
        <div className="text-xl font-bold">ゲーム終了！</div>
        <div className="text-3xl font-bold text-primary mt-1">
          {score} / {totalRounds}
        </div>
        <div className="text-sm text-gray-500 mt-1">{message}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {DIFFICULTY_LABEL[difficulty]}のベスト: {bestScores[difficulty]}点
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {results.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg bg-gray-50"
          >
            <span>{r.correct ? '✅' : '❌'}</span>
            <span className="font-medium">{r.word}</span>
            {!r.correct && (
              <span className="text-gray-400 text-xs">
                → AIは「{r.guess}」と答えた
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 py-2.5 bg-primary text-theme font-bold rounded-xl hover:opacity-90"
          onClick={() => drawingGameStore.getState().startGame()}
        >
          もう一度
        </button>
        <button
          className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50"
          onClick={() => drawingGameStore.getState().resetGame()}
        >
          終わる
        </button>
      </div>
    </div>
  )
}

// ── Main overlay ───────────────────────────────────────────────────────────────
export default function DrawingGameOverlay() {
  const phase = drawingGameStore((s) => s.phase)
  const score = drawingGameStore((s) => s.score)
  const round = drawingGameStore((s) => s.round)
  const totalRounds = drawingGameStore((s) => s.totalRounds)

  if (phase === 'idle') return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-3 flex items-center">
          <span className="text-white font-bold">🎨 お絵描き伝言ゲーム</span>
          {phase !== 'gameover' && (
            <span className="ml-auto text-white/80 text-sm">
              {round}/{totalRounds} ｜ {score}点
            </span>
          )}
          <button
            className="ml-2 text-white/70 hover:text-white text-lg"
            onClick={() => drawingGameStore.getState().resetGame()}
            title="ゲームを中断"
          >
            ✕
          </button>
        </div>

        {phase === 'drawing' && <DrawingPhase />}
        {phase === 'guessing' && <GuessingPhase />}
        {phase === 'result' && <ResultPhase />}
        {phase === 'gameover' && <GameOverPhase />}
      </div>
    </div>
  )
}
