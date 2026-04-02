/**
 * AudioWorklet processor for Voice Chat.
 * Captures microphone input, converts Float32 to Int16 PCM,
 * and sends buffered chunks to the main thread.
 */
class AudioRecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(2048);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.bufferIndex++] = Math.max(
        -32768,
        Math.min(32767, channel[i] * 32768)
      );
      if (this.bufferIndex >= this.buffer.length) {
        this.port.postMessage(
          { type: "audio", data: this.buffer.slice().buffer },
          [this.buffer.slice().buffer]
        );
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}

registerProcessor("audio-recorder-worklet", AudioRecorderWorklet);
