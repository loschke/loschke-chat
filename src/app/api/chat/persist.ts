import { generateText, gateway, type StreamTextOnFinishCallback } from "ai"

import { features } from "@/config/features"
import { aiDefaults } from "@/config/ai"
import { getModelById } from "@/config/models"
import { saveMessages } from "@/lib/db/queries/messages"
import { logUsage } from "@/lib/db/queries/usage"
import { updateChatTitle, touchChat } from "@/lib/db/queries/chats"
import { createArtifact } from "@/lib/db/queries/artifacts"
import { parseFakeArtifactCall } from "@/lib/ai/tools/parse-fake-artifact"
import { uploadBuffer } from "@/lib/storage"
import { sanitizeFilename } from "@/lib/storage/validation"
import { nanoid } from "nanoid"

/** MIME types allowed for chat file attachments (mirrors chatConfig.upload.accept) */
const ALLOWED_PERSIST_TYPES = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf", "text/markdown", "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])

/** Max file size for R2 persistence (4MB, matches client-side limit) */
const MAX_PERSIST_SIZE = 4 * 1024 * 1024

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
  messages: Array<{
    role: string
    parts?: Array<Record<string, unknown>>
    content?: string | unknown[]
  }>
  mcpHandle?: MCPHandle | null
  userMemoryEnabled: boolean
}

/**
 * Create the onFinish callback for streamText.
 * Handles: user message persistence, assistant response assembly,
 * fake artifact detection, usage logging, title generation, touchChat.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createOnFinish(params: CreateOnFinishParams): StreamTextOnFinishCallback<Record<string, any>> {
  const { resolvedChatId, isNewChat, userId, finalModelId, expert, messages, mcpHandle, userMemoryEnabled } = params

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
                args: c.input,
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

      // Step 2: Parallel saves — user message, assistant message, usage log
      const savePromises: Promise<unknown>[] = []

      if (persistedParts) {
        savePromises.push(
          saveMessages([{
            chatId: resolvedChatId,
            role: "user",
            parts: persistedParts,
          }])
        )
      }

      if (assistantParts.length > 0) {
        savePromises.push(
          saveMessages([{
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
          }]).then((savedMessages) => {
            // Log usage after assistant message is saved (needs messageId)
            if (totalUsage) {
              const usage = totalUsage as Record<string, unknown> & typeof totalUsage
              const tokenDetails = (usage as { inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number } }).inputTokenDetails
              return logUsage({
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
          })
        )
      }

      await Promise.all(savePromises)

      // Title generation: fire-and-forget (non-blocking)
      if (isNewChat && userMsg?.role === "user") {
        const userText = userMsg.parts
          ?.filter((p: Record<string, unknown>) => p.type === "text")
          .map((p: Record<string, unknown>) => (p.text as string) || "")
          .join("") ?? ""

        if (userText.length > 0) {
          generateText({
            model: gateway(aiDefaults.model),
            system: SYSTEM_PROMPTS.titleGeneration,
            prompt: userText.slice(0, 500),
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
      // Credit deduction: fire-and-forget (after usage is logged)
      if (features.credits.enabled && totalUsage) {
        import("@/lib/credits").then(({ calculateCredits }) => {
          const creditCost = calculateCredits({
            modelId: finalModelId,
            inputTokens: totalUsage.inputTokens ?? 0,
            outputTokens: totalUsage.outputTokens ?? 0,
            reasoningTokens: totalUsage.reasoningTokens ?? undefined,
            cachedInputTokens: totalUsage.cachedInputTokens ?? undefined,
          })
          return import("@/lib/db/queries/credits").then(({ deductCredits }) =>
            deductCredits(userId, creditCost, {
              modelId: finalModelId,
              chatId: resolvedChatId,
              description: `Chat: ${getModelById(finalModelId)?.name ?? finalModelId}`,
            })
          )
        }).catch((err) => {
          console.warn("[credits] Deduction failed:", err instanceof Error ? err.message : err)
        })
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
