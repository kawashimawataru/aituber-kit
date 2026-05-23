import { useTranslation } from 'react-i18next'
import { exportChatLogAsJsonl } from '@/utils/exportChatLog'

const ChatLogExport = () => {
  const { t } = useTranslation()

  return (
    <div className="mt-24">
      <h2 className="text-2xl font-bold mb-8">{t('ChatLogExportTitle')}</h2>
      <p className="text-sm mb-4">{t('ChatLogExportInfo')}</p>
      <button
        className="bg-secondary hover:bg-secondary-hover text-white px-6 py-2 rounded-lg text-sm font-medium"
        onClick={exportChatLogAsJsonl}
      >
        {t('ChatLogExportButton')}
      </button>
    </div>
  )
}

export default ChatLogExport
