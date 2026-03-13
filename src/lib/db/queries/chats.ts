import { eq, desc, and, count } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { chats } from "@/lib/db/schema/chats"
import { messages } from "@/lib/db/schema/messages"

export async function createChat(userId: string, options?: { title?: string; modelId?: string; expertId?: string }) {
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
    })
    .returning()
  return chat
}

export async function getUserChats(userId: string) {
  const db = getDb()
  return db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
}

export async function getChatById(chatId: string) {
  const db = getDb()
  const [chat] = await db
    .select()
    .from(chats)
    .where(eq(chats.id, chatId))
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

export async function touchChat(chatId: string, userId: string) {
  const db = getDb()
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
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
