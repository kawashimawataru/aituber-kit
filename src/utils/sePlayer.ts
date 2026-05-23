/**
 * 効果音（SE）プレイヤー
 * public/assets/reactions/ 配下の音声ファイルを Web Audio API で再生する
 */

const audioCache = new Map<string, AudioBuffer>()
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

export async function playSE(
  path: string,
  volume = 1.0
): Promise<void> {
  try {
    const ctx = getAudioContext()

    let buffer = audioCache.get(path)
    if (!buffer) {
      const resp = await fetch(path)
      if (!resp.ok) return
      const arrayBuf = await resp.arrayBuffer()
      buffer = await ctx.decodeAudioData(arrayBuf)
      audioCache.set(path, buffer)
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const gainNode = ctx.createGain()
    gainNode.gain.value = volume

    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start(0)
  } catch (err) {
    console.warn('[SE] play failed:', path, err)
  }
}

/**
 * 笑いタイプに対応するSEパスを返す
 * ファイルがない場合は null
 */
export function getLaughSEPath(
  type: 'short' | 'medium' | 'big'
): string {
  return `/assets/reactions/laugh_${type}.wav`
}

/**
 * stunt に対応するSEパスを返す
 */
export function getStuntSEPath(stuntId: string): string {
  return `/assets/reactions/stunt_${stuntId}.wav`
}
