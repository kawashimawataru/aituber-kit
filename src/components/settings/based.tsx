import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import Image from 'next/image'
import { Language } from '@/features/constants/settings'
import homeStore from '@/features/stores/home'
import menuStore from '@/features/stores/menu'
import settingsStore from '@/features/stores/settings'
import { TextButton } from '../textButton'
import { ToggleSwitch } from '../toggleSwitch'
import { IMAGE_CONSTANTS } from '@/constants/images'
import { useRestrictedMode } from '@/hooks/useRestrictedMode'

const Based = () => {
  const { t } = useTranslation()
  const { isRestrictedMode } = useRestrictedMode()
  const selectLanguage = settingsStore((s) => s.selectLanguage)
  const showAssistantText = settingsStore((s) => s.showAssistantText)
  const showCharacterName = settingsStore((s) => s.showCharacterName)
  const showControlPanel = settingsStore((s) => s.showControlPanel)
  const useVideoAsBackground = settingsStore((s) => s.useVideoAsBackground)
  const changeEnglishToJapanese = settingsStore(
    (s) => s.changeEnglishToJapanese
  )
  const colorTheme = settingsStore((s) => s.colorTheme)
  const [backgroundFiles, setBackgroundFiles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const backgroundImageUrl = homeStore((s) => s.backgroundImageUrl)
  const bgmEnabled = settingsStore((s) => s.bgmEnabled)
  const bgmPath = settingsStore((s) => s.bgmPath)
  const bgmVolume = settingsStore((s) => s.bgmVolume)
  const bgmDuckOnSpeech = settingsStore((s) => s.bgmDuckOnSpeech)
  const bgmDuckVolume = settingsStore((s) => s.bgmDuckVolume)
  const [bgmFiles, setBgmFiles] = useState<string[]>([])
  const [bgmLoading, setBgmLoading] = useState(false)
  const [bgmError, setBgmError] = useState<string | null>(null)
  const [bgmUploading, setBgmUploading] = useState(false)
  const [bgmUploadError, setBgmUploadError] = useState<string | null>(null)

  useEffect(() => {
    setBgmLoading(true)
    setBgmError(null)
    fetch('/api/get-bgm-list')
      .then((res) => res.json())
      .then((files) => {
        if (Array.isArray(files)) {
          setBgmFiles(files)
        }
      })
      .catch(() => setBgmError(t('BgmListFetchError')))
      .finally(() => setBgmLoading(false))
  }, [t])

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    fetch('/api/get-background-list')
      .then((res) => res.json())
      .then((files) =>
        setBackgroundFiles(files.filter((file: string) => file !== 'bg-c.png'))
      )
      .catch((error) => {
        console.error('Error fetching background list:', error)
        setError(t('BackgroundListFetchError'))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [t])

  const handleBackgroundUpload = async (file: File) => {
    // ファイルタイプの検証
    if (!file.type.startsWith('image/')) {
      setUploadError(t('OnlyImageFilesAllowed'))
      return
    }

    // ファイルサイズの検証（例：5MB以下）
    if (file.size > IMAGE_CONSTANTS.COMPRESSION.LARGE_FILE_THRESHOLD) {
      setUploadError(t('FileSizeLimitExceeded'))
      return
    }

    setIsUploading(true)
    setUploadError(null)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload-background', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`${t('UploadFailed')}: ${response.status}`)
      }

      const { path } = await response.json()
      homeStore.setState({ backgroundImageUrl: path })

      // バックグラウンドリストを更新
      setIsLoading(true)
      setError(null)
      const listResponse = await fetch('/api/get-background-list')
      if (!listResponse.ok) {
        throw new Error(t('BackgroundListFetchError'))
      }
      const files = await listResponse.json()
      setBackgroundFiles(files.filter((file: string) => file !== 'bg-c.png'))
    } catch (error) {
      console.error('Error uploading background:', error)
      setUploadError(t('BackgroundUploadError'))
    } finally {
      setIsUploading(false)
      setIsLoading(false)
    }
  }

  const handleBgmUpload = async (file: File) => {
    if (
      !file.type.startsWith('audio/') &&
      !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)
    ) {
      setBgmUploadError(t('BgmInvalidFileType'))
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setBgmUploadError(t('FileSizeLimitExceeded'))
      return
    }

    setBgmUploading(true)
    setBgmUploadError(null)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload-bgm', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error(t('UploadFailed'))
      }
      const { path } = await response.json()
      settingsStore.setState({ bgmPath: path, bgmEnabled: true })

      const listResponse = await fetch('/api/get-bgm-list')
      const files = await listResponse.json()
      if (Array.isArray(files)) {
        setBgmFiles(files)
      }
    } catch (error) {
      console.error('Error uploading BGM:', error)
      setBgmUploadError(t('BgmUploadError'))
    } finally {
      setBgmUploading(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center mb-6">
          <div
            className="w-6 h-6 mr-2 icon-mask-default"
            style={{
              maskImage: 'url(/images/setting-icons/basic-settings.svg)',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
            }}
          />
          <h2 className="text-2xl font-bold">{t('BasedSettings')}</h2>
        </div>
        <div className="mb-4 text-xl font-bold">{t('Language')}</div>
        <div className="my-2">
          <select
            className="px-4 py-2 bg-white hover:bg-white-hover rounded-lg"
            value={selectLanguage}
            onChange={(e) => {
              const newLanguage = e.target.value as Language
              settingsStore.setState({ selectLanguage: newLanguage })
              i18n.changeLanguage(newLanguage)
            }}
          >
            <option value="ar">Arabic - アラビア語</option>
            <option value="en">English - 英語</option>
            <option value="fr">French - フランス語</option>
            <option value="de">German - ドイツ語</option>
            <option value="hi">Hindi - ヒンディー語</option>
            <option value="it">Italian - イタリア語</option>
            <option value="ja">Japanese - 日本語</option>
            <option value="ko">Korean - 韓語</option>
            <option value="pl">Polish - ポーランド語</option>
            <option value="pt">Portuguese - ポルトガル語</option>
            <option value="ru">Russian - ロシア語</option>
            <option value="es">Spanish - スペイン語</option>
            <option value="th">Thai - タイ語</option>
            <option value="zh-CN">Simplified Chinese - 簡体字中国語</option>
            <option value="zh-TW">Traditional Chinese - 繁体字中国語</option>
            <option value="vi">Vietnamese - ベトナム語</option>
          </select>
        </div>
      </div>
      {selectLanguage === 'ja' && (
        <div className="my-6">
          <div className="my-4 font-bold">{t('EnglishToJapanese')}</div>
          <div className="my-2">
            <ToggleSwitch
              enabled={changeEnglishToJapanese}
              onChange={(v) =>
                settingsStore.setState({ changeEnglishToJapanese: v })
              }
            />
          </div>
        </div>
      )}
      <div className="border-t border-gray-300 pt-6 my-6">
        <div className="my-4 text-xl font-bold">{t('UserDisplayName')}</div>
        <input
          className="text-ellipsis px-4 py-2 w-full sm:w-col-span-2 bg-white hover:bg-white-hover rounded-lg"
          type="text"
          placeholder={t('UserDisplayName')}
          value={settingsStore((s) => s.userDisplayName)}
          onChange={(e) =>
            settingsStore.setState({ userDisplayName: e.target.value })
          }
        />
      </div>
      <div className="border-t border-gray-300 pt-6 my-6">
        <div className="my-4 text-xl font-bold">{t('BackgroundSettings')}</div>
        <div className="my-2 text-sm whitespace-pre-wrap">
          {t('BackgroundSettingsDescription')}
        </div>

        {isLoading && <div className="my-2">{t('Loading')}</div>}
        {error && <div className="my-2 text-red-500">{error}</div>}
        {uploadError && <div className="my-2 text-red-500">{uploadError}</div>}

        <div className="flex flex-col mb-4">
          <select
            className="text-ellipsis px-4 py-2 w-full sm:w-col-span-2 bg-white hover:bg-white-hover rounded-lg"
            value={backgroundImageUrl}
            onChange={(e) => {
              const path = e.target.value
              homeStore.setState({ backgroundImageUrl: path })
            }}
            disabled={isLoading || isUploading || isRestrictedMode}
          >
            <option value="/backgrounds/bg-c.png">
              {t('DefaultBackground')}
            </option>
            <option value="green">{t('GreenBackground')}</option>
            {backgroundFiles.map((file) => (
              <option key={file} value={`/backgrounds/${file}`}>
                {file}
              </option>
            ))}
          </select>
        </div>

        <div className="my-4">
          <TextButton
            onClick={() => {
              const { fileInput } = menuStore.getState()
              if (fileInput) {
                fileInput.accept = 'image/*'
                fileInput.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    handleBackgroundUpload(file)
                  }
                }
                fileInput.click()
              }
            }}
            disabled={isLoading || isUploading || isRestrictedMode}
          >
            {isUploading ? t('Uploading') : t('UploadBackground')}
          </TextButton>
        </div>
      </div>

      <div className="border-t border-gray-300 pt-6 my-6">
        <div className="my-4 text-xl font-bold">{t('BgmSettings')}</div>
        <div className="my-2 text-sm whitespace-pre-wrap">
          {t('BgmSettingsDescription')}
        </div>

        <div className="my-4 font-bold">{t('BgmEnabled')}</div>
        <ToggleSwitch
          enabled={bgmEnabled}
          onChange={(v) => settingsStore.setState({ bgmEnabled: v })}
        />

        {bgmLoading && <div className="my-2">{t('Loading')}</div>}
        {bgmError && <div className="my-2 text-red-500">{bgmError}</div>}
        {bgmUploadError && (
          <div className="my-2 text-red-500">{bgmUploadError}</div>
        )}

        <div className="my-4 font-bold">{t('BgmSelect')}</div>
        <select
          className="text-ellipsis px-4 py-2 w-full bg-white hover:bg-white-hover rounded-lg"
          value={bgmPath}
          onChange={(e) =>
            settingsStore.setState({
              bgmPath: e.target.value,
              bgmEnabled: e.target.value ? true : bgmEnabled,
            })
          }
          disabled={bgmLoading || bgmUploading || isRestrictedMode}
        >
          <option value="">{t('BgmNone')}</option>
          {bgmFiles.map((file) => (
            <option key={file} value={`/bgm/${file}`}>
              {file}
            </option>
          ))}
        </select>

        <div className="my-4">
          <TextButton
            onClick={() => {
              const { fileInput } = menuStore.getState()
              if (fileInput) {
                fileInput.accept = 'audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac'
                fileInput.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    handleBgmUpload(file)
                  }
                }
                fileInput.click()
              }
            }}
            disabled={bgmLoading || bgmUploading || isRestrictedMode}
          >
            {bgmUploading ? t('Uploading') : t('BgmUpload')}
          </TextButton>
        </div>

        <div className="my-4 font-bold">
          {t('BgmVolume')}: {Math.round(bgmVolume * 100)}%
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={bgmVolume}
          className="w-full input-range"
          onChange={(e) =>
            settingsStore.setState({ bgmVolume: Number(e.target.value) })
          }
        />

        <div className="my-4 font-bold">{t('BgmDuckOnSpeech')}</div>
        <ToggleSwitch
          enabled={bgmDuckOnSpeech}
          onChange={(v) => settingsStore.setState({ bgmDuckOnSpeech: v })}
        />

        {bgmDuckOnSpeech && (
          <>
            <div className="my-4 font-bold">
              {t('BgmDuckVolume')}: {Math.round(bgmDuckVolume * 100)}%
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={bgmDuckVolume}
              className="w-full input-range"
              onChange={(e) =>
                settingsStore.setState({
                  bgmDuckVolume: Number(e.target.value),
                })
              }
            />
          </>
        )}
        <p className="mt-2 text-xs text-gray-600">{t('BgmAutoplayHint')}</p>
      </div>

      {/* アシスタントテキスト表示設定 */}
      <div className="border-t border-gray-300 pt-6 my-6">
        <div className="my-4 text-xl font-bold">{t('ShowAssistantText')}</div>
        <div className="my-2">
          <ToggleSwitch
            enabled={showAssistantText}
            onChange={(v) => settingsStore.setState({ showAssistantText: v })}
          />
        </div>
      </div>

      {/* キャラクター名表示設定 */}
      <div className="my-6">
        <div className="my-4 text-xl font-bold">{t('ShowCharacterName')}</div>
        <div className="my-2">
          <ToggleSwitch
            enabled={showCharacterName}
            onChange={(v) => settingsStore.setState({ showCharacterName: v })}
          />
        </div>
      </div>

      {/* コントロールパネル表示設定 */}
      <div className="border-t border-gray-300 pt-6 my-6">
        <div className="my-4 text-xl font-bold">{t('ShowControlPanel')}</div>
        <div className="my-2 text-sm whitespace-pre-wrap">
          {t('ShowControlPanelInfo')}
        </div>

        <div className="my-2">
          <ToggleSwitch
            enabled={showControlPanel}
            onChange={(v) => settingsStore.setState({ showControlPanel: v })}
          />
        </div>
      </div>

      {/* カラーテーマ設定 */}
      <div className="border-t border-gray-300 pt-6 my-6">
        <div className="my-4 text-xl font-bold">{t('ColorTheme')}</div>
        <div className="my-2 text-sm whitespace-pre-wrap">
          {t('ColorThemeInfo')}
        </div>

        <div className="flex flex-col mb-4">
          <select
            className="text-ellipsis px-4 py-2 w-full sm:w-col-span-2 bg-white hover:bg-white-hover rounded-lg"
            value={colorTheme}
            onChange={(e) => {
              const theme = e.target.value as
                | 'default'
                | 'cool'
                | 'mono'
                | 'ocean'
                | 'forest'
                | 'sunset'
              settingsStore.setState({ colorTheme: theme })
              // テーマをhtmlタグに適用
              document.documentElement.setAttribute('data-theme', theme)
            }}
          >
            <option value="default">{t('ThemeDefault')}</option>
            <option value="mono">{t('ThemeMono')}</option>
            <option value="cool">{t('ThemeCool')}</option>
            <option value="ocean">{t('ThemeOcean')}</option>
            <option value="forest">{t('ThemeForest')}</option>
            <option value="sunset">{t('ThemeSunset')}</option>
          </select>
        </div>
      </div>
    </>
  )
}
export default Based
