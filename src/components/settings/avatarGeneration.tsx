import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import settingsStore from '@/features/stores/settings'
import { TextButton } from '../textButton'
import type { AvatarStyle } from '@/pages/api/avatar/generate-image'

// ─── Types ────────────────────────────────────────────────────────────────────

const STYLES: { key: AvatarStyle; label: string }[] = [
  { key: 'anime', label: 'アニメ' },
  { key: 'chibi', label: 'ちびキャラ' },
  { key: 'semi-realistic', label: 'セミリアル' },
]

const TEMPLATE_OPTIONS = [
  { key: 'nike01', label: 'Nike01（標準テンプレート）' },
]

// ─── Component ────────────────────────────────────────────────────────────────

const AvatarGeneration = () => {
  const { t } = useTranslation()
  const openaiKey = settingsStore((s) => s.openaiKey)

  // 入力状態
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<AvatarStyle>('anime')
  const [templateName, setTemplateName] = useState('nike01')

  // 生成状態
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedB64, setGeneratedB64] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Live2D作成
  const [avatarName, setAvatarName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createdModelPath, setCreatedModelPath] = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!prompt.trim() || !openaiKey) return
    setIsGenerating(true)
    setError(null)
    setGeneratedB64(null)
    setCreatedModelPath(null)

    try {
      const res = await fetch('/api/avatar/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          emotion: 'neutral',
          apiKey: openaiKey,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error)
        throw new Error(data.error || 'Generation failed')
      setGeneratedB64(data.b64)
      if (!avatarName) {
        setAvatarName(prompt.trim().slice(0, 20).replace(/\s+/g, '_'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, style, openaiKey, avatarName])

  const createLive2D = useCallback(async () => {
    if (!generatedB64) return
    setIsCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/avatar/create-live2d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: avatarName || 'ai_avatar',
          textureB64: generatedB64,
          templateName,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      setCreatedModelPath(data.modelPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsCreating(false)
    }
  }, [generatedB64, avatarName, templateName])

  const applyAsLive2D = () => {
    if (!createdModelPath) return
    settingsStore.setState({
      modelType: 'live2d',
      selectedLive2DPath: createdModelPath,
    })
  }

  const downloadImage = () => {
    if (!generatedB64) return
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${generatedB64}`
    a.download = `${avatarName || 'avatar'}_texture.png`
    a.click()
  }

  return (
    <div className="mb-8">
      {/* ヘッダー */}
      <div className="flex items-center mb-6">
        <span className="text-2xl mr-2">🎨</span>
        <h2 className="text-2xl font-bold">{t('AvatarGenTitle')}</h2>
      </div>

      {/* 説明 */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-800 whitespace-pre-wrap">
        {t('AvatarGenArchNote')}
      </div>

      {/* ──────────────── Live2D 生成 ──────────────── */}
      <section className="mb-8">
        <h3 className="text-xl font-bold mb-1">
          ✨ {t('AvatarGenLive2DTitle')}
        </h3>
        <p className="text-sm text-gray-500 mb-4">{t('AvatarGenLive2DDesc')}</p>

        {/* キャラクタープロンプト */}
        <div className="mb-4">
          <label className="font-bold text-sm">
            {t('AvatarGenPromptLabel')}
          </label>
          <textarea
            className="mt-2 w-full px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm resize-none"
            rows={3}
            placeholder={t('AvatarGenPromptPlaceholder')}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
        </div>

        {/* スタイル選択 */}
        <div className="mb-4">
          <label className="font-bold text-sm">
            {t('AvatarGenStyleLabel')}
          </label>
          <div className="mt-2 flex gap-2 flex-wrap">
            {STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStyle(s.key)}
                disabled={isGenerating}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                  style === s.key
                    ? 'bg-primary text-theme border-primary'
                    : 'border-gray-200 hover:border-primary hover:text-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* テンプレート選択 */}
        <div className="mb-4">
          <label className="font-bold text-sm">
            {t('AvatarGenTemplateLabel')}
          </label>
          <div className="mt-2 flex gap-2 flex-wrap">
            {TEMPLATE_OPTIONS.map((tpl) => (
              <button
                key={tpl.key}
                onClick={() => setTemplateName(tpl.key)}
                disabled={isGenerating || isCreating}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                  templateName === tpl.key
                    ? 'bg-primary text-theme border-primary'
                    : 'border-gray-200 hover:border-primary hover:text-primary'
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {t('AvatarGenTemplateHint')}
          </p>
        </div>

        {/* 生成ボタン */}
        <div className="flex gap-3 items-center flex-wrap mb-4">
          <TextButton
            onClick={generate}
            disabled={isGenerating || !prompt.trim() || !openaiKey}
          >
            {isGenerating
              ? t('AvatarGenGenerating')
              : t('AvatarGenGenerateBtn')}
          </TextButton>
          {!openaiKey && (
            <span className="text-xs text-red-500">
              {t('AvatarGenNoApiKey')}
            </span>
          )}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-500 break-all">{error}</p>
        )}

        {/* 生成結果 */}
        {generatedB64 && (
          <div className="mt-4 p-4 border border-gray-200 rounded-xl">
            <div className="flex gap-4 items-start">
              <img
                src={`data:image/png;base64,${generatedB64}`}
                alt="Generated avatar"
                className="w-48 h-48 object-contain rounded-xl border border-gray-200"
              />
              <div className="flex-1 text-sm text-gray-600">
                <p className="font-bold mb-1">{t('AvatarGenPreviewTitle')}</p>
                <p className="text-xs text-gray-400 mb-3">
                  {t('AvatarGenPreviewNote')}
                </p>
                <button
                  onClick={downloadImage}
                  className="text-sm text-primary underline"
                >
                  {t('AvatarGenDownload')}
                </button>
              </div>
            </div>

            {/* Live2D モデル作成 */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="font-bold mb-1">{t('AvatarGenCreateLive2D')}</h4>
              <p className="text-sm text-gray-500 mb-3">
                {t('AvatarGenCreateLive2DDesc')}
              </p>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  type="text"
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white"
                  placeholder={t('AvatarGenNamePlaceholder')}
                  value={avatarName}
                  onChange={(e) => setAvatarName(e.target.value)}
                />
                <TextButton
                  onClick={createLive2D}
                  disabled={isCreating || !generatedB64}
                >
                  {isCreating
                    ? t('AvatarGenCreating')
                    : t('AvatarGenCreateBtn')}
                </TextButton>
              </div>

              {createdModelPath && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">
                    ✅ {t('AvatarGenCreated')}{' '}
                    <code className="text-xs">{createdModelPath}</code>
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {t('AvatarGenCreatedNote')}
                  </p>
                  <button
                    onClick={applyAsLive2D}
                    className="mt-2 px-4 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {t('AvatarGenApplyBtn')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ──────────────── VRM 生成ガイド ──────────────── */}
      <section className="border-t border-gray-200 pt-6">
        <h3 className="text-xl font-bold mb-1">🧊 {t('AvatarGenVRMTitle')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('AvatarGenVRMDesc')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              name: 'VRoid Studio',
              desc: '無料の3Dアバター作成ツール。アニメ調VRMを直接作成・エクスポート可能。',
              url: 'https://vroid.com/studio',
              badge: '無料',
            },
            {
              name: 'Rodin3D (Hyper3D)',
              desc: 'テキスト/画像から高品質3Dメッシュを生成。APIでVRM変換パイプラインを構築可能。',
              url: 'https://hyper3d.ai',
              badge: 'API有料',
            },
            {
              name: 'Meshy',
              desc: 'テキスト/画像→3Dモデル生成。GLBエクスポート→UniVRM等でVRM変換。',
              url: 'https://www.meshy.ai',
              badge: '一部無料',
            },
          ].map((tool) => (
            <div
              key={tool.name}
              className="p-4 border border-gray-200 rounded-xl hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-sm">{tool.name}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
                  {tool.badge}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{tool.desc}</p>
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline"
              >
                開く ↗
              </a>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
          {t('AvatarGenVRMNote')}
        </div>
      </section>
    </div>
  )
}

export default AvatarGeneration
