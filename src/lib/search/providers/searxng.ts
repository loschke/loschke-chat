import type { SearchProvider, SearchResult, FetchResult, SearchOptions } from "../types"
import { truncateContent, SEARCH_SNIPPET_MAX_CHARS } from "../truncate"

function getBaseUrl(): string {
  const url = process.env.SEARXNG_URL
  if (!url) throw new Error("SEARXNG_URL nicht gesetzt.")
  return url.replace(/\/+$/, "")
}

interface SearXNGResult {
  url?: string
  title?: string
  content?: string
}

interface SearXNGResponse {
  results?: SearXNGResult[]
}

export const searxngProvider: SearchProvider = {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const baseUrl = getBaseUrl()

    const params = new URLSearchParams({
      q: options?.domains?.length ? `site:${options.domains[0]} ${query}` : query,
      format: "json",
      categories: "general",
    })

    const res = await fetch(`${baseUrl}/search?${params}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    })

    if (!res.ok) {
      throw new Error(`SearXNG search failed: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as SearXNGResponse
    const items = (json.results ?? []).slice(0, 10)

    return items.map((item) => {
      const raw = item.content ?? ""
      const { content } = truncateContent(raw, SEARCH_SNIPPET_MAX_CHARS)
      return {
        url: item.url ?? "",
        title: item.title ?? "",
        content,
      }
    })
  },

  async fetch(url: string): Promise<FetchResult> {
    // SearXNG doesn't have a dedicated fetch/reader endpoint.
    // Use direct HTTP fetch with basic HTML-to-text extraction.
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ChatBot/1.0)",
        Accept: "text/html,application/xhtml+xml,text/plain",
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
    }

    const contentType = res.headers.get("content-type") ?? ""
    const raw = await res.text()

    let text: string
    if (contentType.includes("text/html")) {
      // Basic HTML stripping — extract text content
      text = raw
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim()
    } else {
      text = raw
    }

    const { content, truncated } = truncateContent(text)

    return {
      url,
      content,
      truncated,
      ...(truncated && { note: "Content was truncated to fit context limits." }),
    }
  },
}
