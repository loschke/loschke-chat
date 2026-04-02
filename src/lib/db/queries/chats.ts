import { eq, desc, and, count, lt } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { chats } from "@/lib/db/schema/chats"
import { messages } from "@/lib/db/schema/messages"

export async function createChat(userId: string, options?: { title?: string; modelId?: string; expertId?: string; projectId?: string; metadata?: Record<string, unknown> }) {
  const db = getDb()
  const id = nanoid(12)
  const [chat] = await db
    .insert(chats)
    .values({
      id,
      userId,
      title: options?.title ?? "Neuer Chat",
      modelId: options?.modelId ?? null,
      expertId: options?.expertId ?? null,
      projectId: options?.projectId ?? null,
      ...(options?.metadata ? { metadata: options.metadata } : {}),
    })
    .returning()
  return chat
}

export async function getUserChats(
  userId: string,
  options?: { limit?: number; cursor?: string }
) {
  const db = getDb()
  const limit = options?.limit ?? 50

  // Build conditions
  const conditions = [eq(chats.userId, userId)]

  // Cursor-based pagination: cursor is an updatedAt ISO string
  if (options?.cursor) {
    conditions.push(lt(chats.updatedAt, new Date(options.cursor)))
  }

  // Fetch limit+1 to determine if there are more
  const results = await db
    .select()
    .from(chats)
    .where(and(...conditions))
    .orderBy(desc(chats.updatedAt))
    .limit(limit + 1)

  const hasMore = results.length > limit
  const items = hasMore ? results.slice(0, limit) : results
  const nextCursor = hasMore && items.length > 0
    ? items[items.length - 1].updatedAt.toISOString()
    : null

  return { chats: items, hasMore, nextCursor }
}

export async function getChatById(chatId: string, userId?: string) {
  const db = getDb()
  const condition = userId
    ? and(eq(chats.id, chatId), eq(chats.userId, userId))
    : eq(chats.id, chatId)
  const [chat] = await db
    .select()
    .from(chats)
    .where(condition)
    .limit(1)
  return chat ?? null
}

export async function getChatWithMessages(
  chatId: string,
  options?: { limit?: number; offset?: number }
) {
  const db = getDb()
  const [chat] = await db
    .select()
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1)

  if (!chat) return null

  // When limit is set without offset: load the LAST N messages (most recent)
  // by fetching DESC and reversing, so the UI gets chronological order.
  if (options?.limit && options.limit > 0 && (!options.offset || options.offset === 0)) {
    const recent = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(options.limit)
    return { ...chat, messages: recent.reverse() }
  }

  // With explicit offset: load from that position (for "load older" pagination)
  let query = db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt)
    .$dynamic()

  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit)
  }
  if (options?.offset && options.offset > 0) {
    query = query.offset(options.offset)
  }

  const chatMessages = await query

  return { ...chat, messages: chatMessages }
}

export async function getMessageCount(chatId: string): Promise<number> {
  const db = getDb()
  const [result] = await db
    .select({ count: count() })
    .from(messages)
    .where(eq(messages.chatId, chatId))
  return result?.count ?? 0
}

export async function updateChatTitle(chatId: string, userId: string, title: string) {
  const db = getDb()
  await db
    .update(chats)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
}

export async function deleteChat(chatId: string, userId: string) {
  const db = getDb()
  await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
}

/**
 * Update chat's updatedAt timestamp.
 * Access control must be verified by caller via canAccessChat().
 */
export async function touchChat(chatId: string) {
  const db = getDb()
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId))
}

export async function toggleChatPin(chatId: string, userId: string, isPinned: boolean) {
  const db = getDb()
  await db
    .update(chats)
    .set({ isPinned, updatedAt: new Date() })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
}

export async function updateChatModel(chatId: string, userId: string, modelId: string) {
  const db = getDb()
  await db
    .update(chats)
    .set({ modelId, updatedAt: new Date() })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
}

export async function updateChatProject(chatId: string, userId: string, projectId: string | null) {
  const db = getDb()
  await db
    .update(chats)
    .set({ projectId, updatedAt: new Date() })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
}

export async function updateChatExpert(chatId: string, userId: string, expertId: string | null) {
  const db = getDb()
  await db
    .update(chats)
    .set({ expertId, updatedAt: new Date() })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
}

/**
 * Delete chats older than the given number of days.
 * Skips pinned chats. Messages and artifacts cascade-delete automatically.
 * Returns the number of deleted chats.
 */
export async function deleteExpiredChats(olderThanDays: number): Promise<number> {
  const db = getDb()
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
  const result = await db
    .delete(chats)
    .where(
      and(
        eq(chats.isPinned, false),
        lt(chats.updatedAt, cutoff)
      )
    )
    .returning({ id: chats.id })
  return result.length
}
