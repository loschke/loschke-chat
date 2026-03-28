/**
 * Post-response operations: title generation, credits, suggestions, memory, expert update.
 */

import { generateText, gateway } from "ai"

import { features } from "@/config/features"
import { getErrorMessage, fireAndForget } from "@/lib/errors"
import { aiDefaults } from "@/config/ai"
import { getModelById } from "@/config/models"
import { updateChatTitle, touchChat, updateChatExpert } from "@/lib/db/queries/chats"
import { calculateCredits } from "@/lib/credits"
import { deductCredits } from "@/lib/db/queries/credits"
import { SYSTEM_PROMPTS } from "@/config/prompts"

import type { ChatContext } from "../resolve-context"

interface TitleGenerationParams {
  resolvedChatId: string
  userId: string
  isNewChat: boolean
  userMsg: {
    role: string
    parts?: Array<Record<string, unknown>>
  } | undefined
}

/** Generate chat title for new chats (fire-and-forget) */
export function generateTitle({ resolvedChatId, userId, isNewChat, userMsg }: TitleGenerationParams): void {
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
        .catch((err) => console.warn("Title generation failed:", getErrorMessage(err)))
    } else {
      // Fire-and-forget touchChat for new chats without text
      touchChat(resolvedChatId, userId).catch(console.error)
    }
  } else {
    // Fire-and-forget touchChat for existing chats
    touchChat(resolvedChatId, userId).catch(console.error)
  }
}

interface CreditDeductionParams {
  userId: string
  resolvedChatId: string
  finalModelId: string
  totalUsage: {
    inputTokens?: number
    outputTokens?: number
    reasoningTokens?: number
    cachedInputTokens?: number
  }
}

/** Deduct usage credits (awaited) */
export async function deductUsageCredits({ userId, resolvedChatId, finalModelId, totalUsage }: CreditDeductionParams): Promise<void> {
  if (!features.credits.enabled) return

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
      requireSufficientBalance: false,
    })
  } catch (err) {
    console.error("[credits] Deduction failed:", getErrorMessage(err))
  }
}

interface SuggestedRepliesParams {
  resolvedChatId: string
  userId: string
  messages: Array<{ role: string; parts?: Array<Record<string, unknown>>; content?: string | unknown[] }>
  savedAssistantMessageId: string
  finalModelId: string
}

/** Trigger suggested replies generation (fire-and-forget) */
export function triggerSuggestedReplies({ resolvedChatId, userId, messages, savedAssistantMessageId, finalModelId }: SuggestedRepliesParams): void {
  fireAndForget("suggestions", async () => {
    const { generateSuggestedReplies } = await import("@/lib/ai/suggested-replies")
    await generateSuggestedReplies(resolvedChatId, userId, messages, savedAssistantMessageId, finalModelId)
  })
}

interface MemoryExtractionParams {
  userId: string
  resolvedChatId: string
  messages: Array<{ role: string; parts?: Array<Record<string, unknown>>; content?: string | unknown[] }>
  totalMessageCount: number
}

/** Trigger memory extraction (fire-and-forget) */
export async function triggerMemoryExtraction({ userId, resolvedChatId, messages, totalMessageCount }: MemoryExtractionParams): Promise<void> {
  if (!features.memory.enabled) return

  const { memoryConfig } = await import("@/config/memory")
  if (totalMessageCount >= memoryConfig.minMessages) {
    fireAndForget("memory", async () => {
      const { extractMemories } = await import("@/lib/memory")
      await extractMemories(userId, resolvedChatId, messages)
    })
  }
}

interface ExpertUpdateParams {
  resolvedChatId: string
  userId: string
  isNewChat: boolean
  expert: ChatContext["expert"]
  existingExpertId?: string | null
}

/** Update expert if changed mid-chat (fire-and-forget) */
export function updateExpertIfChanged({ resolvedChatId, userId, isNewChat, expert, existingExpertId }: ExpertUpdateParams): void {
  if (isNewChat) return

  const newExpertId = expert?.id ?? null
  const oldExpertId = existingExpertId ?? null
  if (newExpertId !== oldExpertId) {
    fireAndForget("persist", () => updateChatExpert(resolvedChatId, userId, newExpertId))
  }
}
