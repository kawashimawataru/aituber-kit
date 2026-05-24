/**
 * untitled-pixi-live2d-engine (cubism) が要求する Cubism Core との互換チェック。
 * 対応 Core: 4.x（SDK 4）/ 5.x（SDK 5 r.1〜r.4）
 * - Core 4.x → Cubism 4 以下のモデル (.moc3) を描画可能
 * - Core 5.x → Cubism 5 以下のモデル (.moc3) を描画可能
 *
 * ⚠️ SDK 5 r.5 以降 (Core 6.x) は drawables API が変わり非互換。SDK 5 r.4 を使うこと。
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

  console.info(`[Live2D] Cubism Core ${major}.${minor}.${patch} (raw=${raw})`)

  // Core 6.x (SDK 5 r.5+) は drawables API が変わり非互換のため拒否
  if (major >= 6) {
    return {
      ok: false,
      major,
      minor,
      patch,
      message:
        `Cubism Core ${major}.${minor}.${patch} (SDK 5 r.5 以降) は非互換です。` +
        'SDK 5 r.4 の live2dcubismcore.min.js を使用してください。',
    }
  }

  // Core 4.x 以上を許可（3.x は未検証のため拒否）
  if (major < 4) {
    return {
      ok: false,
      major,
      minor,
      patch,
      message:
        `Cubism Core ${major}.${minor}.${patch} は古すぎます。` +
        'Cubism SDK for Web 4 または 5 r.4 の live2dcubismcore.min.js を使用してください。',
    }
  }

  return { ok: true, major, minor, patch }
}
