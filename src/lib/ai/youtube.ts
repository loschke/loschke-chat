/**
 * YouTube Data API v3 wrapper.
 * Provides search functionality using a plain REST API call.
 */

import { getErrorMessage } from "@/lib/errors"

export interface YouTubeSearchResult {
  videoId: string
  title: string
  channelTitle: string
  publishedAt: string
  description: string
  thumbnailUrl: string
  duration?: string
}

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

export interface YouTubeSearchOptions {
  query: string
  maxResults?: number
  order?: "relevance" | "date" | "viewCount"
  publishedAfter?: string
  channelHandle?: string
  language?: string
}

/**
 * Search YouTube for videos matching a query.
 * Supports sorting, date filtering, and channel filtering.
 * Requires YOUTUBE_API_KEY to be set.
 */
export async function searchYouTube(options: YouTubeSearchOptions): Promise<YouTubeSearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured")
  }

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: options.query,
    maxResults: String(Math.min(Math.max(options.maxResults ?? 5, 1), 10)),
    key: apiKey,
  })

  if (options.order && options.order !== "relevance") {
    params.set("order", options.order)
  }

  if (options.publishedAfter) {
    params.set("publishedAfter", options.publishedAfter)
  }

  if (options.language) {
    params.set("relevanceLanguage", options.language)
  }

  if (options.channelHandle) {
    const channelId = await resolveChannelId(options.channelHandle, apiKey)
    if (channelId) {
      params.set("channelId", channelId)
    }
  }

  const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`, {
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error")
    console.error(`[YouTube] Search failed (${res.status}):`, text)
    return []
  }

  const data = await res.json() as {
    items?: Array<{
      id: { videoId: string }
      snippet: {
        title: string
        channelTitle: string
        publishedAt: string
        description: string
        thumbnails: { medium?: { url: string }; default?: { url: string } }
      }
    }>
  }

  const results: YouTubeSearchResult[] = (data.items ?? [])
    .filter((item) => isValidVideoId(item.id.videoId))
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? "",
    }))

  // Fetch durations via videos.list (contentDetails) — best-effort, don't fail search on error
  if (results.length > 0) {
    const durations = await fetchVideoDurations(results.map((r) => r.videoId), apiKey)
    for (const result of results) {
      result.duration = durations.get(result.videoId)
    }
  }

  return results
}

/**
 * Resolve a YouTube channel handle or name to a channelId.
 * Tries channels.list with forHandle first (@handle), falls back to search.
 */
async function resolveChannelId(handle: string, apiKey: string): Promise<string | null> {
  // Strip leading @ if present
  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle

  try {
    // Try forHandle lookup first (exact match for @handles)
    const handleParams = new URLSearchParams({
      part: "id",
      forHandle: cleanHandle,
      key: apiKey,
    })
    const handleRes = await fetch(`${YOUTUBE_API_BASE}/channels?${handleParams}`, {
      signal: AbortSignal.timeout(5_000),
    })
    if (handleRes.ok) {
      const data = await handleRes.json() as { items?: Array<{ id: string }> }
      if (data.items?.[0]?.id) return data.items[0].id
    }

    // Fallback: search for the channel by name
    const searchParams = new URLSearchParams({
      part: "snippet",
      type: "channel",
      q: handle,
      maxResults: "1",
      key: apiKey,
    })
    const searchRes = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`, {
      signal: AbortSignal.timeout(5_000),
    })
    if (searchRes.ok) {
      const data = await searchRes.json() as { items?: Array<{ id: { channelId: string } }> }
      if (data.items?.[0]?.id?.channelId) return data.items[0].id.channelId
    }
  } catch (err) {
    console.warn("[YouTube] Channel resolve failed:", getErrorMessage(err))
  }
  return null
}

/**
 * Fetch video durations from the YouTube videos.list endpoint.
 * Returns a Map of videoId → human-readable duration string.
 */
async function fetchVideoDurations(videoIds: string[], apiKey: string): Promise<Map<string, string>> {
  const durations = new Map<string, string>()
  try {
    const params = new URLSearchParams({
      part: "contentDetails",
      id: videoIds.join(","),
      key: apiKey,
    })
    const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`, {
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return durations

    const data = await res.json() as {
      items?: Array<{
        id: string
        contentDetails: { duration: string }
      }>
    }
    for (const item of data.items ?? []) {
      durations.set(item.id, formatIsoDuration(item.contentDetails.duration))
    }
  } catch (err) {
    console.warn("[YouTube] Duration fetch failed:", getErrorMessage(err))
  }
  return durations
}

/**
 * Convert ISO 8601 duration (PT1H2M30S) to human-readable format (1:02:30).
 */
function formatIsoDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ""
  const h = parseInt(match[1] ?? "0", 10)
  const m = parseInt(match[2] ?? "0", 10)
  const s = parseInt(match[3] ?? "0", 10)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

/**
 * Validate a YouTube video ID format (11 chars, alphanumeric + dash/underscore).
 */
export function isValidVideoId(id: string): boolean {
  return /^[A-Za-z0-9_-]{10,12}$/.test(id)
}

/**
 * Validate that a URL is a YouTube video URL.
 * Supports youtube.com/watch, youtu.be, youtube.com/shorts, youtube-nocookie.com
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace("www.", "")
    return (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host === "youtube-nocookie.com" ||
      host === "m.youtube.com"
    )
  } catch {
    return false
  }
}

/**
 * Extract video ID from various YouTube URL formats.
 */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace("www.", "")

    if (host === "youtu.be") {
      return parsed.pathname.slice(1) || null
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      // /watch?v=ID
      const v = parsed.searchParams.get("v")
      if (v) return v

      // /shorts/ID or /embed/ID
      const match = parsed.pathname.match(/^\/(shorts|embed)\/([^/?]+)/)
      if (match) return match[2]
    }

    return null
  } catch {
    return null
  }
}

