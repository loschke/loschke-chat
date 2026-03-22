/**
 * Extract a title from markdown content.
 * Uses the first heading (any level) or falls back to the first non-empty line.
 * Truncated to 60 characters.
 */
export function extractArtifactTitle(content: string): string {
  const lines = content.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match markdown headings: # Title, ## Title, etc.
    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/)
    if (headingMatch) {
      const title = headingMatch[1].trim()
      return title.length > 60 ? title.slice(0, 57) + "..." : title
    }

    // First non-empty line as fallback
    return trimmed.length > 60 ? trimmed.slice(0, 57) + "..." : trimmed
  }

  return "Artifact"
}

/**
 * Extract a short summary for the chat bubble when canvas mode is active.
 * Skips headings, takes the first paragraph, cuts at sentence boundaries.
 */
export function extractChatSummary(content: string, maxLength = 300): string {
  const lines = content.split("\n")
  const bodyLines: string[] = []
  let foundBody = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!foundBody && !trimmed) continue
    if (!foundBody && /^#{1,6}\s+/.test(trimmed)) continue
    if (trimmed.startsWith("```")) break
    if (foundBody && !trimmed) break
    foundBody = true
    bodyLines.push(trimmed)
  }

  let summary = bodyLines.join(" ")

  if (!summary) {
    for (const line of lines) {
      const match = line.trim().match(/^#{1,6}\s+(.+)$/)
      if (match) {
        summary = match[1].trim()
        break
      }
    }
  }

  if (!summary) summary = content.trim().slice(0, maxLength)
  if (summary.length <= maxLength) return summary

  const truncated = summary.slice(0, maxLength)
  const sentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? ")
  )

  if (sentenceEnd > maxLength * 0.4) {
    return truncated.slice(0, sentenceEnd + 1) + " ..."
  }

  const lastSpace = truncated.lastIndexOf(" ")
  if (lastSpace > maxLength * 0.4) {
    return truncated.slice(0, lastSpace) + " ..."
  }

  return truncated + "..."
}

/**
 * Decode a base64 data URL to a string.
 */
export function decodeDataUrl(dataUrl: string): string {
  if (!dataUrl.startsWith("data:")) return dataUrl
  const commaIdx = dataUrl.indexOf(",")
  if (commaIdx === -1) return ""
  const base64 = dataUrl.slice(commaIdx + 1)
  try {
    return atob(base64)
  } catch {
    return ""
  }
}

/**
 * Extract a title from HTML content.
 * Checks <title>, then <h1>, falls back to "Dokument".
 */
export function extractHtmlTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    const title = titleMatch[1].trim()
    if (title) return title.length > 60 ? title.slice(0, 57) + "..." : title
  }

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) {
    const title = h1Match[1].trim()
    if (title) return title.length > 60 ? title.slice(0, 57) + "..." : title
  }

  return "Dokument"
}

/**
 * Extract file_id from code execution tool result parts in a message.
 * Code execution results have: output.content[].file_id
 */
export function extractCodeExecutionFileId(
  parts: unknown[] | undefined
): string | null {
  if (!parts) return null
  for (const part of parts) {
    if (
      typeof part !== "object" ||
      part === null ||
      !("type" in part) ||
      !("output" in part)
    ) continue
    const partType = (part as { type: unknown }).type
    const partOutput = (part as { output: unknown }).output
    // Tool parts from code execution have output with content array
    if (typeof partType === "string" && partType.startsWith("tool-") && partOutput && typeof partOutput === "object") {
      const output = partOutput as Record<string, unknown>
      const content = output.content as
        | Array<{ type: string; file_id: string }>
        | undefined
      if (Array.isArray(content)) {
        for (const item of content) {
          if (
            (item.type === "code_execution_output" ||
              item.type === "bash_code_execution_output") &&
            item.file_id
          ) {
            return item.file_id
          }
        }
      }
    }
  }
  return null
}

/**
 * Fetch file content from Anthropic Files API via our proxy endpoint.
 */
export async function fetchCodeExecutionFile(
  fileId: string
): Promise<string | null> {
  try {
    const res = await fetch(`/api/assistant/file?id=${fileId}`)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/**
 * Map a programming language name to its file extension.
 */
export function languageToExtension(language?: string): string {
  if (!language) return ".txt"
  const map: Record<string, string> = {
    javascript: ".js",
    js: ".js",
    typescript: ".ts",
    ts: ".ts",
    jsx: ".jsx",
    tsx: ".tsx",
    python: ".py",
    py: ".py",
    html: ".html",
    css: ".css",
    json: ".json",
    markdown: ".md",
    md: ".md",
    sql: ".sql",
    bash: ".sh",
    sh: ".sh",
    yaml: ".yaml",
    yml: ".yml",
    xml: ".xml",
    java: ".java",
    go: ".go",
    rust: ".rs",
    ruby: ".rb",
    php: ".php",
    swift: ".swift",
    kotlin: ".kt",
    c: ".c",
    cpp: ".cpp",
    csharp: ".cs",
  }
  return map[language.toLowerCase()] ?? `.${language.toLowerCase()}`
}

/**
 * Map an artifact type to an icon name for ArtifactCard.
 */
export function artifactTypeToIcon(type: string): string {
  switch (type) {
    case "html":
      return "GalleryHorizontalEnd"
    case "code":
      return "Code"
    case "quiz":
      return "ClipboardCheck"
    case "review":
      return "MessageSquareMore"
    case "image":
      return "ImageIcon"
    default:
      return "FileText"
  }
}

/**
 * Extract a preview snippet from markdown content.
 * Skips headings and returns the first body text, max 120 characters.
 */
export function extractArtifactPreview(content: string): string {
  const lines = content.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // Skip headings
    if (/^#{1,6}\s+/.test(trimmed)) continue
    // Skip code fences
    if (trimmed.startsWith("```")) continue

    return trimmed.length > 120 ? trimmed.slice(0, 117) + "..." : trimmed
  }

  return ""
}
