import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { sharedChats } from "@/lib/db/schema/shared-chats"

/** Create a share link for a chat. Returns existing token if already shared. */
export async function createShare(chatId: string, userId: string): Promise<string> {
  const db = getDb()

  // Check if already shared
  const [existing] = await db
    .select({ token: sharedChats.token })
    .from(sharedChats)
    .where(and(eq(sharedChats.chatId, chatId), eq(sharedChats.userId, userId)))
    .limit(1)

  if (existing) return existing.token

  const id = nanoid(12)
  const token = nanoid(24)

  await db.insert(sharedChats).values({ id, chatId, userId, token })
  return token
}

/** Look up a share by its public token. */
export async function getShareByToken(token: string) {
  const db = getDb()
  const [share] = await db
    .select()
    .from(sharedChats)
    .where(eq(sharedChats.token, token))
    .limit(1)
  return share ?? null
}

/** Check if a specific chat is shared by a user. */
export async function getShareByChatId(chatId: string, userId: string) {
  const db = getDb()
  const [share] = await db
    .select()
    .from(sharedChats)
    .where(and(eq(sharedChats.chatId, chatId), eq(sharedChats.userId, userId)))
    .limit(1)
  return share ?? null
}

/** Revoke a share link. */
export async function deleteShare(chatId: string, userId: string) {
  const db = getDb()
  await db
    .delete(sharedChats)
    .where(and(eq(sharedChats.chatId, chatId), eq(sharedChats.userId, userId)))
}

/** Get all shared chatIds for a user (for sidebar badges). */
export async function getUserSharedChatIds(userId: string): Promise<Set<string>> {
  const db = getDb()
  const rows = await db
    .select({ chatId: sharedChats.chatId })
    .from(sharedChats)
    .where(eq(sharedChats.userId, userId))
  return new Set(rows.map((r) => r.chatId))
}
