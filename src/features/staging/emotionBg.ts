/**
 * Phase 6.8-4: 感情連動背景変更
 * emotionTag から catalog.json の emotionMap を引いて背景を切り替える
 */

import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'

interface BgCatalog {
  version: string
  backgrounds: Array<{
    id: string
    keyword?: string
    file?: string
    label: string
    mood: string[]
    color?: string
  }>
  emotionMap: Record<string, string>
}

let _catalog: BgCatalog | null = null
let _loading = false

async function loadCatalog(): Promise<BgCatalog | null> {
  if (_catalog) return _catalog
  if (_loading) return null
  _loading = true
  try {
    const res = await fetch('/backgrounds/catalog.json')
    if (!res.ok) return null
    _catalog = await res.json()
    return _catalog
  } catch {
    return null
  } finally {
    _loading = false
  }
}

/** 感情タグ（"[happy]" 形式）から背景を適用する */
export async function applyEmotionBackground(
  emotionTag: string
): Promise<void> {
  const ss = settingsStore.getState()
  if (!ss.backgroundChangeEnabled) return

  const emotion = emotionTag.replace(/[\[\]]/g, '').toLowerCase()
  if (!emotion || emotion === 'neutral') return

  const catalog = await loadCatalog()
  if (!catalog) return

  const bgId = catalog.emotionMap[emotion]
  if (bgId === undefined || bgId === '') return

  const entry = catalog.backgrounds.find((b) => b.id === bgId)
  if (!entry) return

  let bgPath: string
  if (entry.keyword) {
    bgPath = entry.keyword
  } else if (entry.file) {
    bgPath = `/backgrounds/${entry.file}`
  } else {
    bgPath = ''
  }

  const current = homeStore.getState().backgroundImageUrl
  if (current === bgPath) return

  homeStore.setState({ backgroundImageUrl: bgPath })
}
