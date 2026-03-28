/**
 * youtube_search tool — searches YouTube and returns structured video data.
 * Results are rendered inline in the chat via a Generative UI component.
 */

import { tool } from "ai"
import { z } from "zod"
import { searchYouTube } from "@/lib/ai/youtube"
import type { ToolRegistration } from "./registry"

/**
 * Factory: creates a youtube_search tool scoped to a chat.
 */
export function youtubeSearchTool(chatId: string, userId: string) {
  return tool({
    description:
      "Search YouTube for videos matching a query. Results are displayed inline in the chat as video cards. " +
      "Use when the user wants to find YouTube videos on a topic. Write the search query in the language most likely to yield relevant results. " +
      "The returned video data (titles, channels, videoIds) is available for follow-up questions. " +
      "Use 'order' to sort by date or views. Use 'channelHandle' to filter by a specific channel (e.g. '@anthropic-ai' or 'Anthropic'). " +
      "Use 'recency' to limit results to a recent time period.",
    inputSchema: z.object({
      query: z.string().min(2).max(500).describe("Search query for YouTube"),
      maxResults: z.number().min(1).max(10).optional().describe("Number of results (default 5, max 10)"),
      order: z.enum(["relevance", "date", "viewCount"]).optional().describe("Sort order: 'relevance' (default), 'date' (newest first), 'viewCount' (most viewed)"),
      recency: z.enum(["day", "week", "month", "year"]).optional().describe("Limit to videos published within this time period"),
      channelHandle: z.string().max(100).optional().describe("YouTube channel handle (e.g. '@anthropic-ai') or channel name to filter results"),
      language: z.string().length(2).optional().describe("ISO 639-1 language code to prefer videos in that language (e.g. 'de', 'en', 'fr')"),
    }),
    execute: async ({ query, maxResults, order, recency, channelHandle, language }) => {
      let publishedAfter: string | undefined
      if (recency) {
        const now = new Date()
        const offsets: Record<"day" | "week" | "month" | "year", number> = { day: 1, week: 7, month: 30, year: 365 }
        now.setDate(now.getDate() - (offsets[recency] ?? 7))
        publishedAfter = now.toISOString()
      }

      const results = await searchYouTube({
        query,
        maxResults,
        order,
        publishedAfter,
        channelHandle,
        language,
      })

      const { deductToolCredits, calculateYouTubeSearchCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateYouTubeSearchCredits(), {
        chatId, description: "YouTube-Suche", toolName: "youtube_search",
      })
      if (creditError) {
        console.warn("[youtube_search] Credits insufficient after search:", creditError)
      }

      return {
        query,
        resultCount: results.length,
        videos: results.map((v) => ({
          videoId: v.videoId,
          title: v.title,
          channel: v.channelTitle,
          publishedAt: v.publishedAt,
          duration: v.duration,
          description: v.description?.slice(0, 200),
          thumbnailUrl: v.thumbnailUrl,
        })),
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "youtube_search",
  label: "YouTube-Suche",
  icon: "Youtube",
  category: "media",
  customRenderer: true,
}
