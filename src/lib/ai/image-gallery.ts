/**
 * Shared image gallery types and parsing utilities.
 * Used by both server (generate-image tool) and client (image-preview component).
 */

export interface ImageGalleryEntry {
  url: string
  role: "input" | "generated" | "iteration"
  prompt?: string
  timestamp: string
}

/** Parse gallery entries from artifact content. Handles JSON array and legacy single-URL. */
export function parseImageGallery(content: string): ImageGalleryEntry[] {
  if (!content) return []
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // Not JSON
  }
  if (content.startsWith("data:") || content.startsWith("http")) {
    return [{ url: content, role: "generated", timestamp: new Date().toISOString() }]
  }
  return []
}

/** Extract the latest generated/iteration image URL from gallery content. */
export function getLatestImageUrl(content: string): string | null {
  const gallery = parseImageGallery(content)
  for (let i = gallery.length - 1; i >= 0; i--) {
    if (gallery[i].role === "generated" || gallery[i].role === "iteration") {
      return gallery[i].url
    }
  }
  return gallery[0]?.url ?? null
}
