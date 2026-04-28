import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { chatShares } from "@/lib/db/schema/chat-shares"
import { chats } from "@/lib/db/schema/chats"
import { users } from "@/lib/db/schema/users"

/** Share a chat with another user. Idempotent — returns existing if already shared. */
export async function shareChatWithUser(chatId: string, ownerId: string, sharedWithId: string) {
  const db = getDb()

  const [existing] = await db
    .select()
    .from(chatShares)
    .where(and(eq(chatShares.chatId, chatId), eq(chatShares.sharedWithId, sharedWithId)))
    .limit(1)

  if (existing) return existing

  const id = nanoid(12)
  const [share] = await db
    .insert(chatShares)
    .values({ id, chatId, ownerId, sharedWithId })
    .returning()
  return share
}

/** Revoke a chat share. Only the owner can revoke. */
export async function revokeChatShare(shareId: string, ownerId: string) {
  const db = getDb()
  const [deleted] = await db
    .delete(chatShares)
    .where(and(eq(chatShares.id, shareId), eq(chatShares.ownerId, ownerId)))
    .returning()
  return deleted ?? null
}

/** Get all recipients of a shared chat, with user info. */
export async function getChatShareRecipients(chatId: string, ownerId: string) {
  const db = getDb()
  return db
    .select({
      id: chatShares.id,
      sharedWithId: chatShares.sharedWithId,
      createdAt: chatShares.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(chatShares)
    .innerJoin(users, eq(users.authSub, chatShares.sharedWithId))
    .where(and(eq(chatShares.chatId, chatId), eq(chatShares.ownerId, ownerId)))
}

/** Get all chats shared with a user, with chat and owner info. */
export async function getChatsSharedWithMe(userId: string) {
  const db = getDb()
  return db
    .select({
      id: chats.id,
      title: chats.title,
      projectId: chats.projectId,
      sharedAt: chatShares.createdAt,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(chatShares)
    .innerJoin(chats, eq(chats.id, chatShares.chatId))
    .innerJoin(users, eq(users.authSub, chatShares.ownerId))
    .where(eq(chatShares.sharedWithId, userId))
}

/** Check if a chat is shared with a specific user. */
export async function isChatSharedWithUser(chatId: string, userId: string): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: chatShares.id })
    .from(chatShares)
    .where(and(eq(chatShares.chatId, chatId), eq(chatShares.sharedWithId, userId)))
    .limit(1)
  return !!row
}

/** Get IDs of chats that a user has shared with others (for sidebar badges). */
export async function getUserSharedChatIds(userId: string): Promise<Set<string>> {
  const db = getDb()
  const rows = await db
    .select({ chatId: chatShares.chatId })
    .from(chatShares)
    .where(eq(chatShares.ownerId, userId))
  return new Set(rows.map((r) => r.chatId))
}
