import { tool } from "ai"
import { z } from "zod"

import { fetchWeb } from "@/lib/search"
import { isAllowedUrl } from "@/lib/url-validation"

/**
 * web_fetch tool — fetches and reads web page content as clean markdown.
 * Provider-agnostic: delegates to the configured search provider.
 * SSRF protection via isAllowedUrl.
 */
export const webFetchTool = tool({
  description:
    "Fetch and read the content of a web page. Returns clean markdown text. " +
    "Use this when the user shares a URL and wants you to read or summarize its content.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to fetch"),
  }),
  execute: async ({ url }) => {
    if (!isAllowedUrl(url)) {
      return { error: "URL not allowed" }
    }
    return await fetchWeb(url)
  },
})
