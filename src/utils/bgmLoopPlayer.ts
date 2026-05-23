/** ループ接続時のフェード時間（秒） */
const DEFAULT_LOOP_FADE_SEC = 2.5
const MIN_LOOP_FADE_SEC = 0.4
const VOLUME_RAMP_SEC = 0.2

function getLoopFadeSec(duration: number): number {
  const maxFade = duration / 3
  return Math.max(MIN_LOOP_FADE_SEC, Math.min(DEFAULT_LOOP_FADE_SEC, maxFade))
}

export class BgmLoopPlayer {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private buffer: AudioBuffer | null = null
  private nextStartTime = 0
  private loopTimer: ReturnType<typeof setTimeout> | null = null
  private activeSources = new Set<AudioBufferSourceNode>()
  private playing = false
  private currentUrl = ''
  private masterVolume = 0.35

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this.masterVolume
      this.masterGain.connect(this.ctx.destination)
    }
    return this.ctx
  }

  private clearLoopTimer() {
    if (this.loopTimer !== null) {
      clearTimeout(this.loopTimer)
      this.loopTimer = null
    }
  }

  private stopSources() {
    for (const source of this.activeSources) {
      try {
        source.stop()
        source.disconnect()
      } catch {
        // already stopped
      }
    }
    this.activeSources.clear()
  }

  private scheduleSegment() {
    const ctx = this.ctx
    const buffer = this.buffer
    const masterGain = this.masterGain
    if (!ctx || !buffer || !masterGain || !this.playing) return

    const fade = getLoopFadeSec(buffer.duration)
    const duration = buffer.duration
    const startTime = Math.max(ctx.currentTime + 0.02, this.nextStartTime)

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const segmentGain = ctx.createGain()
    source.connect(segmentGain)
    segmentGain.connect(masterGain)

    segmentGain.gain.setValueAtTime(0, startTime)
    segmentGain.gain.linearRampToValueAtTime(1, startTime + fade)
    segmentGain.gain.setValueAtTime(1, startTime + duration - fade)
    segmentGain.gain.linearRampToValueAtTime(0, startTime + duration)

    source.start(startTime, 0)
    source.stop(startTime + duration)

    this.activeSources.add(source)
    source.onended = () => {
      this.activeSources.delete(source)
      source.disconnect()
      segmentGain.disconnect()
    }

    this.nextStartTime = startTime + (duration - fade)

    const msUntilNext = (this.nextStartTime - ctx.currentTime - 0.05) * 1000
    this.loopTimer = setTimeout(
      () => this.scheduleSegment(),
      Math.max(0, msUntilNext)
    )
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.min(1, Math.max(0, volume))
    const ctx = this.ctx
    const masterGain = this.masterGain
    if (!ctx || !masterGain) return

    const now = ctx.currentTime
    masterGain.gain.cancelScheduledValues(now)
    masterGain.gain.setValueAtTime(masterGain.gain.value, now)
    masterGain.gain.linearRampToValueAtTime(
      this.masterVolume,
      now + VOLUME_RAMP_SEC
    )
  }

  async load(url: string): Promise<void> {
    if (this.currentUrl === url && this.buffer) return

    this.stop()
    const ctx = this.ensureContext()
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load BGM: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    this.buffer = await ctx.decodeAudioData(arrayBuffer)
    this.currentUrl = url
  }

  async play(): Promise<boolean> {
    if (!this.buffer) return false

    const ctx = this.ensureContext()
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        return false
      }
    }

    if (this.playing) return true

    this.playing = true
    this.nextStartTime = ctx.currentTime
    this.clearLoopTimer()
    this.scheduleSegment()
    return true
  }

  stop() {
    this.playing = false
    this.clearLoopTimer()
    this.stopSources()
    this.nextStartTime = 0
  }

  dispose() {
    this.stop()
    if (this.masterGain) {
      this.masterGain.disconnect()
      this.masterGain = null
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close()
    }
    this.ctx = null
    this.buffer = null
    this.currentUrl = ''
  }
}
