import {
  API_IMAGE_MAX_HEIGHT,
  API_IMAGE_MAX_WIDTH,
  calculateScaledDimensions,
} from '@/utils/compressImageForApi'

describe('calculateScaledDimensions', () => {
  it('4K 画像を 1280x720 以内に縮小する', () => {
    const { width, height } = calculateScaledDimensions(3840, 2160)
    expect(width).toBe(API_IMAGE_MAX_WIDTH)
    expect(height).toBe(720)
  })

  it('小さい画像は拡大しない', () => {
    const { width, height } = calculateScaledDimensions(640, 360)
    expect(width).toBe(640)
    expect(height).toBe(360)
  })

  it('縦長画像は高さ基準で収める', () => {
    const { width, height } = calculateScaledDimensions(1080, 1920)
    expect(height).toBe(API_IMAGE_MAX_HEIGHT)
    expect(width).toBeLessThanOrEqual(API_IMAGE_MAX_WIDTH)
  })
})
