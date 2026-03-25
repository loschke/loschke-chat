/**
 * youtube_analyze tool — analyzes, transcribes, or summarizes a YouTube video using Gemini multimodal.
 *
 * Uses @ai-sdk/google with generateText to pass the YouTube URL as a file content part.
 * Gemini processes the video natively (no download needed).
 */

import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { tool } from "ai"
import { z } from "zod"
import { createArtifact } from "@/lib/db/queries/artifacts"
import { isYouTubeUrl, extractVideoId, isValidVideoId } from "@/lib/ai/youtube"


const TASK_PROMPTS: Record<string, (language: string) => string> = {
  transcribe: (lang) =>
    `Transcribe this video word for word in ${lang}. Include timestamps where possible. Format as clean markdown.`,
  summarize: (lang) =>
    `Summarize this video in ${lang}. Include:\n- Key points as bullet list\n- Main topics with headings\n- Important quotes or statements\n- Length and format of the video\n\nFormat as clean, well-structured markdown.`,
  analyze: (lang) =>
    `Provide a detailed analysis of this video in ${lang}. Include:\n- Main arguments and thesis\n- Key takeaways\n- Speaker analysis (tone, credibility, style)\n- Structure and flow\n- Important timestamps\n- Critical assessment\n\nFormat as clean, well-structured markdown with headings.`,
}

/**
 * Factory: creates a youtube_analyze tool scoped to a chat + user.
 */
export function youtubeAnalyzeTool(chatId: string, userId: string) {
  return tool({
    description:
      "Analyze, transcribe, or summarize a YouTube video. Takes a YouTube URL and uses AI to understand the video content. " +
      "Use when the user shares a YouTube link and wants to know what the video is about, get a transcription, or a detailed analysis.",
    inputSchema: z.object({
      url: z.string().url().describe("YouTube video URL"),
      title: z.string().max(200).describe("Short title for the analysis artifact"),
      task: z.enum(["transcribe", "summarize", "analyze"]).optional()
        .describe("Type of analysis: transcribe (word-for-word), summarize (key points), analyze (detailed). Default: summarize"),
      language: z.string().max(20).optional()
        .describe("Output language (default: Deutsch)"),
    }),
    execute: async ({ url, title, task, language }) => {
      if (!isYouTubeUrl(url)) {
        return { error: "Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link." }
      }

      // Extract and validate video ID, then reconstruct canonical URL (SSRF defense)
      const videoId = extractVideoId(url)
      if (!videoId || !isValidVideoId(videoId)) {
        return { error: "Could not extract a valid video ID from the URL." }
      }
      const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`

      const resolvedTask = task ?? "summarize"
      const resolvedLang = language ?? "Deutsch"
      const taskPrompt = TASK_PROMPTS[resolvedTask](resolvedLang)

      const result = await generateText({
        model: google("gemini-2.5-flash"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                data: canonicalUrl,
                mediaType: "video/mp4",
              },
              {
                type: "text",
                text: taskPrompt,
              },
            ],
          },
        ],
        abortSignal: AbortSignal.timeout(120_000),
      })

      const artifact = await createArtifact({
        chatId,
        type: "markdown",
        title,
        content: result.text,
      })

      const { deductToolCredits, calculateYouTubeAnalyzeCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateYouTubeAnalyzeCredits(), {
        chatId, description: `YouTube-Analyse (${resolvedTask})`, toolName: "youtube_analyze",
      })
      if (creditError) {
        console.warn("[youtube_analyze] Credits insufficient after analysis:", creditError)
      }

      return {
        artifactId: artifact.id,
        title: artifact.title,
        type: "markdown" as const,
        version: artifact.version,
      }
    },
  })
}
