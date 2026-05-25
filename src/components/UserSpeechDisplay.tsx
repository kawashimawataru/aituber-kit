import { useEffect, useRef, useState } from 'react'
import homeStore from '@/features/stores/home'

/**
 * 配信者（ユーザー）の発話を画面下部に表示する字幕オーバーレイ
 * 英会話練習モードで視聴者が発言内容を読めるようにする
 */
export default function UserSpeechDisplay() {
  const displayText = homeStore((s) => s.displayUserSpeech)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!displayText) {
      setVisible(false)
      return
    }
    setVisible(true)

    // 最後の更新から3秒後にフェードアウト
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 3000)
  }, [displayText])

  if (!displayText) return null

  return (
    <div
      className="pointer-events-none fixed bottom-28 left-0 right-0 z-30 flex justify-center px-6 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="max-w-2xl rounded-2xl px-6 py-3 text-center"
        style={{
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <span className="text-white text-xl font-semibold tracking-wide leading-relaxed">
          {displayText}
        </span>
      </div>
    </div>
  )
}
