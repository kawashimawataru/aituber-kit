/**
 * Phase 6-3: 画面シェイク
 * ビューア要素に CSS animation を一時的に適用して揺らす
 */

const VIEWER_SELECTOR = '#viewer-container'

let shakeTimer: ReturnType<typeof setTimeout> | null = null

export function triggerScreenShake(
  intensity: number,
  duration: number,
  count: number
): void {
  const el = document.querySelector<HTMLElement>(VIEWER_SELECTOR)
  if (!el) return

  // 前のシェイクをキャンセル
  if (shakeTimer) {
    clearTimeout(shakeTimer)
    el.style.animation = ''
    el.style.transform = ''
  }

  const keyframes = `
    @keyframes __shake_${Date.now()} {
      0%,100% { transform: translate(0,0) }
      25% { transform: translate(${intensity}px, ${Math.round(intensity * 0.5)}px) }
      50% { transform: translate(-${intensity}px, -${Math.round(intensity * 0.5)}px) }
      75% { transform: translate(${Math.round(intensity * 0.7)}px, ${intensity}px) }
    }
  `

  // styleタグを動的に挿入
  const styleId = '__screen_shake_style'
  let style = document.getElementById(styleId) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = styleId
    document.head.appendChild(style)
  }
  style.textContent = keyframes

  const animName = keyframes.match(/@keyframes (__shake_\d+)/)?.[1] ?? 'none'
  const iterCount = count
  el.style.animation = `${animName} ${Math.round(duration / count)}ms ease-in-out ${iterCount} alternate`

  shakeTimer = setTimeout(() => {
    el.style.animation = ''
    el.style.transform = ''
    shakeTimer = null
  }, duration + 50)
}
