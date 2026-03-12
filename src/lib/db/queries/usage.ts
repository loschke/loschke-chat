import { eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { usageLogs } from "@/lib/db/schema/usage-logs"

interface UsageInput {
  userId: string
  chatId?: string
  messageId?: string
  modelId: string
  promptTokens: number
  completionTokens: number
}

export async function logUsage(input: UsageInput) {
  const db = getDb()
  await db.insert(usageLogs).values({
    id: nanoid(12),
    userId: input.userId,
    chatId: input.chatId ?? null,
    messageId: input.messageId ?? null,
    modelId: input.modelId,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens: input.promptTokens + input.completionTokens,
  })
}

export async function getUserUsage(userId: string) {
  const db = getDb()
  const [result] = await db
    .select({
      totalPromptTokens: sql<number>`coalesce(sum(${usageLogs.promptTokens}), 0)`,
      totalCompletionTokens: sql<number>`coalesce(sum(${usageLogs.completionTokens}), 0)`,
      totalTokens: sql<number>`coalesce(sum(${usageLogs.totalTokens}), 0)`,
      messageCount: sql<number>`count(*)`,
    })
    .from(usageLogs)
    .where(eq(usageLogs.userId, userId))
  return result
}
