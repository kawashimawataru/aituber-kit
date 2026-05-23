import settingsStore from '@/features/stores/settings'

/**
 * Live2D モデル切替時に、モデルが持つ表情名へ設定を同期する
 */

const EMOTION_CANDIDATES: Record<string, string[]> = {
  neutralEmotions: ['Neutral', 'Normal', 'normal', 'NoSmile', 'Focus'],
  happyEmotions: ['Happy', 'Happy2', 'Smile'],
  sadEmotions: ['Sad', 'Sad2', 'Troubled'],
  angryEmotions: ['Angry', 'Mad'],
  relaxedEmotions: ['Relaxed', 'Sleep'],
  surprisedEmotions: ['Surprised', 'Surprise', 'Zitome'],
}

export function syncLive2DEmotionsFromModel(model: {
  expressions: string[]
  motions: string[]
}): void {
  if (!model.expressions?.length) {
    // No expressions — reset to avoid stale settings from a previously loaded model
    const idleMotion =
      model.motions?.find((m) => m === 'Idle') || model.motions?.[0] || 'Idle'
    settingsStore.setState({
      idleMotionGroup: idleMotion,
      neutralMotionGroup: idleMotion,
      neutralEmotions: [],
      happyEmotions: [],
      sadEmotions: [],
      angryEmotions: [],
      relaxedEmotions: [],
      surprisedEmotions: [],
    })
    return
  }

  const available = new Set(model.expressions)
  const updates: Record<string, string[] | string> = {}

  for (const [key, candidates] of Object.entries(EMOTION_CANDIDATES)) {
    const matched = candidates.filter((name) => available.has(name))
    updates[key] = matched.length > 0 ? matched : [model.expressions[0]]
  }

  const motion =
    model.motions.find((m) => m === 'Idle') ||
    model.motions.find((m) => m === 'Neutral') ||
    model.motions[0] ||
    'Idle'

  updates.idleMotionGroup = motion
  updates.neutralMotionGroup =
    model.motions.find((m) => m === 'Neutral') || motion

  settingsStore.setState(updates)
}
