import type { SearchProvider, SearchResult, FetchResult, SearchOptions } from "../types"

const BASE_URL = "https://api.perplexity.ai/search"

function getApiKey(): string {
  const key = process.env.PERPLEXITY_API_KEY
  if (!key) throw new Error("PERPLEXITY_API_KEY nicht gesetzt.")
  return key
}

interface PerplexitySearchResult {
  title?: string
  url?: string
  snippet?: string
  date?: string
}

interface PerplexitySearchResponse {
  results?: PerplexitySearchResult[]
}

export const perplexityProvider: SearchProvider = {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const body: Record<string, unknown> = { query, max_results: 5 }
    if (options?.domains?.length) {
      body.search_domain_filter = options.domains
    }

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`Perplexity search failed: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as PerplexitySearchResponse
    const items = json.results ?? []

    return items.map((item) => ({
      url: item.url ?? "",
      title: item.title ?? "",
      content: item.snippet ?? "",
    }))
  },

  async fetch(): Promise<FetchResult> {
    throw new Error(
      "Perplexity unterstützt kein URL-Fetching. " +
      "Nutze FETCH_PROVIDER=firecrawl oder FETCH_PROVIDER=jina für web_fetch."
    )
  },
}
