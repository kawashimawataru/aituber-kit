import { useEffect, useRef, useCallback } from 'react'
import settingsStore from '@/features/stores/settings'
import homeStore from '@/features/stores/home'
import { buildUrl } from '@/utils/buildUrl'
import { BgmLoopPlayer } from '@/utils/bgmLoopPlayer'

/**
 * ループ BGM 再生。ループ境界はフェードイン/アウトで自然に接続。
 * TTS 発話中は音量を下げる（ダッキング）。
 */
export default function BgmPlayer() {
  const playerRef = useRef<BgmLoopPlayer | null>(null)
  const bgmEnabled = settingsStore((s) => s.bgmEnabled)
  const bgmPath = settingsStore((s) => s.bgmPath)
  const bgmVolume = settingsStore((s) => s.bgmVolume)
  const bgmDuckOnSpeech = settingsStore((s) => s.bgmDuckOnSpeech)
  const bgmDuckVolume = settingsStore((s) => s.bgmDuckVolume)
  const isSpeaking = homeStore((s) => s.isSpeaking)

  const getTargetVolume = useCallback(() => {
    const duck = bgmDuckOnSpeech && isSpeaking
    return Math.min(1, Math.max(0, duck ? bgmDuckVolume : bgmVolume))
  }, [bgmVolume, bgmDuckVolume, bgmDuckOnSpeech, isSpeaking])

  const applyVolume = useCallback(() => {
    playerRef.current?.setMasterVolume(getTargetVolume())
  }, [getTargetVolume])

  const tryPlay = useCallback(async () => {
    const player = playerRef.current
    if (!player || !bgmEnabled || !bgmPath) return
    applyVolume()
    try {
      await player.play()
    } catch {
      // ブラウザの自動再生ポリシー — 初回クリックで再試行
    }
  }, [applyVolume, bgmEnabled, bgmPath])

  useEffect(() => {
    playerRef.current = new BgmLoopPlayer()
    return () => {
      playerRef.current?.dispose()
      playerRef.current = null
    }
  }, [])

  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    if (!bgmEnabled || !bgmPath) {
      player.stop()
      return
    }

    let cancelled = false
    const url = buildUrl(bgmPath)

    void (async () => {
      try {
        await player.load(url)
        if (cancelled) return
        applyVolume()
        await tryPlay()
      } catch (error) {
        console.error('BGM load/play failed:', error)
      }
    })()

    const onUserGesture = () => {
      void tryPlay()
    }
    document.addEventListener('click', onUserGesture, { once: true })
    document.addEventListener('keydown', onUserGesture, { once: true })

    return () => {
      cancelled = true
      document.removeEventListener('click', onUserGesture)
      document.removeEventListener('keydown', onUserGesture)
    }
  }, [bgmEnabled, bgmPath, applyVolume, tryPlay])

  useEffect(() => {
    applyVolume()
  }, [applyVolume])

  return null
}
