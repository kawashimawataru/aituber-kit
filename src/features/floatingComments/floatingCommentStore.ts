import { create } from 'zustand'
import settingsStore from '@/features/stores/settings'

export type FloatingCommentType = 'viewer' | 'ai'

export interface FloatingComment {
  id: string
  text: string
  userName?: string
  lane: number
  duration: number
  type: FloatingCommentType
}

interface FloatingCommentState {
  comments: FloatingComment[]
  addViewerComment: (text: string, userName?: string) => void
  addAiComment: (text: string) => void
  removeComment: (id: string) => void
}

const LANE_COUNT = 12
const laneLastUsed = new Array<number>(LANE_COUNT).fill(0)

function pickLane(): number {
  let best = 0
  for (let i = 1; i < LANE_COUNT; i++) {
    if (laneLastUsed[i] < laneLastUsed[best]) best = i
  }
  laneLastUsed[best] = Date.now()
  return best
}

function calcDuration(text: string): number {
  return Math.min(11000, Math.max(5000, 4000 + text.length * 80))
}

function genId(): string {
  return `fc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const floatingCommentStore = create<FloatingCommentState>((set) => ({
  comments: [],

  addViewerComment: (text, userName) => {
    const comment: FloatingComment = {
      id: genId(),
      text: text.slice(0, 60),
      userName,
      lane: pickLane(),
      duration: calcDuration(text),
      type: 'viewer',
    }
    set((s) => ({ comments: [...s.comments, comment] }))
  },

  addAiComment: (text) => {
    const comment: FloatingComment = {
      id: genId(),
      text: text.slice(0, 60),
      lane: pickLane(),
      duration: calcDuration(text),
      type: 'ai',
    }
    set((s) => ({ comments: [...s.comments, comment] }))
  },

  removeComment: (id) =>
    set((s) => ({ comments: s.comments.filter((c) => c.id !== id) })),
}))

export default floatingCommentStore

// ---------- public helpers ----------

// AI self-reactions (purely visual, no TTS)
const AI_REACTIONS = [
  'ｗｗｗ',
  '草ｗ',
  'それな〜！',
  'ほんとそれ',
  'すごい！',
  'わかるー',
  'マジで！？',
  'えぇ〜',
  'たしかに',
  'おいおい',
  'いいね！',
  'なるほど〜',
]

let viewerCommentCount = 0
const REACTION_EVERY = 5

export const addAiFloatingComment = (text: string): void => {
  if (!settingsStore.getState().enableFloatingComments) return
  floatingCommentStore.getState().addAiComment(text)
}

export const addBatchViewerFloatingComments = (
  comments: Array<{ userComment: string; userName?: string }>
): void => {
  if (!settingsStore.getState().enableFloatingComments) return
  if (comments.length === 0) return

  const store = floatingCommentStore.getState()

  comments.slice(0, 8).forEach((comment, i) => {
    setTimeout(() => {
      store.addViewerComment(comment.userComment, comment.userName)
    }, i * 350)
  })

  viewerCommentCount += comments.length
  if (
    Math.floor(viewerCommentCount / REACTION_EVERY) >
    Math.floor((viewerCommentCount - comments.length) / REACTION_EVERY)
  ) {
    const reaction =
      AI_REACTIONS[Math.floor(Math.random() * AI_REACTIONS.length)]
    setTimeout(() => {
      floatingCommentStore.getState().addAiComment(reaction)
    }, 1800)
  }
}
