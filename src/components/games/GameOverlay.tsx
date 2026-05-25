import React from 'react'
import { useTranslation } from 'react-i18next'
import gameStore from '@/features/stores/gameStore'
import GamePanel from './GamePanel'

export default function GameOverlay() {
  const { t } = useTranslation()
  const gameVisible = gameStore((s) => s.gameVisible)
  const gameType = gameStore((s) => s.gameType)

  if (!gameVisible) return null

  return (
    <div className="fixed bottom-24 left-4 z-30 bg-black/80 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-bold text-sm tracking-wide">
          {gameType === 'othello' ? t('GameOthello') : ''}
        </h2>
      </div>
      {gameType === 'othello' && <GamePanel />}
    </div>
  )
}
