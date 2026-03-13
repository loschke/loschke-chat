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
}

interface ArtifactInput {
  type?: string
  title?: string
  content?: string
  language?: string
}

interface ArtifactOutput {
  artifactId?: string
  title?: string
  type?: string
  version?: number
}

interface ArtifactToolPart {
  type: "tool-create_artifact"
  toolCallId: string
  state: string
  input?: unknown
  output?: unknown
}

interface MessageLike {
  id: string
  role: string
  parts?: Array<{ type: string; [key: string]: unknown }>
}

/**
 * Check if a message part is a create_artifact tool invocation.
 * AI SDK 6 sends tool parts as type: "tool-{toolName}" (e.g. "tool-create_artifact").
 */
export function isCreateArtifactPart(part: { type: string }): boolean {
  return part.type === "tool-create_artifact"
}

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
        input: p.args,
        output: result,
      })
    }
    // tool-result parts are consumed above, not added separately
  }

  return mapped
}

/**
 * Extract artifact data from a create_artifact tool part.
 * Returns null if the part doesn't have sufficient data.
 */
export function extractArtifactFromToolPart(part: { type: string; [key: string]: unknown }): {
  artifact: Omit<SelectedArtifact, "isStreaming">
  isStreaming: boolean
} | null {
  if (!isCreateArtifactPart(part)) return null

  const toolPart = part as unknown as ArtifactToolPart
  const inp = toolPart.input as ArtifactInput | undefined

  if (!inp?.content) return null

  if (toolPart.state === "input-streaming" || toolPart.state === "input-available") {
    return {
      artifact: {
        title: inp.title ?? "Artifact",
        content: inp.content,
        type: (inp.type as ArtifactContentType) ?? "markdown",
        language: inp.language,
        version: 1,
      },
      isStreaming: toolPart.state === "input-streaming",
    }
  }

  if (toolPart.state === "output-available") {
    const out = toolPart.output as ArtifactOutput | undefined
    return {
      artifact: {
        id: out?.artifactId,
        title: inp.title ?? "Artifact",
        content: inp.content,
        type: (inp.type as ArtifactContentType) ?? "markdown",
        language: inp.language,
        version: out?.version ?? 1,
      },
      isStreaming: false,
    }
  }

  return null
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

  // Watch for create_artifact tool parts in the latest message during streaming
  useEffect(() => {
    if (messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== "assistant") return

    for (const part of lastMsg.parts ?? []) {
      const extracted = extractArtifactFromToolPart(part)
      if (extracted) {
        setSelectedArtifact({ ...extracted.artifact, isStreaming: extracted.isStreaming })
      }
    }
  }, [messages])

  // Detect fake artifact tool calls in text when streaming finishes
  const prevStatusRef = useRef(status)
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === "streaming" || prevStatusRef.current === "submitted"
    prevStatusRef.current = status
    if (!wasStreaming || status !== "ready") return
    if (selectedArtifact) return // Already have an artifact open

    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role !== "assistant") return

    const hasRealToolPart = lastMsg.parts?.some((p) => isCreateArtifactPart(p))
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
    (artifact: { title: string; content: string; type: string; language?: string; id?: string; version?: number }) => {
      // If we have an artifactId, fetch latest from DB (content may have been edited)
      if (artifact.id) {
        fetch(`/api/artifacts/${artifact.id}`)
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data) {
              setSelectedArtifact({
                id: data.id,
                title: data.title,
                content: data.content,
                type: data.type as ArtifactContentType,
                language: data.language ?? undefined,
                version: data.version ?? 1,
                isStreaming: false,
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
        })
      }
    },
    []
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

  return {
    selectedArtifact,
    handleArtifactCardClick,
    handleArtifactSave,
    closeArtifact,
  }
}
