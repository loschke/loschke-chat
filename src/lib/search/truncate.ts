/**
 * Truncate content to fit within token limits.
 * Uses ~4 chars/token heuristic, max 8000 tokens = 32000 chars.
 * Cuts at the last paragraph boundary before the limit.
 */

const MAX_CHARS = 32_000

export function truncateContent(text: string): { content: string; truncated: boolean } {
  if (text.length <= MAX_CHARS) {
    return { content: text, truncated: false }
  }

  // Find last paragraph break (\n\n) before the limit
  const slice = text.slice(0, MAX_CHARS)
  const lastBreak = slice.lastIndexOf("\n\n")

  const content = lastBreak > MAX_CHARS * 0.5
    ? slice.slice(0, lastBreak)
    : slice

  return { content, truncated: true }
}
