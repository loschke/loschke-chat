/**
 * Google Search Grounding via Gemini.
 *
 * Uses Gemini's built-in Google Search tool to provide
 * grounded answers with structured source citations.
 */

import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { getErrorMessage } from "@/lib/errors"

const GROUNDING_MODEL = process.env.GOOGLE_SEARCH_MODEL ?? "gemini-2.5-flash"

export interface GroundingSource {
  url: string
  title: string
}

export interface GroundingResult {
  answer: string
  sources: GroundingSource[]
  searchQueries: string[]
}

/**
 * Execute a grounded search query via Gemini + Google Search.
 * Gemini autonomously searches Google, synthesizes results,
 * and returns structured source attribution.
 */
export async function groundedSearch(query: string): Promise<GroundingResult> {
  let result
  try {
    result = await generateText({
      model: google(GROUNDING_MODEL),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: { google_search: google.tools.googleSearch({}) } as any,
      toolChoice: "required",
      prompt: query,
    })
  } catch (err) {
    console.error("[google_search] Gemini grounding failed:", getErrorMessage(err))
    throw new Error(`Google Search fehlgeschlagen: ${getErrorMessage(err)}`)
  }

  const metadata = result.providerMetadata?.google as {
    groundingMetadata?: {
      webSearchQueries?: string[] | null
      groundingChunks?: Array<{
        web?: { uri: string; title?: string | null } | null
      }> | null
    } | null
  } | undefined

  const groundingMeta = metadata?.groundingMetadata
  const chunks = groundingMeta?.groundingChunks ?? []
  const searchQueries = groundingMeta?.webSearchQueries ?? []

  const sources: GroundingSource[] = chunks
    .filter((c): c is { web: { uri: string; title?: string | null } } => !!c.web?.uri)
    .map((c) => ({
      url: c.web.uri,
      title: c.web.title ?? "",
    }))

  return {
    answer: result.text,
    sources,
    searchQueries: searchQueries as string[],
  }
}
