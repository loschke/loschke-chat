export interface SearchResult {
  url: string
  title: string
  content: string
}

export interface FetchResult {
  url: string
  content: string
  truncated: boolean
  note?: string
}

export interface SearchOptions {
  domains?: string[]
}

export interface SearchProvider {
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>
  fetch: (url: string) => Promise<FetchResult>
}

export type SearchProviderName = "firecrawl" | "jina" | "tavily" | "perplexity"
