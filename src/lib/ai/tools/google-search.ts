/**
 * google_search tool — grounded search via Gemini + Google Search.
 * Returns a synthesized answer with structured source citations,
 * rendered inline in the chat via a Generative UI component.
 */

import { tool } from "ai"
import { z } from "zod"
import { groundedSearch } from "@/lib/ai/google-search-grounding"
import { getErrorMessage } from "@/lib/errors"
import type { ToolRegistration } from "./registry"

/**
 * Factory: creates a google_search tool scoped to a chat.
 */
export function googleSearchTool(chatId: string, userId: string) {
  return tool({
    description:
      "Search the web using Google and get an answer with verified source citations. " +
      "Use this for fact-checking, current events, quick factual questions, or when the user needs information backed by sources. " +
      "Returns a synthesized answer with inline citations and source URLs directly in the chat. " +
      "Do NOT create an artifact for google_search results — the answer is displayed inline. " +
      "Prefer this over web_search when source attribution and accuracy matter. " +
      "Use web_search for broader research, domain-specific searches, or when you need to read full page content.",
    inputSchema: z.object({
      query: z.string().min(2).max(1000).describe(
        "The search query or question to answer with Google sources"
      ),
    }),
    execute: async ({ query }) => {
      // Pre-check credits before calling Google API
      const { deductToolCredits, calculateGoogleSearchCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateGoogleSearchCredits(), {
        chatId, description: "Google Search", toolName: "google_search",
      })
      if (creditError) {
        return { query, error: creditError }
      }

      try {
        const result = await groundedSearch(query)
        return {
          query,
          answer: result.answer,
          sources: result.sources,
          searchQueries: result.searchQueries,
        }
      } catch (err) {
        return {
          query,
          error: getErrorMessage(err),
        }
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "google_search",
  label: "Google Search",
  icon: "Search",
  category: "search",
  customRenderer: true,
  privacySensitive: true,
}
