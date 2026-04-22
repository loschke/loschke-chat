/**
 * Gemini Text-to-Speech wrapper.
 * Uses @google/genai SDK directly (AI SDK has no TTS provider).
 *
 * Model: aus ENV TTS_MODEL — Alias "flash25" (Default), "flash3", "pro25" oder voller Model-String.
 * Output: PCM raw audio → WAV (24kHz, 16-bit, mono)
 */

import { GoogleGenAI } from "@google/genai"

const TTS_MODEL_ALIASES: Record<string, string> = {
  flash25: "gemini-2.5-flash-preview-tts",
  flash3: "gemini-3.1-flash-tts-preview",
  pro25: "gemini-2.5-pro-preview-tts",
}

function resolveTtsModel(): string {
  const raw = (process.env.TTS_MODEL ?? "flash25").trim()
  return TTS_MODEL_ALIASES[raw.toLowerCase()] ?? raw
}

export type TTSVoice = "Aoede" | "Charon" | "Fenrir" | "Kore" | "Leda" | "Orus" | "Puck" | "Zephyr"

export const TTS_VOICES: Record<TTSVoice, string> = {
  Kore: "warm, weiblich",
  Puck: "energisch, männlich",
  Charon: "tief, männlich",
  Zephyr: "hell, weiblich",
  Aoede: "warm, weiblich",
  Fenrir: "tief, männlich",
  Leda: "sanft, weiblich",
  Orus: "bestimmt, männlich",
}

export interface TTSSpeaker {
  name: string
  voice: TTSVoice
}

export interface TTSParams {
  text: string
  voice?: TTSVoice
  speakers?: TTSSpeaker[]
}

export interface TTSResult {
  wavBuffer: Buffer
  durationSeconds: number
  voice: TTSVoice
}

const TTS_MODEL = resolveTtsModel()
const MAX_TEXT_LENGTH = 5000
const TTS_TIMEOUT = 120_000

/**
 * Generate speech audio from text using Gemini TTS.
 * Returns a WAV buffer ready for storage or playback.
 */
export async function generateSpeech(params: TTSParams): Promise<TTSResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured")
  }

  if (params.text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters (got ${params.text.length})`)
  }

  const ai = new GoogleGenAI({ apiKey })
  const voice = params.voice ?? "Kore"

  // Build speech config
  const speechConfig = params.speakers && params.speakers.length > 0
    ? {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: params.speakers.map((s) => ({
            speaker: s.name,
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: s.voice },
            },
          })),
        },
      }
    : {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      }

  const response = await Promise.race([
    ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: params.text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig,
      },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TTS generation timed out")), TTS_TIMEOUT)
    ),
  ])

  // Extract PCM audio data from response
  const part = response.candidates?.[0]?.content?.parts?.[0]
  if (!part?.inlineData?.data) {
    console.error("[TTS] No audio data in response. Parts count:", response.candidates?.[0]?.content?.parts?.length ?? 0)
    throw new Error("No audio data in TTS response")
  }

  const mimeType = part.inlineData.mimeType
  console.log(`[TTS] Audio response: mimeType=${mimeType}, base64Length=${part.inlineData.data.length}`)

  const pcmData = Buffer.from(part.inlineData.data, "base64")
  const wavBuffer = prependWavHeader(pcmData)
  const durationSeconds = pcmData.length / (24000 * 2) // 24kHz, 16-bit (2 bytes per sample)
  console.log(`[TTS] WAV: pcmBytes=${pcmData.length}, wavBytes=${wavBuffer.length}, duration=${durationSeconds.toFixed(1)}s`)

  return { wavBuffer, durationSeconds, voice }
}

/**
 * Create a WAV header for PCM audio data.
 * Format: 24kHz, 16-bit, mono, PCM.
 */
function prependWavHeader(pcmData: Buffer): Buffer {
  const header = Buffer.alloc(44)
  const dataLength = pcmData.length
  const fileLength = 36 + dataLength

  // RIFF header
  header.write("RIFF", 0)
  header.writeUInt32LE(fileLength, 4)
  header.write("WAVE", 8)

  // fmt chunk
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)     // chunk size
  header.writeUInt16LE(1, 20)      // PCM format
  header.writeUInt16LE(1, 22)      // mono
  header.writeUInt32LE(24000, 24)  // sample rate
  header.writeUInt32LE(48000, 28)  // byte rate (24000 * 2)
  header.writeUInt16LE(2, 32)      // block align
  header.writeUInt16LE(16, 34)     // bits per sample

  // data chunk
  header.write("data", 36)
  header.writeUInt32LE(dataLength, 40)

  return Buffer.concat([header, pcmData])
}
