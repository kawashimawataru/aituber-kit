import pianoStore from '@/features/stores/pianoStore'

export default function PianoProjectDetail() {
  const scoreCache = pianoStore((s) => s.scoreCache)
  const { removeFromCache, clearCache, startPlayback } = pianoStore.getState()

  const songs = Object.entries(scoreCache)

  const totalDuration = (
    score: ReturnType<typeof pianoStore.getState>['scoreCache'][string]
  ) =>
    score.length > 0
      ? Math.max(...score.map((e) => e.time + e.duration)).toFixed(1)
      : '0.0'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">楽譜ストック</span>
        <span className="text-xs text-gray-400">
          {songs.length}曲キャッシュ済み
        </span>
      </div>

      {songs.length === 0 ? (
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-4 text-center">
          まだ演奏した曲はありません。
          <br />
          「〇〇を弾いて」と話しかけてみてください。
        </div>
      ) : (
        <div className="space-y-2">
          {songs.map(([title, score]) => (
            <div
              key={title}
              className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5"
            >
              <span className="text-base">🎵</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{title}</div>
                <div className="text-xs text-gray-400">
                  {score.length}音符 / ~{totalDuration(score)}秒
                </div>
              </div>
              <button
                className="shrink-0 px-2 py-1 rounded-lg text-xs text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                onClick={() => {
                  pianoStore.getState().requestSong(title)
                  setTimeout(() => startPlayback(title, score), 50)
                }}
                title="再演奏"
              >
                ▶
              </button>
              <button
                className="shrink-0 px-2 py-1 rounded-lg text-xs text-red-400 border border-red-200 hover:bg-red-50 transition-colors"
                onClick={() => removeFromCache(title)}
                title="削除"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="w-full text-xs text-red-400 hover:text-red-600 py-1.5 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
            onClick={clearCache}
          >
            全キャッシュを削除
          </button>
        </div>
      )}

      <div className="text-xs text-gray-400 bg-blue-50 rounded-lg px-3 py-2">
        💡 同じ曲を再リクエストするとキャッシュから即座に再生されます
      </div>
    </div>
  )
}
