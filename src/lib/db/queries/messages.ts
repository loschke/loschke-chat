import { nanoid } from "nanoid"
import { eq, and, sql, desc } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { messages } from "@/lib/db/schema/messages"
import { chats } from "@/lib/db/schema/chats"

interface MessageInput {
  chatId: string
  role: string
  parts: unknown
  metadata?: unknown
}

export async function saveMessages(inputs: MessageInput[]) {
  if (inputs.length === 0) return []

  const db = getDb()
  const values = inputs.map((input) => ({
    id: nanoid(12),
    chatId: input.chatId,
    role: input.role,
    parts: input.parts,
    metadata: input.metadata ?? null,
  }))

  return db.insert(messages).values(values).returning()
}

/** Merge new metadata fields into an existing message's metadata (JSONB merge) */
export async function updateMessageMetadata(messageId: string, metadata: Record<string, unknown>) {
  const db = getDb()
  await db
    .update(messages)
    .set({
      metadata: sql`COALESCE(${messages.metadata}, '{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb`,
    })
    .where(eq(messages.id, messageId))
}

/** Get message metadata (lightweight, no parts/content). Validates ownership via chat userId. */
export async function getMessageMetadata(messageId: string, userId: string): Promise<Record<string, unknown> | null> {
  const db = getDb()
  const [row] = await db
    .select({ metadata: messages.metadata })
    .from(messages)
    .innerJoin(chats, eq(messages.chatId, chats.id))
    .where(and(eq(messages.id, messageId), eq(chats.userId, userId)))
    .limit(1)
  return (row?.metadata as Record<string, unknown>) ?? null
}

/** Get metadata of the last assistant message in a chat. Validates ownership. */
export async function getLastAssistantMetadata(chatId: string, userId: string): Promise<Record<string, unknown> | null> {
  const db = getDb()
  const [row] = await db
    .select({ metadata: messages.metadata })
    .from(messages)
    .innerJoin(chats, eq(messages.chatId, chats.id))
    .where(and(
      eq(messages.chatId, chatId),
      eq(messages.role, "assistant"),
      eq(chats.userId, userId),
    ))
    .orderBy(desc(messages.createdAt))
    .limit(1)
  return (row?.metadata as Record<string, unknown>) ?? null
}
