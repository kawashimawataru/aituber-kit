/** API 送信用画像の最大サイズ（画面実況と同一） */
export const API_IMAGE_MAX_WIDTH = 1280
export const API_IMAGE_MAX_HEIGHT = 720
export const API_IMAGE_JPEG_QUALITY = 0.75

/** この文字数以下かつ JPEG なら再圧縮をスキップ（約 400KB 相当） */
const SKIP_RECOMPRESS_IF_BELOW_CHARS = 550_000

export function calculateScaledDimensions(
  width: number,
  height: number,
  maxWidth = API_IMAGE_MAX_WIDTH,
  maxHeight = API_IMAGE_MAX_HEIGHT
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight }
  }
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * マルチモーダル API 送信用に dataURL 画像を JPEG へリサイズ・圧縮する
 * ブラウザ外では入力をそのまま返す
 */
export function compressImageDataUrl(
  dataUrl: string,
  maxWidth = API_IMAGE_MAX_WIDTH,
  maxHeight = API_IMAGE_MAX_HEIGHT,
  quality = API_IMAGE_JPEG_QUALITY
): Promise<string> {
  if (typeof window === 'undefined' || !dataUrl.startsWith('data:image/')) {
    return Promise.resolve(dataUrl)
  }

  const isAlreadySmallJpeg =
    dataUrl.startsWith('data:image/jpeg') &&
    dataUrl.length <= SKIP_RECOMPRESS_IF_BELOW_CHARS
  if (isAlreadySmallJpeg) {
    return Promise.resolve(dataUrl)
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const { width, height } = calculateScaledDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      )
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      try {
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
