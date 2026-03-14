import type { SearchProvider, SearchProviderName, SearchResult, FetchResult, SearchOptions } from "./types"

export type { SearchResult, FetchResult, SearchProviderName, SearchOptions }

/**
 * Search and fetch can use different providers.
 * SEARCH_PROVIDER controls web search, FETCH_PROVIDER controls URL fetching.
 * Both default to "firecrawl". This allows combinations like
 * Perplexity for search + Jina for fetch.
 */
const searchProviderName = (process.env.SEARCH_PROVIDER ?? "firecrawl") as SearchProviderName
const fetchProviderName = (process.env.FETCH_PROVIDER ?? process.env.SEARCH_PROVIDER ?? "firecrawl") as SearchProviderName

const providerCache = new Map<SearchProviderName, SearchProvider>()

async function loadProvider(name: SearchProviderName): Promise<SearchProvider> {
  const cached = providerCache.get(name)
  if (cached) return cached

  let provider: SearchProvider

  switch (name) {
    case "firecrawl": {
      const { firecrawlProvider } = await import("./providers/firecrawl")
      provider = firecrawlProvider
      break
    }
    case "jina": {
      const { jinaProvider } = await import("./providers/jina")
      provider = jinaProvider
      break
    }
    case "tavily": {
      const { tavilyProvider } = await import("./providers/tavily")
      provider = tavilyProvider
      break
    }
    case "perplexity": {
      const { perplexityProvider } = await import("./providers/perplexity")
      provider = perplexityProvider
      break
    }
    default:
      throw new Error(`Unknown search provider: ${name}`)
  }

  providerCache.set(name, provider)
  return provider
}

export async function searchWeb(query: string, options?: SearchOptions): Promise<SearchResult[]> {
  const provider = await loadProvider(searchProviderName)
  return provider.search(query, options)
}

export async function fetchWeb(url: string): Promise<FetchResult> {
  const provider = await loadProvider(fetchProviderName)
  return provider.fetch(url)
}
