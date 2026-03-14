import type { SearchProvider, SearchResult, FetchResult, SearchOptions } from "../types"
import { truncateContent } from "../truncate"
import { webSearch, webScrape } from "@/lib/web"

export const firecrawlProvider: SearchProvider = {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // Firecrawl uses Google-style site: operator for domain filtering
    let searchQuery = query
    if (options?.domains?.length) {
      const siteFilter = options.domains.map((d) => `site:${d}`).join(" OR ")
      searchQuery = `${query} ${siteFilter}`
    }

    const result = await webSearch({ query: searchQuery, limit: 5 })
    return result.data.map((item) => ({
      url: item.url,
      title: item.title,
      content: item.description || item.markdown || "",
    }))
  },

  async fetch(url: string): Promise<FetchResult> {
    const result = await webScrape({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    })

    const markdown = result.markdown ?? ""
    const { content, truncated } = truncateContent(markdown)

    return {
      url,
      content,
      truncated,
      ...(truncated && { note: "Content was truncated to fit context limits." }),
    }
  },
}
