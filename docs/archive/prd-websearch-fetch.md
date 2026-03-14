# PRD: Web Search & Fetch Integration

## Ziel

Zwei universelle Tools (`webSearch`, `webFetch`) für die Chat-Plattform, die über alle Modelle und Expertenprofile hinweg funktionieren. Der aktive Provider wird per Env-Variable gesteuert.

---

## Tools

### `webSearch`
- Input: `{ query: string }`
- Output: Liste von Ergebnissen mit URL und Inhalt
- Wird genutzt wenn der User nach Informationen recherchieren lässt

### `webFetch`
- Input: `{ url: string }`
- Output: Sauberer Markdown-Text der Seite, max. 8.000 Token
- Wird genutzt wenn der User eine URL nennt oder das Modell eine Seite vertiefen will
- Bei Content-Kürzung: expliziter Hinweis ans Modell im Return-Value

---

## Provider-Abstraction

```ts
// lib/search/index.ts

type SearchProvider = 'jina' | 'tavily' | 'firecrawl' | 'perplexity'

const active = (process.env.SEARCH_PROVIDER ?? 'jina') as SearchProvider

const providers: Record<SearchProvider, {
  search: (query: string) => Promise<SearchResult[]>
  fetch:  (url: string)   => Promise<FetchResult>
}> = {
  jina:       { search: searchJina,       fetch: fetchJina       },
  tavily:     { search: searchTavily,     fetch: fetchTavily     },
  firecrawl:  { search: searchFirecrawl,  fetch: fetchFirecrawl  },
  perplexity: { search: searchPerplexity, fetch: fetchPerplexity },
}

export const webSearch = providers[active].search
export const webFetch  = providers[active].fetch
```

```
# .env.local
SEARCH_PROVIDER=jina   # | tavily | firecrawl | perplexity

JINA_API_KEY=...
TAVILY_API_KEY=...
FIRECRAWL_API_KEY=...
PERPLEXITY_API_KEY=...
```

---

## Provider-Implementierungen

### Jina (Default)
- Search: `GET https://s.jina.ai/?q={query}` → Top-5 inkl. vollem Seiteninhalt
- Fetch:  `GET https://r.jina.ai/{url}` → sauberes Markdown
- Auth: `Authorization: Bearer $JINA_API_KEY`

### Tavily
- Search: `POST https://api.tavily.com/search` `{ query }`
- Fetch:  `POST https://api.tavily.com/extract` `{ urls: [url] }`
- Auth: `Authorization: Bearer $TAVILY_API_KEY`

### Firecrawl
- Search: `POST https://api.firecrawl.dev/v1/search` `{ query }`
- Fetch:  `POST https://api.firecrawl.dev/v2/scrape` `{ url, formats: ['markdown'] }`
- Auth: `Authorization: Bearer $FIRECRAWL_API_KEY`

### Perplexity
- Search: `POST https://api.perplexity.ai/v1/agent` `{ tools: [{ type: 'web_search' }], ... }`
- Fetch:  `POST https://api.perplexity.ai/v1/agent` `{ tools: [{ type: 'fetch_url' }], ... }`
- Auth: `Authorization: Bearer $PERPLEXITY_API_KEY`
- Pricing: Search $0.005/Call · Fetch $0.0005/Call
- Hinweis: Perplexity nutzt intern eigene Modelle für die Tool-Ausführung – das zurückgegebene Ergebnis ist trotzdem plain Text/Markdown und passt in die gemeinsame `SearchResult`/`FetchResult` Struktur

---

## AI SDK Integration

```ts
// lib/tools.ts
import { tool } from 'ai'
import { z } from 'zod'
import { webSearch, webFetch } from './search'

export const searchTools = {
  webSearch: tool({
    description: 'Search the web for current information on a topic',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => webSearch(query),
  }),
  webFetch: tool({
    description: 'Fetch and read the content of a specific URL',
    parameters: z.object({ url: z.string() }),
    execute: async ({ url }) => webFetch(url),
  }),
}
```

```ts
// In streamText / generateText:
await streamText({
  model,
  tools: searchTools,
  maxSteps: 10,
  system: profile.systemPrompt,
  messages,
})
```

---

## Typen

```ts
type SearchResult = {
  url: string
  title: string
  content: string
}

type FetchResult = {
  url: string
  content: string
  truncated: boolean
  note?: string
}
```

---

## Token-Handling in webFetch

```ts
const MAX_FETCH_TOKENS = 8000

async function applyTokenLimit(raw: string): Promise<FetchResult> {
  const truncated = truncateToTokens(raw, MAX_FETCH_TOKENS)
  return {
    content: truncated.text,
    truncated: truncated.wasCut,
    note: truncated.wasCut
      ? 'Content was truncated to fit context limits. Key information may be missing.'
      : undefined,
  }
}
```

Gilt für alle vier Provider gleich.

---

## Tool-Steuerung via Expertenprofile

Die Tools werden global bereitgestellt. Ob und wie sie genutzt werden, steuert der System-Prompt des jeweiligen Profils.

Pflicht-Instruktion in jedem Profil das Search/Fetch nutzt:
> "When the user provides a URL or asks for research, always use the available webSearch and webFetch tools."

---

## Out of Scope

- Embedding / semantisches Chunking (spätere Iteration)
- Summarization-Step vor Context-Injection (spätere Iteration)
- Caching von Fetch-Ergebnissen (spätere Iteration)
