class DeepgramPcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0]
    if (ch && ch.length > 0) {
      this.port.postMessage(ch)
    }
    return true
  }
}

registerProcessor('deepgram-pcm-processor', DeepgramPcmProcessor)
