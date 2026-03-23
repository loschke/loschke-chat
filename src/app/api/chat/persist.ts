import { generateText, gateway, type StreamTextOnFinishCallback } from "ai"

import { features } from "@/config/features"
import { aiDefaults } from "@/config/ai"
import { getModelById } from "@/config/models"
import { saveMessages } from "@/lib/db/queries/messages"
import { logUsage } from "@/lib/db/queries/usage"
import { updateChatTitle, touchChat, updateChatExpert } from "@/lib/db/queries/chats"
import { createArtifact } from "@/lib/db/queries/artifacts"
import { parseFakeArtifactCall } from "@/lib/ai/tools/parse-fake-artifact"
import { uploadBuffer, isR2Url, fetchFromR2 } from "@/lib/storage"
import { extractDocumentContent, EXTRACTABLE_MIME_TYPES } from "@/lib/ai/document-extraction"
import { sanitizeFilename } from "@/lib/storage/validation"
import { ALLOWED_MIME_TYPES } from "@/lib/storage/types"
import { nanoid } from "nanoid"
import { calculateCredits } from "@/lib/credits"
import { deductCredits } from "@/lib/db/queries/credits"

/** MIME types allowed for chat file attachments — derived from storage types */
const ALLOWED_PERSIST_TYPES: Set<string> = new Set(ALLOWED_MIME_TYPES)

/** Max file size for R2 persistence (10MB, matches client-side limit) */
const MAX_PERSIST_SIZE = 10 * 1024 * 1024

import { SYSTEM_PROMPTS } from "./resolve-context"
import type { ChatContext } from "./resolve-context"

/**
 * Persist file parts (data URLs) to R2 storage.
 * Replaces inline data URLs with R2 URLs for efficient DB storage.
 * Falls back silently if R2 is not configured or upload fails.
 */
async function persistFilePartsToR2(
  parts: Array<Record<string, unknown>>,
  chatId: string,
  userId: string
): Promise<Array<Record<string, unknown>>> {
  if (!features.storage.enabled) return parts

  const result: Array<Record<string, unknown>> = []

  for (const part of parts) {
    // Files already uploaded to R2 (from pre-signed direct upload):
    // - Documents: extract text and persist as text part (avoids re-fetch on follow-up messages)
    // - Images: keep R2-URL as-is (must stay binary for LLM)
    if (part.type === "file" && typeof part.url === "string" && isR2Url(part.url as string)) {
      const mediaType = (part.mediaType as string) ?? ""
      const filename = (part.filename as string) ?? "attachment"

      if (EXTRACTABLE_MIME_TYPES.has(mediaType)) {
        try {
          const buffer = await fetchFromR2(part.url as string)
          const extractedText = await extractDocumentContent(buffer, mediaType, filename)
          // Single file part: UI shows file chip, LLM gets extractedText via build-messages.ts
          result.push({
            type: "file",
            url: part.url,
            mediaType,
            filename,
            extracted: true,
            extractedText,
          })
          console.log(`[persist] Extracted text from ${filename} (${mediaType}, ${buffer.length} bytes)`)
        } catch (err) {
          console.warn(`[persist] Extraction failed for ${filename}, keeping R2 URL:`, err instanceof Error ? err.message : "Unknown")
          result.push(part)
        }
      } else {
        // Images and other non-extractable types: keep R2-URL
        result.push(part)
      }
      continue
    }

    // FileUIPart uses `url` for data URLs, but after fixFilePartsForGateway `data` may also exist
    const inlineData = (typeof part.url === "string" && (part.url as string).startsWith("data:"))
      ? (part.url as string)
      : (typeof part.data === "string" && (part.data as string).startsWith("data:"))
        ? (part.data as string)
        : null

    if (part.type === "file" && inlineData) {
      try {
        const dataUrl = inlineData
        const commaIdx = dataUrl.indexOf(",")
        if (commaIdx === -1) {
          result.push(part)
          continue
        }

        // Extract MIME type and base64 data
        const header = dataUrl.slice(0, commaIdx)
        const mimeMatch = header.match(/data:([^;]+)/)
        const mediaType = mimeMatch?.[1] ?? (part.mediaType as string) ?? "application/octet-stream"

        // Validate MIME type against allowlist
        if (!ALLOWED_PERSIST_TYPES.has(mediaType)) {
          console.warn(`Skipping file part with disallowed MIME type: ${mediaType}`)
          result.push(part)
          continue
        }

        const base64 = dataUrl.slice(commaIdx + 1)
        const buffer = Buffer.from(base64, "base64")

        // Validate file size
        if (buffer.length > MAX_PERSIST_SIZE) {
          console.warn(`Skipping file part exceeding size limit: ${buffer.length} bytes`)
          result.push(part)
          continue
        }

        const rawFilename = (part.filename as string) ?? `attachment-${nanoid(6)}`
        const filename = sanitizeFilename(rawFilename) || `attachment-${nanoid(6)}`
        const ext = filename.includes(".") ? "" : `.${mediaType.split("/")[1] ?? "bin"}`
        const storageKey = `chat-attachments/${userId}/${chatId}/${nanoid()}-${filename}${ext}`

        const url = await uploadBuffer(buffer, mediaType, filename, storageKey)

        result.push({
          type: "file",
          url,
          mediaType: part.mediaType ?? mediaType,
          filename: part.filename ?? filename,
        })
      } catch (err) {
        console.warn("R2 upload failed for file part, keeping data URL:", err instanceof Error ? err.message : "Unknown")
        result.push(part)
      }
    } else {
      result.push(part)
    }
  }

  return result
}

interface MCPHandle {
  close: () => Promise<void>
}

interface CreateOnFinishParams {
  resolvedChatId: string
  isNewChat: boolean
  userId: string
  finalModelId: string
  expert: ChatContext["expert"]
  existingExpertId?: string | null
  messages: Array<{
    role: string
    parts?: Array<Record<string, unknown>>
    content?: string | unknown[]
  }>
  mcpHandle?: MCPHandle | null
  userMemoryEnabled: boolean
  userSuggestedRepliesEnabled: boolean
}

/**
 * Create the onFinish callback for streamText.
 * Handles: user message persistence, assistant response assembly,
 * fake artifact detection, usage logging, title generation, touchChat.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createOnFinish(params: CreateOnFinishParams): StreamTextOnFinishCallback<Record<string, any>> {
  const { resolvedChatId, isNewChat, userId, finalModelId, expert, existingExpertId, messages, mcpHandle, userMemoryEnabled, userSuggestedRepliesEnabled } = params

  return async ({ response, totalUsage, steps }) => {
    try {
      // Step 1: R2 persist must complete first (mutates parts for user message)
      const userMsg = messages[messages.length - 1]
      let persistedParts: Array<Record<string, unknown>> | null = null
      if (userMsg?.role === "user") {
        const rawParts = userMsg.parts ?? [{ type: "text", text: typeof userMsg.content === "string" ? userMsg.content : "" }]
        persistedParts = await persistFilePartsToR2(
          rawParts as Array<Record<string, unknown>>,
          resolvedChatId,
          userId
        )
      }

      // Assemble assistant response parts (no I/O, pure data transform)
      const assistantParts: Array<Record<string, unknown>> = []
      let prevRole: string | null = null

      for (const m of response.messages) {
        if (!Array.isArray(m.content)) continue

        if (m.role === "assistant" && prevRole === "tool") {
          assistantParts.push({ type: "step-start" })
        }
        prevRole = m.role

        if (m.role === "assistant") {
          for (const c of m.content) {
            if (c.type === "text") {
              assistantParts.push({ type: "text", text: c.text })
            } else if (c.type === "tool-call") {
              assistantParts.push({
                type: "tool-call",
                toolCallId: c.toolCallId,
                toolName: c.toolName,
                args: c.input ?? {},
              })
            }
          }
        } else if (m.role === "tool") {
          for (const c of m.content) {
            if (c.type === "tool-result") {
              assistantParts.push({
                type: "tool-result",
                toolCallId: c.toolCallId,
                toolName: c.toolName,
                result: c.output,
              })
            }
          }
        }
      }

      // Detect fake artifact tool calls in text (models that can't do tool calling)
      const fullText = assistantParts
        .filter((p) => p.type === "text")
        .map((p) => p.text as string)
        .join("")
      const fakeArtifact = parseFakeArtifactCall(fullText)
      if (fakeArtifact) {
        try {
          const artifact = await createArtifact({
            chatId: resolvedChatId,
            type: fakeArtifact.type,
            title: fakeArtifact.title,
            content: fakeArtifact.content,
            language: fakeArtifact.language,
          })

          const cleanText = [fakeArtifact.textBefore, fakeArtifact.textAfter].filter(Boolean).join("\n\n")
          const nonTextParts = assistantParts.filter((p) => p.type !== "text")
          assistantParts.length = 0
          if (cleanText) {
            assistantParts.push({ type: "text", text: cleanText })
          }
          const fakeToolCallId = `fake-${artifact.id}`
          assistantParts.push({
            type: "tool-call",
            toolCallId: fakeToolCallId,
            toolName: "create_artifact",
            args: {
              type: fakeArtifact.type,
              title: fakeArtifact.title,
              content: fakeArtifact.content,
              language: fakeArtifact.language,
            },
          })
          assistantParts.push({
            type: "tool-result",
            toolCallId: fakeToolCallId,
            toolName: "create_artifact",
            result: {
              artifactId: artifact.id,
              title: artifact.title,
              type: artifact.type,
              version: artifact.version,
            },
          })
          assistantParts.push(...nonTextParts)
        } catch (err) {
          console.error("Failed to create artifact from fake tool call:", err instanceof Error ? err.message : "Unknown")
        }
      }

      // Step 2: Save user message FIRST (sequential) to guarantee correct ordering.
      // User message save may include extraction which takes time — if saved in parallel
      // with assistant, the assistant could get an earlier timestamp and appear first in UI.
      let savedAssistantMessageId: string | null = null

      if (persistedParts) {
        await saveMessages([{
          chatId: resolvedChatId,
          role: "user",
          parts: persistedParts,
        }])
      }

      // Step 3: Save assistant message + usage log
      if (assistantParts.length > 0) {
        const savedMessages = await saveMessages([{
          chatId: resolvedChatId,
          role: "assistant",
          parts: assistantParts,
          metadata: {
            modelId: finalModelId,
            modelName: getModelById(finalModelId)?.name ?? finalModelId.split("/").pop(),
            finishReason: response.messages[response.messages.length - 1] ? "stop" : undefined,
            ...(expert && { expertId: expert.id, expertName: expert.name }),
            ...(totalUsage && {
              inputTokens: totalUsage.inputTokens ?? 0,
              outputTokens: totalUsage.outputTokens ?? 0,
              totalTokens: totalUsage.totalTokens ?? (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0),
            }),
          },
        }])
        savedAssistantMessageId = savedMessages[0]?.id ?? null

        // Log usage after assistant message is saved (needs messageId)
        if (totalUsage) {
          const usage = totalUsage as Record<string, unknown> & typeof totalUsage
          const tokenDetails = (usage as { inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number } }).inputTokenDetails
          await logUsage({
            userId,
            chatId: resolvedChatId,
            messageId: savedMessages[0]?.id,
            modelId: finalModelId,
            inputTokens: totalUsage.inputTokens ?? 0,
            outputTokens: totalUsage.outputTokens ?? 0,
            totalTokens: totalUsage.totalTokens ?? (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0),
            reasoningTokens: totalUsage.reasoningTokens ?? undefined,
            cachedInputTokens: totalUsage.cachedInputTokens ?? undefined,
            cacheReadTokens: tokenDetails?.cacheReadTokens ?? undefined,
            cacheWriteTokens: tokenDetails?.cacheWriteTokens ?? undefined,
            stepCount: steps?.length ?? 1,
          })
        }
      }

      console.log(`[persist] Saved: chat=${resolvedChatId}, user=${!!persistedParts}, assistant=${!!savedAssistantMessageId}, parts=${assistantParts.length}`)

      // Title generation: fire-and-forget (non-blocking)
      if (isNewChat && userMsg?.role === "user") {
        const userText = userMsg.parts
          ?.filter((p: Record<string, unknown>) => p.type === "text")
          .map((p: Record<string, unknown>) => (p.text as string) || "")
          .join("") ?? ""

        // Include attached filenames for context so the title reflects the file content
        const attachedFiles = userMsg.parts
          ?.filter((p: Record<string, unknown>) => p.type === "file" && p.filename)
          .map((p: Record<string, unknown>) => p.filename as string) ?? []
        const fileContext = attachedFiles.length > 0
          ? `\n[Angehängte Dateien: ${attachedFiles.join(", ")}]`
          : ""

        if (userText.length > 0 || attachedFiles.length > 0) {
          const titlePrompt = (userText || "Analyse einer Datei") + fileContext
          generateText({
            model: gateway(aiDefaults.model),
            system: SYSTEM_PROMPTS.titleGeneration,
            prompt: titlePrompt.slice(0, 500),
            maxOutputTokens: 30,
            temperature: 0.3,
          })
            .then((titleResult) => {
              const title = titleResult.text
                .trim()
                .replace(/^[#*_>"'\s]+/, "")
                .replace(/["']+$/, "")
                .trim()
                .slice(0, 80)
              if (title) {
                return updateChatTitle(resolvedChatId, userId, title)
              }
            })
            .then(() => touchChat(resolvedChatId, userId))
            .catch((err) => console.warn("Title generation failed:", err instanceof Error ? err.message : "Unknown"))
        } else {
          // Fire-and-forget touchChat for new chats without text
          touchChat(resolvedChatId, userId).catch(console.error)
        }
      } else {
        // Fire-and-forget touchChat for existing chats
        touchChat(resolvedChatId, userId).catch(console.error)
      }
      // Expert switch persistence: update chat if expert changed mid-chat
      if (!isNewChat) {
        const newExpertId = expert?.id ?? null
        const oldExpertId = existingExpertId ?? null
        if (newExpertId !== oldExpertId) {
          updateChatExpert(resolvedChatId, userId, newExpertId)
            .catch((err) => console.warn("[persist] Expert update failed:", err instanceof Error ? err.message : err))
        }
      }

      // Credit deduction: awaited (after usage is logged, before fire-and-forget tasks)
      if (features.credits.enabled && totalUsage) {
        try {
          const creditCost = calculateCredits({
            modelId: finalModelId,
            inputTokens: totalUsage.inputTokens ?? 0,
            outputTokens: totalUsage.outputTokens ?? 0,
            reasoningTokens: totalUsage.reasoningTokens ?? undefined,
            cachedInputTokens: totalUsage.cachedInputTokens ?? undefined,
          })
          await deductCredits(userId, creditCost, {
            modelId: finalModelId,
            chatId: resolvedChatId,
            description: `Chat: ${getModelById(finalModelId)?.name ?? finalModelId}`,
          })
        } catch (err) {
          console.error("[credits] Deduction failed:", err instanceof Error ? err.message : err)
        }
      }

      // Suggested replies generation: fire-and-forget (after messages are saved)
      if (userSuggestedRepliesEnabled && savedAssistantMessageId && assistantParts.length > 0) {
        import("@/lib/ai/suggested-replies").then(({ generateSuggestedReplies }) =>
          generateSuggestedReplies(resolvedChatId, userId, messages, savedAssistantMessageId!, finalModelId)
            .catch((err) => console.warn("[suggestions]", err instanceof Error ? err.message : err))
        )
      }

      // Memory extraction: fire-and-forget (after messages are saved)
      if (features.memory.enabled && userMemoryEnabled) {
        const { memoryConfig } = await import("@/config/memory")
        const totalMessages = messages.length + 1 // +1 for the assistant response
        if (totalMessages >= memoryConfig.minMessages) {
          import("@/lib/memory").then(({ extractMemories }) =>
            extractMemories(userId, resolvedChatId, messages).catch((err) =>
              console.warn("[memory] Extraction failed:", err instanceof Error ? err.message : err)
            )
          )
        }
      }
    } catch (error) {
      console.error("Failed to persist chat data:", error instanceof Error ? error.message : "Unknown error")
    } finally {
      // Close MCP connections
      if (mcpHandle) {
        mcpHandle.close().catch((err) =>
          console.warn("[MCP] Failed to close connections:", err instanceof Error ? err.message : err)
        )
      }
    }
  }
}
