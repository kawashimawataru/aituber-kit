/**
 * Phase 6: stunt カタログ定義
 * [stunt:xxx] タグに対応するマルチチャンネル演出の設定
 */

export type StuntId =
  | 'desk_slam'
  | 'desk_slam_light'
  | 'head_hold'
  | 'flinch'
  | 'lean_in'
  | 'lean_forward'
  | 'lean_back'
  | 'tilt_head'
  | 'rage_quiver'
  | 'collapse'
  | 'point'

export interface StuntDef {
  id: StuntId
  // 画面シェイク設定
  shake?: {
    intensity: number // px
    duration: number // ms
    count: number // 振動回数
  }
  // 感情（表情先行: 音より 50-150ms 早く適用）
  emotion?: string
  // VRM/Live2D モーション ID（poseConfigs から探す）
  motionId?: string
  // 効果音ファイル名（public/assets/reactions/ 配下）
  seFile?: string
  // クールダウン（ms）: この stunt を連打抑制する時間
  cooldownMs: number
}

export const stuntCatalog: Record<StuntId, StuntDef> = {
  desk_slam: {
    id: 'desk_slam',
    shake: { intensity: 12, duration: 400, count: 6 },
    emotion: 'angry',
    motionId: 'stunt_slam',
    seFile: 'stunt_desk_slam.wav',
    cooldownMs: 3000,
  },
  desk_slam_light: {
    id: 'desk_slam_light',
    shake: { intensity: 6, duration: 250, count: 4 },
    emotion: 'angry',
    motionId: 'stunt_slam_light',
    seFile: 'stunt_desk_slam_light.wav',
    cooldownMs: 1500,
  },
  head_hold: {
    id: 'head_hold',
    shake: undefined,
    emotion: 'sad',
    motionId: 'stunt_head_hold',
    seFile: 'stunt_head_hold.wav',
    cooldownMs: 2000,
  },
  flinch: {
    id: 'flinch',
    shake: { intensity: 8, duration: 200, count: 3 },
    emotion: 'surprised',
    motionId: 'stunt_flinch',
    seFile: 'stunt_flinch.wav',
    cooldownMs: 1500,
  },
  lean_in: {
    id: 'lean_in',
    shake: undefined,
    emotion: 'happy',
    motionId: 'stunt_lean_in',
    cooldownMs: 1000,
  },
  lean_forward: {
    id: 'lean_forward',
    shake: undefined,
    emotion: 'neutral',
    motionId: 'stunt_lean_forward',
    cooldownMs: 1000,
  },
  lean_back: {
    id: 'lean_back',
    shake: { intensity: 4, duration: 150, count: 2 },
    emotion: 'surprised',
    motionId: 'stunt_lean_back',
    cooldownMs: 1000,
  },
  tilt_head: {
    id: 'tilt_head',
    shake: undefined,
    emotion: 'neutral',
    motionId: 'stunt_tilt_head',
    cooldownMs: 800,
  },
  rage_quiver: {
    id: 'rage_quiver',
    shake: { intensity: 4, duration: 500, count: 12 },
    emotion: 'angry',
    motionId: 'stunt_rage_quiver',
    seFile: 'stunt_rage_quiver.wav',
    cooldownMs: 3000,
  },
  collapse: {
    id: 'collapse',
    shake: undefined,
    emotion: 'sad',
    motionId: 'stunt_collapse',
    seFile: 'stunt_collapse.wav',
    cooldownMs: 2500,
  },
  point: {
    id: 'point',
    shake: undefined,
    emotion: 'happy',
    motionId: 'stunt_point',
    cooldownMs: 1000,
  },
}
