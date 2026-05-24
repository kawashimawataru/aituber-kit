/**
 * 画面キャプチャユーティリティ
 * `getDisplayMedia` で取得済みの video 要素から Canvas でフレームを切り出す
 */

const CAPTURE_WIDTH = 1280
const CAPTURE_HEIGHT = 720

/**
 * video 要素から base64 JPEG を生成して返す
 */
export function captureFrameFromVideo(
  video: HTMLVideoElement,
  quality = 0.75
): string {
  const canvas = document.createElement('canvas')
  canvas.width = CAPTURE_WIDTH
  canvas.height = CAPTURE_HEIGHT

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * 2枚の JPEG dataURL を比較して差分スコアを返す（0.0 = 同一、1.0 = 完全に異なる）
 * ダウンスケール後にピクセル差分を計算することで高速化
 */
export function computeFrameDiff(a: string, b: string): Promise<number> {
  return new Promise((resolve) => {
    const SIZE = 64
    const canvasA = document.createElement('canvas')
    const canvasB = document.createElement('canvas')
    canvasA.width = canvasB.width = SIZE
    canvasA.height = canvasB.height = SIZE

    const ctxA = canvasA.getContext('2d')!
    const ctxB = canvasB.getContext('2d')!

    const imgA = new Image()
    const imgB = new Image()

    let loaded = 0

    const done = () => {
      loaded++
      if (loaded < 2) return

      ctxA.drawImage(imgA, 0, 0, SIZE, SIZE)
      ctxB.drawImage(imgB, 0, 0, SIZE, SIZE)

      const dataA = ctxA.getImageData(0, 0, SIZE, SIZE).data
      const dataB = ctxB.getImageData(0, 0, SIZE, SIZE).data

      let diff = 0
      for (let i = 0; i < dataA.length; i += 4) {
        diff += Math.abs(dataA[i] - dataB[i]) // R
        diff += Math.abs(dataA[i + 1] - dataB[i + 1]) // G
        diff += Math.abs(dataA[i + 2] - dataB[i + 2]) // B
      }
      // 最大差分: SIZE*SIZE*3チャンネル*255
      const maxDiff = SIZE * SIZE * 3 * 255
      resolve(diff / maxDiff)
    }

    imgA.onload = done
    imgB.onload = done
    imgA.src = a
    imgB.src = b
  })
}
