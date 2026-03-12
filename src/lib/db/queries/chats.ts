import { eq, desc, and } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { chats } from "@/lib/db/schema/chats"
import { messages } from "@/lib/db/schema/messages"

export async function createChat(userId: string, title?: string) {
  const db = getDb()
  const id = nanoid(12)
  const [chat] = await db
    .insert(chats)
    .values({
      id,
      userId,
      title: title ?? "Neuer Chat",
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

export async function getChatWithMessages(chatId: string) {
  const db = getDb()
  const [chat] = await db
    .select()
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1)

  if (!chat) return null

  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt)

  return { ...chat, messages: chatMessages }
}

export async function updateChatTitle(chatId: string, title: string) {
  const db = getDb()
  await db
    .update(chats)
    .set({ title, updatedAt: new Date() })
    .where(eq(chats.id, chatId))
}

export async function deleteChat(chatId: string, userId: string) {
  const db = getDb()
  await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
}

export async function touchChat(chatId: string) {
  const db = getDb()
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId))
}
