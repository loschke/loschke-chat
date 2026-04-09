/**
 * onFinish callback orchestrator for chat stream persistence.
 * Coordinates: file persistence, response assembly, message saving, and post-response tasks.
 */

import type { StreamTextOnFinishCallback } from "ai"

import { after } from "next/server"

import { getErrorMessage } from "@/lib/errors"
import { getModelById } from "@/config/models"
import { saveMessages } from "@/lib/db/queries/messages"
import { logUsage } from "@/lib/db/queries/usage"

import type { ChatContext } from "../resolve-context"

import { persistFilePartsToR2, persistCodeExecutionFiles } from "./persist-files"
import { assembleAssistantParts, detectAndCreateFakeArtifact } from "./assemble-parts"
import { generateTitle, deductUsageCredits, triggerSuggestedReplies, updateExpertIfChanged } from "./post-response"

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
  userSuggestedRepliesEnabled: boolean
}

/**
 * Create the onFinish callback for streamText.
 * Handles: user message persistence, assistant response assembly,
 * fake artifact detection, usage logging, title generation, touchChat.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createOnFinish(params: CreateOnFinishParams): StreamTextOnFinishCallback<Record<string, any>> {
  const { resolvedChatId, isNewChat, userId, finalModelId, expert, existingExpertId, messages, mcpHandle, userSuggestedRepliesEnabled } = params

  return async ({ response, totalUsage, steps }) => {
    try {
      // 1. R2 persist — mutates parts for user message (awaited)
      const userMsg = messages[messages.length - 1]
      let persistedParts: Array<Record<string, unknown>> | null = null
      if (userMsg?.role === "user") {
        const rawParts = userMsg.parts ?? [{ type: "text", text: typeof userMsg.content === "string" ? userMsg.content : "" }]
        persistedParts = await persistFilePartsToR2(rawParts as Array<Record<string, unknown>>, resolvedChatId, userId)
      }

      // 2. Assemble assistant response parts (sync)
      const assistantParts = assembleAssistantParts(response.messages)

      // 3 & 4. Concurrent fake artifact detection and code execution file persistence
      // Both operations may await DB writes or external APIs, run concurrently to reduce latency
      await Promise.all([
        detectAndCreateFakeArtifact(assistantParts, resolvedChatId),
        persistCodeExecutionFiles(assistantParts, resolvedChatId, userId),
      ])

      // 5. Save user message FIRST (sequential) to guarantee correct ordering
      let savedAssistantMessageId: string | null = null

      if (persistedParts) {
        await saveMessages([{ chatId: resolvedChatId, role: "user", parts: persistedParts }])
      }

      // 6. Save assistant message + usage log (awaited)
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

      // 7. Expert update (after response)
      after(() => updateExpertIfChanged({ resolvedChatId, userId, isNewChat, expert, existingExpertId }))

      // 8. Title generation (after response)
      after(() => generateTitle({ resolvedChatId, userId, isNewChat, userMsg }))

      // 9. Credit deduction (awaited)
      if (totalUsage) {
        await deductUsageCredits({ userId, resolvedChatId, finalModelId, totalUsage })
      }

      // 10. Suggested replies (after response)
      if (userSuggestedRepliesEnabled && savedAssistantMessageId && assistantParts.length > 0) {
        after(() => triggerSuggestedReplies({ resolvedChatId, userId, messages, savedAssistantMessageId, finalModelId }))
      }

    } catch (error) {
      console.error("Failed to persist chat data:", getErrorMessage(error))
    } finally {
      // MCP cleanup
      if (mcpHandle) {
        after(() => mcpHandle.close().catch((err) => console.warn("[MCP]", getErrorMessage(err))))
      }
    }
  }
}
