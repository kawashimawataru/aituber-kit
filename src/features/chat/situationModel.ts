/**
 * Phase 4-3: 状況モデル
 * 配信中の状況を追跡し、能動発話のトリガー判定に使用する
 */

import homeStore from '@/features/stores/home'

export interface SessionSituation {
  humanSpeaking: boolean
  aiSpeaking: boolean
  silenceSec: number
  lastCommentAt: number | null
  screenChangeScore: number // 0-1 (Phase 2 から連携)
  chatBacklog: number
}

let _situation: SessionSituation = {
  humanSpeaking: false,
  aiSpeaking: false,
  silenceSec: 0,
  lastCommentAt: null,
  screenChangeScore: 0,
  chatBacklog: 0,
}

let _silenceTimer: ReturnType<typeof setInterval> | null = null

export function getSituation(): SessionSituation {
  return { ..._situation }
}

export function updateSituation(patch: Partial<SessionSituation>): void {
  _situation = { ..._situation, ...patch }
}

/** 最後のコメント受信を記録する */
export function recordComment(): void {
  _situation = {
    ..._situation,
    lastCommentAt: Date.now(),
    silenceSec: 0,
  }
}

/** homeStore の isSpeaking と同期する */
export function syncFromHomeStore(): void {
  const hs = homeStore.getState()
  _situation.aiSpeaking = hs.isSpeaking
}

/** 1秒ごとに無音時間をカウントアップする */
export function startSituationTracker(): () => void {
  if (_silenceTimer) clearInterval(_silenceTimer)

  _silenceTimer = setInterval(() => {
    syncFromHomeStore()
    if (!_situation.humanSpeaking && !_situation.aiSpeaking) {
      _situation.silenceSec += 1
    }
  }, 1000)

  return () => {
    if (_silenceTimer) {
      clearInterval(_silenceTimer)
      _silenceTimer = null
    }
  }
}

/**
 * 能動発話を行うべき状況かどうかを判定する
 * @param minSilenceSec コメントなし最低秒数
 */
export function shouldProactivelySpeak(minSilenceSec = 20): boolean {
  const s = _situation

  // 人間 or AI が話している間は割り込まない
  if (s.humanSpeaking || s.aiSpeaking) return false

  // 直近コメントから十分な無音があるか
  const timeSinceLastComment = s.lastCommentAt
    ? (Date.now() - s.lastCommentAt) / 1000
    : Infinity

  if (timeSinceLastComment < minSilenceSec && s.silenceSec < minSilenceSec) {
    return false
  }

  // 画面変化が大きい場合は実況を優先（別フック）
  return true
}
