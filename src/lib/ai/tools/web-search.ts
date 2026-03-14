import { tool } from "ai"
import { z } from "zod"

import { searchWeb } from "@/lib/search"

/**
 * web_search tool — searches the web for current information.
 * Provider-agnostic: delegates to the configured search provider (Firecrawl, Jina, etc.).
 */
export const webSearchTool = tool({
  description:
    "Search the web for current information. Returns results with URLs and content snippets. " +
    "Use this when the user asks about recent events, needs up-to-date information, or wants to research a topic. " +
    "You can optionally limit search to specific domains.",
  inputSchema: z.object({
    query: z.string().min(1).max(500).describe("The search query"),
    domains: z
      .array(z.string())
      .max(5)
      .optional()
      .describe("Optional: limit search to these domains (e.g. ['github.com', 'docs.python.org'])"),
  }),
  execute: async ({ query, domains }) => {
    const results = await searchWeb(query, domains?.length ? { domains } : undefined)
    return { results }
  },
})
