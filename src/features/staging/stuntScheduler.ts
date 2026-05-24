/**
 * Phase 6: stunt スケジューラ
 * [stunt:xxx] タグを受け取り、音・モーション・シェイクを同期的に発火する
 * クールダウンで連打を抑制する
 */

import { VRMExpressionPresetName } from '@pixiv/three-vrm'
import { StuntId, StuntDef, stuntCatalog } from './stuntTypes'
import { triggerScreenShake } from './screenShake'
import { playSE, getStuntSEPath } from '@/utils/sePlayer'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'

const lastFiredAt: Partial<Record<StuntId, number>> = {}

export function canFireStunt(id: StuntId): boolean {
  const def = stuntCatalog[id]
  if (!def) return false
  const last = lastFiredAt[id] ?? 0
  return Date.now() - last >= def.cooldownMs
}

/**
 * stunt を発火する
 * @param id stunt ID
 * @param emotionOverride stunt 定義の emotion を上書き（null = 無効化）
 */
export async function fireStunt(
  id: StuntId,
  emotionOverride?: string | null
): Promise<void> {
  const def: StuntDef | undefined = stuntCatalog[id]
  if (!def) {
    console.warn('[Stunt] unknown stunt:', id)
    return
  }

  if (!canFireStunt(id)) {
    console.log('[Stunt] cooldown active, skip:', id)
    return
  }

  lastFiredAt[id] = Date.now()

  const emotion = emotionOverride !== undefined ? emotionOverride : def.emotion

  // 表情先行（音より ~100ms 早く）
  if (emotion) {
    const viewer = homeStore.getState().viewer
    if (viewer?.model?.emoteController) {
      viewer.model.emoteController.playEmotion(
        emotion as VRMExpressionPresetName
      )
    }
  }

  // モーション（表情と同時 or 少し遅れて）
  if (def.motionId) {
    setTimeout(() => {
      const viewer = homeStore.getState().viewer
      if (viewer?.model) {
        const ss = settingsStore.getState()
        const poseConfig = ss.poseConfigs.find((p) => p.id === def.motionId)
        if (poseConfig) {
          void viewer.model.poseManager
            .applyPose(viewer.model, def.motionId!, poseConfig)
            .catch(() => {})
        }
      }
    }, 80)
  }

  // SE 再生（インパクトフレームと合わせる: 音と同時）
  if (def.seFile) {
    playSE(getStuntSEPath(def.id), 0.8).catch(() => {})
  }

  // 画面シェイク（音と同時）
  if (def.shake) {
    triggerScreenShake(def.shake.intensity, def.shake.duration, def.shake.count)
  }

  // Phase 6-11: ポーズを cooldownMs の 70% 後に idle へ戻す
  if (def.motionId) {
    const resetDelay = Math.max(def.cooldownMs * 0.7, 800)
    setTimeout(() => {
      const viewer = homeStore.getState().viewer
      if (viewer?.model?.poseManager.isActive) {
        viewer.model.poseManager.resetToIdle(viewer.model)
      }
    }, resetDelay)
  }
}
