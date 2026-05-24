'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import homeStore from '@/features/stores/home'
import { Live2DErrorBoundary } from '@/components/common/Live2DErrorBoundary'
import { checkCubismCoreCompatibility } from '@/utils/live2dCubismCoreCheck'

const Live2DComponent = dynamic(
  () => {
    console.log('Loading Live2DComponent...')
    return import('./Live2DComponent')
      .then((mod) => mod.default)
      .then((mod) => {
        console.log('Live2DComponent loaded successfully')
        return mod
      })
      .catch((err) => {
        console.error('Failed to load Live2DComponent:', err)
        throw err
      })
  },
  {
    ssr: false,
    loading: () => {
      console.log('Live2DComponent is loading...')
      return null
    },
  }
)

export default function Live2DViewer() {
  const [isMounted, setIsMounted] = useState(false)
  const [cubismCoreError, setCubismCoreError] = useState<string | null>(null)
  const [scriptLoadRetries, setScriptLoadRetries] = useState({
    cubismcore: 0,
    live2d: 0,
  })
  const MAX_RETRIES = 3

  const isCubismCoreLoaded = homeStore((s) => s.isCubismCoreLoaded)
  const setIsCubismCoreLoaded = homeStore((s) => s.setIsCubismCoreLoaded)
  const isLive2dLoaded = homeStore((s) => s.isLive2dLoaded)
  const setIsLive2dLoaded = homeStore((s) => s.setIsLive2dLoaded)

  // スクリプトの再読み込み処理
  const retryLoadScript = (scriptName: 'cubismcore' | 'live2d') => {
    if (scriptLoadRetries[scriptName] < MAX_RETRIES) {
      setScriptLoadRetries((prev) => ({
        ...prev,
        [scriptName]: prev[scriptName] + 1,
      }))
      // 強制的に再読み込みするためにキーを変更
      return true
    }
    return false
  }

  useEffect(() => {
    console.log('Live2DViewer mounted')
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    console.log('Live2DViewer not mounted yet')
    return null
  }

  console.log('Rendering Live2DViewer')

  if (cubismCoreError) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-lg">
        <p className="font-semibold">Live2D Cubism Core のバージョンが合いません</p>
        <p className="mt-2 whitespace-pre-wrap">{cubismCoreError}</p>
        <p className="mt-3 text-xs text-red-800">
          取得先: Live2D公式 → Cubism SDK for Web 4 または 5 → 解凍後の Core/
          live2dcubismcore.min.js を public/scripts/ に配置
        </p>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 w-screen h-screen z-5">
      <Script
        key={`cubismcore-${scriptLoadRetries.cubismcore}`}
        src="/scripts/live2dcubismcore.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window === 'undefined' || !(window as any).Live2DCubismCore) {
            console.error(
              'live2dcubismcore.min.js loaded but window.Live2DCubismCore is not set. ' +
                'Place the Cubism SDK Core file at public/scripts/live2dcubismcore.min.js'
            )
            setCubismCoreError(
              'live2dcubismcore.min.js は読み込まれましたが Live2DCubismCore が未定義です。SDK の Core ファイルを確認してください。'
            )
            return
          }

          const check = checkCubismCoreCompatibility()
          if (!check.ok) {
            console.error('[Live2D] Incompatible Cubism Core:', check.message)
            setCubismCoreError(check.message ?? 'Cubism Core のバージョンが非互換です。')
            homeStore.getState().setIsCubismCoreLoaded(false)
            return
          }

          console.log(
            `cubismcore loaded (${check.major}.${check.minor}.${check.patch})`
          )
          setCubismCoreError(null)
          setIsCubismCoreLoaded(true)
        }}
        onError={() => {
          console.error(
            'Failed to load live2dcubismcore.min.js. ' +
            'Download the Cubism SDK Core from https://www.live2d.com/en/download/cubism-sdk/ ' +
            'and place live2dcubismcore.min.js at public/scripts/live2dcubismcore.min.js'
          )
          if (retryLoadScript('cubismcore')) {
            console.log('Retrying cubismcore load...')
          } else {
            console.error('Max retries reached for cubismcore')
          }
        }}
      />
      {isCubismCoreLoaded && (
        <Live2DErrorBoundary>
          <Live2DComponent />
        </Live2DErrorBoundary>
      )}
    </div>
  )
}
