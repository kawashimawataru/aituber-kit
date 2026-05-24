import { useTranslation } from 'react-i18next'
import settingsStore from '@/features/stores/settings'
import { ToggleSwitch } from '../toggleSwitch'
import CoStreamingPresets from './coStreamingPresets'

const CoStreamingSettings = () => {
  const { t } = useTranslation()
  const coStreamingMode = settingsStore((s) => s.coStreamingMode)
  const coStreamerName = settingsStore((s) => s.coStreamerName)
  const backgroundChangeEnabled = settingsStore(
    (s) => s.backgroundChangeEnabled
  )

  return (
    <div className="my-10">
      <div className="my-4 text-xl font-bold">{t('CoStreamingTitle')}</div>
      <div className="my-2 text-sm whitespace-pre-wrap">
        {t('CoStreamingInfo')}
      </div>

      <div className="my-4">
        <ToggleSwitch
          enabled={coStreamingMode}
          onChange={(v) => settingsStore.setState({ coStreamingMode: v })}
        />
      </div>

      {coStreamingMode && (
        <>
          <div className="my-6">
            <div className="my-2 text-xl font-bold">{t('CoStreamerName')}</div>
            <div className="my-2 text-sm">{t('CoStreamerNameInfo')}</div>
            <input
              type="text"
              className="px-4 py-2 w-full md:w-1/2 bg-white hover:bg-white-hover rounded-lg text-sm"
              placeholder={t('CoStreamerNamePlaceholder')}
              value={coStreamerName}
              onChange={(e) =>
                settingsStore.setState({ coStreamerName: e.target.value })
              }
            />
          </div>

          <CoStreamingPresets />

          <div className="my-6">
            <div className="my-2 text-xl font-bold">
              {t('BackgroundChangeTitle')}
            </div>
            <div className="my-2 text-sm">{t('BackgroundChangeInfo')}</div>
            <div className="my-3">
              <ToggleSwitch
                enabled={backgroundChangeEnabled}
                onChange={(v) =>
                  settingsStore.setState({ backgroundChangeEnabled: v })
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CoStreamingSettings
