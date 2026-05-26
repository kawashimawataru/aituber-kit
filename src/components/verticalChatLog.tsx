import { useEffect, useRef } from 'react'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'
import { messageSelectors } from '@/features/messages/messageSelectors'
import { getTextFromMessageContent } from '@/utils/multimodalContent'
import { stripSpeakControlTags } from '@/utils/speakControlTags'

const MAX_VISIBLE = 10

export const VerticalChatLog = () => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const characterName = settingsStore((s) => s.characterName)
  const userDisplayName = settingsStore((s) => s.userDisplayName)
  const allMessages = messageSelectors.getTextAndImageMessages(
    homeStore((s) => s.chatLog)
  )
  const messages = allMessages.slice(-MAX_VISIBLE)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none pb-28 px-3">
      <div className="flex flex-col gap-2 w-full max-w-sm mx-auto">
        {messages.map((msg, i) => {
          const text = stripSpeakControlTags(
            typeof msg.content === 'string'
              ? msg.content
              : getTextFromMessageContent(msg.content)
          )
          if (!text) return null
          const isUser = msg.role === 'user'
          return (
            <div
              key={i}
              className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              style={{ animation: 'vcl-fadein 0.25s ease' }}
            >
              {/* Avatar circle */}
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-theme text-xs font-bold select-none">
                  {(characterName || 'A').slice(0, 1)}
                </div>
              )}

              <div
                className={`flex flex-col gap-0.5 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] font-semibold text-white/70 px-1 select-none">
                  {isUser
                    ? msg.userName || userDisplayName || 'YOU'
                    : characterName || 'CHARACTER'}
                </span>
                <div
                  className={[
                    'px-3 py-2 text-sm leading-snug break-words whitespace-pre-wrap shadow',
                    isUser
                      ? 'bg-[#06c755] text-white rounded-tl-2xl rounded-bl-2xl rounded-tr-2xl rounded-br-sm'
                      : 'bg-white text-gray-900 rounded-tr-2xl rounded-br-2xl rounded-tl-2xl rounded-bl-sm',
                  ].join(' ')}
                >
                  {text}
                </div>
              </div>

              {/* User side spacer */}
              {isUser && <div className="w-8 flex-shrink-0" />}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <style jsx>{`
        @keyframes vcl-fadein {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
