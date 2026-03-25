/**
 * youtube_search tool — searches YouTube and creates an HTML artifact with embedded videos.
 */

import { tool } from "ai"
import { z } from "zod"
import { createArtifact } from "@/lib/db/queries/artifacts"
import { searchYouTube, buildYouTubeResultsHtml } from "@/lib/ai/youtube"

/**
 * Factory: creates a youtube_search tool scoped to a chat.
 */
export function youtubeSearchTool(chatId: string, userId: string) {
  return tool({
    description:
      "Search YouTube for videos matching a query. Returns an interactive HTML artifact with embedded video player. " +
      "Use when the user wants to find YouTube videos on a topic. Write the search query in the language most likely to yield relevant results.",
    inputSchema: z.object({
      query: z.string().min(2).max(500).describe("Search query for YouTube"),
      maxResults: z.number().min(1).max(10).optional().describe("Number of results (default 5, max 10)"),
    }),
    execute: async ({ query, maxResults }) => {
      const results = await searchYouTube(query, maxResults)

      const html = buildYouTubeResultsHtml(results, query)

      const artifact = await createArtifact({
        chatId,
        type: "html",
        title: `YouTube: ${query.slice(0, 80)}`,
        content: html,
      })

      const { deductToolCredits, calculateYouTubeSearchCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateYouTubeSearchCredits(), {
        chatId, description: "YouTube-Suche", toolName: "youtube_search",
      })
      if (creditError) {
        console.warn("[youtube_search] Credits insufficient after search:", creditError)
      }

      return {
        artifactId: artifact.id,
        title: artifact.title,
        type: "html" as const,
        version: artifact.version,
        resultCount: results.length,
      }
    },
  })
}
