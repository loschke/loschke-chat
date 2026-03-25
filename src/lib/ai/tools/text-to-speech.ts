/**
 * text_to_speech tool — generates audio from text using Gemini TTS.
 *
 * Creates an audio artifact with a WAV file stored in R2 (or data URL fallback).
 * Supports single voice and multi-speaker dialogue.
 */

import { tool } from "ai"
import { z } from "zod"
import { nanoid } from "nanoid"
import { createArtifact } from "@/lib/db/queries/artifacts"
import { generateSpeech, type TTSVoice } from "@/lib/ai/tts"
import { features } from "@/config/features"

const VOICE_ENUM = ["Aoede", "Charon", "Fenrir", "Kore", "Leda", "Orus", "Puck", "Zephyr"] as const

/**
 * Factory: creates a text_to_speech tool scoped to a chat + user.
 */
export function textToSpeechTool(chatId: string, userId: string) {
  return tool({
    description:
      "Convert text to spoken audio. Use when the user wants text read aloud, a podcast-style audio, voiceover, or speech generation. " +
      "Supports single voice and multi-speaker dialogue (max 2 speakers). " +
      "For dialogue: the text must contain speaker names (e.g. 'Speaker 1: Hello'), and you map them to voices via the speakers parameter. " +
      "Maximum text length: 5000 characters. Write the text in the target language.",
    inputSchema: z.object({
      text: z.string().min(1).max(5000).describe("The text to convert to speech. For dialogue, include speaker names like 'Speaker 1: ...'"),
      title: z.string().max(200).describe("Short title for the audio artifact"),
      voice: z.enum(VOICE_ENUM).optional()
        .describe("Voice for single-speaker mode. Kore (warm female, default), Puck (energetic male), Charon (deep male), Zephyr (bright female), Aoede (warm female), Fenrir (deep male), Leda (gentle female), Orus (firm male)"),
      speakers: z.array(z.object({
        name: z.string().min(1).max(50).describe("Speaker name as used in the text, e.g. 'Sprecher 1'"),
        voice: z.enum(VOICE_ENUM).describe("Voice for this speaker"),
      })).min(2).max(2).optional()
        .describe("For multi-speaker dialogue: map exactly 2 speaker names from the text to voices."),
    }),
    execute: async ({ text, title, voice, speakers }) => {
      const result = await generateSpeech({
        text,
        voice: voice as TTSVoice | undefined,
        speakers: speakers?.map((s) => ({ name: s.name, voice: s.voice as TTSVoice })),
      })

      // Upload to R2 or create data URL
      let audioUrl: string

      if (!features.storage.enabled) {
        return { error: "Audio-Generierung benötigt konfiguriertes R2 Storage. Bitte R2_ACCESS_KEY_ID setzen." }
      }

      const { uploadBuffer } = await import("@/lib/storage")
      const storageKey = `generated-audio/${chatId}/${nanoid()}.wav`
      audioUrl = await uploadBuffer(result.wavBuffer, "audio/wav", `${title}.wav`, storageKey)

      // Create audio artifact
      const artifact = await createArtifact({
        chatId,
        type: "audio",
        title,
        content: JSON.stringify({
          url: audioUrl,
          duration: Math.round(result.durationSeconds * 10) / 10,
          format: "wav",
          voice: result.voice,
        }),
      })

      const { deductToolCredits, calculateTTSCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateTTSCredits(), {
        chatId, description: "Text-to-Speech", toolName: "text_to_speech",
      })
      if (creditError) {
        console.warn("[text_to_speech] Credits insufficient after generation:", creditError)
      }

      return {
        artifactId: artifact.id,
        title: artifact.title,
        type: "audio" as const,
        version: artifact.version,
        durationSeconds: Math.round(result.durationSeconds * 10) / 10,
      }
    },
  })
}
