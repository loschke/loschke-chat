import { eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { usageLogs } from "@/lib/db/schema/usage-logs"

interface UsageInput {
  userId: string
  chatId?: string
  messageId?: string
  modelId: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  reasoningTokens?: number
  cachedInputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  stepCount: number
}

export async function logUsage(input: UsageInput) {
  const db = getDb()
  await db.insert(usageLogs).values({
    id: nanoid(12),
    userId: input.userId,
    chatId: input.chatId ?? null,
    messageId: input.messageId ?? null,
    modelId: input.modelId,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    totalTokens: input.totalTokens,
    reasoningTokens: input.reasoningTokens ?? null,
    cachedInputTokens: input.cachedInputTokens ?? null,
    cacheReadTokens: input.cacheReadTokens ?? null,
    cacheWriteTokens: input.cacheWriteTokens ?? null,
    stepCount: input.stepCount,
  })
}

export async function getUserUsage(userId: string) {
  const db = getDb()
  const [result] = await db
    .select({
      totalInputTokens: sql<number>`coalesce(sum(${usageLogs.inputTokens}), 0)`,
      totalOutputTokens: sql<number>`coalesce(sum(${usageLogs.outputTokens}), 0)`,
      totalTokens: sql<number>`coalesce(sum(${usageLogs.totalTokens}), 0)`,
      totalReasoningTokens: sql<number>`coalesce(sum(${usageLogs.reasoningTokens}), 0)`,
      totalCachedInputTokens: sql<number>`coalesce(sum(${usageLogs.cachedInputTokens}), 0)`,
      totalCacheReadTokens: sql<number>`coalesce(sum(${usageLogs.cacheReadTokens}), 0)`,
      totalCacheWriteTokens: sql<number>`coalesce(sum(${usageLogs.cacheWriteTokens}), 0)`,
      requestCount: sql<number>`count(*)`,
    })
    .from(usageLogs)
    .where(eq(usageLogs.userId, userId))
  return result
}
