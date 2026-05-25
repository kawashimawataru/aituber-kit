import React from 'react'
import floatingCommentStore from '@/features/floatingComments/floatingCommentStore'
import settingsStore from '@/features/stores/settings'

export default function FloatingComments() {
  const enabled = settingsStore((s) => s.enableFloatingComments)
  const { comments, removeComment } = floatingCommentStore()

  if (!enabled) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
      {comments.map((c) => (
        <div
          key={c.id}
          onAnimationEnd={() => removeComment(c.id)}
          className="absolute whitespace-nowrap"
          style={{
            top: `${c.lane * 7 + 4}%`,
            left: 0,
            animation: `niconicoFloat ${c.duration}ms linear forwards`,
            color: c.type === 'ai' ? '#7fffff' : '#ffffff',
            fontSize: '18px',
            fontWeight: 'bold',
            textShadow:
              '1px 1px 3px #000, -1px -1px 3px #000, 1px -1px 3px #000, -1px 1px 3px #000',
          }}
        >
          {c.userName && (
            <span
              style={{
                fontSize: '13px',
                opacity: 0.75,
                marginRight: '4px',
              }}
            >
              {c.userName}：
            </span>
          )}
          {c.text}
        </div>
      ))}
    </div>
  )
}
