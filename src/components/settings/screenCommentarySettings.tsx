import { useTranslation } from 'react-i18next'
import settingsStore from '@/features/stores/settings'
import { ToggleSwitch } from '../toggleSwitch'

const ScreenCommentarySettings = () => {
  const { t } = useTranslation()
  const enabled = settingsStore((s) => s.screenCommentaryEnabled)
  const interval = settingsStore((s) => s.screenCommentaryInterval)
  const threshold = settingsStore((s) => s.screenCommentaryThreshold)
  const prompt = settingsStore((s) => s.screenCommentaryPrompt)

  return (
    <div className="my-10">
      <div className="my-4 text-xl font-bold">{t('ScreenCommentaryTitle')}</div>
      <div className="my-2 text-sm whitespace-pre-wrap">
        {t('ScreenCommentaryInfo')}
      </div>

      <div className="my-4">
        <ToggleSwitch
          enabled={enabled}
          onChange={(v) =>
            settingsStore.setState({ screenCommentaryEnabled: v })
          }
        />
      </div>

      {enabled && (
        <>
          <div className="my-6">
            <div className="my-4 text-xl font-bold">
              {t('ScreenCommentaryInterval')}: {interval}秒
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={interval}
              onChange={(e) =>
                settingsStore.setState({
                  screenCommentaryInterval: parseInt(e.target.value),
                })
              }
              className="mt-2 mb-4 input-range w-full md:w-1/2"
            />
          </div>

          <div className="my-6">
            <div className="my-4 text-xl font-bold">
              {t('ScreenCommentaryThreshold')}: {(threshold * 100).toFixed(0)}%
            </div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('ScreenCommentaryThresholdInfo')}
            </div>
            <input
              type="range"
              min="0.01"
              max="0.30"
              step="0.01"
              value={threshold}
              onChange={(e) =>
                settingsStore.setState({
                  screenCommentaryThreshold: parseFloat(e.target.value),
                })
              }
              className="mt-2 mb-4 input-range w-full md:w-1/2"
            />
          </div>

          <div className="my-6">
            <div className="my-4 text-xl font-bold">
              {t('ScreenCommentaryPrompt')}
            </div>
            <div className="my-2 text-sm whitespace-pre-wrap">
              {t('ScreenCommentaryPromptInfo')}
            </div>
            <textarea
              className="px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg text-sm"
              rows={4}
              placeholder={t('ScreenCommentaryPromptPlaceholder')}
              value={prompt}
              onChange={(e) =>
                settingsStore.setState({ screenCommentaryPrompt: e.target.value })
              }
            />
          </div>
        </>
      )}
    </div>
  )
}

export default ScreenCommentarySettings
