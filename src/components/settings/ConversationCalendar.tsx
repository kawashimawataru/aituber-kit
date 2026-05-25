import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getConversationLogService,
  DailyConversation,
  todayString,
} from '@/features/memory/conversationLogService'

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatDateLabel(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return `${y}年${m}月${d}日`
  } catch {
    return dateStr
  }
}

interface Props {
  onTotalDaysChange?: (n: number) => void
}

const ConversationCalendar = ({ onTotalDaysChange }: Props) => {
  const { t } = useTranslation()
  const today = todayString()
  const todayDate = new Date()

  const [year, setYear] = useState(todayDate.getFullYear())
  const [month, setMonth] = useState(todayDate.getMonth() + 1)
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayData, setDayData] = useState<DailyConversation | null>(null)
  const [loading, setLoading] = useState(false)
  const [totalDays, setTotalDays] = useState(0)

  const loadMonth = useCallback(async () => {
    const svc = getConversationLogService()
    if (!svc.isAvailable()) await svc.initialize()
    const dates = await svc.getDatesInMonth(year, month)
    setActiveDates(dates)
    const total = await svc.getTotalDays()
    setTotalDays(total)
    onTotalDaysChange?.(total)
  }, [year, month, onTotalDaysChange])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  const selectDate = async (date: string) => {
    if (selectedDate === date) {
      setSelectedDate(null)
      setDayData(null)
      return
    }
    setSelectedDate(date)
    setLoading(true)
    try {
      const svc = getConversationLogService()
      const data = await svc.getDay(date)
      setDayData(data)
    } finally {
      setLoading(false)
    }
  }

  const deleteDay = async (date: string) => {
    const confirmed = window.confirm(
      `${formatDateLabel(date)} の会話履歴を削除しますか？`
    )
    if (!confirmed) return
    const svc = getConversationLogService()
    await svc.deleteDay(date)
    setSelectedDate(null)
    setDayData(null)
    await loadMonth()
  }

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = firstDayOfMonth.getDay() // 0=Sun

  const cells: Array<number | null> = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else setMonth((m) => m - 1)
    setSelectedDate(null)
    setDayData(null)
  }
  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else setMonth((m) => m + 1)
    setSelectedDate(null)
    setDayData(null)
  }

  const isToday = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` ===
    today

  const dateStr = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const isDisabledNext =
    year === todayDate.getFullYear() && month === todayDate.getMonth() + 1

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          className="px-3 py-1 text-sm rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
          onClick={prevMonth}
        >
          ◀
        </button>
        <span className="font-bold text-lg">
          {year}年{month}月
        </span>
        <button
          className="px-3 py-1 text-sm rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          onClick={nextMonth}
          disabled={isDisabledNext}
        >
          ▶
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={w}
            className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}
          >
            {w}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />
          }
          const ds = dateStr(day)
          const hasConv = activeDates.has(ds)
          const selected = selectedDate === ds
          const weekday = (startWeekday + day - 1) % 7
          const isSun = weekday === 0
          const isSat = weekday === 6

          return (
            <button
              key={ds}
              onClick={() => hasConv && selectDate(ds)}
              className={[
                'relative flex flex-col items-center justify-center h-10 w-full rounded-lg text-sm transition-colors',
                hasConv
                  ? 'cursor-pointer hover:bg-primary/10'
                  : 'cursor-default',
                selected ? 'bg-primary text-theme' : '',
                isToday(day) && !selected
                  ? 'ring-2 ring-primary ring-inset'
                  : '',
                isSun && !selected ? 'text-red-400' : '',
                isSat && !selected ? 'text-blue-400' : '',
                !hasConv && !isToday(day) ? 'text-gray-300' : '',
              ].join(' ')}
            >
              <span>{day}</span>
              {hasConv && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${selected ? 'bg-white' : 'bg-primary'}`}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="text-xs text-gray-400 text-right mb-4">
        {t('ConvLogTotalDays', { count: totalDays })}
      </div>

      {/* Day detail */}
      {selectedDate && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="font-bold text-sm">
              {formatDateLabel(selectedDate)} の会話
            </span>
            <div className="flex gap-2">
              <button
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                onClick={() => deleteDay(selectedDate)}
              >
                削除
              </button>
              <button
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                onClick={() => {
                  setSelectedDate(null)
                  setDayData(null)
                }}
              >
                ×
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                読み込み中...
              </div>
            ) : !dayData || dayData.messages.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                {t('ConvLogNoMessages')}
              </div>
            ) : (
              dayData.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap self-start mt-1 ${
                      msg.role === 'user'
                        ? 'bg-primary/20 text-gray-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {msg.role === 'user' ? 'あなた' : 'AI'}
                  </div>
                  <div
                    className={`flex-1 text-sm rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary/10 text-right'
                        : 'bg-gray-50'
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ConversationCalendar
