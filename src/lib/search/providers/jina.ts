import type { SearchProvider, SearchResult, FetchResult, SearchOptions } from "../types"
import { truncateContent, SEARCH_SNIPPET_MAX_CHARS } from "../truncate"

const BASE_SEARCH = "https://s.jina.ai/"
const BASE_READER = "https://r.jina.ai/"

function getApiKey(): string {
  const key = process.env.JINA_API_KEY
  if (!key) throw new Error("JINA_API_KEY nicht gesetzt.")
  return key
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  }
}

interface JinaSearchItem {
  title?: string
  url?: string
  description?: string
  content?: string
}

interface JinaSearchResponse {
  data?: JinaSearchItem[]
}

interface JinaReaderResponse {
  data?: {
    title?: string
    url?: string
    content?: string
  }
}

export const jinaProvider: SearchProvider = {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const reqHeaders = headers()
    // Jina supports single-domain filtering via X-Site header
    if (options?.domains?.length) {
      reqHeaders["X-Site"] = options.domains[0]
    }

    const res = await fetch(BASE_SEARCH, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({ q: query, num: 5 }),
    })

    if (!res.ok) {
      throw new Error(`Jina search failed: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as JinaSearchResponse
    const items = json.data ?? []

    return items.map((item) => {
      const raw = item.description || item.content || ""
      const { content } = truncateContent(raw, SEARCH_SNIPPET_MAX_CHARS)
      return {
        url: item.url ?? "",
        title: item.title ?? "",
        content,
      }
    })
  },

  async fetch(url: string): Promise<FetchResult> {
    const res = await fetch(BASE_READER, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ url }),
    })

    if (!res.ok) {
      throw new Error(`Jina reader failed: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as JinaReaderResponse
    const markdown = json.data?.content ?? ""
    const { content, truncated } = truncateContent(markdown)

    return {
      url,
      content,
      truncated,
      ...(truncated && { note: "Content was truncated to fit context limits." }),
    }
  },
}
