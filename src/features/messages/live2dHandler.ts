import { Ticker, UPDATE_PRIORITY } from 'pixi.js'
import { Talk } from './messages'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'

const LIP_SYNC_PARAM = 'ParamMouthOpenY'
const LIP_SYNC_SAMPLE_RATE = 24000 // IrodoriTTS PCM output rate

function pickRandomEmotion(list: string[] | undefined): string | undefined {
  if (!list?.length) return undefined
  return list[Math.floor(Math.random() * list.length)]
}

export class Live2DHandler {
  private static idleMotionInterval: NodeJS.Timeout | null = null
  private static lipSyncTicker: (() => void) | null = null

  static async speak(
    audioBuffer: ArrayBuffer,
    talk: Talk,
    isNeedDecode: boolean = true
  ) {
    const hs = homeStore.getState()
    const ss = settingsStore.getState()
    const live2dViewer = hs.live2dViewer
    if (!live2dViewer) {
      console.warn(
        '[Live2D] live2dViewer が未ロードのためリップシンクなしで音声のみ再生します。Cubism Core とモデル表示を確認してください。'
      )
      await Live2DHandler.playAudioOnly(audioBuffer, isNeedDecode)
      return
    }

    let expression: string | undefined
    let motion: string | undefined
    switch (talk.emotion) {
      case 'neutral':
        expression = pickRandomEmotion(ss.neutralEmotions)
        motion = ss.neutralMotionGroup
        break
      case 'happy':
        expression = pickRandomEmotion(ss.happyEmotions)
        motion = ss.happyMotionGroup
        break
      case 'sad':
        expression = pickRandomEmotion(ss.sadEmotions)
        motion = ss.sadMotionGroup
        break
      case 'angry':
        expression = pickRandomEmotion(ss.angryEmotions)
        motion = ss.angryMotionGroup
        break
      case 'relaxed':
        expression = pickRandomEmotion(ss.relaxedEmotions)
        motion = ss.relaxedMotionGroup
        break
      case 'surprised':
        expression = pickRandomEmotion(ss.surprisedEmotions)
        motion = ss.surprisedMotionGroup
    }

    let durationSec = 10
    let audioUrl: string
    let lipSyncPcm: Int16Array | null = null

    if (isNeedDecode) {
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })
      audioUrl = URL.createObjectURL(audioBlob)
      try {
        const audioContext = new AudioContext()
        const decoded = await audioContext.decodeAudioData(audioBuffer.slice(0))
        durationSec = decoded.duration || 10
        // WAV → Float32 → Int16 for lip sync amplitude analysis
        const ch = decoded.getChannelData(0)
        lipSyncPcm = new Int16Array(ch.length)
        for (let i = 0; i < ch.length; i++) {
          lipSyncPcm[i] = Math.max(-32768, Math.min(32767, ch[i] * 32767))
        }
        await audioContext.close().catch(() => undefined)
      } catch {
        durationSec = 10
      }
    } else {
      const audioContext = new AudioContext()
      const pcmData = new Int16Array(audioBuffer)
      lipSyncPcm = pcmData
      const floatData = new Float32Array(pcmData.length)
      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] =
          pcmData[i] < 0 ? pcmData[i] / 32768.0 : pcmData[i] / 32767.0
      }
      const decodedAudio = audioContext.createBuffer(1, floatData.length, 24000)
      decodedAudio.getChannelData(0).set(floatData)
      durationSec = decodedAudio.duration || 10
      const audioBlob = new Blob([this.audioBufferToWav(decodedAudio)], {
        type: 'audio/wav',
      })
      audioUrl = URL.createObjectURL(audioBlob)
      await audioContext.close().catch(() => undefined)
    }

    // Live2Dモデルの表情を設定
    if (expression) {
      live2dViewer.expression(expression)
    }
    if (motion) {
      Live2DHandler.stopIdleMotion()
      live2dViewer.motion(motion, undefined, 3)
    }
    // 発話中もアイドルと同じ揺れを低優先度で継続（優先度1=他のモーション中は割り込まない）
    const speakIdleMotion = ss.idleMotionGroup || 'Idle'
    Live2DHandler.startSpeakingIdleMotion(live2dViewer, speakIdleMotion)

    // PCM振幅からリップシンク駆動
    if (lipSyncPcm) {
      Live2DHandler.startManualLipSync(lipSyncPcm, LIP_SYNC_SAMPLE_RATE, live2dViewer)
    }

    // live2dViewer.speak の onFinish コールバックを利用して音声再生完了を検知
    // StopSpeaking で強制停止された場合 onFinish が呼び出されず Promise が未解決のまま
    // 次の再生がブロックされる問題を回避するため、タイムアウトでフォールバック解決を追加
    await new Promise<void>((resolve) => {
      let resolved = false

      const finish = () => {
        if (resolved) return
        resolved = true
        Live2DHandler.stopManualLipSync(live2dViewer)
        resolve()
        URL.revokeObjectURL(audioUrl)
      }

      // ライブラリ経由の終了通知
      live2dViewer.speak(audioUrl, {
        volume: 1.0,
        expression,
        resetExpression: true,
        onFinish: finish,
        onError: (e: any) => {
          console.error('speak error:', e)
          finish()
        },
      })

      // フォールバック: 音声の理論上の再生時間 + 余裕で強制解決
      const fallbackTimeout = durationSec * 1000 + 200
      setTimeout(finish, fallbackTimeout)
    })
  }

  /** Live2D 未表示時でも TTS を聞けるフォールバック */
  private static async playAudioOnly(
    audioBuffer: ArrayBuffer,
    isNeedDecode: boolean
  ): Promise<void> {
    const audioContext = new AudioContext()
    try {
      const decoded = isNeedDecode
        ? await audioContext.decodeAudioData(audioBuffer.slice(0))
        : audioBuffer

      if (!isNeedDecode) {
        const pcmData = new Int16Array(decoded as ArrayBuffer)
        const floatData = new Float32Array(pcmData.length)
        for (let i = 0; i < pcmData.length; i++) {
          floatData[i] =
            pcmData[i] < 0 ? pcmData[i] / 32768.0 : pcmData[i] / 32767.0
        }
        const buf = audioContext.createBuffer(1, floatData.length, 24000)
        buf.getChannelData(0).set(floatData)
        await Live2DHandler.playDecodedBuffer(audioContext, buf)
        return
      }

      await Live2DHandler.playDecodedBuffer(
        audioContext,
        decoded as AudioBuffer
      )
    } finally {
      await audioContext.close().catch(() => undefined)
    }
  }

  private static playDecodedBuffer(
    audioContext: AudioContext,
    buffer: AudioBuffer
  ): Promise<void> {
    return new Promise((resolve) => {
      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(audioContext.destination)
      source.onended = () => resolve()
      source.start(0)
    })
  }

  static async stopSpeaking() {
    const hs = homeStore.getState()
    const live2dViewer = hs.live2dViewer
    if (!live2dViewer) return
    live2dViewer.stopSpeaking()
  }

  /** Live2D ビューア破棄時のクリーンアップ */
  static dispose() {
    Live2DHandler.stopIdleMotion()
  }

  static async resetToIdle() {
    // インターバルを停止
    Live2DHandler.stopIdleMotion()

    const hs = homeStore.getState()
    const ss = settingsStore.getState()
    const live2dViewer = hs.live2dViewer
    if (!live2dViewer) return

    // Live2Dモデル以外の場合は早期リターン
    if (ss.modelType !== 'live2d') return

    const idleMotion = ss.idleMotionGroup || 'Idle'
    live2dViewer.motion(idleMotion)
    const expression = pickRandomEmotion(ss.neutralEmotions)
    if (expression) {
      live2dViewer.expression(expression)
    }

    // 5秒ごとのアイドルモーション再生を開始
    Live2DHandler.startIdleMotion(idleMotion)
  }

  // PCM振幅からリップシンクを駆動（PixiJS Ticker の LOW 優先度でモーション更新後に上書き）
  private static startManualLipSync(
    pcm: Int16Array,
    sampleRate: number,
    viewer: NonNullable<ReturnType<typeof homeStore.getState>['live2dViewer']>
  ) {
    Live2DHandler.stopManualLipSync(viewer)

    const frameMs = 33 // ~30fps
    const samplesPerFrame = Math.floor((sampleRate * frameMs) / 1000)

    // RMS 振幅フレームを計算
    const frames: number[] = []
    for (let i = 0; i < pcm.length; i += samplesPerFrame) {
      let sum = 0
      const end = Math.min(i + samplesPerFrame, pcm.length)
      for (let j = i; j < end; j++) {
        const s = pcm[j] / 32768
        sum += s * s
      }
      frames.push(Math.sqrt(sum / (end - i)))
    }

    // 正規化 + 平滑化
    const maxAmp = Math.max(...frames, 0.001)
    const smoothed = frames.map((v, i) => {
      const prev = frames[i - 1] ?? v
      const next = frames[i + 1] ?? v
      return ((prev + v * 2 + next) / 4) / maxAmp
    })

    const startTime = performance.now()

    const tick = () => {
      const elapsed = performance.now() - startTime
      const idx = Math.floor(elapsed / frameMs)
      const amp = idx < smoothed.length ? smoothed[idx] : 0
      const mouthValue = Math.min(amp * 1.4, 1.0)
      try {
        const coreModel = (viewer as any).internalModel?.coreModel
        if (coreModel) {
          coreModel.setParameterValueById(LIP_SYNC_PARAM, mouthValue)
        }
      } catch {
        Ticker.shared.remove(tick)
        Live2DHandler.lipSyncTicker = null
      }
    }

    Ticker.shared.add(tick, undefined, UPDATE_PRIORITY.LOW)
    Live2DHandler.lipSyncTicker = tick
  }

  private static stopManualLipSync(
    viewer?: NonNullable<ReturnType<typeof homeStore.getState>['live2dViewer']>
  ) {
    if (Live2DHandler.lipSyncTicker) {
      Ticker.shared.remove(Live2DHandler.lipSyncTicker)
      Live2DHandler.lipSyncTicker = null
    }
    // 口を閉じる
    if (viewer) {
      try {
        const coreModel = (viewer as any).internalModel?.coreModel
        if (coreModel) coreModel.setParameterValueById(LIP_SYNC_PARAM, 0)
      } catch {}
    }
  }

  // 発話中アイドルモーション（優先度1：感情モーションを邪魔しない）
  private static startSpeakingIdleMotion(
    viewer: NonNullable<ReturnType<typeof homeStore.getState>['live2dViewer']>,
    idleMotion: string
  ) {
    this.idleMotionInterval = setInterval(() => {
      const ss = settingsStore.getState()
      if (ss.modelType !== 'live2d') {
        this.stopIdleMotion()
        return
      }
      const currentViewer = homeStore.getState().live2dViewer
      if (!currentViewer || (currentViewer as any).destroyed) {
        this.stopIdleMotion()
        return
      }
      try {
        // 優先度1(IDLE)：感情モーション(優先度3)の再生中は割り込まず、終了後に自然に埋める
        currentViewer.motion(idleMotion, undefined, 1)
      } catch {
        this.stopIdleMotion()
      }
    }, 3500)
  }

  // アイドルモーションのインターバル開始
  private static startIdleMotion(idleMotion: string) {
    const ss = settingsStore.getState()
    if (ss.modelType !== 'live2d') return

    this.idleMotionInterval = setInterval(() => {
      const currentSs = settingsStore.getState()
      if (currentSs.modelType !== 'live2d') {
        this.stopIdleMotion()
        return
      }

      const hs = homeStore.getState()
      const viewer = hs.live2dViewer

      // Viewerが存在しない、または破棄済みの場合はインターバルを停止
      if (!viewer || (viewer as any).destroyed) {
        this.stopIdleMotion()
        return
      }

      try {
        viewer.motion(idleMotion)
      } catch (error) {
        console.error('Idle motion failed:', error)
        this.stopIdleMotion()
      }
    }, 5000)
  }

  // アイドルモーションのインターバル停止
  private static stopIdleMotion() {
    if (this.idleMotionInterval) {
      clearInterval(this.idleMotionInterval)
      this.idleMotionInterval = null
    }
  }

  // WAVファイルフォーマットに変換するヘルパー関数
  private static audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numOfChan = buffer.numberOfChannels
    const length = buffer.length * numOfChan * 2
    const buffer2 = new ArrayBuffer(44 + length)
    const view = new DataView(buffer2)
    const channels = []
    let sample
    let offset = 0
    let pos = 0

    // WAVヘッダーの作成
    setUint32(0x46464952) // "RIFF"
    setUint32(36 + length) // file length
    setUint32(0x45564157) // "WAVE"
    setUint32(0x20746d66) // "fmt "
    setUint32(16) // section length
    setUint16(1) // PCM
    setUint16(numOfChan)
    setUint32(buffer.sampleRate)
    setUint32(buffer.sampleRate * 2 * numOfChan) // byte rate
    setUint16(numOfChan * 2) // block align
    setUint16(16) // bits per sample
    setUint32(0x61746164) // "data"
    setUint32(length)

    // チャンネルデータの取得
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }

    // インターリーブ
    while (pos < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][pos]))
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
        view.setInt16(44 + offset, sample, true)
        offset += 2
      }
      pos++
    }

    function setUint16(data: number) {
      view.setUint16(pos, data, true)
      pos += 2
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true)
      pos += 4
    }

    return buffer2
  }
}
