import { useTranslation } from 'react-i18next'
import Image from 'next/image'

import AdvancedSettings from './advancedSettings'
import ChatLogExport from './chatLogExport'
import CoStreamingSettings from './coStreamingSettings'
import MessageReceiverSetting from './messageReceiver'
import PresetQuestions from './presetQuestions'
import ScreenCommentarySettings from './screenCommentarySettings'
import settingsStore from '@/features/stores/settings'

const Other = () => {
  const { t } = useTranslation()
  const enableFloatingComments = settingsStore((s) => s.enableFloatingComments)

  return (
    <>
      <div className="flex items-center mb-6">
        <Image
          src="/images/setting-icons/other-settings.svg"
          alt="Other Settings"
          width={24}
          height={24}
          className="mr-2"
        />
        <h2 className="text-2xl font-bold">{t('OtherSettings')}</h2>
      </div>

      {/* 流れるコメント設定 */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-2">{t('FloatingCommentsTitle')}</h3>
        <p className="text-sm text-gray-500 mb-3">
          {t('FloatingCommentsDesc')}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              settingsStore.setState({
                enableFloatingComments: !enableFloatingComments,
              })
            }
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              enableFloatingComments
                ? 'bg-primary hover:bg-primary-hover text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {enableFloatingComments ? t('StatusOn') : t('StatusOff')}
          </button>
          <span className="text-sm text-gray-500">
            {t('FloatingCommentsHint')}
          </span>
        </div>
      </div>

      <AdvancedSettings />
      <CoStreamingSettings />
      <ScreenCommentarySettings />
      <ChatLogExport />
      <PresetQuestions />
      <MessageReceiverSetting />
    </>
  )
}
export default Other
