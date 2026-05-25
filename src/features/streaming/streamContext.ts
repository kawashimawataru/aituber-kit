/**
 * Stream Context - 配信状況の統合コンテキスト
 *
 * 画面・視聴者コメント・配信者の発言を一元管理し、
 * 全LLM呼び出しに「今この配信で何が起きているか」を注入する。
 * React/Zustandに依存しない純粋なモジュールシングルトン。
 */

export interface ViewerComment {
  user: string
  text: string
  ts: number
}

const MAX_COMMENTS = 10

let _screenSummary = ''
let _viewerComments: ViewerComment[] = []
let _streamerLastSaid = ''
let _streamerLastSaidAt = 0

/** 画面実況の結果テキストを保存（次回以降の全LLMコールに注入） */
export function setScreenSummary(text: string): void {
  _screenSummary = text
}

export function getScreenSummary(): string {
  return _screenSummary
}

/** 視聴者コメントを追加（古いものは自動削除） */
export function pushViewerComment(user: string, text: string): void {
  _viewerComments = [
    ..._viewerComments.slice(-(MAX_COMMENTS - 1)),
    { user, text, ts: Date.now() },
  ]
}

/** 視聴者コメント一覧取得 */
export function getViewerComments(): ViewerComment[] {
  return [..._viewerComments]
}

/**
 * 配信者（画面前の人間）の最新発言を保存
 * 30秒以内の発言のみをコンテキストに含める
 */
export function setStreamerLastSaid(text: string): void {
  _streamerLastSaid = text
  _streamerLastSaidAt = Date.now()
}

/**
 * 全コンテキストを [配信状況] ブロックとして整形する
 * 何もなければ空文字を返す
 */
export function buildContextBlock(streamerName?: string): string {
  const parts: string[] = []

  if (_screenSummary) {
    parts.push(`🎮 画面: ${_screenSummary}`)
  }

  const recent = _viewerComments.slice(-6)
  if (recent.length > 0) {
    const lines = recent.map((c) => `  - ${c.user}: ${c.text}`)
    parts.push(`💬 視聴者コメント:\n${lines.join('\n')}`)
  }

  // 30秒以内の配信者発言のみ含める
  const streamerStale = Date.now() - _streamerLastSaidAt > 30_000
  if (_streamerLastSaid && !streamerStale) {
    const name = streamerName || '配信者'
    parts.push(`🎤 ${name}: ${_streamerLastSaid}`)
  }

  if (parts.length === 0) return ''

  return `\n\n[配信状況]\n${parts.join('\n')}`
}

/** リセット（セッション終了時など） */
export function resetStreamContext(): void {
  _screenSummary = ''
  _viewerComments = []
  _streamerLastSaid = ''
  _streamerLastSaidAt = 0
}
