import type { YouTubeComment } from '@/features/youtube/youtubeComments'

type GameCommentHandler = (comment: YouTubeComment) => boolean

let handler: GameCommentHandler | null = null

export const registerGameCommentHandler = (fn: GameCommentHandler): void => {
  handler = fn
}

export const unregisterGameCommentHandler = (): void => {
  handler = null
}

// Returns true if the comment was intercepted by the game (should not go to LLM)
export const dispatchToGame = (comment: YouTubeComment): boolean => {
  if (!handler) return false
  return handler(comment)
}
