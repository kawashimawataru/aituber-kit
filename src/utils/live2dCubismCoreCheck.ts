/**
 * untitled-pixi-live2d-engine (cubism) が要求する Cubism Core との互換チェック。
 * Cubism Core 4.x / 5.x 以降に対応。
 * - Core 4.x → Cubism 4 以下のモデル (.moc3) を描画可能
 * - Core 5.x → Cubism 5 以下のモデル (.moc5 / .moc3) を描画可能
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

  // Cubism Core 4.x 以上に対応（3.x は未検証のため拒否）
  if (major < 4) {
    return {
      ok: false,
      major,
      minor,
      patch,
      message:
        `Cubism Core ${major}.${minor}.${patch} は古すぎます。` +
        'Cubism SDK for Web 4 または 5 の live2dcubismcore.min.js を使用してください。',
    }
  }

  // Cubism 4 / 5 以降を許可
  // - Core 4.x: Cubism 4 以下のモデル (.moc3) に対応
  // - Core 5.x+: Cubism 5 以下のモデル (.moc5 / .moc3) に対応
  return { ok: true, major, minor, patch }
}
