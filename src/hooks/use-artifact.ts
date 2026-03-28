"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { parseFakeArtifactCall } from "@/lib/ai/tools/parse-fake-artifact"
import type { ArtifactContentType } from "@/types/artifact"

export interface SelectedArtifact {
  id?: string
  title: string
  content: string
  type: ArtifactContentType
  language?: string
  version: number
  isStreaming: boolean
  reviewMode?: boolean
}

interface MessageLike {
  id: string
  role: string
  parts?: Array<{ type: string; [key: string]: unknown }>
}

// ---------------------------------------------------------------------------
// Generic tool part type check
// ---------------------------------------------------------------------------

/** Generic tool part type check */
export function isToolPart(part: { type: string }, toolName: string): boolean {
  return part.type === `tool-${toolName}`
}

// Import extractors for internal use in useArtifact hook
import {
  extractArtifactFromToolPart,
  extractQuizFromToolPart,
  extractReviewFromToolPart,
  extractImageFromToolPart,
  extractBrandingFromToolPart,
  extractYouTubeAnalyzeFromToolPart,
  extractDesignFromToolPart,
} from "./artifact-extractors"

// Re-export extractors for backward compatibility with external consumers
export {
  extractArtifactFromToolPart,
  extractQuizFromToolPart,
  extractReviewFromToolPart,
  extractImageFromToolPart,
  extractBrandingFromToolPart,
  extractYouTubeAnalyzeFromToolPart,
  extractDesignFromToolPart,
} from "./artifact-extractors"

/** Artifact-producing tools — used for auto-opening the panel during streaming */
const ARTIFACT_TOOL_TYPES = new Set(["tool-create_artifact", "tool-create_quiz", "tool-create_review", "tool-generate_image", "tool-youtube_analyze", "tool-extract_branding", "tool-generate_design", "tool-edit_design"])

/**
 * Map saved DB parts (tool-call, tool-result) to AI SDK 6 typed tool UI parts.
 * This enables artifact cards to render when reloading a chat.
 */
export function mapSavedPartsToUI(parts: unknown[]): unknown[] {
  if (!Array.isArray(parts)) return parts

  const mapped: unknown[] = []
  const toolResults = new Map<string, unknown>()

  // First pass: collect tool results by toolCallId
  for (const part of parts) {
    const p = part as Record<string, unknown>
    if (p.type === "tool-result" && typeof p.toolCallId === "string") {
      toolResults.set(p.toolCallId, p.result)
    }
  }

  // Second pass: build UI parts
  for (const part of parts) {
    const p = part as Record<string, unknown>
    if (p.type === "text") {
      mapped.push(part)
    } else if (p.type === "file") {
      mapped.push(part)
    } else if (p.type === "step-start") {
      // Preserve step boundaries — convertToModelMessages uses these to split
      // multi-step tool interactions into separate model messages
      mapped.push(part)
    } else if (p.type === "tool-call" && typeof p.toolName === "string") {
      const result = toolResults.get(p.toolCallId as string)
      // Convert to AI SDK 6 tool UI part format (type: "tool-{toolName}")
      mapped.push({
        type: `tool-${p.toolName}`,
        toolCallId: p.toolCallId,
        state: result !== undefined ? "output-available" : "input-available",
        input: p.args ?? {},
        output: result,
      })
    }
    // tool-result parts are consumed above, not added separately
  }

  return mapped
}

/**
 * Backward compatibility for old review artifacts (type: "review", JSON content).
 * Extracts markdown content from JSON wrapper and treats as markdown with reviewMode.
 */
function resolveReviewCompat(data: { id: string; title: string; content: string; type: string; language?: string; version?: number }): Omit<SelectedArtifact, "isStreaming"> {
  if (data.type === "review") {
    // Old format: JSON-wrapped review content
    try {
      const parsed = JSON.parse(data.content) as { content?: string; title?: string }
      return {
        id: data.id,
        title: data.title,
        content: parsed.content ?? data.content,
        type: "markdown",
        language: data.language ?? undefined,
        version: data.version ?? 1,
        reviewMode: true,
      }
    } catch {
      // Invalid JSON — use raw content
      return {
        id: data.id,
        title: data.title,
        content: data.content,
        type: "markdown",
        language: data.language ?? undefined,
        version: data.version ?? 1,
        reviewMode: true,
      }
    }
  }

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    type: data.type as ArtifactContentType,
    language: data.language ?? undefined,
    version: data.version ?? 1,
  }
}

interface UseArtifactOptions {
  messages: MessageLike[]
  status: string
}

/**
 * Custom hook for managing artifact state: detection (real + fake tool calls),
 * selection, save, and card click handling.
 */
export function useArtifact({ messages, status }: UseArtifactOptions) {
  const [selectedArtifact, setSelectedArtifact] = useState<SelectedArtifact | null>(null)

  // Watch for artifact-producing tool parts in the latest message during streaming
  useEffect(() => {
    if (messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== "assistant") return

    for (const part of lastMsg.parts ?? []) {
      // Try artifact-producing tools in order
      const extracted = extractArtifactFromToolPart(part) ?? extractQuizFromToolPart(part) ?? extractReviewFromToolPart(part) ?? extractImageFromToolPart(part) ?? extractBrandingFromToolPart(part) ?? extractYouTubeAnalyzeFromToolPart(part) ?? extractDesignFromToolPart(part)
      if (extracted) {
        setSelectedArtifact((prev) => {
          // Server-side artifacts (image, youtube_search): skip auto-open on chat reload
          // (no panel open, content empty). Allow updates when panel IS open (streaming → output-available).
          const isServerSideArtifact = !extracted.artifact.content && !extracted.isStreaming
          if (isServerSideArtifact) {
            if (!prev || prev.type !== extracted.artifact.type) {
              return prev
            }
          }

          // Skip re-setting server-side artifacts that already have content loaded
          // (prevents flicker when text continues streaming after content is ready)
          if (prev && prev.content && !prev.isStreaming
            && extracted.artifact.id === prev.id) {
            return prev
          }
          return { ...extracted.artifact, isStreaming: extracted.isStreaming }
        })
      }
    }
  }, [messages])

  // Auto-fetch server-side artifact content from DB.
  // Server-side artifacts (image, youtube_search, etc.) arrive with empty content
  // (generated in the tool's execute handler). This effect fetches the actual content
  // once an artifactId is available.
  const serverFetchedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedArtifact) return
    if (selectedArtifact.isStreaming) return
    if (!selectedArtifact.id) return
    if (selectedArtifact.content) return // Already has content

    // Prevent duplicate fetches for the same artifact
    if (serverFetchedRef.current === selectedArtifact.id) return
    serverFetchedRef.current = selectedArtifact.id

    fetch(`/api/artifacts/${selectedArtifact.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.content) {
          setSelectedArtifact((prev) =>
            prev && prev.id === data.id
              ? { ...prev, content: data.content, version: data.version ?? prev.version }
              : prev
          )
        }
      })
      .catch((err) => {
        console.warn("[useArtifact] Server artifact fetch failed:", err)
        serverFetchedRef.current = null
      })
  }, [selectedArtifact?.id, selectedArtifact?.type, selectedArtifact?.isStreaming, selectedArtifact?.content])

  // Detect fake artifact tool calls in text when streaming finishes
  const prevStatusRef = useRef(status)
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === "streaming" || prevStatusRef.current === "submitted"
    prevStatusRef.current = status
    if (!wasStreaming || status !== "ready") return
    if (selectedArtifact) return // Already have an artifact open

    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role !== "assistant") return

    const hasRealToolPart = lastMsg.parts?.some((p) => ARTIFACT_TOOL_TYPES.has(p.type))
    if (hasRealToolPart) return

    const fullText = lastMsg.parts
      ?.filter((p): p is { type: string; text: string; [key: string]: unknown } => p.type === "text" && "text" in p)
      .map((p) => p.text)
      .join("") ?? ""

    const fakeArtifact = parseFakeArtifactCall(fullText)
    if (fakeArtifact) {
      setSelectedArtifact({
        title: fakeArtifact.title,
        content: fakeArtifact.content,
        type: fakeArtifact.type,
        language: fakeArtifact.language,
        version: 1,
        isStreaming: false,
      })
    }
  }, [status, messages, selectedArtifact])

  const handleArtifactCardClick = useCallback(
    (artifact: { title: string; content: string; type: string; language?: string; id?: string; version?: number; reviewMode?: boolean }) => {
      // Skip fetch if same artifact is already loaded (saves a network request on re-click)
      if (artifact.id && selectedArtifact?.id === artifact.id && !selectedArtifact?.isStreaming) {
        return
      }
      // If we have an artifactId, fetch latest from DB (content may have been edited)
      if (artifact.id) {
        fetch(`/api/artifacts/${artifact.id}`)
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data) {
              const resolved = resolveReviewCompat(data)
              setSelectedArtifact({
                ...resolved,
                isStreaming: false,
                reviewMode: artifact.reviewMode || resolved.reviewMode,
              })
            } else {
              // Fallback to tool part data
              setSelectedArtifact({
                id: artifact.id,
                title: artifact.title,
                content: artifact.content,
                type: artifact.type as ArtifactContentType,
                language: artifact.language,
                version: artifact.version ?? 1,
                isStreaming: false,
                reviewMode: artifact.reviewMode,
              })
            }
          })
          .catch(() => {
            // Fallback to tool part data on network error
            setSelectedArtifact({
              id: artifact.id,
              title: artifact.title,
              content: artifact.content,
              type: artifact.type as ArtifactContentType,
              language: artifact.language,
              version: artifact.version ?? 1,
              isStreaming: false,
              reviewMode: artifact.reviewMode,
            })
          })
      } else {
        setSelectedArtifact({
          title: artifact.title,
          content: artifact.content,
          type: artifact.type as ArtifactContentType,
          language: artifact.language,
          version: artifact.version ?? 1,
          isStreaming: false,
          reviewMode: artifact.reviewMode,
        })
      }
    },
    [selectedArtifact?.id, selectedArtifact?.isStreaming]
  )

  const handleArtifactSave = useCallback(
    async (content: string) => {
      if (!selectedArtifact?.id) return
      try {
        const res = await fetch(`/api/artifacts/${selectedArtifact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            expectedVersion: selectedArtifact.version,
          }),
        })
        if (res.ok) {
          const updated = await res.json()
          setSelectedArtifact((prev) =>
            prev ? { ...prev, content, version: updated.version ?? prev.version + 1 } : null
          )
        } else if (res.status === 409) {
          // Version conflict — reload latest
          const conflictData = await res.json()
          console.warn("[ArtifactPanel] Version conflict. Server version:", conflictData.currentVersion)
          // Refetch the latest version
          const latest = await fetch(`/api/artifacts/${selectedArtifact.id}`)
          if (latest.ok) {
            const data = await latest.json()
            setSelectedArtifact((prev) =>
              prev ? { ...prev, content: data.content, version: data.version } : null
            )
          }
        }
      } catch (err) {
        console.warn("[ArtifactPanel] Failed to save:", err)
      }
    },
    [selectedArtifact?.id, selectedArtifact?.version]
  )

  const closeArtifact = useCallback(() => setSelectedArtifact(null), [])

  const openArtifactById = useCallback(
    (artifactId: string) => {
      fetch(`/api/artifacts/${artifactId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            const resolved = resolveReviewCompat(data)
            setSelectedArtifact({
              ...resolved,
              isStreaming: false,
            })
          }
        })
        .catch(() => {
          // Silently fail — artifact may not exist
        })
    },
    []
  )

  return {
    selectedArtifact,
    handleArtifactCardClick,
    handleArtifactSave,
    closeArtifact,
    openArtifactById,
  }
}
