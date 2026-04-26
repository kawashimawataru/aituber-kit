import { expect, Page } from '@playwright/test'

type PersistedValue = string | number | boolean | null

const settingsStorageKey = 'aitube-kit-settings'
const homeStorageKey = 'aitube-kit-home'

export async function prepareApp(page: Page) {
  await page.addInitScript(
    ({ settingsStorageKey, homeStorageKey }) => {
      localStorage.setItem(
        homeStorageKey,
        JSON.stringify({
          state: {
            chatLog: [],
            showIntroduction: false,
          },
          version: 0,
        })
      )

      localStorage.setItem(
        settingsStorageKey,
        JSON.stringify({
          state: {
            selectLanguage: 'en',
            showControlPanel: true,
            modelType: 'pngtuber',
            selectAIService: 'openai',
            selectAIModel: 'gpt-4o',
            enableMultiModal: true,
            youtubeMode: false,
            youtubePlaying: false,
            youtubeCommentSource: 'youtube-api',
            youtubeApiKey: '',
            youtubeLiveId: '',
            onecommePort: 11180,
            gameCommentaryEnabled: false,
            gameCommentaryPlaying: false,
            gameCommentaryCaptureInterval: 5,
            gameCommentaryContextCount: 5,
            gameCommentaryPromptTemplate: '',
            gameCommentaryBackgroundAnalysisPromptTemplate: '',
            gameCommentaryImageQuality: 0.7,
            gameCommentaryResizeWidth: 1024,
            gameCommentarySaveToChat: true,
            gameCommentaryVideoDelay: 0,
            gameCommentaryBackgroundAnalysisEnabled: false,
            gameCommentaryBackgroundAnalysisInterval: 2,
          },
          version: 0,
        })
      )

      const createDisplayStream = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = 360
        const context = canvas.getContext('2d')
        if (context) {
          context.fillStyle = '#1f2937'
          context.fillRect(0, 0, canvas.width, canvas.height)
          context.fillStyle = '#f9fafb'
          context.font = '24px sans-serif'
          context.fillText('AITuberKit E2E capture', 40, 80)
        }

        if ('captureStream' in canvas) {
          return canvas.captureStream(5)
        }

        return new MediaStream()
      }

      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getDisplayMedia: async () => createDisplayStream(),
          getUserMedia: async () => createDisplayStream(),
        },
      })

      HTMLMediaElement.prototype.play = async () => {}
    },
    { settingsStorageKey, homeStorageKey }
  )
}

export async function gotoHome(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('open-settings-button')).toBeVisible()
}

export async function openSettings(page: Page) {
  await page.getByTestId('open-settings-button').click()
  await expect(page.getByTestId('settings-panel')).toBeVisible()
}

export async function closeSettings(page: Page) {
  await page.getByTestId('close-settings-button').click()
  await expect(page.getByTestId('settings-panel')).toBeHidden()
}

export async function readPersistedSetting<T = PersistedValue>(
  page: Page,
  key: string
): Promise<T> {
  return page.evaluate(
    ({ settingsStorageKey, key }) => {
      const raw = localStorage.getItem(settingsStorageKey)
      return raw ? JSON.parse(raw).state[key] : undefined
    },
    { settingsStorageKey, key }
  )
}

export async function expectPersistedSetting(
  page: Page,
  key: string,
  value: PersistedValue
) {
  await expect.poll(() => readPersistedSetting(page, key)).toBe(value)
}

export async function setControlValue(
  page: Page,
  testId: string,
  value: string
) {
  await page.getByTestId(testId).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement | HTMLSelectElement
    const prototype =
      input instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

    valueSetter?.call(input, nextValue)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    input.dispatchEvent(new Event('blur', { bubbles: true }))
  }, value)
}
