/**
 * pixi-live2d-display-lipsyncpatch (cubism4) が要求する Cubism Core 4.x との互換チェック。
 * Cubism 5/6 の live2dcubismcore.min.js では getDrawableRenderOrders が undefined になり
 * CubismRenderer_WebGL.doDrawModel で reading '0' が発生する。
 */

export type CubismCoreCheckResult = {
  ok: boolean
  major?: number
  minor?: number
  patch?: number
  message?: string
}

export function parseCubismCoreVersion(raw: number): {
  major: number
  minor: number
  patch: number
} {
  return {
    major: (raw & 0xff000000) >> 24,
    minor: (raw & 0x00ff0000) >> 16,
    patch: raw & 0xffff,
  }
}

export function checkCubismCoreCompatibility(): CubismCoreCheckResult {
  const core = (window as Window & { Live2DCubismCore?: unknown })
    .Live2DCubismCore as
    | {
        Version?: { csmGetVersion?: () => number }
      }
    | undefined

  if (!core?.Version?.csmGetVersion) {
    return {
      ok: false,
      message:
        'Live2DCubismCore が読み込まれていません。public/scripts/live2dcubismcore.min.js を配置してください。',
    }
  }

  const raw = core.Version.csmGetVersion()
  const { major, minor, patch } = parseCubismCoreVersion(raw)

  console.info(
    `[Live2D] Cubism Core ${major}.${minor}.${patch} (raw=${raw})`
  )

  // cubism4 ビルドは Core 4.x 系のみ対応（5/6 は Framework API 不一致）
  if (major >= 5) {
    return {
      ok: false,
      major,
      minor,
      patch,
      message:
        `Cubism Core ${major}.${minor}.${patch} はこのアプリと非互換です。` +
        'Live2D公式の「Cubism SDK for Web 4」（Core 4.x）から live2dcubismcore.min.js を取得し、' +
        'public/scripts/ に置き換えてください。Cubism 5/6 の Core は使用できません。',
    }
  }

  if (major < 4) {
    return {
      ok: false,
      major,
      minor,
      patch,
      message:
        `Cubism Core ${major}.${minor}.${patch} は古すぎます。Cubism SDK for Web 4 の Core を使用してください。`,
    }
  }

  return { ok: true, major, minor, patch }
}
