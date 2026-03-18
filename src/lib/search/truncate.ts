/**
 * Truncate content to fit within token limits.
 * Uses ~4 chars/token heuristic. Cuts at the last paragraph boundary before the limit.
 *
 * Default: 8000 tokens = 32000 chars (for full page fetches).
 * Use a smaller limit for search snippets to prevent token explosion in multi-step tool calls.
 */

const DEFAULT_MAX_CHARS = 32_000

export function truncateContent(text: string, maxChars: number = DEFAULT_MAX_CHARS): { content: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { content: text, truncated: false }
  }

  // Find last paragraph break (\n\n) before the limit
  const slice = text.slice(0, maxChars)
  const lastBreak = slice.lastIndexOf("\n\n")

  const content = lastBreak > maxChars * 0.5
    ? slice.slice(0, lastBreak)
    : slice

  return { content, truncated: true }
}

/** Max chars for individual search result snippets (~1500 tokens) */
export const SEARCH_SNIPPET_MAX_CHARS = 6_000
