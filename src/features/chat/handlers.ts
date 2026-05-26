import { getAIChatResponseStream } from '@/features/chat/aiChatFactory'
import { Message, EmotionType, EMOTIONS } from '@/features/messages/messages'
import { speakCharacter } from '@/features/messages/speakCharacter'
import { judgeSlide } from '@/features/slide/slideAIHelpers'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'
import slideStore from '@/features/stores/slide'
import { goToSlide } from '@/components/slides'
import { messageSelectors } from '../messages/messageSelectors'
import webSocketStore from '@/features/stores/websocketStore'
import i18next from 'i18next'
import toastStore from '@/features/stores/toast'
import { generateMessageId } from '@/utils/messageUtils'
import { isMultiModalAvailable } from '@/features/constants/aiModels'
import {
  saveMessageToMemory,
  searchMemoryContext,
} from '@/features/memory/memoryStoreSync'
import { THINKING_MARKER } from '@/features/chat/vercelAIChat'
import {
  parseLaughTag,
  playLaughSE,
  scheduleL1Reaction,
} from '@/features/conversation/reactionScheduler'
import { fireStunt } from '@/features/staging/stuntScheduler'
import type { StuntId } from '@/features/staging/stuntTypes'
import { recordComment } from '@/features/chat/situationModel'
import { applyEmotionBackground } from '@/features/staging/emotionBg'
import {
  getImageFromMessageContent,
  getTextFromMessageContent,
} from '@/utils/multimodalContent'
import {
  extractSentenceByMode,
  finalizeStyleBertVits2Tail,
  isInvalidStandaloneTtsUnit,
  SBV2_MERGE_MAX_CHARS,
  hasUnclosedJapaneseQuote,
} from '@/utils/ttsSentenceSplit'
import { sbv2SpeakBatcher } from '@/features/messages/sbv2SpeakBatcher'
import { compressImageDataUrl } from '@/utils/compressImageForApi'
import { stripSpeakControlTags } from '@/utils/speakControlTags'
import {
  buildContextBlock,
  setStreamerLastSaid,
} from '@/features/streaming/streamContext'
import { PROJECT_REGISTRY } from '@/features/projects/registry'
import projectStore from '@/features/stores/projectStore'

// セッションIDを生成する関数
const generateSessionId = () => generateMessageId()

// コードブロックのデリミネーター
const CODE_DELIMITER = '```'

/**
 * AI判断機能でマルチモーダルを使用するかどうかを決定する
 * @param userMessage ユーザーメッセージ
 * @param image 画像データ
 * @param decisionPrompt AI判断用プロンプト
 * @returns 画像を使用するかどうか
 */
const askAIForMultiModalDecision = async (
  userMessage: string,
  image: string,
  decisionPrompt: string
): Promise<boolean> => {
  try {
    // 直近の会話履歴を取得（最新3つまで）
    const currentChatLog = homeStore.getState().chatLog
    const recentMessages = currentChatLog.slice(-3)

    // 会話履歴をテキストとして構築
    let conversationHistory = ''
    if (recentMessages.length > 0) {
      conversationHistory = '\n\n直近の会話履歴:\n'
      // cutImageMessage関数を使用して画像メッセージをテキストに変換
      const textOnlyMessages = messageSelectors.cutImageMessage(recentMessages)
      textOnlyMessages.forEach((msg, index) => {
        const content = msg.content || ''
        conversationHistory += `${index + 1}. ${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${content}\n`
      })
    }

    // AI判断用のメッセージを構築
    const decisionMessage: Message = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Conversation History:\n${conversationHistory}\n\nUser Message: "${userMessage}"`,
        },
        { type: 'image', image: image },
      ],
      timestamp: new Date().toISOString(),
    }

    // AI判断用のシステムプロンプト
    const systemMessage: Message = {
      role: 'system',
      content: decisionPrompt,
    }

    // AIに判断を求める
    const response = await getAIChatResponseStream([
      systemMessage,
      decisionMessage,
    ])

    if (!response) {
      return false // エラーの場合は画像を使用しない
    }

    // ReadableStreamからテキストを取得
    const reader = response.getReader()
    let result = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += value
      }
    } finally {
      reader.releaseLock()
    }

    const decision = result.trim().toLowerCase()

    // 各言語の肯定的な回答をチェック
    const affirmativeResponses = [
      'はい',
      'yes',
      'oui',
      'sí',
      'ja',
      '是',
      '예',
      'tak',
      'da',
      'sim',
    ]
    return affirmativeResponses.some((response) => decision.includes(response))
  } catch (error) {
    console.error('AI判断でエラーが発生しました:', error)
    return false // エラーの場合は画像を使用しない
  }
}

const NON_EMOTION_TAG_PREFIX = /^(motion:|stunt:|laugh:|bg:)/i

function escapeForSingleLineLog(text: string): string {
  // JSON.stringify makes newlines and quotes visible in logs (e.g. "\n", "\"")
  return JSON.stringify(text)
}

function logTtsSplitDecision(params: {
  phase: 'stream' | 'finalize' | 'non-stream'
  action: 'emit' | 'buffer'
  text: string
  sentence?: string
  remainingText?: string
  emotionTag?: string
  motionTag?: string
}) {
  const ss = settingsStore.getState()
  const unclosedQuote = hasUnclosedJapaneseQuote(params.text)
  const isSbv2 = ss.selectVoice === 'stylebertvits2'

  const parts = [
    '[TTS-SPLIT]',
    `phase=${params.phase}`,
    `voice=${ss.selectVoice}`,
    `mode=${ss.ttsSplitMode}`,
    `action=${params.action}`,
    `unclosedQuote=${unclosedQuote}`,
    ...(isSbv2 ? [`sbv2MergeMax=${SBV2_MERGE_MAX_CHARS}`] : []),
    `text=${escapeForSingleLineLog(params.text)}`,
  ]
  if (params.sentence !== undefined) {
    parts.push(`sentence=${escapeForSingleLineLog(params.sentence)}`)
  }
  if (params.remainingText !== undefined) {
    parts.push(`remaining=${escapeForSingleLineLog(params.remainingText)}`)
  }
  if (params.emotionTag) parts.push(`emotionTag=${params.emotionTag}`)
  if (params.motionTag) parts.push(`motionTag=${params.motionTag}`)

  console.info(parts.join(' '))
}

/**
 * 文中の laugh / stunt タグで SE・演出を発火してから TTS 用にタグ除去
 */
function prepareSentenceForSpeech(sentence: string): string {
  for (const m of sentence.matchAll(/\[laugh:(short|medium|big)\]/gi)) {
    void playLaughSE(m[1].toLowerCase() as 'short' | 'medium' | 'big')
  }
  for (const m of sentence.matchAll(/\[stunt:([a-z_]+)\]/gi)) {
    void fireStunt(m[1] as StuntId)
  }
  return stripSpeakControlTags(sentence)
}

/**
 * テキストから感情タグ `[...]` を抽出する
 * @param text 入力テキスト
 * @returns 感情タグと残りのテキスト
 */
const extractEmotion = (
  text: string
): { emotionTag: string; remainingText: string } => {
  const emotionMatch = text.match(/^\s*\[(.*?)\]/)
  if (emotionMatch?.[0]) {
    const inner = emotionMatch[1].trim()
    if (NON_EMOTION_TAG_PREFIX.test(inner)) {
      return { emotionTag: '', remainingText: text }
    }
    if (!EMOTIONS.includes(inner.toLowerCase() as EmotionType)) {
      return { emotionTag: '', remainingText: text }
    }
    return {
      emotionTag: emotionMatch[0].trim(),
      remainingText: text
        .slice(text.indexOf(emotionMatch[0]) + emotionMatch[0].length)
        .trimStart(),
    }
  }
  return { emotionTag: '', remainingText: text }
}

/**
 * テキストからモーションタグ `[motion:xxx]` を抽出する
 * @param text 入力テキスト
 * @returns モーションタグと残りのテキスト
 */
const extractMotionTag = (
  text: string
): { motionTag: string; remainingText: string } => {
  const motionMatch = text.match(/^\s*\[motion:([^\]\s]+)\]/i)
  if (motionMatch?.[0]) {
    return {
      motionTag: motionMatch[1],
      remainingText: text
        .slice(text.indexOf(motionMatch[0]) + motionMatch[0].length)
        .trimStart(),
    }
  }
  return { motionTag: '', remainingText: text }
}

/**
 * テキストから [stunt:xxx] タグを抽出する
 */
const extractStuntTag = (
  text: string
): { stuntId: string; remainingText: string } => {
  const match = text.match(/^\s*\[stunt:([a-z_]+)\]/i)
  if (match) {
    return {
      stuntId: match[1],
      remainingText: text
        .slice(text.indexOf(match[0]) + match[0].length)
        .trimStart(),
    }
  }
  return { stuntId: '', remainingText: text }
}

/**
 * 先頭の制御タグ（stunt / laugh / 未知タグ等）を処理してスキップ
 */
function advancePastLeadingControlTags(text: string): string {
  let t = text.trimStart()
  while (t.length > 0) {
    const prev = t
    const { motionTag, remainingText: afterMotion } = extractMotionTag(t)
    if (motionTag) {
      t = afterMotion
      continue
    }
    const { stuntId, remainingText: afterStunt } = extractStuntTag(t)
    if (stuntId) {
      void fireStunt(stuntId as StuntId)
      t = afterStunt
      continue
    }
    const { laughType, remainingText: afterLaugh } = parseLaughTag(t)
    if (laughType) {
      void playLaughSE(laughType)
      t = afterLaugh
      continue
    }
    const unknown = t.match(/^\s*\[[a-zA-Z][a-zA-Z0-9_:]*\]/)
    if (unknown) {
      t = t.slice(unknown[0].length).trimStart()
      continue
    }
    if (t === prev) break
  }
  return t
}

/**
 * テキストから [bg:xxx] タグを抽出して背景を変更する
 * ファイル名 or キーワード: `[bg:bg-c.png]`, `[bg:night]`
 */
const extractAndApplyBgTag = (text: string): string => {
  const match = text.match(/\[bg:([^\]]+)\]/gi)
  if (!match) return text

  let remaining = text
  for (const tag of match) {
    const bgName = tag.match(/\[bg:([^\]]+)\]/i)?.[1] ?? ''
    if (bgName) {
      // backgrounds/ 配下に対応ファイルがあればパスをセット、なければキーワードのまま
      const bgPath = bgName.includes('.') ? `/backgrounds/${bgName}` : bgName
      homeStore.setState({ backgroundImageUrl: bgPath })
    }
    remaining = remaining.replace(tag, '').trimStart()
  }
  return remaining
}

/**
 * テキストから文法的に区切りの良い文を抽出する
 * Style-Bert-VITS2 時は括弧をまたがない・句点単位の切り出し
 */
const extractSentence = (
  text: string
): { sentence: string; remainingText: string } => {
  const ss = settingsStore.getState()
  return extractSentenceByMode(text, ss.ttsSplitMode, ss.selectVoice)
}

/**
 * 発話と関連する状態更新を行う
 * @param sessionId セッションID
 * @param sentence 発話する文
 * @param emotionTag 感情タグ (例: "[neutral]")
 * @param currentAssistantMessageListRef アシスタントメッセージリストの参照
 * @param currentSlideMessagesRef スライドメッセージリストの参照
 * @param motionTag モーションタグ (例: "think")
 */
let _ttfrMeasured = false
let _ttfaMeasured = false

const handleSpeakAndStateUpdate = (
  sessionId: string,
  sentence: string,
  emotionTag: string,
  currentAssistantMessageListRef: { current: string[] },
  currentSlideMessagesRef: { current: string[] },
  motionTag?: string
) => {
  sentence = prepareSentenceForSpeech(sentence)
  if (!sentence) return false

  const hs = homeStore.getState()
  const emotion = emotionTag.includes('[')
    ? (emotionTag.slice(1, -1).toLowerCase() as EmotionType)
    : 'neutral'

  // 感情連動背景変更（backgroundChangeEnabled が ON の時のみ）
  if (emotionTag && EMOTIONS.includes(emotion)) {
    void applyEmotionBackground(emotionTag)
  }

  // 発話不要/不可能な文字列だった場合はスキップ
  if (
    sentence === '' ||
    sentence.replace(
      /^[\s\u3000\t\n\r\[\(\{「［（【『〈《〔｛«‹〘〚〛〙›»〕》〉』】）］」\}\)\]'"''""・、。,.!?！？:：;；\-_=+~～*＊@＠#＃$＄%％^＾&＆|｜\\＼/／`｀]+$/gu,
      ''
    ) === ''
  ) {
    return false
  }

  // TTFR: 最初の TTS キュー投入までの時間
  if (!_ttfrMeasured && typeof performance !== 'undefined') {
    try {
      performance.mark('first-audio-queued')
      const ttfr = performance.measure(
        'TTFR',
        'input-confirmed',
        'first-audio-queued'
      )
      console.info(`[TTFR] ${Math.round(ttfr.duration)} ms`)
    } catch {
      // input-confirmed マークが存在しない場合は無視
    }
    _ttfrMeasured = true
  }

  speakCharacter(
    sessionId,
    { message: sentence, emotion: emotion, motion: motionTag || undefined },
    () => {
      hs.incrementChatProcessingCount()
      currentSlideMessagesRef.current.push(sentence)
      homeStore.setState({
        slideMessages: [...currentSlideMessagesRef.current],
      })
      // TTFA: 最初の発話開始（speakCharacter onStart）までの時間
      if (!_ttfaMeasured && typeof performance !== 'undefined') {
        try {
          performance.mark('first-audio-play')
          const ttfa = performance.measure(
            'TTFA',
            'input-confirmed',
            'first-audio-play'
          )
          console.info(`[TTFA] ${Math.round(ttfa.duration)} ms`)
        } catch {
          // input-confirmed マークが存在しない場合は無視
        }
        _ttfaMeasured = true
      }
    },
    () => {
      hs.decrementChatProcessingCount()
      currentSlideMessagesRef.current.shift()
      homeStore.setState({
        slideMessages: [...currentSlideMessagesRef.current],
      })
    }
  )

  return true
}

/**
 * 受け取ったメッセージを処理し、AIの応答を生成して発話させる (Refactored)
 * @param receivedMessage 処理する文字列
 */
export const speakMessageHandler = async (receivedMessage: string) => {
  const sessionId = generateSessionId()
  const currentSlideMessagesRef = { current: [] as string[] }
  const assistantMessageListRef = { current: [] as string[] }

  let isCodeBlock: boolean = false
  let codeBlockContent: string = ''
  let accumulatedAssistantText: string = ''
  let remainingMessage = receivedMessage
  let currentMessageId: string = generateMessageId()

  while (remainingMessage.length > 0 || isCodeBlock) {
    let processableText = ''
    let currentCodeBlock = ''

    if (isCodeBlock) {
      if (remainingMessage.includes(CODE_DELIMITER)) {
        const [codeEnd, ...rest] = remainingMessage.split(CODE_DELIMITER)
        currentCodeBlock = codeBlockContent + codeEnd
        codeBlockContent = ''
        remainingMessage = rest.join(CODE_DELIMITER).trimStart()
        isCodeBlock = false

        if (accumulatedAssistantText.trim()) {
          homeStore.getState().upsertMessage({
            id: currentMessageId,
            role: 'assistant',
            content: accumulatedAssistantText.trim(),
          })
          accumulatedAssistantText = ''
        }
        const codeBlockId = generateMessageId()
        homeStore.getState().upsertMessage({
          id: codeBlockId,
          role: 'code',
          content: currentCodeBlock,
        })

        currentMessageId = generateMessageId()
        continue
      } else {
        codeBlockContent += remainingMessage
        remainingMessage = ''
        continue
      }
    } else if (remainingMessage.includes(CODE_DELIMITER)) {
      const [beforeCode, ...rest] = remainingMessage.split(CODE_DELIMITER)
      processableText = beforeCode
      codeBlockContent = rest.join(CODE_DELIMITER)
      isCodeBlock = true
      remainingMessage = ''
    } else {
      processableText = remainingMessage
      remainingMessage = ''
    }

    if (processableText.length > 0) {
      let localRemaining = processableText.trimStart()
      while (localRemaining.length > 0) {
        localRemaining = advancePastLeadingControlTags(localRemaining)
        if (!localRemaining) break

        const prevLocalRemaining = localRemaining
        const { emotionTag, remainingText: textAfterEmotion } =
          extractEmotion(localRemaining)
        const { motionTag, remainingText: textAfterMotion } =
          extractMotionTag(textAfterEmotion)
        const { stuntId, remainingText: textAfterStunt } =
          extractStuntTag(textAfterMotion)
        if (stuntId) void fireStunt(stuntId as StuntId)
        const { laughType, remainingText: textAfterLaugh } =
          parseLaughTag(textAfterStunt)
        if (laughType) void playLaughSE(laughType)
        const textAfterBg = extractAndApplyBgTag(textAfterLaugh)
        const { sentence, remainingText: textAfterSentence } =
          extractSentence(textAfterBg)

        if (sentence) {
          logTtsSplitDecision({
            phase: 'non-stream',
            action: 'emit',
            text: textAfterBg,
            sentence,
            remainingText: textAfterSentence,
            emotionTag,
            motionTag,
          })
          const spokenText = prepareSentenceForSpeech(sentence)
          if (spokenText) {
            assistantMessageListRef.current.push(spokenText)
            const aiText = emotionTag
              ? `${emotionTag} ${spokenText}`
              : spokenText
            accumulatedAssistantText += aiText + ' '
            handleSpeakAndStateUpdate(
              sessionId,
              spokenText,
              emotionTag,
              assistantMessageListRef,
              currentSlideMessagesRef,
              motionTag || undefined
            )
          }
          localRemaining = textAfterSentence
        } else {
          if (localRemaining === prevLocalRemaining && localRemaining) {
            logTtsSplitDecision({
              phase: 'non-stream',
              action: 'buffer',
              text: textAfterBg || localRemaining,
              emotionTag,
              motionTag,
            })
            const finalSentence = prepareSentenceForSpeech(
              textAfterBg || localRemaining
            )
            if (finalSentence) {
              assistantMessageListRef.current.push(finalSentence)
              const aiText = emotionTag
                ? `${emotionTag} ${finalSentence}`
                : finalSentence
              accumulatedAssistantText += aiText + ' '
              handleSpeakAndStateUpdate(
                sessionId,
                finalSentence,
                emotionTag,
                assistantMessageListRef,
                currentSlideMessagesRef,
                motionTag || undefined
              )
            }
            localRemaining = ''
          } else {
            localRemaining = textAfterSentence
          }
        }
        if (
          localRemaining.length > 0 &&
          localRemaining === prevLocalRemaining &&
          !sentence
        ) {
          console.warn(
            'Potential infinite loop detected in speakMessageHandler, breaking. Remaining:',
            localRemaining
          )
          const finalSentence = prepareSentenceForSpeech(localRemaining)
          if (finalSentence) {
            assistantMessageListRef.current.push(finalSentence)
            accumulatedAssistantText += finalSentence + ' '
            handleSpeakAndStateUpdate(
              sessionId,
              finalSentence,
              '',
              assistantMessageListRef,
              currentSlideMessagesRef
            )
          }
          break
        }
      }
    }

    if (isCodeBlock && codeBlockContent) {
      if (accumulatedAssistantText.trim()) {
        homeStore.getState().upsertMessage({
          id: currentMessageId,
          role: 'assistant',
          content: accumulatedAssistantText.trim(),
        })
        accumulatedAssistantText = ''
      }
      remainingMessage = codeBlockContent
      codeBlockContent = ''
    }
  }

  if (accumulatedAssistantText.trim()) {
    homeStore.getState().upsertMessage({
      id: currentMessageId,
      role: 'assistant',
      content: accumulatedAssistantText.trim(),
    })
  }
  if (isCodeBlock && codeBlockContent.trim()) {
    console.warn('Loop ended unexpectedly while in code block state.')
    homeStore.getState().upsertMessage({
      role: 'code',
      content: codeBlockContent.trim(),
    })
  }
}

/**
 * AIからの応答を処理する関数 (Refactored for chunk-by-chunk saving)
 * @param messages 解答生成に使用するメッセージの配列
 */
export const processAIResponse = async (messages: Message[]) => {
  const sessionId = generateSessionId()
  if (settingsStore.getState().selectVoice === 'stylebertvits2') {
    sbv2SpeakBatcher.clear()
  }
  homeStore.setState({ chatProcessing: true })

  // 思考中ポーズの適用
  const ss = settingsStore.getState()
  const shouldApplyThinkingPose =
    ss.thinkingPoseEnabled && ss.modelType === 'vrm'
  if (shouldApplyThinkingPose) {
    const poseConfig = ss.poseConfigs.find((p) => p.id === ss.thinkingPoseId)
    if (poseConfig) {
      const model = homeStore.getState().viewer.model
      if (model) {
        void model.poseManager
          .applyPose(model, ss.thinkingPoseId, poseConfig)
          .catch((e: unknown) =>
            console.error('Failed to apply thinking pose:', e)
          )
      }
    }
  }
  const resetThinkingPose = () => {
    if (shouldApplyThinkingPose) {
      const model = homeStore.getState().viewer.model
      if (model?.poseManager.isActive) {
        model.poseManager.resetToIdle(model)
      }
    }
  }

  let stream

  const currentSlideMessagesRef = { current: [] as string[] }
  const assistantMessageListRef = { current: [] as string[] }

  try {
    stream = await getAIChatResponseStream(messages)
  } catch (e) {
    console.error(e)
    resetThinkingPose()
    homeStore.setState({ chatProcessing: false })
    return
  }

  if (stream == null) {
    resetThinkingPose()
    homeStore.setState({ chatProcessing: false })
    return
  }

  const reader = stream.getReader()
  let receivedChunksForSpeech = ''
  let currentMessageId: string | null = null
  let currentMessageContent = ''
  let currentEmotionTag = ''
  let currentMotionTag = ''
  let isCodeBlock = false
  let codeBlockContent = ''
  let currentThinkingContent = ''
  let hasSpeakBeenCalled = false
  let didStreamProcessingFail = false

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (value) {
        // 思考チャンクの検出（THINKING_MARKERプレフィックス）
        if (value.startsWith(THINKING_MARKER)) {
          const thinkingChunk = value.substring(THINKING_MARKER.length)
          currentThinkingContent += thinkingChunk

          if (currentMessageId === null) {
            currentMessageId = generateMessageId()
          }
          homeStore.getState().upsertMessage({
            id: currentMessageId,
            role: 'assistant',
            content: currentMessageContent || '',
            thinking: currentThinkingContent,
          })
          // receivedChunksForSpeechには追加しない（読み上げ対象外）
        } else {
          let textToAdd = value

          if (!isCodeBlock) {
            const delimiterIndexInValue = value.indexOf(CODE_DELIMITER)
            if (delimiterIndexInValue !== -1) {
              textToAdd = value.substring(0, delimiterIndexInValue)
            }
          }

          if (currentMessageId === null) {
            currentMessageId = generateMessageId()
            currentMessageContent = textToAdd
            if (currentMessageContent) {
              homeStore.getState().upsertMessage({
                id: currentMessageId,
                role: 'assistant',
                content: currentMessageContent,
                ...(currentThinkingContent && {
                  thinking: currentThinkingContent,
                }),
              })
            }
          } else if (!isCodeBlock) {
            currentMessageContent += textToAdd

            if (textToAdd) {
              homeStore.getState().upsertMessage({
                id: currentMessageId,
                role: 'assistant',
                content: currentMessageContent,
                ...(currentThinkingContent && {
                  thinking: currentThinkingContent,
                }),
              })
            }
          }

          // assistantMessage is now derived from chatLog, no need to set it separately

          receivedChunksForSpeech += value
        }
      }

      let processableTextForSpeech = receivedChunksForSpeech
      receivedChunksForSpeech = ''

      while (processableTextForSpeech.length > 0) {
        const originalProcessableText = processableTextForSpeech

        if (isCodeBlock) {
          codeBlockContent += processableTextForSpeech
          processableTextForSpeech = ''

          const delimiterIndex = codeBlockContent.lastIndexOf(CODE_DELIMITER)

          if (
            delimiterIndex !== -1 &&
            delimiterIndex >=
              codeBlockContent.length -
                (originalProcessableText.length + CODE_DELIMITER.length - 1)
          ) {
            const actualCode = codeBlockContent.substring(0, delimiterIndex)
            const remainingAfterDelimiter = codeBlockContent.substring(
              delimiterIndex + CODE_DELIMITER.length
            )

            if (actualCode.trim()) {
              homeStore.getState().upsertMessage({
                role: 'code',
                content: actualCode,
              })
            }

            codeBlockContent = ''
            isCodeBlock = false
            currentEmotionTag = ''
            currentMotionTag = ''

            currentMessageId = generateMessageId()
            currentMessageContent = ''

            processableTextForSpeech = remainingAfterDelimiter.trimStart()
            continue
          } else {
            receivedChunksForSpeech = codeBlockContent + receivedChunksForSpeech
            codeBlockContent = ''
            break
          }
        } else {
          const delimiterIndex =
            processableTextForSpeech.indexOf(CODE_DELIMITER)
          if (delimiterIndex !== -1) {
            const beforeCode = processableTextForSpeech.substring(
              0,
              delimiterIndex
            )
            const afterDelimiterRaw = processableTextForSpeech.substring(
              delimiterIndex + CODE_DELIMITER.length
            )

            //
            let textToProcessBeforeCode = beforeCode.trimStart()
            while (textToProcessBeforeCode.length > 0) {
              textToProcessBeforeCode = advancePastLeadingControlTags(
                textToProcessBeforeCode
              )
              if (!textToProcessBeforeCode) break

              const prevText = textToProcessBeforeCode
              const {
                emotionTag: extractedEmotion,
                remainingText: textAfterEmotion,
              } = extractEmotion(textToProcessBeforeCode)
              if (extractedEmotion) currentEmotionTag = extractedEmotion
              const {
                motionTag: extractedMotion,
                remainingText: textAfterMotion,
              } = extractMotionTag(textAfterEmotion)
              if (extractedMotion) currentMotionTag = extractedMotion
              const { stuntId: bsStuntId, remainingText: bsAfterStunt } =
                extractStuntTag(textAfterMotion)
              if (bsStuntId) void fireStunt(bsStuntId as StuntId)
              const { laughType: bsLaughType, remainingText: bsAfterLaugh } =
                parseLaughTag(bsAfterStunt)
              if (bsLaughType) void playLaughSE(bsLaughType)
              const bsAfterBg = extractAndApplyBgTag(bsAfterLaugh)
              const { sentence, remainingText: textAfterSentence } =
                extractSentence(bsAfterBg)

              if (sentence) {
                logTtsSplitDecision({
                  phase: 'stream',
                  action: 'emit',
                  text: bsAfterBg,
                  sentence,
                  remainingText: textAfterSentence,
                  emotionTag: currentEmotionTag,
                  motionTag: currentMotionTag,
                })
                hasSpeakBeenCalled =
                  handleSpeakAndStateUpdate(
                    sessionId,
                    sentence,
                    currentEmotionTag,
                    assistantMessageListRef,
                    currentSlideMessagesRef,
                    currentMotionTag || undefined
                  ) || hasSpeakBeenCalled
                textToProcessBeforeCode = textAfterSentence
                if (!textAfterSentence) {
                  currentEmotionTag = ''
                  currentMotionTag = ''
                }
              } else {
                logTtsSplitDecision({
                  phase: 'stream',
                  action: 'buffer',
                  text: bsAfterBg,
                  emotionTag: currentEmotionTag,
                  motionTag: currentMotionTag,
                })
                receivedChunksForSpeech =
                  textToProcessBeforeCode + receivedChunksForSpeech
                textToProcessBeforeCode = ''
                break
              }

              if (
                textToProcessBeforeCode.length > 0 &&
                textToProcessBeforeCode === prevText
              ) {
                console.warn('Speech processing loop stuck on:', prevText)
                receivedChunksForSpeech =
                  textToProcessBeforeCode + receivedChunksForSpeech
                break
              }
            }

            isCodeBlock = true
            codeBlockContent = ''

            const langMatch = afterDelimiterRaw.match(/^ *(\w+)? *\n/)
            let remainingAfterDelimiter = afterDelimiterRaw
            if (langMatch) {
              remainingAfterDelimiter = afterDelimiterRaw.substring(
                langMatch[0].length
              )
            }
            processableTextForSpeech = remainingAfterDelimiter
            continue
          } else {
            const {
              emotionTag: extractedEmotion,
              remainingText: textAfterEmotion,
            } = extractEmotion(processableTextForSpeech)
            if (extractedEmotion) currentEmotionTag = extractedEmotion
            const {
              motionTag: extractedMotion,
              remainingText: textAfterMotion,
            } = extractMotionTag(textAfterEmotion)
            if (extractedMotion) currentMotionTag = extractedMotion
            const { stuntId: msStuntId, remainingText: msAfterStunt } =
              extractStuntTag(textAfterMotion)
            if (msStuntId) void fireStunt(msStuntId as StuntId)
            const { laughType: msLaughType, remainingText: msAfterLaugh } =
              parseLaughTag(msAfterStunt)
            if (msLaughType) void playLaughSE(msLaughType)
            const msAfterBg = extractAndApplyBgTag(msAfterLaugh)

            const { sentence, remainingText: textAfterSentence } =
              extractSentence(msAfterBg)

            if (sentence) {
              logTtsSplitDecision({
                phase: 'stream',
                action: 'emit',
                text: msAfterBg,
                sentence,
                remainingText: textAfterSentence,
                emotionTag: currentEmotionTag,
                motionTag: currentMotionTag,
              })
              hasSpeakBeenCalled =
                handleSpeakAndStateUpdate(
                  sessionId,
                  sentence,
                  currentEmotionTag,
                  assistantMessageListRef,
                  currentSlideMessagesRef,
                  currentMotionTag || undefined
                ) || hasSpeakBeenCalled
              processableTextForSpeech = textAfterSentence
              if (!textAfterSentence) {
                currentEmotionTag = ''
                currentMotionTag = ''
              }
            } else {
              logTtsSplitDecision({
                phase: 'stream',
                action: 'buffer',
                text: msAfterBg,
                emotionTag: currentEmotionTag,
                motionTag: currentMotionTag,
              })
              receivedChunksForSpeech =
                processableTextForSpeech + receivedChunksForSpeech
              processableTextForSpeech = ''
              break
            }
          }
        }

        if (
          processableTextForSpeech.length > 0 &&
          processableTextForSpeech === originalProcessableText
        ) {
          console.warn(
            'Main speech processing loop stuck on:',
            originalProcessableText
          )
          receivedChunksForSpeech =
            processableTextForSpeech + receivedChunksForSpeech
          processableTextForSpeech = ''
          break
        }
      }

      if (done) {
        console.info(
          '[TTS-SPLIT] stream done  bufferLen=%d  buffer=%s',
          receivedChunksForSpeech.length,
          receivedChunksForSpeech
            ? JSON.stringify(receivedChunksForSpeech.slice(0, 120))
            : '(empty)'
        )
        if (receivedChunksForSpeech.length > 0) {
          if (!isCodeBlock) {
            const finalSentence = receivedChunksForSpeech
            const { emotionTag: extractedEmotion, remainingText: finalText } =
              extractEmotion(finalSentence)
            if (extractedEmotion) currentEmotionTag = extractedEmotion
            const {
              motionTag: extractedMotion,
              remainingText: finalTextAfterMotion,
            } = extractMotionTag(finalText)
            if (extractedMotion) currentMotionTag = extractedMotion
            const { stuntId: doneStuntId, remainingText: doneAfterStunt } =
              extractStuntTag(finalTextAfterMotion)
            if (doneStuntId) void fireStunt(doneStuntId as StuntId)
            const { laughType: doneLaughType, remainingText: doneAfterLaugh } =
              parseLaughTag(doneAfterStunt)
            if (doneLaughType) void playLaughSE(doneLaughType)
            const doneAfterBg = extractAndApplyBgTag(doneAfterLaugh)
            const { selectVoice: doneVoice, ttsSplitMode: doneSplitMode } =
              settingsStore.getState()
            const isAutoSbv2 =
              doneVoice === 'stylebertvits2' && doneSplitMode === 'auto'
            const tailText = isAutoSbv2
              ? finalizeStyleBertVits2Tail(doneAfterBg)
              : doneAfterBg

            if (
              tailText &&
              (!isAutoSbv2 || !isInvalidStandaloneTtsUnit(tailText))
            ) {
              logTtsSplitDecision({
                phase: 'finalize',
                action: 'emit',
                text: tailText,
                sentence: tailText,
                remainingText: '',
                emotionTag: currentEmotionTag,
                motionTag: currentMotionTag,
              })
              hasSpeakBeenCalled =
                handleSpeakAndStateUpdate(
                  sessionId,
                  tailText,
                  currentEmotionTag,
                  assistantMessageListRef,
                  currentSlideMessagesRef,
                  currentMotionTag || undefined
                ) || hasSpeakBeenCalled
            }
          } else {
            console.warn(
              'Stream ended while still in code block state. Saving remaining code.',
              codeBlockContent
            )
            codeBlockContent += receivedChunksForSpeech
            if (codeBlockContent.trim()) {
              homeStore.getState().upsertMessage({
                role: 'code',
                content: codeBlockContent,
              })
            }
            codeBlockContent = ''
            isCodeBlock = false
          }
        }

        if (isCodeBlock && codeBlockContent.trim()) {
          console.warn(
            'Stream ended unexpectedly while in code block state. Saving buffered code.'
          )
          homeStore.getState().upsertMessage({
            role: 'code',
            content: codeBlockContent,
          })
          codeBlockContent = ''
          isCodeBlock = false
        }
        break
      }
    }
  } catch (e) {
    didStreamProcessingFail = true
    console.error('Error processing AI response stream:', e)
  } finally {
    reader.releaseLock()
  }

  if (settingsStore.getState().selectVoice === 'stylebertvits2') {
    sbv2SpeakBatcher.flushNow()
  }

  if (didStreamProcessingFail || !hasSpeakBeenCalled) {
    resetThinkingPose()
  }
  homeStore.setState({
    chatProcessing: false,
  })

  if (currentMessageContent.trim()) {
    homeStore.getState().upsertMessage({
      id: currentMessageId ?? generateMessageId(),
      role: 'assistant',
      content: currentMessageContent.trim(),
      ...(currentThinkingContent && { thinking: currentThinkingContent }),
    })

    // IndexedDBにアシスタントメッセージを保存
    saveMessageToMemory({
      role: 'assistant',
      content: currentMessageContent.trim(),
    }).catch(() => {})

    // アクティブプロジェクトの onAiResponse フックを呼ぶ
    const activeIds2 = projectStore.getState().activeProjectIds
    for (const id of activeIds2) {
      const proj = PROJECT_REGISTRY.find((p) => p.id === id)
      proj?.onAiResponse?.(currentMessageContent.trim())
    }
  }
  if (isCodeBlock && codeBlockContent.trim()) {
    console.warn(
      'Stream ended unexpectedly while in code block state. Saving buffered code.'
    )
    homeStore.getState().upsertMessage({
      role: 'code',
      content: codeBlockContent,
    })
    codeBlockContent = ''
    isCodeBlock = false
  }
}

/**
 * アシスタントとの会話を行う
 * 画面のチャット欄から入力されたときに実行される処理
 * Youtubeでチャット取得した場合もこの関数を使用する
 */
export const handleSendChatFn =
  () => async (text: string, userName?: string) => {
    const sessionId = generateSessionId()
    const newMessage = text
    const timestamp = new Date().toISOString()

    if (newMessage === null) return

    const ss = settingsStore.getState()
    const sls = slideStore.getState()
    const wsManager = webSocketStore.getState().wsManager
    const rawModalImage = homeStore.getState().modalImage
    const modalImage = rawModalImage
      ? await compressImageDataUrl(rawModalImage)
      : ''

    if (ss.externalLinkageMode) {
      homeStore.setState({ chatProcessing: true })

      if (wsManager?.websocket?.readyState === WebSocket.OPEN) {
        const userMessageContent: Message['content'] = modalImage
          ? [
              { type: 'text' as const, text: newMessage },
              { type: 'image' as const, image: modalImage },
            ]
          : newMessage

        homeStore.getState().upsertMessage({
          role: 'user',
          content: userMessageContent,
          timestamp: timestamp,
          userName: userName,
        })

        saveMessageToMemory({
          role: 'user',
          content: newMessage,
          timestamp: timestamp,
        }).catch(() => {})

        const wsPayload: { content: string; type: string; image?: string } = {
          content: newMessage,
          type: 'chat',
        }
        if (modalImage) {
          wsPayload.image = modalImage
        }
        wsManager.websocket.send(JSON.stringify(wsPayload))

        if (modalImage) {
          homeStore.setState({ modalImage: '' })
        }
      } else {
        toastStore.getState().addToast({
          message: i18next.t('NotConnectedToExternalAssistant'),
          type: 'error',
          tag: 'not-connected-to-external-assistant',
        })
        homeStore.setState({
          chatProcessing: false,
        })
      }
    } else if (ss.realtimeAPIMode) {
      if (wsManager?.websocket?.readyState === WebSocket.OPEN) {
        homeStore.getState().upsertMessage({
          role: 'user',
          content: newMessage,
          timestamp: timestamp,
          userName: userName,
        })

        saveMessageToMemory({
          role: 'user',
          content: newMessage,
          timestamp: timestamp,
        }).catch(() => {})
      }
    } else {
      let systemPrompt = ss.systemPrompt

      // 共演配信モード: 共演者名をシステムプロンプトに注入
      if (ss.coStreamingMode && ss.coStreamerName) {
        systemPrompt += `\n\n共演配信中。人間の配信者（共演者）の名前は「${ss.coStreamerName}」です。`
      }

      // 配信状況コンテキスト注入（画面・視聴者・配信者を一括で）
      if (!userName) {
        // userName なし = 配信者本人の発言
        setStreamerLastSaid(newMessage)
      }
      const ctxBlock = buildContextBlock(ss.coStreamerName || undefined)
      if (ctxBlock) {
        systemPrompt += ctxBlock
      }

      // アクティブなプロジェクトのシステムプロンプト追記
      const activeIds = projectStore.getState().activeProjectIds
      for (const id of activeIds) {
        const proj = PROJECT_REGISTRY.find((p) => p.id === id)
        if (proj?.systemPromptAppend) {
          systemPrompt += proj.systemPromptAppend()
        }
      }

      if (ss.slideMode) {
        if (sls.isPlaying) {
          return
        }

        try {
          let scripts = JSON.stringify(
            require(
              `../../../public/slides/${sls.selectedSlideDocs}/scripts.json`
            )
          )
          systemPrompt = systemPrompt.replace('{{SCRIPTS}}', scripts)

          let supplement = ''
          try {
            const response = await fetch(
              `/api/getSupplement?slideName=${sls.selectedSlideDocs}`
            )
            if (!response.ok) {
              throw new Error('Failed to fetch supplement')
            }
            const data = await response.json()
            supplement = data.supplement
            systemPrompt = systemPrompt.replace('{{SUPPLEMENT}}', supplement)
          } catch (e) {
            console.error('supplement.txtの読み込みに失敗しました:', e)
          }

          const answerString = await judgeSlide(newMessage, scripts, supplement)
          const answer = JSON.parse(answerString)
          if (answer.judge === 'true' && answer.page !== '') {
            goToSlide(Number(answer.page))
            systemPrompt += `\n\nEspecial Page Number is ${answer.page}.`
          }
        } catch (e) {
          console.error(e)
        }
      }

      homeStore.setState({ chatProcessing: true })

      // マルチモーダル対応チェック
      if (
        modalImage &&
        !isMultiModalAvailable(
          ss.selectAIService,
          ss.selectAIModel,
          ss.enableMultiModal,
          ss.multiModalMode,
          ss.customModel
        )
      ) {
        toastStore.getState().addToast({
          message: i18next.t('MultiModalNotSupported'),
          type: 'error',
          tag: 'multimodal-not-supported',
        })
        homeStore.setState({
          chatProcessing: false,
          modalImage: '',
        })
        return
      }

      // マルチモーダルモードに基づいてメッセージコンテンツを構築
      let userMessageContent: Message['content'] = newMessage
      let shouldUseImage = false

      if (modalImage) {
        switch (ss.multiModalMode) {
          case 'always':
            shouldUseImage = true
            break
          case 'never':
            shouldUseImage = false
            break
          case 'ai-decide':
            // AI判断モードの場合は、AIに判断を求める
            shouldUseImage = await askAIForMultiModalDecision(
              newMessage,
              modalImage,
              ss.multiModalAiDecisionPrompt
            )
            break
        }

        if (shouldUseImage) {
          userMessageContent = [
            { type: 'text' as const, text: newMessage },
            { type: 'image' as const, image: modalImage },
          ]
        }
      }

      homeStore.getState().upsertMessage({
        role: 'user',
        content: userMessageContent,
        timestamp: timestamp,
        userName: userName,
      })

      // IndexedDBにユーザーメッセージを保存
      saveMessageToMemory({
        role: 'user',
        content:
          typeof userMessageContent === 'string'
            ? userMessageContent
            : newMessage,
        timestamp: timestamp,
      }).catch(() => {})

      if (modalImage) {
        homeStore.setState({ modalImage: '' })
      }

      // ポーズ設定からモーションタグ情報をシステムプロンプトに追加
      const poseConfigs = ss.poseConfigs
      if (poseConfigs.length > 0) {
        const motionIds = poseConfigs.map((p) => p.id).join(', ')
        systemPrompt +=
          '\n\nモーションタグを使うことで、キャラクターのポーズを制御できます。' +
          `利用可能なモーション: ${motionIds}\n` +
          '書式: [motion:モーション名]  例: [motion:think]\n' +
          '感情タグと併用可能です。例: [happy][motion:cheer]やったー！'
      }

      // IndexedDBから関連する過去の記憶を検索してsystemPromptに追加
      const memoryContext = await searchMemoryContext(newMessage)
      if (memoryContext) {
        systemPrompt = systemPrompt + '\n\n' + memoryContext
      }

      const currentChatLog = homeStore.getState().chatLog

      const messages: Message[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messageSelectors.getProcessedMessages(
          currentChatLog,
          ss.includeTimestampInUserMessage
        ),
      ]

      // TTFR/TTFA 計測: 入力確定点
      _ttfrMeasured = false
      _ttfaMeasured = false
      if (typeof performance !== 'undefined') {
        try {
          performance.mark('input-confirmed')
        } catch {
          // 無視
        }
      }

      // L1 先出し反応（コメント受信時）& 状況モデル更新
      scheduleL1Reaction(newMessage)
      recordComment()

      try {
        await processAIResponse(messages)
      } catch (e) {
        console.error(e)
        // 思考中ポーズのリセット
        if (ss.thinkingPoseEnabled && ss.modelType === 'vrm') {
          const model = homeStore.getState().viewer.model
          if (model?.poseManager.isActive) {
            model.poseManager.resetToIdle(model)
          }
        }
        homeStore.setState({ chatProcessing: false })
      }
    }
  }

/**
 * WebSocketからのテキストを受信したときの処理
 */
export const handleReceiveTextFromWsFn =
  () =>
  async (
    text: string,
    role?: string,
    emotion: EmotionType = 'neutral',
    type?: string,
    image?: string
  ) => {
    const sessionId = generateSessionId()
    if (text === null || role === undefined) return

    const ss = settingsStore.getState()
    const hs = homeStore.getState()
    const wsManager = webSocketStore.getState().wsManager

    if (ss.externalLinkageMode) {
      console.log('ExternalLinkage Mode: true')
    } else {
      console.log('ExternalLinkage Mode: false')
      return
    }

    homeStore.setState({ chatProcessing: true })

    if (role !== 'user') {
      if (type === 'start') {
        // startの場合は何もしない（textは空文字のため）
        console.log('Starting new response')
        wsManager?.setTextBlockStarted(false)
      } else if (
        hs.chatLog.length > 0 &&
        hs.chatLog[hs.chatLog.length - 1].role === role &&
        wsManager?.textBlockStarted
      ) {
        // 既存のメッセージに追加（IDを維持）
        const lastMessage = hs.chatLog[hs.chatLog.length - 1]
        const lastContent =
          typeof lastMessage.content === 'string'
            ? lastMessage.content
            : getTextFromMessageContent(lastMessage.content)

        const appendedText = lastContent + text
        const imageUrl = getImageFromMessageContent(lastMessage.content)
        const appendedContent: Message['content'] = Array.isArray(
          lastMessage.content
        )
          ? imageUrl
            ? [
                { type: 'text' as const, text: appendedText },
                { type: 'image' as const, image: imageUrl },
              ]
            : appendedText
          : appendedText

        homeStore.getState().upsertMessage({
          id: lastMessage.id,
          role: role,
          content: appendedContent,
        })
      } else {
        // 新しいメッセージを追加（新規IDを生成）
        const messageContent: Message['content'] = image
          ? [
              { type: 'text' as const, text: text },
              { type: 'image' as const, image: image },
            ]
          : text

        homeStore.getState().upsertMessage({
          role: role,
          content: messageContent,
        })
        wsManager?.setTextBlockStarted(true)
      }

      if (role === 'assistant' && text !== '') {
        try {
          // 文ごとに音声を生成 & 再生、返答を表示
          speakCharacter(
            sessionId,
            {
              message: text,
              emotion: emotion,
            },
            () => {
              // assistantMessage is now derived from chatLog, no need to set it separately
            },
            () => {
              // hs.decrementChatProcessingCount()
            }
          )
        } catch (e) {
          console.error('Error in speakCharacter:', e)
        }
      }

      if (type === 'end') {
        // レスポンスの終了処理
        console.log('Response ended')
        wsManager?.setTextBlockStarted(false)
        homeStore.setState({ chatProcessing: false })
      }
    }

    homeStore.setState({ chatProcessing: type !== 'end' })
  }

/**
 * RealtimeAPIからのテキストまたは音声データを受信したときの処理
 */
export const handleReceiveTextFromRtFn = () => {
  // 連続する response.audio イベントで共通の sessionId を使用するための変数
  let currentSessionId: string | null = null

  return async (
    text?: string,
    role?: string,
    type?: string,
    buffer?: ArrayBuffer
  ) => {
    // type が `response.audio` かつ currentSessionId が未設定の場合に新しいセッションIDを発番
    // それ以外の場合は既存の sessionId を使い続ける。
    // レスポンス終了（content_part.done 等）時にリセットする。

    if (currentSessionId === null) {
      currentSessionId = generateSessionId()
    }

    const sessionId = currentSessionId

    const ss = settingsStore.getState()
    const hs = homeStore.getState()

    if (ss.realtimeAPIMode) {
      console.log('realtime api mode: true')
    } else if (ss.audioMode) {
      console.log('audio mode: true')
    } else {
      console.log('realtime api mode: false')
      return
    }

    homeStore.setState({ chatProcessing: true })

    if (role == 'assistant') {
      if (type?.includes('response.audio') && buffer !== undefined) {
        console.log('response.audio:')
        try {
          speakCharacter(
            sessionId,
            {
              emotion: 'neutral',
              message: '',
              buffer: buffer,
            },
            () => {},
            () => {}
          )
        } catch (e) {
          console.error('Error in speakCharacter:', e)
        }
      } else if (type === 'response.content_part.done' && text !== undefined) {
        homeStore.getState().upsertMessage({
          role: role,
          content: text,
        })
      }
    }
    homeStore.setState({ chatProcessing: false })

    // レスポンスが完了したらセッションIDをリセット
    if (type === 'response.content_part.done') {
      currentSessionId = null
    }
  }
}
